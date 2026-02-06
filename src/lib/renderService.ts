import { supabase } from './supabase';

export interface RenderProgress {
  stage: 'initializing' | 'rendering' | 'uploading' | 'completed' | 'failed';
  progress: number;
  message: string;
}

class RenderService {
  async triggerTransitionRender(
    transitionId: string,
    userId: string,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      onProgress?.({
        stage: 'initializing',
        progress: 10,
        message: 'Starting render process'
      });

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-transition`;

      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      onProgress?.({
        stage: 'rendering',
        progress: 20,
        message: 'Processing audio segments'
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            transitionId,
            userId
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Render failed: ${response.statusText}`);
        }

        onProgress?.({
          stage: 'rendering',
          progress: 50,
          message: 'Applying fades and effects'
        });

        const pollInterval = setInterval(async () => {
          const status = await this.checkRenderStatus(transitionId);

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            onProgress?.({
              stage: 'completed',
              progress: 100,
              message: 'Render completed successfully'
            });
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            onProgress?.({
              stage: 'failed',
              progress: 0,
              message: status.error || 'Render failed'
            });
          } else if (status.status === 'rendering') {
            const estimatedProgress = Math.min(90, 50 + (Date.now() - status.startTime) / 1000);
            onProgress?.({
              stage: 'rendering',
              progress: estimatedProgress,
              message: 'Processing audio...'
            });
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
        }, 180000);

        return { success: true };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          throw new Error('Render timed out after 3 minutes');
        }

        throw fetchError;
      }
    } catch (error: any) {
      console.error('Failed to trigger render:', error);
      return {
        success: false,
        error: error.message || 'Failed to render transition'
      };
    }
  }

  async checkRenderStatus(transitionId: string): Promise<{
    status: 'draft' | 'rendering' | 'completed' | 'failed';
    outputUrl?: string;
    error?: string;
    startTime: number;
  }> {
    const { data, error } = await supabase
      .from('transitions')
      .select('status, output_url, render_error_message, updated_at')
      .eq('id', transitionId)
      .maybeSingle();

    if (error || !data) {
      return {
        status: 'failed',
        error: 'Failed to check render status',
        startTime: Date.now()
      };
    }

    return {
      status: data.status as any,
      outputUrl: data.output_url,
      error: data.render_error_message,
      startTime: new Date(data.updated_at).getTime()
    };
  }

  async waitForRenderCompletion(
    transitionId: string,
    timeoutMs: number = 180000,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<{ success: boolean; outputUrl?: string; error?: string }> {
    const startTime = Date.now();
    const pollInterval = 2000;

    return new Promise((resolve) => {
      const poll = async () => {
        const elapsed = Date.now() - startTime;

        if (elapsed > timeoutMs) {
          resolve({
            success: false,
            error: 'Render timed out after 3 minutes'
          });
          return;
        }

        const status = await this.checkRenderStatus(transitionId);

        if (status.status === 'completed' && status.outputUrl) {
          onProgress?.({
            stage: 'completed',
            progress: 100,
            message: 'Render completed successfully'
          });

          resolve({
            success: true,
            outputUrl: status.outputUrl
          });
        } else if (status.status === 'failed') {
          onProgress?.({
            stage: 'failed',
            progress: 0,
            message: status.error || 'Render failed'
          });

          resolve({
            success: false,
            error: status.error || 'Render failed'
          });
        } else if (status.status === 'rendering') {
          const progress = Math.min(90, 30 + (elapsed / timeoutMs) * 60);

          onProgress?.({
            stage: 'rendering',
            progress,
            message: 'Processing audio segments and applying effects'
          });

          setTimeout(poll, pollInterval);
        } else {
          setTimeout(poll, pollInterval);
        }
      };

      poll();
    });
  }
}

export const renderService = new RenderService();
