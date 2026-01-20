import { supabase } from './supabase';
import { Database } from './supabase';

// Type definitions for database operations
type Tables = Database['public']['Tables'];
type ProjectRow = Tables['projects']['Row'];
type ProjectInsert = Tables['projects']['Insert'];
type ProjectUpdate = Tables['projects']['Update'];
type TemplateRow = Tables['templates']['Row'];
type UploadRow = Tables['uploads']['Row'];

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'processing' | 'completed' | 'error';
  duration: number;
  bpm: number;
  trackAUploadId?: string;
  trackBUploadId?: string;
  trackAName?: string;
  trackBName?: string;
  trackAUrl?: string;
  trackBUrl?: string;
  templatePlacements: TemplatePlacementData[];
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

export interface TemplatePlacementData {
  id: string;
  templateId: string;
  startTime: number;
  trackARegion: { start: number; end: number };
  trackBRegion: { start: number; end: number };
  parameterOverrides?: Record<string, any>;
}

export interface TemplateData {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isPopular: boolean;
  isPremium: boolean;
  author: string;
  downloads: number;
  rating: number;
  templateData: any;
}

export interface RenderJobData {
  id: string;
  userId: string;
  projectId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  format: 'mp3' | 'wav' | 'flac';
  quality: 'draft' | 'standard' | 'high' | 'lossless';
  outputUrl?: string;
  losslessUrl?: string;
  errorMessage?: string;
  processingLogs: Array<{
    timestamp: string;
    message: string;
  }>;
  renderConfig: any;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCredits {
  userId: string;
  creditsRemaining: number;
  creditsUsedThisMonth: number;
  lastResetDate: string;
  totalCreditsPurchased: number;
  totalCreditsEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'purchased' | 'consumed' | 'refunded';
  amount: number;
  description: string;
  renderJobId?: string;
  metadata?: any;
  createdAt: string;
}

class DatabaseService {
  /**
   * Get all templates
   */
  async getTemplates(): Promise<TemplateData[]> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('is_popular', { ascending: false })
      .order('downloads', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    return data.map(this.mapTemplateFromDb);
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<TemplateData | null> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return this.mapTemplateFromDb(data);
  }

  /**
   * Create new template (admin only)
   */
  async createTemplate(templateData: Omit<TemplateData, 'id'>): Promise<TemplateData> {
    const templateInsert = {
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      thumbnail_url: templateData.thumbnailUrl,
      duration: templateData.duration,
      difficulty: templateData.difficulty,
      is_popular: templateData.isPopular,
      is_premium: templateData.isPremium,
      author: templateData.author,
      downloads: templateData.downloads,
      rating: templateData.rating,
      template_data: templateData.templateData
    };

    const { data, error } = await supabase
      .from('templates')
      .insert(templateInsert)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    return this.mapTemplateFromDb(data);
  }

  /**
   * Update template (admin only)
   */
  async updateTemplate(templateId: string, templateData: Partial<TemplateData>): Promise<TemplateData> {
    const templateUpdate = {
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      thumbnail_url: templateData.thumbnailUrl,
      duration: templateData.duration,
      difficulty: templateData.difficulty,
      is_popular: templateData.isPopular,
      is_premium: templateData.isPremium,
      author: templateData.author,
      downloads: templateData.downloads,
      rating: templateData.rating,
      template_data: templateData.templateData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('templates')
      .update(templateUpdate)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    return this.mapTemplateFromDb(data);
  }

  /**
   * Delete template (admin only)
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Get user's projects
   */
  async getUserProjects(userId: string): Promise<ProjectData[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return data.map((project) => this.mapProjectFromDb({ ...project, template_placements: [] }));
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string, userId: string): Promise<ProjectData | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return this.mapProjectFromDb({ ...data, template_placements: [] });
  }

