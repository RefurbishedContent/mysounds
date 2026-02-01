import { supabase } from './supabase';
import { UploadResult, AudioAnalysis } from './storage';
import { databaseService } from './database';

export interface ComprehensiveAudioAnalysis extends AudioAnalysis {
  genre?: string;
  genreConfidence?: number;
  subGenres?: string[];
  moodTags?: string[];
  hasVocals?: boolean;
  vocalPercentage?: number;
  brightness?: number;
  warmth?: number;
  dynamicRangeDb?: number;
  beatConfidence?: number;
  keyConfidence?: number;
  introDuration?: number;
  outroDuration?: number;
  harmonicComplexity?: number;
  rhythmicComplexity?: number;
  tempoStability?: number;
  analyzedAt?: string;
  analyzerVersion?: string;
  beatGrid?: number[];
  downbeats?: number[];
}

export interface AnalysisJob {
  id: string;
  uploadId: string;
  userId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

class SongAnalyzerService {
  private readonly ANALYSIS_COST = 1;

  async analyzeSong(uploadId: string, userId: string): Promise<AnalysisJob> {
    const hasCredits = await this.checkCredits(userId);
    if (!hasCredits) {
      throw new Error('Insufficient credits for analysis');
    }

    const upload = await this.getUpload(uploadId, userId);
    if (!upload) {
      throw new Error('Upload not found');
    }

    if (upload.status !== 'ready') {
      throw new Error('Upload must be ready before analysis');
    }

    const { data: job, error } = await supabase
      .from('analysis_jobs')
      .insert({
        upload_id: uploadId,
        user_id: userId,
        status: 'queued',
        progress: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create analysis job:', error);
      throw new Error('Failed to start analysis');
    }

    this.triggerAnalysis(job.id, uploadId, upload.url);

    return this.mapJobFromDb(job);
  }

  async reanalyzeSong(uploadId: string, userId: string): Promise<AnalysisJob> {
    return this.analyzeSong(uploadId, userId);
  }

  async getAnalysisStatus(jobId: string): Promise<AnalysisJob | null> {
    const { data, error } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapJobFromDb(data);
  }

  async getUserAnalysisQueue(userId: string): Promise<AnalysisJob[]> {
    const { data, error } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map(this.mapJobFromDb);
  }

  async cancelAnalysisJob(jobId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        error_message: 'Cancelled by user'
      })
      .eq('id', jobId)
      .eq('user_id', userId)
      .in('status', ['queued', 'processing']);

    return !error;
  }

  subscribeToAnalysisUpdates(
    uploadId: string,
    callback: (analysis: ComprehensiveAudioAnalysis | null, status: string) => void
  ) {
    return supabase
      .channel(`upload-analysis-${uploadId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'uploads',
          filter: `id=eq.${uploadId}`
        },
        (payload) => {
          callback(payload.new.analysis, payload.new.status);
        }
      )
      .subscribe();
  }

  subscribeToJobUpdates(
    jobId: string,
    callback: (job: AnalysisJob) => void
  ) {
    return supabase
      .channel(`analysis-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          callback(this.mapJobFromDb(payload.new));
        }
      )
      .subscribe();
  }

  private async triggerAnalysis(jobId: string, uploadId: string, audioUrl: string): Promise<void> {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-audio`;

      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobId,
          uploadId,
          audioUrl,
          comprehensive: true
        })
      }).catch(error => {
        console.error('Failed to trigger analysis:', error);
      });

    } catch (error) {
      console.error('Failed to trigger analysis:', error);
    }
  }

  private async checkCredits(userId: string): Promise<boolean> {
    const credits = await databaseService.getUserCredits(userId);
    if (!credits) return false;
    return credits.creditsRemaining >= this.ANALYSIS_COST;
  }

  private async getUpload(uploadId: string, userId: string): Promise<UploadResult | null> {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      url: data.url,
      path: data.filename,
      originalName: data.original_name,
      mimeType: data.mime_type || 'audio/mpeg',
      size: data.size,
      status: data.status || 'ready',
      analysis: data.analysis,
      metadata: {
        filename: data.original_name,
        size: data.size,
        mimeType: data.mime_type || 'audio/mpeg',
        duration: data.analysis?.duration,
        analysis: data.analysis
      }
    };
  }

  private mapJobFromDb(data: any): AnalysisJob {
    return {
      id: data.id,
      uploadId: data.upload_id,
      userId: data.user_id,
      status: data.status,
      progress: data.progress || 0,
      errorMessage: data.error_message,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const songAnalyzer = new SongAnalyzerService();
