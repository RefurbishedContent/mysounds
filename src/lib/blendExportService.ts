import { supabase } from './supabase';
import { storageService, UploadResult } from './storage';
import { TransitionData } from './transitionsService';
import { reconstructRenderSpec, RenderSpec } from './renderSpec';

export type BlendAccessMode = 'playable' | 'demo_unavailable' | 'source_revoked';

export interface BlendAccess {
  mode: BlendAccessMode;
  url?: string;
  expiresAt?: string;
  filename?: string;
  size?: number;
  contentType?: string;
  message?: string;
}

export class BlendAccessError extends Error {
  readonly code: string;
  readonly transient: boolean;
  constructor(code: string, message: string, transient = true) {
    super(message);
    this.code = code;
    this.transient = transient;
  }
}

export interface BlendData {
  id: string;
  userId: string;
  transitionId: string;
  name: string;
  songAId: string;
  songBId: string;
  /**
   * Raw value stored in the `blends.url` column. This is either an empty
   * string, the legacy `demo-no-audio` sentinel, or a stale historical URL.
   * Never render it directly for playback — always resolve access through
   * `blendExportService.getPlaybackAccess(blendId)`.
   */
  url: string;
  /** Durable storage path in the `blends` bucket. */
  filename: string;
  storagePath: string;
  isDemo: boolean;
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
  // Opt-in real backend path used by the mash-up wizard. Legacy callers
  // (BlendExportDialog, blender/BlenderProcessingScreen) omit these and keep
  // the existing simulated flow.
  useRenderBlend?: boolean;
  renderRequestId?: string;
}

export interface ExportProgress {
  stage: string;
  progress: number;
  message: string;
}

// Documented stage milestones for the real render pipeline. Percentages are
// stage checkpoints, not time estimates. 100 is only emitted after the blend
// row is confirmed completed with a filename.
const STAGE_PROGRESS: Record<string, { pct: number; message: string }> = {
  queued: { pct: 5, message: 'Queued for rendering...' },
  claimed: { pct: 10, message: 'Worker picked up the job...' },
  downloading: { pct: 20, message: 'Downloading source audio...' },
  validating: { pct: 35, message: 'Validating audio...' },
  rendering: { pct: 55, message: 'Rendering mash up...' },
  uploading: { pct: 85, message: 'Uploading final file...' },
  verifying: { pct: 95, message: 'Verifying result...' },
  completed: { pct: 100, message: 'Mash up ready!' },
};

const POLL_INTERVAL_MS = 2000;
const MAX_TRANSIENT_ERRORS = 6;
const RENDER_TIMEOUT_MS = 10 * 60 * 1000;

const ACCESS_REFRESH_MARGIN_MS = 60 * 1000;

class BlendExportService {
  private readonly BUCKET_NAME = 'blends';
  private readonly accessCache = new Map<string, BlendAccess>();

