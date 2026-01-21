import { supabase } from './supabase';

export interface TransitionData {
  id: string;
  userId: string;
  name: string;
  songAId: string;
  songBId: string;
  templateId: string | null;
  transitionStartPoint: number;
  transitionDuration: number;
  songAEndTime: number;
  songBStartTime: number;
  songAMarkerPoint?: number;
  songBMarkerPoint?: number;
  songAClipStart?: number;
  songBClipEnd?: number;
  status: 'draft' | 'ready' | 'processing' | 'error';
  renderJobId?: string;
  outputUrl?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransitionInput {
  name?: string;
  songAId: string;
  songBId: string;
  templateId: string | null;
  transitionStartPoint: number;
  transitionDuration: number;
  songAEndTime: number;
  songBStartTime?: number;
  songAMarkerPoint?: number;
  songBMarkerPoint?: number;
  songAClipStart?: number;
  songBClipEnd?: number;
  metadata?: any;
}

export interface UpdateTransitionInput {
  name?: string;
  templateId?: string | null;
  transitionStartPoint?: number;
  transitionDuration?: number;
  songAEndTime?: number;
  songBStartTime?: number;
  songAMarkerPoint?: number;
  songBMarkerPoint?: number;
  songAClipStart?: number;
  songBClipEnd?: number;
  status?: 'draft' | 'ready' | 'processing' | 'error';
  renderJobId?: string;
  outputUrl?: string;
  metadata?: any;
}

class TransitionsService {
  async createTransition(userId: string, input: CreateTransitionInput): Promise<TransitionData> {
    const insertData: any = {
      user_id: userId,
      name: input.name || 'Untitled Transition',
      song_a_id: input.songAId,
      song_b_id: input.songBId,
      template_id: input.templateId,
      transition_start_point: input.transitionStartPoint,
      transition_duration: input.transitionDuration,
      song_a_end_time: input.songAEndTime,
      song_b_start_time: input.songBStartTime || 0,
      metadata: input.metadata || {},
      status: 'draft'
    };

    if (input.songAMarkerPoint !== undefined) insertData.song_a_marker_point = input.songAMarkerPoint;
    if (input.songBMarkerPoint !== undefined) insertData.song_b_marker_point = input.songBMarkerPoint;
    if (input.songAClipStart !== undefined) insertData.song_a_clip_start = input.songAClipStart;
    if (input.songBClipEnd !== undefined) insertData.song_b_clip_end = input.songBClipEnd;

    const { data, error } = await supabase
      .from('transitions')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return this.mapRowToTransition(data);
  }

  async getTransition(transitionId: string): Promise<TransitionData> {
    const { data, error } = await supabase
      .from('transitions')
      .select()
      .eq('id', transitionId)
      .single();

    if (error) throw error;
    return this.mapRowToTransition(data);
  }

  async getUserTransitions(userId: string): Promise<TransitionData[]> {
    const { data, error } = await supabase
      .from('transitions')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(row => this.mapRowToTransition(row));
  }

  async updateTransition(transitionId: string, updates: UpdateTransitionInput): Promise<TransitionData> {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.templateId !== undefined) updateData.template_id = updates.templateId;
    if (updates.transitionStartPoint !== undefined) updateData.transition_start_point = updates.transitionStartPoint;
    if (updates.transitionDuration !== undefined) updateData.transition_duration = updates.transitionDuration;
    if (updates.songAEndTime !== undefined) updateData.song_a_end_time = updates.songAEndTime;
    if (updates.songBStartTime !== undefined) updateData.song_b_start_time = updates.songBStartTime;
    if (updates.songAMarkerPoint !== undefined) updateData.song_a_marker_point = updates.songAMarkerPoint;
    if (updates.songBMarkerPoint !== undefined) updateData.song_b_marker_point = updates.songBMarkerPoint;
    if (updates.songAClipStart !== undefined) updateData.song_a_clip_start = updates.songAClipStart;
    if (updates.songBClipEnd !== undefined) updateData.song_b_clip_end = updates.songBClipEnd;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.renderJobId !== undefined) updateData.render_job_id = updates.renderJobId;
    if (updates.outputUrl !== undefined) updateData.output_url = updates.outputUrl;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    const { data, error } = await supabase
      .from('transitions')
      .update(updateData)
      .eq('id', transitionId)
      .select()
      .single();

    if (error) throw error;
    return this.mapRowToTransition(data);
  }

  async deleteTransition(transitionId: string): Promise<void> {
    const { error } = await supabase
      .from('transitions')
      .delete()
      .eq('id', transitionId);

    if (error) throw error;
  }

  async getTransitionWithDetails(transitionId: string): Promise<TransitionData & {
    songA?: any;
    songB?: any;
    template?: any;
  }> {
    const { data, error } = await supabase
      .from('transitions')
      .select(`
        *,
        song_a:uploads!transitions_song_a_id_fkey(*),
        song_b:uploads!transitions_song_b_id_fkey(*),
        template:templates(*)
      `)
      .eq('id', transitionId)
      .single();

    if (error) throw error;

    const transition = this.mapRowToTransition(data);
    return {
      ...transition,
      songA: data.song_a,
      songB: data.song_b,
      template: data.template
    };
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
}

export const transitionsService = new TransitionsService();
