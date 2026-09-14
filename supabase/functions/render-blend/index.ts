// render-blend: enqueue-only entry point for the blend render pipeline.
//
// Source-replacement detection: for each source track we snapshot
// sourceContentHash = sha256(storage_path || '|' || updated_at). The worker
// re-reads the track before starting and refuses to run if the value differs,
// so if an operator swaps the underlying object the job fails fast instead of
// silently rendering a different song.
//
// Never returns audio bytes. Never accepts caller-supplied source URLs.
// Never exposes the service role key.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildRenderSpec, MAX_TRANSITION_BLEND_SECONDS, type RenderMode } from './renderSpec.ts';
import { computeRequestHash, sha256Hex } from './requestHash.ts';
import { corsHeaders, errorResponse, jsonResponse, type ErrorCode } from './errors.ts';

const ENGINE_VERSION = Deno.env.get('RENDER_BLEND_ENGINE_VERSION') ?? 'render-blend-v1';
const MAX_ACTIVE_JOBS = parseInt(Deno.env.get('RENDER_BLEND_MAX_ACTIVE_JOBS') ?? '20', 10);
const MAX_SUBMISSIONS_PER_MIN = parseInt(Deno.env.get('RENDER_BLEND_MAX_SUBMISSIONS_PER_MINUTE') ?? '60', 10);
const TRACKS_BUCKET = Deno.env.get('RENDER_BLEND_TRACKS_BUCKET') ?? 'tracks';
const TEMPLATE_BUCKET = Deno.env.get('RENDER_BLEND_TEMPLATE_BUCKET') ?? 'templates';

const SUPPORTED_RENDER_MODES: RenderMode[] = ['direct_cut', 'smooth_crossfade'];