  /**
   * Fetch a fresh authorized playback URL for a blend. Cached in-memory and
   * automatically re-signed when it is within one minute of expiry. Never
   * mutates the blend row. Errors are output-access failures, not render
   * failures — callers must NOT flip the blend into `failed` on them.
   */
  async getPlaybackAccess(blendId: string, options?: { forceRefresh?: boolean }): Promise<BlendAccess> {
    if (!options?.forceRefresh) {
      const cached = this.accessCache.get(blendId);
      if (cached) {
        if (cached.mode !== 'playable') {
          return cached;
        }
        const expiresAtMs = cached.expiresAt ? Date.parse(cached.expiresAt) : 0;
        if (expiresAtMs - Date.now() > ACCESS_REFRESH_MARGIN_MS) {
          return cached;
        }
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      throw new BlendAccessError('auth_expired', 'Your session expired. Please sign in again.', false);
    }

    const { data, error } = await supabase.functions.invoke('get-blend-output', {
      body: { blendId },
    });

    if (error) {
      const ctx = (error as any).context;
      let body: any = null;
      if (ctx && typeof ctx.json === 'function') {
        try { body = await ctx.json(); } catch { body = null; }
      }
      const status = ctx?.status ?? (error as any).status;
      const code = body?.error?.code ?? 'access_failed';
      const message = body?.error?.message ?? error.message ?? 'Could not get playback access.';
      if (status === 401 || code === 'unauthorized') {
        throw new BlendAccessError('auth_expired', 'Your session expired. Please sign in again.', false);
      }
      if (status === 403 || code === 'forbidden') {
        throw new BlendAccessError('forbidden', message, false);
      }
      if (status === 404 || code === 'not_found') {
        throw new BlendAccessError('not_found', message, false);
      }
      // Everything else (network, 5xx, signing) is transient: DO NOT change
      // blend.status on account of it.
      throw new BlendAccessError(code, message, true);
    }

    if (!data || typeof data !== 'object' || typeof (data as any).mode !== 'string') {
      throw new BlendAccessError('access_failed', 'Unexpected response from server.', true);
    }

    const access: BlendAccess = {
      mode: (data as any).mode,
      url: (data as any).url,
      expiresAt: (data as any).expiresAt,
      filename: (data as any).filename,
      size: (data as any).size,
      contentType: (data as any).contentType,
      message: (data as any).message,
    };
    this.accessCache.set(blendId, access);
    return access;
  }

  clearBlendAccess(blendId?: string) {
    if (blendId) this.accessCache.delete(blendId);
    else this.accessCache.clear();
  }

  async createBlend(
    userId: string,
    input: CreateBlendInput,
    onProgress?: (progress: ExportProgress) => void,
    signal?: AbortSignal,
  ): Promise<BlendData> {
    if (input.useRenderBlend) {
      return this.createBlendViaRenderService(userId, input, onProgress, signal);
    }
    try {
      onProgress?.({
        stage: 'initializing',
        progress: 0,
        message: 'Loading transition data...'
      });

      const transition = await this.getTransitionWithDetails(input.transitionId);
      if (!transition) {
        throw new Error(`Transition not found with ID: ${input.transitionId}`);
      }

      console.log('[BlendExport] Transition data loaded:', {
        id: transition.id,
        songAId: transition.songAId,
        songBId: transition.songBId,
        name: transition.name
      });

      if (!transition.songAId || !transition.songBId) {
        throw new Error(`Transition is missing song references. SongA: ${transition.songAId}, SongB: ${transition.songBId}`);
      }

      const songA = await storageService.getUpload(transition.songAId);
      const songB = await storageService.getUpload(transition.songBId);

      if (!songA) {
        throw new Error(`Song A not found with ID: ${transition.songAId}`);
      }

      if (!songB) {
        throw new Error(`Song B not found with ID: ${transition.songBId}`);
      }

      console.log('[BlendExport] Source songs loaded:', {
        songA: songA.originalName,
        songB: songB.originalName
      });

      const renderSpec: RenderSpec | null = reconstructRenderSpec(transition, {
        songA: songA.analysis?.duration ?? songA.metadata?.duration,
        songB: songB.analysis?.duration ?? songB.metadata?.duration,
      });

      if (!renderSpec) {
        throw new Error(
          'This mash-up is missing its selected clip ranges. Re-open it in the wizard and save the Clip Points step before creating.'
        );
      }

      const songAContribution = renderSpec.expectedContribution.songASeconds;
      const songBContribution = renderSpec.expectedContribution.songBSeconds;
      const transitionDuration = renderSpec.overlapSeconds;
      const totalDuration = renderSpec.expectedContribution.outputSeconds;

      const blendName = input.name || `${songA.originalName} → ${songB.originalName}`;
      const filename = `${userId}/${Date.now()}-blend.${input.format || 'wav'}`;

      onProgress?.({
        stage: 'creating-record',
        progress: 20,
        message: 'Creating mash up record...'
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
            fadeOut: input.fadeOut || 0,
            renderSpec,
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

      // Simulated export process for prototype demonstration
      await this.simulateExportProcess(blendRecord.id, onProgress);

      // Fetch and return the updated blend record
      const updatedBlend = await this.getBlend(blendRecord.id);
      return updatedBlend || this.mapRowToBlend(blendRecord);
    } catch (error) {
      console.error('Failed to create blend:', error);
      throw error;
    }
  }

  private async createBlendViaRenderService(
    userId: string,
    input: CreateBlendInput,
    onProgress?: (progress: ExportProgress) => void,
    signal?: AbortSignal,
  ): Promise<BlendData> {
    if (!input.renderRequestId) {
      throw new Error('renderRequestId is required when useRenderBlend is true');
    }

    const throwIfAborted = () => {
      if (signal?.aborted) throw new Error('aborted');
    };

    const emit = (stage: string, override?: Partial<ExportProgress>) => {
      const preset = STAGE_PROGRESS[stage] ?? { pct: 15, message: `Working (${stage})...` };
      onProgress?.({
        stage,
        progress: override?.progress ?? preset.pct,
        message: override?.message ?? preset.message,
      });
    };

    emit('queued');

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const err = new Error('Your session expired. Please sign in again.');
      (err as any).code = 'auth_expired';
      throw err;
    }

    const { data: enqData, error: enqErr } = await supabase.functions.invoke('render-blend', {
      body: {
        transitionId: input.transitionId,
        renderRequestId: input.renderRequestId,
        exportSettings: {
          format: input.format ?? 'wav',
          quality: input.quality === 'draft' ? 'standard' : (input.quality ?? 'standard'),
          sampleRate: input.sampleRate ?? 44100,
          bitDepth: input.bitDepth ?? 16,
          blendName: input.name,
        },
      },
    });

    if (enqErr) {
      const context = (enqErr as any).context;
      let body: any = null;
      if (context && typeof context.json === 'function') {
        try { body = await context.json(); } catch { body = null; }
      }
      const status = context?.status ?? (enqErr as any).status;
      const code = body?.error?.code ?? body?.code ?? 'render_failed';
      const message = body?.error?.message ?? body?.message ?? enqErr.message ?? 'Failed to start render.';
      if (status === 401 || code === 'unauthorized') {
        const err = new Error('Your session expired. Please sign in again.');
        (err as any).code = 'auth_expired';
        throw err;
      }
      if (status === 409 || code === 'conflicting_settings') {
        const err = new Error(message);
        (err as any).code = 'conflicting_settings';
        (err as any).terminal = true;
        throw err;
      }
      if (status === 429 || code === 'active_job_limit' || code === 'submission_limit') {
        const err = new Error(message);
        (err as any).code = code;
        (err as any).terminal = true;
        throw err;
      }
      const err = new Error(message);
      (err as any).code = code;
      throw err;
    }

    const blendId: string | undefined = enqData?.blendId;
    const jobId: string | undefined = enqData?.jobId;
    if (!blendId || !jobId) {
      throw new Error('Render service did not return a blend id.');
    }

    throwIfAborted();
    return this.waitForBlendCompletion({ blendId, jobId, userId, emit, signal });
  }

  private async waitForBlendCompletion(args: {
    blendId: string;
    jobId: string;
    userId: string;
    emit: (stage: string, override?: Partial<ExportProgress>) => void;
    signal?: AbortSignal;
  }): Promise<BlendData> {
    const { blendId, jobId, emit, signal } = args;
    let lastStage = 'queued';
    let transientErrors = 0;
    const startedAt = Date.now();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const cleanup = () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch { /* noop */ }
        channel = null;
      }
    };

    try {
      channel = supabase
        .channel(`blend-progress-${blendId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'blend_render_jobs', filter: `id=eq.${jobId}` },
          () => { /* handled by next poll */ },
        )
        .subscribe();

      while (true) {
        if (signal?.aborted) throw new Error('aborted');
        if (Date.now() - startedAt > RENDER_TIMEOUT_MS) {
          throw new Error('Render timed out. The job may still finish in the background.');
        }

        let job: any = null;
        let blend: any = null;
        try {
          const [jobRes, blendRes] = await Promise.all([
            supabase
              .from('blend_render_jobs')
              .select('status, stage, error_code, error_message')
              .eq('id', jobId)
              .maybeSingle(),
            supabase
              .from('blends')
              .select('*')
              .eq('id', blendId)
              .maybeSingle(),
          ]);
          if (jobRes.error) throw jobRes.error;
          if (blendRes.error) throw blendRes.error;
          job = jobRes.data;
          blend = blendRes.data;
          transientErrors = 0;
        } catch (pollErr) {
          transientErrors += 1;
          if (transientErrors >= MAX_TRANSIENT_ERRORS) {
            const err = new Error('Lost connection to the render service. Please retry.');
            (err as any).code = 'network_error';
            throw err;
          }
          emit(lastStage, {
            progress: STAGE_PROGRESS[lastStage]?.pct ?? 20,
            message: 'Reconnecting...',
          });
          await this.sleep(POLL_INTERVAL_MS);
          continue;
        }

        if (!job) {
          await this.sleep(POLL_INTERVAL_MS);
          continue;
        }

        const stage = (job.stage as string) || job.status || lastStage;
        if (stage !== lastStage && STAGE_PROGRESS[stage]) {
          lastStage = stage;
          emit(stage);
        }

        if (job.status === 'failed') {
          const err = new Error(job.error_message || 'Render failed.');
          (err as any).code = job.error_code || 'render_failed';
          (err as any).terminal = true;
          throw err;
        }

        if (job.status === 'completed' && blend?.status === 'completed' && blend?.filename) {
          emit('completed');
          return this.mapRowToBlend(blend);
        }

        await this.sleep(POLL_INTERVAL_MS);
      }
    } finally {
      cleanup();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getBlendsByIds(ids: string[]): Promise<BlendData[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('blends')
      .select('*')
      .in('id', ids);
    if (error) throw new Error(`Failed to fetch blends: ${error.message}`);
    return (data ?? [])
      .filter((row: any) => row.status === 'completed')
      .map((row: any) => this.mapRowToBlend(row));
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

  async analyzeBlendCompatibility(blendId1: string, blendId2: string): Promise<{
    score: number;
    level: 'excellent' | 'good' | 'fair' | 'poor';
    bpmDifference: number;
    keyCompatible: boolean;
    suggestions: string[];
  }> {
    const blend1 = await this.getBlendWithDetails(blendId1);
    const blend2 = await this.getBlendWithDetails(blendId2);

    if (!blend1 || !blend2) {
      throw new Error('One or both blends not found');
    }

    const bpm1 = blend1.songB?.analysis?.bpm || 0;
    const bpm2 = blend2.songA?.analysis?.bpm || 0;
    const key1 = blend1.songB?.analysis?.key || '';
    const key2 = blend2.songA?.analysis?.key || '';

    const bpmDifference = Math.abs(bpm1 - bpm2);
    const keyCompatible = this.areKeysCompatible(key1, key2);

    let score = 100;
    const suggestions: string[] = [];

    if (bpmDifference > 0 && bpmDifference <= 3) {
      score -= 5;
    } else if (bpmDifference > 3 && bpmDifference <= 5) {
      score -= 10;
      suggestions.push('BPM difference is moderate. Consider tempo adjustment.');
    } else if (bpmDifference > 5 && bpmDifference <= 10) {
      score -= 25;
      suggestions.push('Significant BPM difference. Strong tempo adjustment recommended.');
    } else if (bpmDifference > 10) {
      score -= 40;
      suggestions.push('Large BPM difference may require creative mixing techniques.');
    }

    if (!keyCompatible && key1 && key2) {
      score -= 15;
      suggestions.push('Keys are not harmonically compatible. Consider key shift or EQ adjustment.');
    } else if (keyCompatible) {
      suggestions.push('Keys are harmonically compatible - great match!');
    }

    let level: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) level = 'excellent';
    else if (score >= 70) level = 'good';
    else if (score >= 50) level = 'fair';
    else level = 'poor';

    return {
      score,
      level,
      bpmDifference,
      keyCompatible,
      suggestions
    };
  }

  private areKeysCompatible(key1: string, key2: string): boolean {
    if (!key1 || !key2) return false;

    const compatibleKeys: Record<string, string[]> = {
      'C': ['C', 'Am', 'G', 'F', 'Dm', 'Em'],
      'Am': ['Am', 'C', 'Dm', 'Em', 'G', 'F'],
      'G': ['G', 'Em', 'C', 'D', 'Am', 'Bm'],
      'Em': ['Em', 'G', 'Am', 'Bm', 'C', 'D'],
      'D': ['D', 'Bm', 'G', 'A', 'Em', 'F#m'],
      'Bm': ['Bm', 'D', 'Em', 'F#m', 'G', 'A'],
      'A': ['A', 'F#m', 'D', 'E', 'Bm', 'C#m'],
      'F#m': ['F#m', 'A', 'Bm', 'C#m', 'D', 'E'],
      'E': ['E', 'C#m', 'A', 'B', 'F#m', 'G#m'],
      'C#m': ['C#m', 'E', 'F#m', 'G#m', 'A', 'B'],
      'B': ['B', 'G#m', 'E', 'F#', 'C#m', 'D#m'],
      'G#m': ['G#m', 'B', 'C#m', 'D#m', 'E', 'F#'],
      'F#': ['F#', 'D#m', 'B', 'C#', 'G#m', 'A#m'],
      'D#m': ['D#m', 'F#', 'G#m', 'A#m', 'B', 'C#'],
      'F': ['F', 'Dm', 'C', 'Bb', 'Am', 'Gm'],
      'Dm': ['Dm', 'F', 'Am', 'Gm', 'C', 'Bb'],
      'Bb': ['Bb', 'Gm', 'F', 'Eb', 'Dm', 'Cm'],
      'Gm': ['Gm', 'Bb', 'Dm', 'Cm', 'F', 'Eb'],
      'Eb': ['Eb', 'Cm', 'Bb', 'Ab', 'Gm', 'Fm'],
      'Cm': ['Cm', 'Eb', 'Gm', 'Fm', 'Bb', 'Ab'],
      'Ab': ['Ab', 'Fm', 'Eb', 'Db', 'Cm', 'Bbm'],
      'Fm': ['Fm', 'Ab', 'Cm', 'Bbm', 'Eb', 'Db']
    };

    const compatibles = compatibleKeys[key1] || [];
    return compatibles.includes(key2);
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

  private async getTransitionWithDetails(transitionId: string): Promise<TransitionData | null> {
    const { data, error } = await supabase
      .from('transitions')
      .select('*')
      .eq('id', transitionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch transition: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRowToTransition(data);
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

  private async simulateExportProcess(
    blendId: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    console.log('[BlendExport] Starting simulated export process for prototype demo');

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const stages = [
      { progress: 40, message: 'Extracting audio segments...', delay: 800 },
      { progress: 55, message: 'Applying crossfade transition...', delay: 1000 },
      { progress: 70, message: 'Mixing audio tracks...', delay: 900 },
      { progress: 85, message: 'Normalizing volume levels...', delay: 700 },
      { progress: 95, message: 'Finalizing mash up...', delay: 600 },
    ];

    for (const stage of stages) {
      onProgress?.({
        stage: 'processing',
        progress: stage.progress,
        message: stage.message
      });
      await delay(stage.delay);
    }

    onProgress?.({
      stage: 'completing',
      progress: 100,
      message: 'Mash up created successfully!'
    });

    await delay(500);

    // Mark blend as completed with demo placeholder
    const { error } = await supabase
      .from('blends')
      .update({
        status: 'completed',
        url: 'demo-no-audio',
        file_size: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', blendId);

    if (error) {
      console.error('[BlendExport] Failed to mark blend as completed:', error);
      throw new Error(`Failed to complete blend: ${error.message}`);
    }

    console.log('[BlendExport] Blend marked as completed (demo mode):', blendId);
  }

  private async markBlendAsFailed(blendId: string, errorMessage: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('blends')
        .update({
          status: 'failed',
          export_settings: {
            error: errorMessage,
            failedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', blendId);

      if (error) {
        console.error('[BlendExport] Failed to update blend status:', error);
      } else {
        console.log('[BlendExport] Blend marked as failed:', blendId);
      }
    } catch (err) {
      console.error('[BlendExport] Error marking blend as failed:', err);
    }
  }

  private mapRowToBlend(row: any): BlendData {
    const filename = row.filename ?? '';
    const url = row.url ?? '';
    const fileSize = Number(row.file_size ?? 0);
    const isDemo = url === 'demo-no-audio' && fileSize === 0;
    return {
      id: row.id,
      userId: row.user_id,
      transitionId: row.transition_id,
      name: row.name,
      songAId: row.song_a_id,
      songBId: row.song_b_id,
      url,
      filename,
      storagePath: filename,
      isDemo,
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
