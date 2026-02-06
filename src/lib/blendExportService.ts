import { supabase } from './supabase';
import { storageService, UploadResult } from './storage';
import { TransitionData } from './transitionsService';

export interface BlendData {
  id: string;
  userId: string;
  transitionId: string;
  name: string;
  songAId: string;
  songBId: string;
  url: string;
  filename: string;
  duration: number;
  fileSize: number;
  format: 'mp3' | 'wav' | 'flac';
  quality: 'draft' | 'standard' | 'high' | 'lossless';
  sampleRate: number;
  bitDepth: 16 | 24;
  status: 'processing' | 'completed' | 'failed';
  exportSettings: any;
  songADurationContribution: number;
  songBDurationContribution: number;
  transitionDuration: number;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlendInput {
  transitionId: string;
  name?: string;
  format?: 'mp3' | 'wav' | 'flac';
  quality?: 'draft' | 'standard' | 'high' | 'lossless';
  sampleRate?: number;
  bitDepth?: 16 | 24;
  normalize?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

export interface ExportProgress {
  stage: string;
  progress: number;
  message: string;
}

class BlendExportService {
  private readonly BUCKET_NAME = 'blends';

  async createBlend(
    userId: string,
    input: CreateBlendInput,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<BlendData> {
    try {
      onProgress?.({
        stage: 'initializing',
        progress: 0,
        message: 'Loading transition data...'
      });

      const transition = await this.getTransitionWithDetails(input.transitionId);
      if (!transition) {
        throw new Error(`Transition not found with ID: ${input.transitionId}`);
      }

      console.log('[BlendExport] Transition data loaded:', {
        id: transition.id,
        songAId: transition.songAId,
        songBId: transition.songBId,
        name: transition.name
      });

      if (!transition.songAId || !transition.songBId) {
        throw new Error(`Transition is missing song references. SongA: ${transition.songAId}, SongB: ${transition.songBId}`);
      }

      const songA = await storageService.getUpload(transition.songAId);
      const songB = await storageService.getUpload(transition.songBId);

      if (!songA) {
        throw new Error(`Song A not found with ID: ${transition.songAId}`);
      }

      if (!songB) {
        throw new Error(`Song B not found with ID: ${transition.songBId}`);
      }

      console.log('[BlendExport] Source songs loaded:', {
        songA: songA.originalName,
        songB: songB.originalName
      });

      const songAMarker = transition.songAMarkerPoint || 0;
      const songBMarker = transition.songBMarkerPoint || 0;
      const transitionDuration = transition.transitionDuration || 12;

      const songADuration = songA.analysis?.duration || 0;
      const songBDuration = songB.analysis?.duration || 0;

      const songAContribution = songAMarker;
      const songBContribution = songBDuration - songBMarker;
      const totalDuration = songAContribution + transitionDuration + songBContribution;

      const blendName = input.name || `${songA.originalName} → ${songB.originalName}`;
      const filename = `${userId}/${Date.now()}-blend.${input.format || 'wav'}`;

      onProgress?.({
        stage: 'creating-record',
        progress: 20,
        message: 'Creating blend record...'
      });

      const { data: blendRecord, error: dbError } = await supabase
        .from('blends')
        .insert({
          user_id: userId,
          transition_id: input.transitionId,
          name: blendName,
          song_a_id: transition.songAId,
          song_b_id: transition.songBId,
          url: '',
          filename: filename,
          duration: Math.round(totalDuration),
          file_size: 0,
          format: input.format || 'wav',
          quality: input.quality || 'standard',
          sample_rate: input.sampleRate || 44100,
          bit_depth: input.bitDepth || 16,
          status: 'processing',
          export_settings: {
            normalize: input.normalize ?? true,
            fadeIn: input.fadeIn || 0,
            fadeOut: input.fadeOut || 0
          },
          song_a_duration_contribution: Math.round(songAContribution),
          song_b_duration_contribution: Math.round(songBContribution),
          transition_duration: transitionDuration,
          template_name: transition.metadata?.templateName
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Failed to create blend record: ${dbError.message}`);
      }

      onProgress?.({
        stage: 'triggering-export',
        progress: 40,
        message: 'Triggering server-side export...'
      });

      await this.triggerServerExport(blendRecord.id, {
        transitionId: input.transitionId,
        songAId: transition.songAId,
        songBId: transition.songBId,
        songAMarker,
        songBMarker,
        transitionDuration,
        format: input.format || 'wav',
        quality: input.quality || 'standard',
        sampleRate: input.sampleRate || 44100,
        bitDepth: input.bitDepth || 16,
        normalize: input.normalize ?? true,
        fadeIn: input.fadeIn || 0,
        fadeOut: input.fadeOut || 0
      });

      return this.mapRowToBlend(blendRecord);
    } catch (error) {
      console.error('Failed to create blend:', error);
      throw error;
    }
  }

  async getUserBlends(userId: string): Promise<BlendData[]> {
    const { data, error } = await supabase
      .from('blends')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch blends: ${error.message}`);
    }

    return data.map(row => this.mapRowToBlend(row));
  }

  async getBlend(blendId: string): Promise<BlendData | null> {
    const { data, error } = await supabase
      .from('blends')
      .select('*')
      .eq('id', blendId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch blend: ${error.message}`);
    }

    return data ? this.mapRowToBlend(data) : null;
  }

  async getBlendWithDetails(blendId: string): Promise<(BlendData & {
    songA?: UploadResult;
    songB?: UploadResult;
    transition?: TransitionData;
  }) | null> {
    const { data, error } = await supabase
      .from('blends')
      .select(`
        *,
        song_a:uploads!blends_song_a_id_fkey(*),
        song_b:uploads!blends_song_b_id_fkey(*),
        transition:transitions(*)
      `)
      .eq('id', blendId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const blend = this.mapRowToBlend(data);

    const songA: UploadResult | undefined = data.song_a ? {
      id: data.song_a.id,
      url: data.song_a.url,
      path: data.song_a.filename,
      originalName: data.song_a.original_name,
      mimeType: data.song_a.mime_type,
      size: data.song_a.size,
      status: data.song_a.status,
      analysis: data.song_a.analysis,
      metadata: {
        filename: data.song_a.original_name,
        size: data.song_a.size,
        mimeType: data.song_a.mime_type,
        duration: data.song_a.analysis?.duration,
        analysis: data.song_a.analysis
      }
    } : undefined;

    const songB: UploadResult | undefined = data.song_b ? {
      id: data.song_b.id,
      url: data.song_b.url,
      path: data.song_b.filename,
      originalName: data.song_b.original_name,
      mimeType: data.song_b.mime_type,
      size: data.song_b.size,
      status: data.song_b.status,
      analysis: data.song_b.analysis,
      metadata: {
        filename: data.song_b.original_name,
        size: data.song_b.size,
        mimeType: data.song_b.mime_type,
        duration: data.song_b.analysis?.duration,
        analysis: data.song_b.analysis
      }
    } : undefined;

    return {
      ...blend,
      songA,
      songB,
      transition: data.transition
    };
  }

  async deleteBlend(blendId: string, userId: string): Promise<void> {
    const blend = await this.getBlend(blendId);
    if (!blend) {
      throw new Error('Blend not found');
    }

    if (blend.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (blend.filename) {
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([blend.filename]);

      if (storageError) {
        console.warn('Failed to delete blend file from storage:', storageError);
      }
    }

    const { error: dbError } = await supabase
      .from('blends')
      .delete()
      .eq('id', blendId)
      .eq('user_id', userId);

    if (dbError) {
      throw new Error(`Failed to delete blend: ${dbError.message}`);
    }
  }

  async analyzeBlendCompatibility(blendId1: string, blendId2: string): Promise<{
    score: number;
    level: 'excellent' | 'good' | 'fair' | 'poor';
    bpmDifference: number;
    keyCompatible: boolean;
    suggestions: string[];
  }> {
    const blend1 = await this.getBlendWithDetails(blendId1);
    const blend2 = await this.getBlendWithDetails(blendId2);

    if (!blend1 || !blend2) {
      throw new Error('One or both blends not found');
    }

    const bpm1 = blend1.songB?.analysis?.bpm || 0;
    const bpm2 = blend2.songA?.analysis?.bpm || 0;
    const key1 = blend1.songB?.analysis?.key || '';
    const key2 = blend2.songA?.analysis?.key || '';

    const bpmDifference = Math.abs(bpm1 - bpm2);
    const keyCompatible = this.areKeysCompatible(key1, key2);

    let score = 100;
    const suggestions: string[] = [];

    if (bpmDifference > 0 && bpmDifference <= 3) {
      score -= 5;
    } else if (bpmDifference > 3 && bpmDifference <= 5) {
      score -= 10;
      suggestions.push('BPM difference is moderate. Consider tempo adjustment.');
    } else if (bpmDifference > 5 && bpmDifference <= 10) {
      score -= 25;
      suggestions.push('Significant BPM difference. Strong tempo adjustment recommended.');
    } else if (bpmDifference > 10) {
      score -= 40;
      suggestions.push('Large BPM difference may require creative mixing techniques.');
    }

    if (!keyCompatible && key1 && key2) {
      score -= 15;
      suggestions.push('Keys are not harmonically compatible. Consider key shift or EQ adjustment.');
    } else if (keyCompatible) {
      suggestions.push('Keys are harmonically compatible - great match!');
    }

    let level: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) level = 'excellent';
    else if (score >= 70) level = 'good';
    else if (score >= 50) level = 'fair';
    else level = 'poor';

    return {
      score,
      level,
      bpmDifference,
      keyCompatible,
      suggestions
    };
  }

  private areKeysCompatible(key1: string, key2: string): boolean {
    if (!key1 || !key2) return false;

    const compatibleKeys: Record<string, string[]> = {
      'C': ['C', 'Am', 'G', 'F', 'Dm', 'Em'],
      'Am': ['Am', 'C', 'Dm', 'Em', 'G', 'F'],
      'G': ['G', 'Em', 'C', 'D', 'Am', 'Bm'],
      'Em': ['Em', 'G', 'Am', 'Bm', 'C', 'D'],
      'D': ['D', 'Bm', 'G', 'A', 'Em', 'F#m'],
      'Bm': ['Bm', 'D', 'Em', 'F#m', 'G', 'A'],
      'A': ['A', 'F#m', 'D', 'E', 'Bm', 'C#m'],
      'F#m': ['F#m', 'A', 'Bm', 'C#m', 'D', 'E'],
      'E': ['E', 'C#m', 'A', 'B', 'F#m', 'G#m'],
      'C#m': ['C#m', 'E', 'F#m', 'G#m', 'A', 'B'],
      'B': ['B', 'G#m', 'E', 'F#', 'C#m', 'D#m'],
      'G#m': ['G#m', 'B', 'C#m', 'D#m', 'E', 'F#'],
      'F#': ['F#', 'D#m', 'B', 'C#', 'G#m', 'A#m'],
      'D#m': ['D#m', 'F#', 'G#m', 'A#m', 'B', 'C#'],
      'F': ['F', 'Dm', 'C', 'Bb', 'Am', 'Gm'],
      'Dm': ['Dm', 'F', 'Am', 'Gm', 'C', 'Bb'],
      'Bb': ['Bb', 'Gm', 'F', 'Eb', 'Dm', 'Cm'],
      'Gm': ['Gm', 'Bb', 'Dm', 'Cm', 'F', 'Eb'],
      'Eb': ['Eb', 'Cm', 'Bb', 'Ab', 'Gm', 'Fm'],
      'Cm': ['Cm', 'Eb', 'Gm', 'Fm', 'Bb', 'Ab'],
      'Ab': ['Ab', 'Fm', 'Eb', 'Db', 'Cm', 'Bbm'],
      'Fm': ['Fm', 'Ab', 'Cm', 'Bbm', 'Eb', 'Db']
    };

    const compatibles = compatibleKeys[key1] || [];
    return compatibles.includes(key2);
  }

  subscribeToBlendUpdates(
    blendId: string,
    callback: (blend: BlendData) => void
  ) {
    return supabase
      .channel(`blend-${blendId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blends',
          filter: `id=eq.${blendId}`
        },
        (payload) => {
          callback(this.mapRowToBlend(payload.new));
        }
      )
      .subscribe();
  }

  private async getTransitionWithDetails(transitionId: string): Promise<TransitionData | null> {
    const { data, error } = await supabase
      .from('transitions')
      .select('*')
      .eq('id', transitionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch transition: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRowToTransition(data);
  }

  private mapRowToTransition(row: any): TransitionData {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      songAId: row.song_a_id,
      songBId: row.song_b_id,
      templateId: row.template_id,
      transitionStartPoint: row.transition_start_point,
      transitionDuration: row.transition_duration,
      songAEndTime: row.song_a_end_time,
      songBStartTime: row.song_b_start_time,
      songAMarkerPoint: row.song_a_marker_point,
      songBMarkerPoint: row.song_b_marker_point,
      songAClipStart: row.song_a_clip_start,
      songBClipEnd: row.song_b_clip_end,
      status: row.status,
      renderJobId: row.render_job_id,
      outputUrl: row.output_url,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private async triggerServerExport(blendId: string, config: any): Promise<void> {
    const TIMEOUT_MS = 30000;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-blend`;

      console.log('[BlendExport] Triggering Edge Function:', {
        url: apiUrl,
        blendId,
        timeout: `${TIMEOUT_MS}ms`
      });

      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('[BlendExport] Request timeout - aborting');
        controller.abort();
      }, TIMEOUT_MS);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            blendId,
            config
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('[BlendExport] Edge Function response:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[BlendExport] Edge Function error:', errorData);
          throw new Error(errorData.error || `Failed to trigger export: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[BlendExport] Edge Function success:', result);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          console.error('[BlendExport] Request timed out after 30 seconds');
          await this.markBlendAsFailed(blendId, 'Export timed out after 30 seconds');
          throw new Error('Export request timed out. Please try again.');
        }

        throw fetchError;
      }
    } catch (error: any) {
      console.error('[BlendExport] Failed to trigger server export:', {
        error: error.message,
        stack: error.stack,
        blendId
      });

      await this.markBlendAsFailed(blendId, error.message).catch(err => {
        console.error('[BlendExport] Failed to mark blend as failed:', err);
      });

      throw error;
    }
  }

  private async markBlendAsFailed(blendId: string, errorMessage: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('blends')
        .update({
          status: 'failed',
          export_settings: {
            error: errorMessage,
            failedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', blendId);

      if (error) {
        console.error('[BlendExport] Failed to update blend status:', error);
      } else {
        console.log('[BlendExport] Blend marked as failed:', blendId);
      }
    } catch (err) {
      console.error('[BlendExport] Error marking blend as failed:', err);
    }
  }

  private mapRowToBlend(row: any): BlendData {
    return {
      id: row.id,
      userId: row.user_id,
      transitionId: row.transition_id,
      name: row.name,
      songAId: row.song_a_id,
      songBId: row.song_b_id,
      url: row.url,
      filename: row.filename,
      duration: row.duration,
      fileSize: row.file_size,
      format: row.format,
      quality: row.quality,
      sampleRate: row.sample_rate,
      bitDepth: row.bit_depth,
      status: row.status,
      exportSettings: row.export_settings,
      songADurationContribution: row.song_a_duration_contribution,
      songBDurationContribution: row.song_b_duration_contribution,
      transitionDuration: row.transition_duration,
      templateName: row.template_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const blendExportService = new BlendExportService();
