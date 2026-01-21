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
        throw new Error('Transition not found');
      }

      const songA = await storageService.getUpload(transition.songAId);
      const songB = await storageService.getUpload(transition.songBId);

      if (!songA || !songB) {
        throw new Error('Source songs not found');
      }

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

  private async getTransitionWithDetails(transitionId: string): Promise<any> {
    const { data, error } = await supabase
      .from('transitions')
      .select('*')
      .eq('id', transitionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch transition: ${error.message}`);
    }

    return data;
  }

  private async triggerServerExport(blendId: string, config: any): Promise<void> {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-blend`;

      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          blendId,
          config
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to trigger export');
      }
    } catch (error) {
      console.error('Failed to trigger server export:', error);
      throw error;
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
