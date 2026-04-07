import { supabase } from './supabase';
import { config } from './config';
import { activityLogger } from './analytics';
import type { Track, TrackAnalysis, TrackUploadOptions } from '../types/track';

export type { Track, TrackAnalysis };

export interface UploadResult {
  id: string;
  url: string;
  path: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  analysis?: TrackAnalysis;
  manualGenre?: string;
  genreConfidence?: number;
  lastAnalyzedAt?: string;
  metadata: {
    filename: string;
    size: number;
    mimeType: string;
    duration?: number;
    analysis?: TrackAnalysis;
    artist?: string;
    title?: string;
    album?: string;
  };
}

export interface AudioAnalysis extends TrackAnalysis {}

export function trackToUploadResult(track: Track): UploadResult {
  return {
    id: track.id,
    url: track.url,
    path: track.storagePath,
    originalName: track.originalName,
    mimeType: track.mimeType,
    size: track.size,
    status:
      track.status === 'failed' ? 'error'
      : track.status === 'pending' ? 'processing'
      : (track.status as UploadResult['status']),
    analysis: track.analysis,
    manualGenre: track.manualGenre,
    genreConfidence: track.genreConfidence,
    lastAnalyzedAt: track.lastAnalyzedAt,
    metadata: {
      filename: track.originalName,
      size: track.size,
      mimeType: track.mimeType,
      duration: track.durationMs ? track.durationMs / 1000 : undefined,
      analysis: track.analysis,
      artist: track.artist,
      title: track.title,
      album: track.album,
    },
  };
}

class StorageService {
  private readonly BUCKET = config.storage.audioBucket;
  private readonly MAX_SIZE = config.storage.maxFileSizeBytes;
  private readonly ALLOWED_TYPES = config.storage.allowedMimeTypes;

  async uploadTrack(
    file: File,
    userId: string,
    options: TrackUploadOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<Track> {
    this.validateFile(file);

    const trackId = crypto.randomUUID();
    const ext = file.name.split('.').pop() ?? 'audio';
    const storagePath = `tracks/${userId}/${trackId}/original.${ext}`;

    onProgress?.(5);

    const { error: uploadError } = await supabase.storage
      .from(this.BUCKET)
      .upload(storagePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error(
          `Storage bucket '${this.BUCKET}' not found. Please create it in Supabase Storage.`
        );
      }
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    onProgress?.(40);

    const { data: urlData } = supabase.storage
      .from(this.BUCKET)
      .getPublicUrl(storagePath);

    const analysis = await this.extractClientDuration(file);

    onProgress?.(60);

    const { data: record, error: dbError } = await supabase
      .from('tracks')
      .insert({
        id: trackId,
        user_id: userId,
        title: options.title ?? stripExtension(file.name),
        artist: options.artist ?? '',
        album: options.album ?? '',
        original_name: file.name,
        filename: storagePath,
        storage_path: storagePath,
        mime_type: file.type,
        size: file.size,
        url: urlData.publicUrl,
        status: 'processing',
        duration_ms: analysis.durationMs,
        metadata: options.year ? { year: options.year } : {},
      })
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from(this.BUCKET).remove([storagePath]);
      throw new Error(`Database error: ${dbError.message}`);
    }

    this.triggerAnalysis(record.id, urlData.publicUrl);

    await activityLogger.logUpload('started', record.id, userId, {
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    });

    onProgress?.(80);

    return this.mapRow(record);
  }