  /**
   * Create new project
   */
  async createProject(
    userId: string, 
    projectData: {
      name: string;
      description?: string;
      trackAUploadId?: string;
      trackBUploadId?: string;
    }
  ): Promise<ProjectData> {
    const projectInsert: ProjectInsert = {
      user_id: userId,
      name: projectData.name,
      description: projectData.description,
      status: 'draft',
      duration: 0,
      bpm: 120,
      track1_name: null,
      track1_url: null,
      track2_name: null,
      track2_url: null,
      project_data: {}
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(projectInsert)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    return this.mapProjectFromDb({ ...data, template_placements: [] });
  }

  /**
   * Update project
   */
  async updateProject(
    projectId: string, 
    userId: string, 
    updates: Partial<ProjectData>
  ): Promise<ProjectData> {
    const projectUpdate: ProjectUpdate = {
      name: updates.name,
      description: updates.description,
      status: updates.status,
      duration: updates.duration ? Math.floor(updates.duration) : undefined,
      bpm: updates.bpm,
      track1_name: updates.trackAName,
      track1_url: updates.trackAUrl,
      track2_name: updates.trackBName,
      track2_url: updates.trackBUrl,
      thumbnail_url: updates.thumbnail,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('projects')
      .update(projectUpdate)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }

    // Get updated project with template placements
    const updatedProject = await this.getProject(projectId, userId);
    if (!updatedProject) {
      throw new Error('Project not found after update');
    }

    return updatedProject;
  }

  /**
   * Duplicate project with all template placements
   */
  async duplicateProject(projectId: string, userId: string): Promise<ProjectData> {
    // Get original project
    const originalProject = await this.getProject(projectId, userId);
    if (!originalProject) {
      throw new Error('Project not found');
    }

    // Create new project with copied data
    const duplicatedProject = await this.createProject(userId, {
      name: `${originalProject.name} (Copy)`,
      description: originalProject.description,
      trackAUploadId: originalProject.trackAUploadId,
      trackBUploadId: originalProject.trackBUploadId
    });

    // Copy template placements
    for (const placement of originalProject.templatePlacements) {
      await this.addTemplatePlacement(duplicatedProject.id, userId, {
        templateId: placement.templateId,
        startTime: placement.startTime,
        trackARegion: placement.trackARegion,
        trackBRegion: placement.trackBRegion,
        parameterOverrides: placement.parameterOverrides
      });
    }

    // Return updated project with placements
    const finalProject = await this.getProject(duplicatedProject.id, userId);
    if (!finalProject) {
      throw new Error('Failed to retrieve duplicated project');
    }

    return finalProject;
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Add template placement to project
   */
  async addTemplatePlacement(
    projectId: string,
    userId: string,
    placement: Omit<TemplatePlacementData, 'id'>
  ): Promise<TemplatePlacementData> {
    // Verify project ownership
    const project = await this.getProject(projectId, userId);
    if (!project) {
      throw new Error('Project not found');
    }

    const { data, error } = await supabase
      .from('template_placements')
      .insert({
        project_id: projectId,
        template_id: placement.templateId,
        start_time: placement.startTime,
        track_a_start: placement.trackARegion.start,
        track_a_end: placement.trackARegion.end,
        track_b_start: placement.trackBRegion.start,
        track_b_end: placement.trackBRegion.end,
        parameter_overrides: placement.parameterOverrides || {}
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add template placement: ${error.message}`);
    }

    return this.mapTemplatePlacementFromDb(data);
  }

  /**
   * Update template placement
   */
  async updateTemplatePlacement(
    placementId: string,
    userId: string,
    updates: Partial<TemplatePlacementData>
  ): Promise<TemplatePlacementData> {
    const { data, error } = await supabase
      .from('template_placements')
      .update({
        start_time: updates.startTime,
        track_a_start: updates.trackARegion?.start,
        track_a_end: updates.trackARegion?.end,
        track_b_start: updates.trackBRegion?.start,
        track_b_end: updates.trackBRegion?.end,
        parameter_overrides: updates.parameterOverrides,
        updated_at: new Date().toISOString()
      })
      .eq('id', placementId)
      .select(`
        *,
        project:projects!inner(user_id)
      `)
      .eq('project.user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to update template placement: ${error.message}`);
    }

    return this.mapTemplatePlacementFromDb(data);
  }

  /**
   * Delete template placement
   */
  async deleteTemplatePlacement(placementId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('template_placements')
      .delete()
      .eq('id', placementId)
      .eq('project.user_id', userId);

    if (error) {
      throw new Error(`Failed to delete template placement: ${error.message}`);
    }
  }

  /**
   * Create render job
   */
  async createRenderJob(
    userId: string,
    projectId: string,
    format: 'mp3' | 'wav' | 'flac' = 'mp3',
    quality: 'draft' | 'standard' | 'high' | 'lossless' = 'standard'
  ): Promise<RenderJobData> {
    const renderJobInsert = {
      user_id: userId,
      project_id: projectId,
      format,
      quality,
      status: 'queued' as const,
      progress: 0,
      processing_logs: [],
      render_config: {
        sampleRate: quality === 'lossless' || quality === 'high' ? 48000 : 44100,
        bitDepth: quality === 'lossless' || quality === 'high' ? 24 : 16,
        bitrate: format === 'mp3' ? (quality === 'draft' ? 128 : 320) : undefined,
        normalize: quality !== 'draft',
        fadeIn: 0,
        fadeOut: 0
      }
    };

    const { data, error } = await supabase
      .from('render_jobs')
      .insert(renderJobInsert)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create render job: ${error.message}`);
    }

    return this.mapRenderJobFromDb(data);
  }

  /**
   * Get render job by ID
   */
  async getRenderJob(jobId: string, userId: string): Promise<RenderJobData | null> {
    const { data, error } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return this.mapRenderJobFromDb(data);
  }

  /**
   * Get user's render jobs
   */
  async getUserRenderJobs(userId: string): Promise<RenderJobData[]> {
    const { data, error } = await supabase
      .from('render_jobs')
      .select(`
        *,
        project:projects(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch render jobs: ${error.message}`);
    }

    return data.map(this.mapRenderJobFromDb);
  }

  /**
   * Start render job processing
   */
  async startRenderJob(jobId: string, userId: string): Promise<void> {
    // Get job details
    const job = await this.getRenderJob(jobId, userId);
    if (!job) {
      throw new Error('Render job not found');
    }

    // Trigger render function
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-audio`;
    
    const headers = {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobId: job.id,
          projectId: job.projectId,
          userId: job.userId,
          format: job.format,
          quality: job.quality
        })
      });

      if (!response.ok) {
        throw new Error(`Render request failed: ${response.statusText}`);
      }
    } catch (error) {
      // Update job status to failed
      await supabase
        .from('render_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Failed to start render',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
        
      throw error;
    }
  }

