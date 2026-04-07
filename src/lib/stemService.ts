import { supabase } from './supabase';
import { config } from './config';
import type { StemSeparationJob } from '../types/track';

class StemService {
  async requestStemSeparation(
    trackId: string,
    userId: string,
    stemLevel: 1 | 2 | 3
  ): Promise<StemSeparationJob> {
    const requestId = crypto.randomUUID();
    const response = await fetch(`${config.functions.baseUrl}/separate-stems`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.supabase.anonKey}`,
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({ trackId, userId, stemLevel }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.error ?? 'Failed to start stem separation');
    }

    const { jobId } = await response.json();
    const job = await this.getStemJob(jobId);
    if (!job) throw new Error('Stem job not found after creation');
    return job;
  }

  async getStemJob(jobId: string): Promise<StemSeparationJob | null> {
    const { data, error } = await supabase
      .from('stem_separation_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRow(data);
  }

  async getStemJobForTrack(trackId: string): Promise<StemSeparationJob | null> {
    const { data, error } = await supabase
      .from('stem_separation_jobs')
      .select('*')
      .eq('track_id', trackId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRow(data);
  }

  subscribeStemJob(jobId: string, callback: (job: StemSeparationJob) => void): () => void {
    const channel = supabase
      .channel(`stem-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stem_separation_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => callback(this.mapRow(payload.new as Record<string, unknown>))
      )
      .subscribe();

    return () => channel.unsubscribe();
  }

  private mapRow(row: Record<string, unknown>): StemSeparationJob {
    return {
      id: row.id as string,
      trackId: row.track_id as string,
      userId: row.user_id as string,
      replicatePredictionId: row.replicate_prediction_id as string | undefined,
      status: row.status as StemSeparationJob['status'],
      progress: (row.progress as number) ?? 0,
      stemLevel: (row.stem_level as 1 | 2 | 3) ?? 1,
      vocalsUrl: row.vocals_url as string | undefined,
      drumsUrl: row.drums_url as string | undefined,
      bassUrl: row.bass_url as string | undefined,
      otherUrl: row.other_url as string | undefined,
      errorMessage: row.error_message as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export const stemService = new StemService();
