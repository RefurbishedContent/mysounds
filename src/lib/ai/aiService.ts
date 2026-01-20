import { supabase } from '../supabase';
import { databaseService, TemplateData } from '../database';
import { templateMatcher, AudioAnalysisData, TemplateMatchScore } from './templateMatcher';

export interface AIAnalysisJob {
  id: string;
  userId: string;
  uploadIdA?: string;
  uploadIdB?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  analysisType: 'single_track' | 'track_pair' | 'template_match';
  results: any;
  errorMessage?: string;
  creditsConsumed: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateRecommendation {
  id: string;
  templateId: string;
  compatibilityScore: number;
  bpmScore: number;
  keyScore: number;
  genreScore: number;
  energyScore: number;
  reasoning: any;
  template?: TemplateData;
}

export const AI_CREDITS_COST = {
  SINGLE_TRACK_ANALYSIS: 1,
  TRACK_PAIR_ANALYSIS: 2,
  TEMPLATE_RECOMMENDATION: 1,
  SKIP_TRANSITION: 1,
};

class AIService {
  async checkCreditsAvailable(userId: string, creditsNeeded: number): Promise<boolean> {
    const credits = await databaseService.getUserCredits(userId);
    if (!credits) return false;
    return credits.creditsRemaining >= creditsNeeded;
  }