  async getTrack(trackId: string): Promise<Track | null> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRow(data);
  }

  async getUserTracks(userId: string): Promise<Track[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch tracks: ${error.message}`);
    return (data ?? []).map(this.mapRow);
  }

  async updateTrackMetadata(
    trackId: string,
    userId: string,
    fields: Partial<Pick<Track, 'title' | 'artist' | 'album' | 'manualGenre'>>
  ): Promise<void> {
    const update: Record<string, unknown> = {};
    if (fields.title !== undefined) update.title = fields.title;
    if (fields.artist !== undefined) update.artist = fields.artist;
    if (fields.album !== undefined) update.album = fields.album;
    if (fields.manualGenre !== undefined) update.manual_genre = fields.manualGenre;
    update.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('tracks')
      .update(update)
      .eq('id', trackId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to update track: ${error.message}`);
  }

  async deleteTrackAndAllAssets(trackId: string, userId: string): Promise<void> {
    const { data: track, error: fetchError } = await supabase
      .from('tracks')
      .select('storage_path, user_id')
      .eq('id', trackId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError || !track) throw new Error('Track not found');

    const directory = `tracks/${userId}/${trackId}`;
    const { data: files } = await supabase.storage
      .from(this.BUCKET)
      .list(directory);

    if (files && files.length > 0) {
      const paths = files.map((f) => `${directory}/${f.name}`);
      await supabase.storage.from(this.BUCKET).remove(paths);
    }

    const { error: dbError } = await supabase
      .from('tracks')
      .delete()
      .eq('id', trackId)
      .eq('user_id', userId);

    if (dbError) throw new Error(`Failed to delete track record: ${dbError.message}`);
  }

  subscribeToTrackUpdates(
    trackId: string,
    callback: (status: string, analysis?: TrackAnalysis) => void
  ) {
    return supabase
      .channel(`track-${trackId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tracks', filter: `id=eq.${trackId}` },
        (payload) => callback(payload.new.status, payload.new.analysis)
      )
      .subscribe();
  }

  async refreshUrl(trackId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('tracks')
      .select('storage_path')
      .eq('id', trackId)
      .maybeSingle();

    if (error || !data) return null;

    const { data: urlData } = await supabase.storage
      .from(this.BUCKET)
      .createSignedUrl(data.storage_path, 3600);

    return urlData?.signedUrl ?? null;
  }

  private async triggerAnalysis(trackId: string, audioUrl: string): Promise<void> {
    try {
      const requestId = crypto.randomUUID();
      await fetch(`${config.functions.baseUrl}/analyze-audio`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.supabase.anonKey}`,
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({ trackId, audioUrl }),
      });
    } catch {
      // fire and forget — analysis failure does not block the upload
    }
  }

  private async extractClientDuration(file: File): Promise<{ durationMs: number }> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      const cleanup = () => URL.revokeObjectURL(url);
      const done = (ms: number) => { cleanup(); resolve({ durationMs: ms }); };

      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', () => {
        if (isFinite(audio.duration) && audio.duration > 0) {
          done(Math.round(audio.duration * 1000));
        }
      });
      audio.addEventListener('durationchange', () => {
        if (isFinite(audio.duration) && audio.duration > 0) {
          done(Math.round(audio.duration * 1000));
        }
      });
      audio.addEventListener('error', () => done(0));
      setTimeout(() => {
        if (isFinite(audio.duration) && audio.duration > 0) {
          done(Math.round(audio.duration * 1000));
        } else {
          done(0);
        }
      }, 5000);
      audio.src = url;
    });
  }

  validateFile(file: File): void {
    if (!this.ALLOWED_TYPES.includes(file.type as typeof this.ALLOWED_TYPES[number])) {
      throw new Error(
        `Unsupported file type: ${file.type}. Supported types: MP3, WAV, FLAC, AAC, M4A, OGG, AIFF.`
      );
    }
    if (file.size > this.MAX_SIZE) {
      throw new Error(
        `File too large: ${Math.round(file.size / 1024 / 1024)}MB (max: 200MB)`
      );
    }
    if (file.size === 0) throw new Error('File is empty');
  }

  async uploadAudioFile(
    file: File,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    const track = await this.uploadTrack(file, userId, {}, onProgress);
    return trackToUploadResult(track);
  }

  async getUpload(uploadId: string): Promise<UploadResult | null> {
    const track = await this.getTrack(uploadId);
    return track ? trackToUploadResult(track) : null;
  }

  async getUserUploads(userId: string): Promise<UploadResult[]> {
    const tracks = await this.getUserTracks(userId);
    return tracks.map(trackToUploadResult);
  }

  async listUserUploads(userId: string): Promise<UploadResult[]> {
    return this.getUserUploads(userId);
  }

  async deleteUpload(uploadId: string, userId: string): Promise<void> {
    return this.deleteTrackAndAllAssets(uploadId, userId);
  }

  subscribeToAnalysisUpdates(
    trackId: string,
    callback: (status: string, analysis?: TrackAnalysis) => void
  ) {
    return this.subscribeToTrackUpdates(trackId, callback);
  }

  private mapRow(row: Record<string, unknown>): Track {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      title: (row.title as string) ?? '',
      artist: (row.artist as string) ?? '',
      album: (row.album as string) ?? '',
      originalName: row.original_name as string,
      filename: row.filename as string,
      storagePath: (row.storage_path as string) ?? '',
      mimeType: (row.mime_type as string) ?? 'audio/mpeg',
      size: row.size as number,
      url: row.url as string,
      status: (row.status as Track['status']) ?? 'ready',
      durationMs: (row.duration_ms as number) ?? 0,
      sampleRate: (row.sample_rate as number) ?? 44100,
      bitDepth: (row.bit_depth as number) ?? 16,
      channels: (row.channels as number) ?? 2,
      analysis: row.analysis as TrackAnalysis | undefined,
      manualGenre: row.manual_genre as string | undefined,
      genreConfidence: row.genre_confidence as number | undefined,
      metadata: row.metadata as Track['metadata'],
      lastAnalyzedAt: row.last_analyzed_at as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

export const storageService = new StorageService();
