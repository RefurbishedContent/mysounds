import { supabase } from './supabase';
import { config } from './config';

export type JobPriority = 'low' | 'normal' | 'high';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface BaseJob {
  id: string;
  userId: string;
  status: JobStatus;
  progress: number;
  retryCount: number;
  priority: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface RenderJob extends BaseJob {
  type: 'render-audio';
  projectId: string;
  format: 'mp3' | 'wav' | 'flac';
  quality: 'draft' | 'standard' | 'high' | 'lossless';
}

export interface JobTypeDefinition<TJob extends BaseJob> {
  table: string;
  functionSlug: string;
  maxRetries: number;
  buildPayload: (job: TJob) => Record<string, unknown>;
  mapRow: (row: Record<string, unknown>) => TJob;
}

const RENDER_JOB_DEF: JobTypeDefinition<RenderJob> = {
  table: 'render_jobs',
  functionSlug: 'render-audio',
  maxRetries: 3,
  buildPayload: (job) => ({
    jobId: job.id,
    projectId: job.projectId,
    userId: job.userId,
    format: job.format,
    quality: job.quality,
  }),
  mapRow: (row) => ({
    type: 'render-audio',
    id: row.id as string,
    userId: row.user_id as string,
    projectId: row.project_id as string,
    format: row.format as RenderJob['format'],
    quality: row.quality as RenderJob['quality'],
    status: row.status as JobStatus,
    progress: (row.progress as number) ?? 0,
    retryCount: (row.retry_count as number) ?? 0,
    priority: (row.priority as number) ?? 5,
    errorMessage: row.error_message as string | undefined,
    createdAt: row.created_at as string,
    startedAt: row.started_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
  }),
};

class GenericJobQueueManager {
  private static instance: GenericJobQueueManager;
  private processingJobs: Set<string> = new Set();
  private maxConcurrentJobs = 3;

  private constructor() {}

  static getInstance(): GenericJobQueueManager {
    if (!GenericJobQueueManager.instance) {
      GenericJobQueueManager.instance = new GenericJobQueueManager();
    }
    return GenericJobQueueManager.instance;
  }

  async createRenderJob(
    projectId: string,
    userId: string,
    format: RenderJob['format'],
    quality: RenderJob['quality'],
    priority: JobPriority = 'normal'
  ): Promise<string> {
    const { data, error } = await supabase
      .from('render_jobs')
      .insert({
        project_id: projectId,
        user_id: userId,
        format,
        quality,
        status: 'queued',
        progress: 0,
        retry_count: 0,
        priority: this.priorityValue(priority),
        processing_logs: [],
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create job: ${error.message}`);
    return data.id;
  }

  async startJob<TJob extends BaseJob>(
    jobId: string,
    def: JobTypeDefinition<TJob>
  ): Promise<void> {
    if (this.processingJobs.has(jobId)) throw new Error('Job already processing');
    if (this.processingJobs.size >= this.maxConcurrentJobs) {
      throw new Error('Maximum concurrent jobs reached');
    }

    this.processingJobs.add(jobId);

    const { data: row, error } = await supabase
      .from(def.table)
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !row) {
      this.processingJobs.delete(jobId);
      throw new Error('Job not found');
    }

    const job = def.mapRow(row as Record<string, unknown>);

    try {
      const response = await fetch(`${config.functions.baseUrl}/${def.functionSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.supabase.anonKey}`,
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify(def.buildPayload(job)),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }
    } catch (err) {
      await this.handleFailure(jobId, def, err);
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  async startRenderJob(jobId: string): Promise<void> {
    return this.startJob(jobId, RENDER_JOB_DEF);
  }

  private async handleFailure<TJob extends BaseJob>(
    jobId: string,
    def: JobTypeDefinition<TJob>,
    error: unknown
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);

    const { data: row } = await supabase
      .from(def.table)
      .select('retry_count')
      .eq('id', jobId)
      .single();

    const retryCount = ((row?.retry_count as number) ?? 0) + 1;

    if (retryCount < def.maxRetries) {
      await supabase
        .from(def.table)
        .update({ status: 'queued', retry_count: retryCount, error_message: message, updated_at: new Date().toISOString() })
        .eq('id', jobId);

      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      setTimeout(() => this.startJob(jobId, def), delay);
    } else {
      await supabase
        .from(def.table)
        .update({ status: 'failed', error_message: `Max retries exceeded: ${message}`, updated_at: new Date().toISOString() })
        .eq('id', jobId);

      await this.sendToDeadLetter(jobId, def.table, { jobId, table: def.table }, message, retryCount);
    }
  }

  private async sendToDeadLetter(
    originalJobId: string,
    jobType: string,
    payload: Record<string, unknown>,
    errorMessage: string,
    retryCount: number
  ): Promise<void> {
    try {
      await supabase.from('dead_letter_jobs').insert({
        original_job_id: originalJobId,
        job_type: jobType,
        payload,
        error_message: errorMessage,
        retry_count: retryCount,
      });
    } catch {
      // dead letter logging must never throw
    }
  }

  async getRenderJobStatus(jobId: string): Promise<RenderJob | null> {
    const { data, error } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (error || !data) return null;
    return RENDER_JOB_DEF.mapRow(data as Record<string, unknown>);
  }

  async cancelJob(jobId: string, table = 'render_jobs'): Promise<void> {
    this.processingJobs.delete(jobId);
    await supabase
      .from(table)
      .update({ status: 'failed', error_message: 'Cancelled by user', updated_at: new Date().toISOString() })
      .eq('id', jobId);
  }

  subscribeToJob(jobId: string, callback: (job: RenderJob) => void): () => void {
    const channel = supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'render_jobs', filter: `id=eq.${jobId}` },
        (payload) => callback(RENDER_JOB_DEF.mapRow(payload.new as Record<string, unknown>))
      )
      .subscribe();

    return () => channel.unsubscribe();
  }

  getProcessingCount(): number {
    return this.processingJobs.size;
  }

  setMaxConcurrentJobs(max: number): void {
    this.maxConcurrentJobs = Math.max(1, Math.min(10, max));
  }

  private priorityValue(p: JobPriority): number {
    return p === 'high' ? 10 : p === 'low' ? 1 : 5;
  }
}

export const jobQueue = GenericJobQueueManager.getInstance();

export type { JobTypeDefinition };

// ============================================================
// STEM ANALYSIS JOB
// ============================================================

export interface StemAnalysisJob extends BaseJob {
  type: 'stem-analysis';
  trackId: string;
  stemIds: string[];
}

export const STEM_ANALYSIS_JOB_DEF: JobTypeDefinition<StemAnalysisJob> = {
  table: 'stem_separation_jobs',
  functionSlug: 'analyze-stems',
  maxRetries: 2,
  buildPayload: (job) => ({
    jobId: job.id,
    trackId: job.trackId,
    userId: job.userId,
    stemIds: job.stemIds,
  }),
  mapRow: (row) => ({
    type: 'stem-analysis',
    id: row.id as string,
    userId: row.user_id as string,
    trackId: row.track_id as string,
    stemIds: (row.stem_ids as string[]) ?? [],
    status: row.status as JobStatus,
    progress: (row.progress as number) ?? 0,
    retryCount: (row.retry_count as number) ?? 0,
    priority: (row.priority as number) ?? 5,
    errorMessage: row.error_message as string | undefined,
    createdAt: row.created_at as string,
    startedAt: row.started_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
  }),
};

// ============================================================
// COMPATIBILITY COMPUTATION JOB
// ============================================================

export interface CompatibilityJob extends BaseJob {
  type: 'compatibility-computation';
  trackAId: string;
  trackBId: string;
}

export const COMPATIBILITY_JOB_DEF: JobTypeDefinition<CompatibilityJob> = {
  table: 'stem_separation_jobs',
  functionSlug: 'analyze-mix',
  maxRetries: 2,
  buildPayload: (job) => ({
    jobId: job.id,
    trackAId: job.trackAId,
    trackBId: job.trackBId,
    userId: job.userId,
  }),
  mapRow: (row) => ({
    type: 'compatibility-computation',
    id: row.id as string,
    userId: row.user_id as string,
    trackAId: row.track_a_id as string,
    trackBId: row.track_b_id as string,
    status: row.status as JobStatus,
    progress: (row.progress as number) ?? 0,
    retryCount: (row.retry_count as number) ?? 0,
    priority: (row.priority as number) ?? 5,
    errorMessage: row.error_message as string | undefined,
    createdAt: row.created_at as string,
    startedAt: row.started_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
  }),
};

// ============================================================
// MIX PLAN GENERATION JOB
// ============================================================

export interface MixPlanJob extends BaseJob {
  type: 'mix-plan-generation';
  trackAId: string;
  trackBId: string;
  planId: string;
}

export const MIX_PLAN_JOB_DEF: JobTypeDefinition<MixPlanJob> = {
  table: 'stem_separation_jobs',
  functionSlug: 'execute-mix',
  maxRetries: 2,
  buildPayload: (job) => ({
    jobId: job.id,
    trackAId: job.trackAId,
    trackBId: job.trackBId,
    planId: job.planId,
    userId: job.userId,
  }),
  mapRow: (row) => ({
    type: 'mix-plan-generation',
    id: row.id as string,
    userId: row.user_id as string,
    trackAId: row.track_a_id as string,
    trackBId: row.track_b_id as string,
    planId: row.plan_id as string,
    status: row.status as JobStatus,
    progress: (row.progress as number) ?? 0,
    retryCount: (row.retry_count as number) ?? 0,
    priority: (row.priority as number) ?? 5,
    errorMessage: row.error_message as string | undefined,
    createdAt: row.created_at as string,
    startedAt: row.started_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
  }),
};