const ALLOWED_FORMATS = new Set(['wav', 'mp3', 'flac']);
const ALLOWED_QUALITIES = new Set(['standard', 'high', 'lossless']);
const ALLOWED_SAMPLE_RATES = new Set([44100, 48000]);
const ALLOWED_BIT_DEPTHS = new Set([16, 24]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RequestBody {
  transitionId?: unknown;
  renderRequestId?: unknown;
  exportSettings?: unknown;
}

interface NormalizedSettings {
  format: 'wav' | 'mp3' | 'flac';
  quality: 'standard' | 'high' | 'lossless';
  sampleRate: 44100 | 48000;
  bitDepth: 16 | 24;
  blendName: string;
}

function normalizeSettings(raw: unknown): NormalizedSettings | ErrorCode {
  const obj = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const format = typeof obj.format === 'string' ? obj.format.toLowerCase() : 'wav';
  const quality = typeof obj.quality === 'string' ? obj.quality.toLowerCase() : 'standard';
  const sampleRate = typeof obj.sampleRate === 'number' ? obj.sampleRate : 44100;
  const bitDepth = typeof obj.bitDepth === 'number' ? obj.bitDepth : 16;
  const rawName = typeof obj.blendName === 'string' ? obj.blendName.trim() : '';
  if (!ALLOWED_FORMATS.has(format)) return 'invalid_request';
  if (!ALLOWED_QUALITIES.has(quality)) return 'invalid_request';
  if (!ALLOWED_SAMPLE_RATES.has(sampleRate)) return 'invalid_request';
  if (!ALLOWED_BIT_DEPTHS.has(bitDepth)) return 'invalid_request';
  const blendName = rawName.length === 0 ? 'Untitled Blend' : rawName.slice(0, 120);
  return {
    format: format as NormalizedSettings['format'],
    quality: quality as NormalizedSettings['quality'],
    sampleRate: sampleRate as NormalizedSettings['sampleRate'],
    bitDepth: bitDepth as NormalizedSettings['bitDepth'],
    blendName,
  };
}

function log(level: string, requestId: string, message: string, data?: unknown) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    requestId,
    fn: 'render-blend',
    message,
    ...(data !== undefined ? { data } : {}),
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorResponse('invalid_request', 'Only POST is accepted.');
  }

  const requestId = req.headers.get('X-Request-ID') ?? crypto.randomUUID();

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return errorResponse('unauthorized');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !anonKey || !serviceKey) {
      log('error', requestId, 'missing-supabase-env');
      return errorResponse('internal_error');
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return errorResponse('unauthorized');
    const userId = userData.user.id;

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return errorResponse('invalid_request', 'Body must be JSON.');
    }

    const transitionId = typeof body.transitionId === 'string' ? body.transitionId : '';
    const renderRequestId = typeof body.renderRequestId === 'string' ? body.renderRequestId : '';
    if (!UUID_RE.test(transitionId) || !UUID_RE.test(renderRequestId)) {
      return errorResponse('invalid_request', 'transitionId and renderRequestId must be UUIDs.');
    }

    const settings = normalizeSettings(body.exportSettings);
    if (typeof settings === 'string') return errorResponse(settings, 'Invalid exportSettings.');

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Read transition server-side, verify ownership.
    const { data: transition, error: tErr } = await admin
      .from('transitions')
      .select('id, user_id, song_a_id, song_b_id, template_id, transition_duration, song_a_end_time, song_b_start_time, metadata')
      .eq('id', transitionId)
      .maybeSingle();
    if (tErr) {
      log('error', requestId, 'transition-read-failed', { code: tErr.code });
      return errorResponse('internal_error');
    }
    if (!transition) return errorResponse('transition_not_found');
    if (transition.user_id !== userId) return errorResponse('unauthorized');

    // 2. Read both source tracks with trusted storage metadata.
    const { data: tracks, error: trErr } = await admin
      .from('tracks')
      .select('id, user_id, storage_path, duration_ms, updated_at, is_catalog, catalog_visibility')
      .in('id', [transition.song_a_id, transition.song_b_id]);
    if (trErr) {
      log('error', requestId, 'tracks-read-failed', { code: trErr.code });
      return errorResponse('internal_error');
    }
    const trackA = tracks?.find((t) => t.id === transition.song_a_id);
    const trackB = tracks?.find((t) => t.id === transition.song_b_id);
    if (!trackA || !trackB) return errorResponse('source_not_eligible');

    const eligible = (t: typeof trackA) =>
      t.user_id === userId ||
      (t.is_catalog === true && t.catalog_visibility === 'public');
    if (!eligible(trackA) || !eligible(trackB)) return errorResponse('source_not_eligible');
    if (!trackA.storage_path || !trackB.storage_path) return errorResponse('source_not_eligible');
    if (!trackA.duration_ms || !trackB.duration_ms) return errorResponse('source_not_eligible');

    // 3. Determine render mode. Unimplemented templates are rejected loudly.
    const md = (transition.metadata ?? {}) as Record<string, unknown>;
    const requestedMode: RenderMode =
      md.renderMode === 'direct_cut'
        ? 'direct_cut'
        : (transition.template_id ? 'template' : 'smooth_crossfade');
    if (!SUPPORTED_RENDER_MODES.includes(requestedMode)) {
      return errorResponse(
        'unsupported_render_mode',
        `Render mode "${requestedMode}" is not yet implemented by ${ENGINE_VERSION}.`,
      );
    }

    // 4. Resolve template server-side if ever needed (not in this engine version).
    // Placeholder so the shape is uniform when templates land.
    let templateRef: undefined = undefined;

    // 5. Derive source-content hashes for snapshot / replacement-detection.
    const durationA = trackA.duration_ms / 1000;
    const durationB = trackB.duration_ms / 1000;
    const rawStartA = Number(md.songAFullClipStart ?? 0);
    const rawEndA = Number(md.songAFullClipEnd ?? transition.song_a_end_time ?? durationA);
    const rawStartB = Number(md.songBFullClipStart ?? transition.song_b_start_time ?? 0);
    const rawEndB = Number(md.songBFullClipEnd ?? durationB);

    const startA = Math.max(0, Math.min(rawStartA, durationA));
    const endA = Math.max(startA + 0.001, Math.min(rawEndA, durationA));
    const startB = Math.max(0, Math.min(rawStartB, durationB));
    const endB = Math.max(startB + 0.001, Math.min(rawEndB, durationB));

    const overlap = requestedMode === 'direct_cut'
      ? 0
      : Math.min(
          MAX_TRANSITION_BLEND_SECONDS,
          Math.max(0, Number(transition.transition_duration ?? 0)),
          endA - startA,
          endB - startB,
        );
    if (requestedMode !== 'direct_cut' && !(overlap > 0)) {
      return errorResponse('invalid_request', 'Transition overlap must be > 0 for this mode.');
    }

    const hashA = await sha256Hex(`${trackA.storage_path}|${trackA.updated_at ?? ''}`);
    const hashB = await sha256Hex(`${trackB.storage_path}|${trackB.updated_at ?? ''}`);

    // 6. Build the canonical, server-controlled render spec.
    let spec;
    try {
      spec = buildRenderSpec({
        mashUpGroup: typeof md.mashUpGroup === 'string' ? md.mashUpGroup : '',
        pairIndex: typeof md.pairIndex === 'number' ? md.pairIndex : 0,
        isFirstPair: md.pairIndex === 0 || md.pairIndex === undefined,
        isLastPair: md.isLastPair === true,
        songA: {
          uploadId: trackA.id,
          sourceStart: startA,
          sourceEnd: endA,
          sourceDuration: durationA,
          storageBucket: TRACKS_BUCKET,
          storagePath: trackA.storage_path,
          sourceContentHash: hashA,
        },
        songB: {
          uploadId: trackB.id,
          sourceStart: startB,
          sourceEnd: endB,
          sourceDuration: durationB,
          storageBucket: TRACKS_BUCKET,
          storagePath: trackB.storage_path,
          sourceContentHash: hashB,
        },
        renderMode: requestedMode,
        overlapSeconds: overlap,
        templateRef,
      });
    } catch (specErr) {
      log('warn', requestId, 'spec-invalid', { error: (specErr as Error).message });
      return errorResponse('invalid_request', (specErr as Error).message);
    }

    // 7. Enforce active-job and submission-rate caps. The queue's unique
    // constraint on (user_id, render_request_id, transition_id) still prevents
    // double-charge under concurrent bursts; these counts are the soft cap.
    const { count: activeCount, error: activeErr } = await admin
      .from('blend_render_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['queued', 'processing']);
    if (activeErr) {
      log('error', requestId, 'active-count-failed', { code: activeErr.code });
      return errorResponse('internal_error');
    }
    if ((activeCount ?? 0) >= MAX_ACTIVE_JOBS) {
      return errorResponse('active_job_limit', 'Too many renders currently in flight.');
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentCount, error: recentErr } = await admin
      .from('blend_render_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('created_at', oneMinuteAgo);
    if (recentErr) {
      log('error', requestId, 'recent-count-failed', { code: recentErr.code });
      return errorResponse('internal_error');
    }
    if ((recentCount ?? 0) >= MAX_SUBMISSIONS_PER_MIN) {
      return errorResponse('submission_limit', 'Rate limit: too many submissions this minute.');
    }

    // 8. Compute request hash from spec + normalized settings + engine version.
    const requestHash = await computeRequestHash({
      spec,
      exportSettings: settings,
      engineVersion: ENGINE_VERSION,
    });

    // 9. Call the enqueue RPC as the caller (JWT-bound) so auth.uid() matches.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: enqData, error: enqErr } = await userClient.rpc('enqueue_blend_render', {
      p_transition_id: transitionId,
      p_render_spec: spec,
      p_request_hash: requestHash,
      p_engine_version: ENGINE_VERSION,
      p_render_request_id: renderRequestId,
      p_blend_name: settings.blendName,
      p_export_settings: settings,
    });
    if (enqErr) {
      log('error', requestId, 'enqueue-failed', { code: enqErr.code, message: enqErr.message });
      return errorResponse('internal_error');
    }
    const row = Array.isArray(enqData) ? enqData[0] : enqData;
    if (!row || !row.blend_id || !row.render_job_id) {
      log('error', requestId, 'enqueue-empty');
      return errorResponse('internal_error');
    }

    // 10. Read the enqueued row and compare stored hash against ours. A
    // mismatch means an earlier request with the same (user, renderRequestId,
    // transitionId) had different settings — reject with 409 instead of
    // silently replacing.
    const { data: existingJob, error: exErr } = await admin
      .from('blend_render_jobs')
      .select('id, request_hash, status, engine_version, created_at')
      .eq('id', row.render_job_id)
      .maybeSingle();
    if (exErr || !existingJob) {
      log('error', requestId, 'job-read-failed', { code: exErr?.code });
      return errorResponse('internal_error');
    }
    if (existingJob.request_hash !== requestHash) {
      return errorResponse('conflicting_settings', 'Different settings for the same request id.');
    }
    const deduped = Date.now() - new Date(existingJob.created_at).getTime() > 2000;

    return jsonResponse({
      blendId: row.blend_id,
      jobId: row.render_job_id,
      status: existingJob.status,
      requestHash,
      engineVersion: ENGINE_VERSION,
      deduped,
    }, 202);

  } catch (err) {
    log('error', requestId, 'unhandled', { error: (err as Error).message });
    return errorResponse('internal_error');
  }
});