  /**
   * Subscribe to render job updates
   */
  subscribeToRenderJob(jobId: string, callback: (job: RenderJobData) => void) {
    return supabase
      .channel(`render-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'render_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          callback(this.mapRenderJobFromDb(payload.new));
        }
      )
      .subscribe();
  }

  /**
   * Get user credits
   */
  async getUserCredits(userId: string): Promise<UserCredits | null> {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Initialize credits if they don't exist
      if (error.code === 'PGRST116') {
        const { data: userData } = await supabase
          .from('users')
          .select('plan')
          .eq('id', userId)
          .single();

        if (userData) {
          await this.initializeUserCredits(userId, userData.plan);
          return this.getUserCredits(userId);
        }
      }
      return null;
    }

    return {
      userId: data.user_id,
      creditsRemaining: data.credits_remaining,
      creditsUsedThisMonth: data.credits_used_this_month,
      lastResetDate: data.last_reset_date,
      totalCreditsPurchased: data.total_credits_purchased,
      totalCreditsEarned: data.total_credits_earned,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Initialize user credits based on plan
   */
  async initializeUserCredits(userId: string, plan: string): Promise<void> {
    const { error } = await supabase.rpc('initialize_user_credits', {
      user_id_param: userId,
      plan_param: plan
    });

    if (error) {
      throw new Error(`Failed to initialize credits: ${error.message}`);
    }
  }

  /**
   * Check if user has enough credits for render
   */
  async checkCreditsForRender(userId: string, creditsNeeded: number = 1): Promise<{
    hasCredits: boolean;
    creditsRemaining: number;
    plan: string;
  }> {
    const { data, error } = await supabase
      .from('user_credits')
      .select(`
        credits_remaining,
        user:users(plan)
      `)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { hasCredits: false, creditsRemaining: 0, plan: 'free' };
    }

    return {
      hasCredits: data.credits_remaining >= creditsNeeded,
      creditsRemaining: data.credits_remaining,
      plan: (data.user as any)?.plan || 'free'
    };
  }

  /**
   * Consume credits for render job
   */
  async consumeCreditsForRender(userId: string, renderJobId: string, creditsNeeded: number = 1): Promise<boolean> {
    const { data, error } = await supabase.rpc('consume_credits_for_render', {
      user_id_param: userId,
      render_job_id_param: renderJobId,
      credits_needed: creditsNeeded
    });

    if (error) {
      throw new Error(`Failed to consume credits: ${error.message}`);
    }

    return data;
  }

  /**
   * Refund credits for failed render
   */
  async refundCreditsForFailedRender(userId: string, renderJobId: string): Promise<void> {
    const { error } = await supabase.rpc('refund_credits_for_failed_render', {
      user_id_param: userId,
      render_job_id_param: renderJobId
    });

    if (error) {
      console.error('Failed to refund credits:', error);
    }
  }

  /**
   * Get user's credit transactions
   */
  async getCreditTransactions(userId: string, limit: number = 50): Promise<CreditTransaction[]> {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch credit transactions: ${error.message}`);
    }