  async createAnalysisJob(
    userId: string,
    uploadIdA: string,
    uploadIdB: string,
    analysisType: 'track_pair' | 'template_match' = 'template_match'
  ): Promise<AIAnalysisJob | null> {
    const creditsNeeded = analysisType === 'template_match'
      ? AI_CREDITS_COST.TEMPLATE_RECOMMENDATION
      : AI_CREDITS_COST.TRACK_PAIR_ANALYSIS;

    const hasCredits = await this.checkCreditsAvailable(userId, creditsNeeded);
    if (!hasCredits) {
      throw new Error('Insufficient credits for AI analysis');
    }

    const { data, error } = await supabase
      .from('ai_analysis_jobs')
      .insert({
        user_id: userId,
        upload_id_a: uploadIdA,
        upload_id_b: uploadIdB,
        analysis_type: analysisType,
        status: 'pending',
        progress: 0,
        credits_consumed: creditsNeeded,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create analysis job:', error);
      return null;
    }

    return this.mapAnalysisJobFromDb(data);
  }

  async runTemplateMatchAnalysis(
    userId: string,
    uploadIdA: string,
    uploadIdB: string
  ): Promise<TemplateRecommendation[]> {
    const job = await this.createAnalysisJob(userId, uploadIdA, uploadIdB, 'template_match');
    if (!job) {
      throw new Error('Failed to create analysis job');
    }

    try {
      await this.updateJobStatus(job.id, 'processing', 10);

      const [uploadA, uploadB, templates] = await Promise.all([
        supabase.from('uploads').select('*').eq('id', uploadIdA).single(),
        supabase.from('uploads').select('*').eq('id', uploadIdB).single(),
        databaseService.getTemplates(),
      ]);

      if (uploadA.error || uploadB.error) {
        throw new Error('Failed to fetch upload data');
      }

      await this.updateJobStatus(job.id, 'processing', 30);

      const analysisA: AudioAnalysisData = uploadA.data.analysis || {};
      const analysisB: AudioAnalysisData = uploadB.data.analysis || {};

      if (!analysisA.bpm && !analysisB.bpm) {
        throw new Error('Tracks must be analyzed before AI matching. Please analyze your tracks first.');
      }

      await this.updateJobStatus(job.id, 'processing', 50);

      const matches = templateMatcher.matchTemplates(analysisA, analysisB, templates);

      await this.updateJobStatus(job.id, 'processing', 70);

      const topMatches = templateMatcher.getTopMatches(matches, 5);

      const recommendations: TemplateRecommendation[] = [];

      for (const match of topMatches) {
        const { data: recommendation, error } = await supabase
          .from('template_recommendations')
          .insert({
            user_id: userId,
            template_id: match.templateId,
            upload_id_a: uploadIdA,
            upload_id_b: uploadIdB,
            compatibility_score: match.overallScore,
            bpm_score: match.bpmScore,
            key_score: match.keyScore,
            genre_score: match.genreScore,
            energy_score: match.energyScore,
            reasoning: match.reasoning,
          })
          .select()
          .single();

        if (!error && recommendation) {
          recommendations.push({
            id: recommendation.id,
            templateId: recommendation.template_id,
            compatibilityScore: recommendation.compatibility_score,
            bpmScore: recommendation.bpm_score,
            keyScore: recommendation.key_score,
            genreScore: recommendation.genre_score,
            energyScore: recommendation.energy_score,
            reasoning: recommendation.reasoning,
            template: match.template,
          });
        }
      }

      await this.updateJobStatus(job.id, 'processing', 90);

      const consumeSuccess = await this.consumeCredits(userId, job.id, job.creditsConsumed);
      if (!consumeSuccess) {
        throw new Error('Failed to consume credits');
      }

      await this.completeJob(job.id, { recommendations: topMatches });

      return recommendations;
    } catch (error) {
      await this.failJob(job.id, error instanceof Error ? error.message : 'Analysis failed');
      await this.refundCredits(userId, job.id, job.creditsConsumed);
      throw error;
    }
  }

  async getRecommendations(
    userId: string,
    uploadIdA: string,
    uploadIdB: string
  ): Promise<TemplateRecommendation[]> {
    const { data, error } = await supabase
      .from('template_recommendations')
      .select(`
        *,
        template:templates(*)
      `)
      .eq('user_id', userId)
      .eq('upload_id_a', uploadIdA)
      .eq('upload_id_b', uploadIdB)
      .gt('expires_at', new Date().toISOString())
      .order('compatibility_score', { ascending: false });

    if (error) {
      console.error('Failed to fetch recommendations:', error);
      return [];
    }

    return data.map(rec => ({
      id: rec.id,
      templateId: rec.template_id,
      compatibilityScore: rec.compatibility_score,
      bpmScore: rec.bpm_score,
      keyScore: rec.key_score,
      genreScore: rec.genre_score,
      energyScore: rec.energy_score,
      reasoning: rec.reasoning,
      template: rec.template ? {
        id: rec.template.id,
        name: rec.template.name,
        description: rec.template.description,
        category: rec.template.category,
        thumbnailUrl: rec.template.thumbnail_url,
        duration: rec.template.duration,
        difficulty: rec.template.difficulty,
        isPopular: rec.template.is_popular,
        isPremium: rec.template.is_premium,
        author: rec.template.author,
        downloads: rec.template.downloads,
        rating: rec.template.rating,
        templateData: rec.template.template_data,
      } : undefined,
    }));
  }

  async acceptRecommendation(recommendationId: string, userId: string): Promise<void> {
    await supabase
      .from('template_recommendations')
      .update({ user_accepted: true })
      .eq('id', recommendationId)
      .eq('user_id', userId);
  }

  async provideFeedback(recommendationId: string, userId: string, feedback: string): Promise<void> {
    await supabase
      .from('template_recommendations')
      .update({ user_feedback: feedback })
      .eq('id', recommendationId)
      .eq('user_id', userId);
  }

  async getAnalysisJob(jobId: string, userId: string): Promise<AIAnalysisJob | null> {
    const { data, error } = await supabase
      .from('ai_analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return this.mapAnalysisJobFromDb(data);
  }

  subscribeToAnalysisJob(jobId: string, callback: (job: AIAnalysisJob) => void) {
    return supabase
      .channel(`ai-analysis-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_analysis_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          callback(this.mapAnalysisJobFromDb(payload.new));
        }
      )
      .subscribe();
  }

  private async updateJobStatus(jobId: string, status: string, progress: number): Promise<void> {
    await supabase
      .from('ai_analysis_jobs')
      .update({
        status,
        progress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  private async completeJob(jobId: string, results: any): Promise<void> {
    await supabase
      .from('ai_analysis_jobs')
      .update({
        status: 'completed',
        progress: 100,
        results,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  private async failJob(jobId: string, errorMessage: string): Promise<void> {
    await supabase
      .from('ai_analysis_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  private async consumeCredits(userId: string, jobId: string, credits: number): Promise<boolean> {
    const { data, error } = await supabase.rpc('consume_credits_for_ai_analysis', {
      p_user_id: userId,
      p_analysis_job_id: jobId,
      p_credits_to_consume: credits,
    });

    if (error) {
      console.error('Failed to consume credits:', error);
      return false;
    }

    return data === true;
  }

  private async refundCredits(userId: string, jobId: string, credits: number): Promise<void> {
    try {
      await supabase.rpc('refund_credits_for_failed_ai_analysis', {
        p_user_id: userId,
        p_analysis_job_id: jobId,
        p_credits_to_refund: credits,
      });
    } catch (error) {
      console.error('Failed to refund credits:', error);
    }
  }

  private mapAnalysisJobFromDb(data: any): AIAnalysisJob {
    return {
      id: data.id,
      userId: data.user_id,
      uploadIdA: data.upload_id_a,
      uploadIdB: data.upload_id_b,
      status: data.status,
      progress: data.progress,
      analysisType: data.analysis_type,
      results: data.results,
      errorMessage: data.error_message,
      creditsConsumed: data.credits_consumed,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const aiService = new AIService();
