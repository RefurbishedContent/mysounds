import { createClient } from '@supabase/supabase-js';
import { mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  render,
  SAMPLE_RATE,
  CHANNELS,
  BIT_DEPTH,
  FORMAT,
} from './render.mjs';
import { probeAudio } from './process.mjs';
import { startHealthServer } from './health.mjs';
import {
  computeSourceIdentity,
  downloadObjectToFile,
  uploadWav,
  deleteOwnObjects,
  TerminalError,
  TransientError,
} from './storage.mjs';

// ---- env / config ---------------------------------------------------------

function readEnv() {
  const req = (k) => {
    const v = process.env[k];
    if (!v) throw new Error(`Missing required env: ${k}`);
    return v;
  };
  const num = (k, d, min, max) => {
    const raw = process.env[k];
    if (!raw) return d;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) {
      throw new Error(`Invalid env ${k}=${raw} (expected ${min}..${max})`);
    }
    return n;
  };
  return {
    SUPABASE_URL: req('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: req('SUPABASE_SERVICE_ROLE_KEY'),
    WORKER_CONCURRENCY: num('WORKER_CONCURRENCY', 1, 1, 8),
    POLL_INTERVAL_MS: num('POLL_INTERVAL_MS', 2000, 250, 60_000),
    JOB_TIMEOUT_SECONDS: num('JOB_TIMEOUT_SECONDS', 300, 30, 1800),
    LEASE_SECONDS: num('LEASE_SECONDS', 360, 30, 3600),
    HEARTBEAT_INTERVAL_MS: num('HEARTBEAT_INTERVAL_MS', 20_000, 5_000, 120_000),
    PORT: num('PORT', 8080, 1, 65535),
    ENGINE_VERSION: process.env.RENDER_BLEND_ENGINE_VERSION || 'render-blend-v1',
    MAX_SOURCE_BYTES: num('MAX_SOURCE_BYTES', 262_144_000, 1024, 5_000_000_000),
    MAX_OUTPUT_SECONDS: num('MAX_OUTPUT_SECONDS', 900, 5, 7200),
    MAX_ATTEMPTS: num('MAX_ATTEMPTS', 3, 1, 10),
    BLENDS_BUCKET: process.env.BLENDS_BUCKET || 'blends',
    TEMP_DIR: process.env.TEMP_DIR || tmpdir(),
  };
}

const WORKER_ID = `worker-${hostname()}-${process.pid}`;

// ---- logging (never emits secrets/URLs) -----------------------------------

function log(level, message, data) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    worker_id: WORKER_ID,
    message,
  };
  if (data) entry.data = data;
  process.stdout.write(JSON.stringify(entry) + '\n');
}

function redactError(err) {
  const msg = String(err?.message ?? err ?? 'unknown').slice(0, 500);
  return msg.replace(/https?:\/\/\S+/g, '[url]').replace(/eyJ[\w.-]+/g, '[jwt]');
}

// ---- terminal error classifier --------------------------------------------

const TERMINAL_CODES = new Set([
  'source_not_eligible',
  'source_replaced',
  'source_replaced_during_render',
  'source_too_large',
  'source_missing',
  'output_too_long',
  'unreadable_source',
  'invalid_selection',
  'unsupported_mode',
  'output_verification_failed',
  'silent_output',
  'output_conflict',
]);

function classifyRenderError(err) {
  if (err instanceof TerminalError) return err;
  if (err instanceof TransientError) return err;
  const msg = String(err?.message ?? '');
  if (
    /Unsupported renderMode|is not supported by the worker|Unsupported exportOptions|Unsupported output/i.test(msg)
  ) {
    return new TerminalError('unsupported_mode', msg);
  }
  if (
    /exceeds sourceDuration|exceeds either selection length|exceeds actual duration|overlapSeconds exceeds maximum|must be > sourceStart|must be a finite number|direct_cut requires|smooth_crossfade requires|inputPath does not exist/i.test(
      msg,
    )
  ) {
    return new TerminalError('invalid_selection', msg);
  }
  return new TransientError('ffmpeg_transient', msg);
}

// ---- source eligibility recheck -------------------------------------------

