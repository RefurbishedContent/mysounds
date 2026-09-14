// Thin, safety-first wrapper around ffmpeg and ffprobe.
// - argv arrays only, no shell interpolation, stdin disabled
// - protocol whitelist restricted to local files (+ pipe for lavfi)
// - per-call timeout and bounded stderr capture
// - no inheritance of caller stdio

import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const FFMPEG_BIN = process.env.AUDIO_WORKER_FFMPEG || 'ffmpeg';
export const FFPROBE_BIN = process.env.AUDIO_WORKER_FFPROBE || 'ffprobe';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_STDERR_BYTES = 512 * 1024;
const MAX_STDOUT_BYTES = 4 * 1024 * 1024;

const BASE_FFMPEG_FLAGS = [
  '-hide_banner',
  '-nostdin',
  '-nostats',
  '-loglevel', 'error',
  '-protocol_whitelist', 'file,pipe',
  '-y',
];

const BASE_FFPROBE_FLAGS = [
  '-hide_banner',
  '-loglevel', 'error',
  '-protocol_whitelist', 'file,pipe',
];

function runBinary(bin, args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdoutBytes = 0;
    let stderrBytes = 0;
    const stdoutChunks = [];
    const stderrChunks = [];
    let killedForOversize = false;

    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      reject(new Error(`Process ${bin} timed out after ${timeoutMs} ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_STDOUT_BYTES) {
        killedForOversize = true;
        try { child.kill('SIGKILL'); } catch { /* ignore */ }
        return;
      }
      stdoutChunks.push(chunk);
    });
    child.stderr.on('data', (chunk) => {
      if (stderrBytes >= MAX_STDERR_BYTES) return;
      const remaining = MAX_STDERR_BYTES - stderrBytes;
      const slice = chunk.length <= remaining ? chunk : chunk.subarray(0, remaining);
      stderrBytes += slice.length;
      stderrChunks.push(slice);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      if (killedForOversize) {
        return reject(new Error(`${bin} stdout exceeded ${MAX_STDOUT_BYTES} bytes`));
      }
      if (code !== 0) {
        const detail = stderr.trim().split('\n').slice(-4).join(' | ');
        return reject(new Error(`${bin} exited with code=${code} signal=${signal || ''}: ${detail}`));
      }
      resolve({ stdout, stderr });
    });
  });
}

export function ffmpeg(args, opts) {
  return runBinary(FFMPEG_BIN, [...BASE_FFMPEG_FLAGS, ...args], opts);
}

export function ffprobe(args, opts) {
  return runBinary(FFPROBE_BIN, [...BASE_FFPROBE_FLAGS, ...args], opts);
}

// Probe an audio file's metadata using only well-supported ffprobe fields.
// Returns durationSeconds, sampleRate, channels, codec, formatName, bitsPerSample,
// plus an `estimatedSampleCount` derived from duration/time_base. The estimate is
// non-authoritative; for exact sample counts use countDecodedPcmSamples().
export async function probeAudio(inputPath) {
  const { stdout } = await ffprobe([
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    '-select_streams', 'a:0',
    inputPath,
  ], { timeoutMs: 60_000 });
  let parsed;
  try { parsed = JSON.parse(stdout); }
  catch (e) { throw new Error(`ffprobe returned invalid JSON for ${inputPath}: ${e.message}`); }
  const stream = parsed.streams && parsed.streams[0];
  if (!stream) throw new Error(`No audio stream found in ${inputPath}`);
  const durationSeconds = Number(
    stream.duration ?? parsed.format?.duration ?? NaN
  );
  const sampleRate = Number(stream.sample_rate);
  const channels = Number(stream.channels);
  const codec = String(stream.codec_name || '');

  let estimatedSampleCount = null;
  const timeBase = typeof stream.time_base === 'string' ? stream.time_base : '';
  const durationTs = Number(stream.duration_ts ?? NaN);
  const tbMatch = timeBase.match(/^(\d+)\/(\d+)$/);
  if (Number.isFinite(durationTs) && tbMatch) {
    const num = Number(tbMatch[1]);
    const den = Number(tbMatch[2]);
    if (den > 0 && num === 1 && den === sampleRate) {
      estimatedSampleCount = durationTs;
    } else if (den > 0 && Number.isFinite(sampleRate)) {
      estimatedSampleCount = Math.round((durationTs * num / den) * sampleRate);
    }
  }
  if (estimatedSampleCount === null && Number.isFinite(durationSeconds) && Number.isFinite(sampleRate)) {
    estimatedSampleCount = Math.round(durationSeconds * sampleRate);
  }

  return {
    durationSeconds,
    sampleRate,
    channels,
    codec,
    channelLayout: String(stream.channel_layout || ''),
    estimatedSampleCount: Number.isFinite(estimatedSampleCount) ? estimatedSampleCount : null,
    formatName: String(parsed.format?.format_name || ''),
    bitsPerSample: Number(stream.bits_per_sample || 0),
  };
}

// Count decoded samples per channel exactly by asking ffmpeg to re-decode the
// input to signed 16-bit little-endian PCM and measuring the raw byte length.
// samplesPerChannel = bytes / (channels * 2). This does NOT rely on the invalid
// ffprobe `-count_samples 1` flag, and it treats decoded sample count (not
// compressed frame count) as the source of truth.
export async function countDecodedPcmSamples(inputPath) {
  const probe = await probeAudio(inputPath);
  const channels = Number(probe.channels);
  const sampleRate = Number(probe.sampleRate);
  if (!Number.isFinite(channels) || channels <= 0) {
    throw new Error(`countDecodedPcmSamples: invalid channel count for ${inputPath}`);
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error(`countDecodedPcmSamples: invalid sample rate for ${inputPath}`);
  }
  const dir = await mkdtemp(join(tmpdir(), 'audio-worker-count-'));
  const rawPath = join(dir, 'samples.s16le');
  try {
    await ffmpeg([
      '-i', inputPath,
      '-map', '0:a:0',
      '-vn',
      '-ac', String(channels),
      '-ar', String(sampleRate),
      '-f', 's16le',
      '-acodec', 'pcm_s16le',
      rawPath,
    ], { timeoutMs: 180_000 });
    const st = await stat(rawPath);
    const bytesPerFrame = channels * 2;
    if (st.size % bytesPerFrame !== 0) {
      throw new Error(
        `countDecodedPcmSamples: raw byte size ${st.size} not divisible by ${bytesPerFrame} for ${inputPath}`,
      );
    }
    return st.size / bytesPerFrame;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Exercise the same probe + decoded-sample-count code paths used for real jobs
// against a small synthetic tone. If this fails, the worker's ffmpeg/ffprobe
// binaries are unusable for real work and the worker must refuse to start.
export async function runStartupSelfTest() {
  const dir = await mkdtemp(join(tmpdir(), 'audio-worker-selftest-'));
  const tonePath = join(dir, 'tone.wav');
  try {
    const seconds = 0.25;
    const sampleRate = 44100;
    const channels = 2;
    await ffmpeg([
      '-f', 'lavfi',
      '-i', `sine=frequency=440:sample_rate=${sampleRate}:duration=${seconds}`,
      '-ac', String(channels),
      '-ar', String(sampleRate),
      '-c:a', 'pcm_s16le',
      '-f', 'wav',
      tonePath,
    ], { timeoutMs: 30_000 });

    const probe = await probeAudio(tonePath);
    if (probe.codec !== 'pcm_s16le') {
      throw new Error(`self-test: expected codec pcm_s16le, got ${probe.codec}`);
    }
    if (probe.sampleRate !== sampleRate) {
      throw new Error(`self-test: expected ${sampleRate} Hz, got ${probe.sampleRate}`);
    }
    if (probe.channels !== channels) {
      throw new Error(`self-test: expected ${channels} channels, got ${probe.channels}`);
    }
    if (!/wav/i.test(probe.formatName)) {
      throw new Error(`self-test: expected wav container, got ${probe.formatName}`);
    }

    const samples = await countDecodedPcmSamples(tonePath);
    const expected = Math.round(seconds * sampleRate);
    if (Math.abs(samples - expected) > 2) {
      throw new Error(`self-test: sample count ${samples} vs expected ${expected}`);
    }
    return { ok: true, samples, expected };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Return { peakDbfs } measured by ffmpeg astats. peakDbfs is <= 0 (0 == full-scale).
// Silent input yields -Infinity; we clamp to a safe floor.
export async function measurePeakDbfs(wavPath) {
  const { stderr } = await runBinary(FFMPEG_BIN, [
    ...BASE_FFMPEG_FLAGS,
    '-i', wavPath,
    '-af', 'astats=measure_overall=Peak_level:measure_perchannel=0',
    '-f', 'null',
    '-',
  ], { timeoutMs: 120_000 }).catch(err => ({ stderr: err.message || '' }));

  // Look for "Peak level dB: <n>" in overall stats.
  const lines = String(stderr).split('\n');
  let peak = null;
  for (const line of lines) {
    const m = line.match(/Peak level dB:\s*(-?\d+(?:\.\d+)?|-inf)/i);
    if (m) {
      peak = m[1].toLowerCase() === '-inf' ? -Infinity : Number(m[1]);
      // Overall block comes last; keep updating.
    }
  }
  if (peak === null) throw new Error(`Failed to measure peak level for ${wavPath}`);
  return { peakDbfs: peak };
}
