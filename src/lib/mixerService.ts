import { supabase } from './supabase';

export interface MixSession {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  renderedUrl: string | null;
  duration: number;
  fileSize: number;
  autoCrossfadeDuration: number;
  normalizeVolume: boolean;
  masterGain: number;
  totalBlendsCount: number;
  totalDuration: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MixTrack {
  id: string;
  mixSessionId: string;
  blendId: string;
  position: number;
  startTime: number;
  crossfadeType: 'beat-matched' | 'smooth' | 'quick';
  crossfadeDurationOverride: number | null;
  preGain: number;
  postGain: number;
  fadeIn: number;
  fadeOut: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  blend?: any;
}

export interface MixRender {
  id: string;
  mixSessionId: string;
  renderJobId: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progressPercentage: number;
  currentStage: string;
  format: 'mp3' | 'wav' | 'flac';
  quality: 'draft' | 'standard' | 'high' | 'lossless';
  fileSize: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMixSessionInput {
  name: string;
  description?: string;
  autoCrossfadeDuration?: number;
  normalizeVolume?: boolean;
  masterGain?: number;
}

export interface AddBlendToMixInput {
  blendId: string;
  position: number;
  crossfadeType?: 'beat-matched' | 'smooth' | 'quick';
  crossfadeDurationOverride?: number | null;
}

export interface RenderMixInput {
  format?: 'mp3' | 'wav' | 'flac';
  quality?: 'draft' | 'standard' | 'high' | 'lossless';
}

class MixerService {
  async createMixSession(userId: string, input: CreateMixSessionInput): Promise<MixSession> {
    const { data, error } = await supabase
      .from('mix_sessions')
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description || '',
        auto_crossfade_duration: input.autoCrossfadeDuration || 8,
        normalize_volume: input.normalizeVolume ?? true,
        master_gain: input.masterGain || 0,
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create mix session: ${error.message}`);
    }

    return this.mapMixSession(data);
  }

  async getMixSession(sessionId: string): Promise<MixSession | null> {
    const { data, error } = await supabase
      .from('mix_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get mix session: ${error.message}`);
    }

    return data ? this.mapMixSession(data) : null;
  }

