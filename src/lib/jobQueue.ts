import { supabase } from './supabase';

export interface JobQueueConfig {
  maxRetries: number;
  retryDelay: number;
  priority: 'low' | 'normal' | 'high';
}

export interface RenderJob {
  id: string;
  projectId: string;
  userId: string;
  format: 'mp3' | 'wav' | 'flac';
  quality: 'draft' | 'standard' | 'high' | 'lossless';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  retryCount: number;
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

class JobQueueManager {
  private static instance: JobQueueManager;
  private processingJobs: Set<string> = new Set();
  private maxConcurrentJobs = 3;

  private constructor() {}

  static getInstance(): JobQueueManager {
    if (!JobQueueManager.instance) {
      JobQueueManager.instance = new JobQueueManager();
    }
    return JobQueueManager.instance;
  }

  async createJob(
    projectId: string,
    userId: string,
    format: 'mp3' | 'wav' | 'flac',
    quality: 'draft' | 'standard' | 'high' | 'lossless',
    config?: Partial<JobQueueConfig>
  ): Promise<string> {
    const priority = this.getPriorityValue(config?.priority || 'normal');

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
        priority,
        processing_logs: []
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create job: ${error.message}`);
    }

    return data.id;
  }

  private getPriorityValue(priority: 'low' | 'normal' | 'high'): number {
    switch (priority) {
      case 'high':
        return 10;
      case 'normal':
        return 5;
      case 'low':
        return 1;
      default:
        return 5;
    }
  }

  async startJob(jobId: string): Promise<void> {
    if (this.processingJobs.has(jobId)) {
      throw new Error('Job already processing');
    }

    if (this.processingJobs.size >= this.maxConcurrentJobs) {
      throw new Error('Maximum concurrent jobs reached');
    }

    this.processingJobs.add(jobId);

    const { data: job, error } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      this.processingJobs.delete(jobId);
      throw new Error('Job not found');
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            jobId: job.id,
            projectId: job.project_id,
            userId: job.user_id,
            format: job.format,
            quality: job.quality
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Render request failed: ${response.statusText}`);
      }
    } catch (error) {
      await this.handleJobFailure(jobId, error);
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  async handleJobFailure(jobId: string, error: any): Promise<void> {
    const { data: job } = await supabase
      .from('render_jobs')
      .select('retry_count')
      .eq('id', jobId)
      .single();

    const maxRetries = 3;
    const retryCount = (job?.retry_count || 0) + 1;

    if (retryCount < maxRetries) {
      await supabase
        .from('render_jobs')
        .update({
          status: 'queued',
          retry_count: retryCount,
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      setTimeout(() => this.startJob(jobId), delay);
    } else {
      await supabase
        .from('render_jobs')
        .update({
          status: 'failed',
          error_message: `Max retries exceeded: ${error.message}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }
  }

  async getJobStatus(jobId: string): Promise<RenderJob | null> {
    const { data, error } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      return null;
    }

    return {
      id: data.id,
      projectId: data.project_id,
      userId: data.user_id,
      format: data.format,
      quality: data.quality,
      status: data.status,
      progress: data.progress,
      retryCount: data.retry_count,
      priority: data.priority,
      createdAt: data.created_at,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      errorMessage: data.error_message
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    this.processingJobs.delete(jobId);

    await supabase
      .from('render_jobs')
      .update({
        status: 'failed',
        error_message: 'Cancelled by user',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }

  async getQueuedJobs(userId: string): Promise<RenderJob[]> {
    const { data, error } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      return [];
    }

    return data.map(job => ({
      id: job.id,
      projectId: job.project_id,
      userId: job.user_id,
      format: job.format,
      quality: job.quality,
      status: job.status,
      progress: job.progress,
      retryCount: job.retry_count,
      priority: job.priority,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      errorMessage: job.error_message
    }));
  }

  async processNextJob(): Promise<void> {
    if (this.processingJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    const { data: jobs } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (jobs && jobs.length > 0) {
      await this.startJob(jobs[0].id);
    }
  }

  subscribeToJob(jobId: string, callback: (job: RenderJob) => void): () => void {
    const channel = supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'render_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const job = payload.new as any;
          callback({
            id: job.id,
            projectId: job.project_id,
            userId: job.user_id,
            format: job.format,
            quality: job.quality,
            status: job.status,
            progress: job.progress,
            retryCount: job.retry_count,
            priority: job.priority,
            createdAt: job.created_at,
            startedAt: job.started_at,
            completedAt: job.completed_at,
            errorMessage: job.error_message
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  getProcessingCount(): number {
    return this.processingJobs.size;
  }

  setMaxConcurrentJobs(max: number): void {
    this.maxConcurrentJobs = Math.max(1, Math.min(10, max));
  }
}

export const jobQueue = JobQueueManager.getInstance();