async function recheckSource(supabase, userId, song) {
  const { data, error } = await supabase
    .from('tracks')
    .select('id, user_id, storage_path, updated_at, is_catalog, catalog_visibility')
    .eq('id', song.uploadId)
    .maybeSingle();

  if (error) throw new TransientError('db_transient', 'tracks select failed');
  if (!data) throw new TerminalError('source_not_eligible', 'source track missing');

  const isOwner = data.user_id === userId;
  const isPublicCatalog = data.is_catalog === true && data.catalog_visibility === 'public';
  if (!isOwner && !isPublicCatalog) {
    throw new TerminalError('source_not_eligible', 'caller not eligible for source');
  }

  if (data.storage_path !== song.storagePath) {
    throw new TerminalError('source_replaced', 'storage_path drift');
  }
  const identity = computeSourceIdentity(data.storage_path, data.updated_at);
  if (identity !== song.sourceContentHash) {
    throw new TerminalError('source_replaced', 'source content hash mismatch');
  }
  return data;
}

// ---- job execution --------------------------------------------------------

async function runJob(supabase, cfg, job, state) {
  const jobId = job.id;
  const leaseToken = job.lease_token;
  const spec = job.render_spec;
  const startedAt = Date.now();
  const workDir = join(cfg.TEMP_DIR, `audio-worker-${leaseToken}`);
  await mkdir(workDir, { recursive: true });

  const heartbeatState = { alive: true, staleLease: false };
  const heartbeatTimer = setInterval(async () => {
    if (!heartbeatState.alive) return;
    try {
      await supabase.rpc('heartbeat_blend_render', {
        p_job_id: jobId,
        p_lease_token: leaseToken,
        p_stage: null,
        p_lease_seconds: cfg.LEASE_SECONDS,
      });
    } catch (err) {
      const msg = redactError(err);
      if (/stale_lease/.test(msg)) {
        heartbeatState.staleLease = true;
        heartbeatState.alive = false;
        log('warn', 'heartbeat lost lease', { job_id: jobId });
      } else {
        log('warn', 'heartbeat transient error', { job_id: jobId, error: msg });
      }
    }
  }, cfg.HEARTBEAT_INTERVAL_MS);

  const setStage = async (stage) => {
    if (heartbeatState.staleLease) throw new TerminalError('stale_lease', 'lease lost');
    try {
      await supabase.rpc('heartbeat_blend_render', {
        p_job_id: jobId,
        p_lease_token: leaseToken,
        p_stage: stage,
        p_lease_seconds: cfg.LEASE_SECONDS,
      });
    } catch (err) {
      const msg = redactError(err);
      if (/stale_lease/.test(msg)) {
        heartbeatState.staleLease = true;
        throw new TerminalError('stale_lease', 'lease lost');
      }
      throw new TransientError('heartbeat_transient', msg);
    }
  };

  let uploaded = false;
  let outputKey = null;

  try {
    if (!spec || spec.version !== 1) {
      throw new TerminalError('invalid_selection', 'render spec missing/invalid');
    }
    if (spec.renderMode !== 'direct_cut' && spec.renderMode !== 'smooth_crossfade') {
      throw new TerminalError('unsupported_mode', `renderMode ${spec.renderMode}`);
    }
    if (spec.expectedContribution?.outputSeconds > cfg.MAX_OUTPUT_SECONDS) {
      throw new TerminalError(
        'output_too_long',
        `expected ${spec.expectedContribution.outputSeconds}s exceeds ${cfg.MAX_OUTPUT_SECONDS}s`,
      );
    }

    await setStage('validating');
    await recheckSource(supabase, job.user_id, spec.songA);
    await recheckSource(supabase, job.user_id, spec.songB);

    await setStage('downloading');
    const aPath = join(workDir, 'a.audio');
    const bPath = join(workDir, 'b.audio');
    await downloadObjectToFile(supabase, {
      bucket: spec.songA.storageBucket,
      path: spec.songA.storagePath,
      destPath: aPath,
      maxBytes: cfg.MAX_SOURCE_BYTES,
    });
    await downloadObjectToFile(supabase, {
      bucket: spec.songB.storageBucket,
      path: spec.songB.storagePath,
      destPath: bPath,
      maxBytes: cfg.MAX_SOURCE_BYTES,
    });

    await setStage('validating');
    for (const [label, p, s] of [
      ['songA', aPath, spec.songA],
      ['songB', bPath, spec.songB],
    ]) {
      const probe = await probeAudio(p);
      if (!Number.isFinite(probe.durationSeconds) || probe.durationSeconds <= 0) {
        throw new TerminalError('unreadable_source', `${label}: unreadable audio`);
      }
      if (s.sourceEnd > probe.durationSeconds + 0.01) {
        throw new TerminalError(
          'invalid_selection',
          `${label}: sourceEnd exceeds actual duration`,
        );
      }
    }

    await setStage('rendering');
    const localSpec = {
      ...spec,
      songA: { ...spec.songA, inputPath: aPath },
      songB: { ...spec.songB, inputPath: bPath },
    };
    const outPath = join(workDir, 'output.wav');
    const renderTimer = setTimeout(() => {
      log('warn', 'render timeout budget reached', { job_id: jobId });
    }, cfg.JOB_TIMEOUT_SECONDS * 1000);

    let result;
    try {
      result = await render(localSpec, outPath, { keepTemp: false });
    } finally {
      clearTimeout(renderTimer);
    }

    await setStage('verifying');
    const probe = await probeAudio(outPath);
    if (probe.sampleRate !== SAMPLE_RATE || probe.channels !== CHANNELS) {
      throw new TerminalError(
        'output_verification_failed',
        `output ${probe.sampleRate}/${probe.channels}ch mismatch`,
      );
    }
    if (probe.codec && probe.codec !== 'pcm_s16le') {
      throw new TerminalError('output_verification_failed', `output codec ${probe.codec}`);
    }
    if (probe.bitsPerSample && probe.bitsPerSample !== BIT_DEPTH) {
      throw new TerminalError('output_verification_failed', `output bit depth ${probe.bitsPerSample}`);
    }
    if (!Number.isFinite(result.peakDbfs) || result.peakDbfs <= -120) {
      throw new TerminalError('silent_output', 'output has no measurable audio');
    }
    const expected = spec.expectedContribution?.outputSeconds ?? 0;
    if (Math.abs(result.seconds - expected) > 0.05) {
      throw new TerminalError(
        'output_verification_failed',
        `duration ${result.seconds}s vs expected ${expected}s`,
      );
    }

    // Pre-publish source recheck.
    await recheckSource(supabase, job.user_id, spec.songA);
    await recheckSource(supabase, job.user_id, spec.songB);

    // Confirm lease before upload.
    await setStage('uploading');
    if (heartbeatState.staleLease) throw new TerminalError('stale_lease', 'lease lost');

    const st = await stat(outPath);
    outputKey = `${job.user_id}/${job.blend_id}/${leaseToken}/output.wav`;
    await uploadWav(supabase, {
      bucket: cfg.BLENDS_BUCKET,
      key: outputKey,
      localPath: outPath,
    });
    uploaded = true;

    // Final lease confirmation before publishing completion.
    await setStage('verifying');

    const renderDurationSeconds = Math.max(0, (Date.now() - startedAt) / 1000);
    const durationSec = Math.max(0, Math.floor(result.seconds));
    const songASec = Math.max(
      0,
      Math.floor(spec.expectedContribution?.songASeconds ?? 0),
    );
    const songBSec = Math.max(
      0,
      Math.floor(spec.expectedContribution?.songBSeconds ?? 0),
    );

    const resultPayload = {
      url: '',
      filename: outputKey,
      duration: durationSec,
      file_size: st.size,
      format: FORMAT,
      quality: 'standard',
      sample_rate: SAMPLE_RATE,
      bit_depth: BIT_DEPTH,
      song_a_duration_contribution: songASec,
      song_b_duration_contribution: songBSec,
      render_duration_seconds: Number(renderDurationSeconds.toFixed(3)),
      engine_version: cfg.ENGINE_VERSION,
    };

    // transition_duration column CHECK requires value in [4,25]. Only emit
    // for smooth_crossfade with an in-range overlap; direct_cut preserves the
    // enqueue-time value via COALESCE.
    if (spec.renderMode === 'smooth_crossfade') {
      const overlap = Math.round(spec.overlapSeconds);
      if (overlap >= 4 && overlap <= 25) {
        resultPayload.transition_duration = overlap;
      }
    }

    const { error: completeErr } = await supabase.rpc('complete_blend_render', {
      p_job_id: jobId,
      p_lease_token: leaseToken,
      p_result: resultPayload,
    });
    if (completeErr) {
      const msg = redactError(completeErr);
      if (/stale_lease|terminal_state/.test(msg)) {
        throw new TerminalError('stale_lease', 'lease lost at completion');
      }
      throw new TransientError('completion_transient', msg);
    }

    log('info', 'job completed', {
      job_id: jobId,
      blend_id: job.blend_id,
      seconds: result.seconds,
      bytes: st.size,
      attempt: job.attempts,
    });
  } catch (err) {
    const classified = classifyRenderError(err);
    const isTerminal =
      classified.terminal || TERMINAL_CODES.has(classified.code);
    const errCode = classified.code || 'internal_error';
    const errMsg = redactError(classified);

    if (classified.code === 'stale_lease' || heartbeatState.staleLease) {
      log('warn', 'aborting due to lost lease', { job_id: jobId, error: errMsg });
      if (uploaded && outputKey) {
        const prefix = `${job.user_id}/${job.blend_id}/${leaseToken}`;
        await deleteOwnObjects(supabase, { bucket: cfg.BLENDS_BUCKET, prefix });
      }
      // Do not call fail_blend_render: the queue has re-issued the row.
      return;
    }

    log(isTerminal ? 'error' : 'warn', 'job failed', {
      job_id: jobId,
      code: errCode,
      terminal: isTerminal,
      attempt: job.attempts,
      error: errMsg,
    });

    if (uploaded && outputKey) {
      const prefix = `${job.user_id}/${job.blend_id}/${leaseToken}`;
      await deleteOwnObjects(supabase, { bucket: cfg.BLENDS_BUCKET, prefix });
    }

    try {
      // For terminal errors, retry_in_seconds=0 short-circuits backoff; the
      // queue will keep incrementing attempts until max_attempts is reached.
      await supabase.rpc('fail_blend_render', {
        p_job_id: jobId,
        p_lease_token: leaseToken,
        p_error_code: errCode,
        p_error_message: errMsg.slice(0, 500),
        p_retry_in_seconds: isTerminal ? 0 : null,
      });
    } catch (failErr) {
      log('error', 'fail_blend_render rpc failed', {
        job_id: jobId,
        error: redactError(failErr),
      });
    }
  } finally {
    heartbeatState.alive = false;
    clearInterval(heartbeatTimer);
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ---- main loop ------------------------------------------------------------

async function claimOne(supabase, cfg) {
  const { data, error } = await supabase.rpc('claim_blend_render', {
    p_worker_id: WORKER_ID,
    p_lease_seconds: cfg.LEASE_SECONDS,
    p_batch: 1,
  });
  if (error) {
    log('warn', 'claim_blend_render failed', { error: redactError(error) });
    return null;
  }
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function checkFfmpeg() {
  try {
    await probeAudio('/dev/null').catch(() => null);
    return true;
  } catch {
    return true; // probeAudio spawns ffprobe; if the binary is missing the render step will surface the error
  }
}

async function main() {
  const cfg = readEnv();

  const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const state = {
    lastPollAt: null,
    pollIntervalMs: cfg.POLL_INTERVAL_MS,
    inFlight: 0,
    shuttingDown: false,
    ffmpegAvailable: await checkFfmpeg(),
  };

  const server = startHealthServer({
    port: cfg.PORT,
    engineVersion: cfg.ENGINE_VERSION,
    state,
  });

  log('info', 'worker started', {
    concurrency: cfg.WORKER_CONCURRENCY,
    engine_version: cfg.ENGINE_VERSION,
    port: cfg.PORT,
  });

  const stop = { requested: false };
  const shutdown = (sig) => {
    if (state.shuttingDown) return;
    state.shuttingDown = true;
    stop.requested = true;
    log('info', 'shutdown requested', { signal: sig });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  const loop = async () => {
    while (!stop.requested) {
      state.lastPollAt = Date.now();
      let job = null;
      try {
        job = await claimOne(supabase, cfg);
      } catch (err) {
        log('warn', 'claim loop error', { error: redactError(err) });
      }
      if (!job) {
        await new Promise((r) => setTimeout(r, cfg.POLL_INTERVAL_MS));
        continue;
      }
      state.inFlight++;
      log('info', 'job claimed', {
        job_id: job.id,
        blend_id: job.blend_id,
        attempt: job.attempts,
      });
      try {
        await runJob(supabase, cfg, job, state);
      } catch (err) {
        log('error', 'unhandled job error', {
          job_id: job.id,
          error: redactError(err),
        });
      } finally {
        state.inFlight--;
      }
    }
  };

  const workers = Array.from({ length: cfg.WORKER_CONCURRENCY }, () => loop());
  await Promise.all(workers);

  server.close();
  log('info', 'worker stopped', {});
}

main().catch((err) => {
  log('error', 'fatal', { error: redactError(err) });
  process.exit(1);
});