  async updateMixSession(sessionId: string, updates: Partial<MixSession>): Promise<MixSession> {
    const dbUpdates: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.autoCrossfadeDuration !== undefined) dbUpdates.auto_crossfade_duration = updates.autoCrossfadeDuration;
    if (updates.normalizeVolume !== undefined) dbUpdates.normalize_volume = updates.normalizeVolume;
    if (updates.masterGain !== undefined) dbUpdates.master_gain = updates.masterGain;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.renderedUrl !== undefined) dbUpdates.rendered_url = updates.renderedUrl;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.fileSize !== undefined) dbUpdates.file_size = updates.fileSize;
    if (updates.totalBlendsCount !== undefined) dbUpdates.total_blends_count = updates.totalBlendsCount;
    if (updates.totalDuration !== undefined) dbUpdates.total_duration = updates.totalDuration;
    if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;

    const { data, error } = await supabase
      .from('mix_sessions')
      .update(dbUpdates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update mix session: ${error.message}`);
    }

    return this.mapMixSession(data);
  }

  async deleteMixSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('mix_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to delete mix session: ${error.message}`);
    }
  }

  async listUserMixes(userId: string): Promise<MixSession[]> {
    const { data, error } = await supabase
      .from('mix_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list user mixes: ${error.message}`);
    }

    return data.map(item => this.mapMixSession(item));
  }

  async addBlendToMix(sessionId: string, input: AddBlendToMixInput): Promise<MixTrack> {
    const { data, error } = await supabase
      .from('mix_tracks')
      .insert({
        mix_session_id: sessionId,
        blend_id: input.blendId,
        position: input.position,
        crossfade_type: input.crossfadeType || 'beat-matched',
        crossfade_duration_override: input.crossfadeDurationOverride || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add blend to mix: ${error.message}`);
    }

    await this.recalculateMixMetadata(sessionId);
    return this.mapMixTrack(data);
  }

  async removeBlendFromMix(sessionId: string, trackId: string): Promise<void> {
    const { error } = await supabase
      .from('mix_tracks')
      .delete()
      .eq('id', trackId)
      .eq('mix_session_id', sessionId);

    if (error) {
      throw new Error(`Failed to remove blend from mix: ${error.message}`);
    }

    await this.recalculateMixMetadata(sessionId);
  }

  async getMixTracks(sessionId: string): Promise<MixTrack[]> {
    const { data, error } = await supabase
      .from('mix_tracks')
      .select(`
        *,
        blend:blends(*)
      `)
      .eq('mix_session_id', sessionId)
      .order('position', { ascending: true });

    if (error) {
      throw new Error(`Failed to get mix tracks: ${error.message}`);
    }

    return data.map(item => this.mapMixTrack(item));
  }

  async reorderMixTracks(sessionId: string, trackOrder: { id: string; position: number }[]): Promise<void> {
    for (const track of trackOrder) {
      const { error } = await supabase
        .from('mix_tracks')
        .update({ position: track.position, updated_at: new Date().toISOString() })
        .eq('id', track.id)
        .eq('mix_session_id', sessionId);

      if (error) {
        throw new Error(`Failed to reorder track ${track.id}: ${error.message}`);
      }
    }

    await this.recalculateStartTimes(sessionId);
  }

  async updateCrossfadeSettings(
    sessionId: string,
    trackId: string,
    settings: {
      crossfadeType?: 'beat-matched' | 'smooth' | 'quick';
      crossfadeDurationOverride?: number | null;
    }
  ): Promise<MixTrack> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (settings.crossfadeType) updates.crossfade_type = settings.crossfadeType;
    if (settings.crossfadeDurationOverride !== undefined) updates.crossfade_duration_override = settings.crossfadeDurationOverride;

    const { data, error } = await supabase
      .from('mix_tracks')
      .update(updates)
      .eq('id', trackId)
      .eq('mix_session_id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update crossfade settings: ${error.message}`);
    }

    await this.recalculateStartTimes(sessionId);
    return this.mapMixTrack(data);
  }

  async renderMix(sessionId: string, input: RenderMixInput = {}): Promise<MixRender> {
    const session = await this.getMixSession(sessionId);
    if (!session) {
      throw new Error('Mix session not found');
    }

    await this.updateMixSession(sessionId, { status: 'rendering' });

    const { data, error } = await supabase
      .from('mix_renders')
      .insert({
        mix_session_id: sessionId,
        format: input.format || 'wav',
        quality: input.quality || 'standard',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create render job: ${error.message}`);
    }

    try {
      const tracks = await this.getMixTracks(sessionId);

      const response = await supabase.functions.invoke('render-mix', {
        body: {
          renderId: data.id,
          sessionId: sessionId,
          tracks: tracks,
          settings: {
            format: input.format || 'wav',
            quality: input.quality || 'standard',
            autoCrossfadeDuration: session.autoCrossfadeDuration,
            normalizeVolume: session.normalizeVolume,
            masterGain: session.masterGain
          }
        }
      });

      if (response.error) {
        throw new Error(`Failed to trigger render: ${response.error.message}`);
      }
    } catch (err) {
      await supabase
        .from('mix_renders')
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error'
        })
        .eq('id', data.id);

      throw err;
    }

    return this.mapMixRender(data);
  }

  async getMixRenderStatus(renderId: string): Promise<MixRender | null> {
    const { data, error } = await supabase
      .from('mix_renders')
      .select('*')
      .eq('id', renderId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get render status: ${error.message}`);
    }

    return data ? this.mapMixRender(data) : null;
  }

  private async recalculateMixMetadata(sessionId: string): Promise<void> {
    const tracks = await this.getMixTracks(sessionId);
    const totalBlendsCount = tracks.length;

    let totalDuration = 0;
    for (const track of tracks) {
      if (track.blend?.duration) {
        totalDuration += track.blend.duration;
      }
    }

    const session = await this.getMixSession(sessionId);
    if (session) {
      const crossfadeReduction = (totalBlendsCount - 1) * session.autoCrossfadeDuration;
      totalDuration = Math.max(0, totalDuration - crossfadeReduction);
    }

    await this.updateMixSession(sessionId, {
      totalBlendsCount,
      totalDuration
    });
  }

  private async recalculateStartTimes(sessionId: string): Promise<void> {
    const session = await this.getMixSession(sessionId);
    if (!session) return;

    const tracks = await this.getMixTracks(sessionId);
    let currentTime = 0;

    for (const track of tracks) {
      await supabase
        .from('mix_tracks')
        .update({ start_time: currentTime })
        .eq('id', track.id);

      if (track.blend?.duration) {
        const crossfadeDuration = track.crossfadeDurationOverride || session.autoCrossfadeDuration;
        currentTime += track.blend.duration - crossfadeDuration;
      }
    }
  }

  private mapMixSession(data: any): MixSession {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      status: data.status,
      renderedUrl: data.rendered_url,
      duration: data.duration,
      fileSize: data.file_size,
      autoCrossfadeDuration: data.auto_crossfade_duration,
      normalizeVolume: data.normalize_volume,
      masterGain: data.master_gain,
      totalBlendsCount: data.total_blends_count,
      totalDuration: data.total_duration,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapMixTrack(data: any): MixTrack {
    return {
      id: data.id,
      mixSessionId: data.mix_session_id,
      blendId: data.blend_id,
      position: data.position,
      startTime: data.start_time,
      crossfadeType: data.crossfade_type,
      crossfadeDurationOverride: data.crossfade_duration_override,
      preGain: data.pre_gain,
      postGain: data.post_gain,
      fadeIn: data.fade_in,
      fadeOut: data.fade_out,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      blend: data.blend
    };
  }

  private mapMixRender(data: any): MixRender {
    return {
      id: data.id,
      mixSessionId: data.mix_session_id,
      renderJobId: data.render_job_id,
      status: data.status,
      progressPercentage: data.progress_percentage,
      currentStage: data.current_stage,
      format: data.format,
      quality: data.quality,
      fileSize: data.file_size,
      errorMessage: data.error_message,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const mixerService = new MixerService();