    return data.map(transaction => ({
      id: transaction.id,
      userId: transaction.user_id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      renderJobId: transaction.render_job_id,
      metadata: transaction.metadata,
      createdAt: transaction.created_at
    }));
  }

  /**
   * Subscribe to credit updates
   */
  subscribeToCredits(userId: string, callback: (credits: UserCredits) => void) {
    return supabase
      .channel(`user-credits-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const data = payload.new;
          callback({
            userId: data.user_id,
            creditsRemaining: data.credits_remaining,
            creditsUsedThisMonth: data.credits_used_this_month,
            lastResetDate: data.last_reset_date,
            totalCreditsPurchased: data.total_credits_purchased,
            totalCreditsEarned: data.total_credits_earned,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          });
        }
      )
      .subscribe();
  }

  /**
   * Map database template to application format
   */
  private mapTemplateFromDb(dbTemplate: TemplateRow): TemplateData {
    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      category: dbTemplate.category,
      thumbnailUrl: dbTemplate.thumbnail_url,
      duration: dbTemplate.duration,
      difficulty: dbTemplate.difficulty as 'beginner' | 'intermediate' | 'advanced',
      isPopular: dbTemplate.is_popular || false,
      isPremium: dbTemplate.is_premium || false,
      author: dbTemplate.author,
      downloads: dbTemplate.downloads || 0,
      rating: Number(dbTemplate.rating) || 0,
      templateData: dbTemplate.template_data || {}
    };
  }

  /**
   * Map database project to application format
   */
  private mapProjectFromDb(dbProject: any): ProjectData {
    return {
      id: dbProject.id,
      name: dbProject.name,
      description: dbProject.description,
      status: dbProject.status,
      duration: dbProject.duration || 0,
      bpm: dbProject.bpm || 120,
      trackAUploadId: dbProject.track1_upload_id,
      trackBUploadId: dbProject.track2_upload_id,
      trackAName: dbProject.track1_name,
      trackBName: dbProject.track2_name,
      trackAUrl: dbProject.track1_url,
      trackBUrl: dbProject.track2_url,
      templatePlacements: (dbProject.template_placements || []).map(this.mapTemplatePlacementFromDb),
      createdAt: dbProject.created_at,
      updatedAt: dbProject.updated_at,
      thumbnail: dbProject.thumbnail_url
    };
  }

  /**
   * Map database template placement to application format
   */
  private mapTemplatePlacementFromDb(dbPlacement: any): TemplatePlacementData {
    return {
      id: dbPlacement.id,
      templateId: dbPlacement.template_id,
      startTime: dbPlacement.start_time,
      trackARegion: {
        start: dbPlacement.track_a_start,
        end: dbPlacement.track_a_end
      },
      trackBRegion: {
        start: dbPlacement.track_b_start,
        end: dbPlacement.track_b_end
      },
      parameterOverrides: dbPlacement.parameter_overrides || {}
    };
  }

  /**
   * Map database render job to application format
   */
  private mapRenderJobFromDb(dbJob: any): RenderJobData {
    return {
      id: dbJob.id,
      userId: dbJob.user_id,
      projectId: dbJob.project_id,
      status: dbJob.status,
      progress: dbJob.progress || 0,
      format: dbJob.format,
      quality: dbJob.quality,
      outputUrl: dbJob.output_url,
      losslessUrl: dbJob.lossless_url,
      errorMessage: dbJob.error_message,
      processingLogs: dbJob.processing_logs || [],
      renderConfig: dbJob.render_config || {},
      startedAt: dbJob.started_at,
      completedAt: dbJob.completed_at,
      createdAt: dbJob.created_at,
      updatedAt: dbJob.updated_at
    };
  }
}

export const databaseService = new DatabaseService();