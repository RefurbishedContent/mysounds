// Thin, safety-first wrapper around ffmpeg and ffprobe.
// - argv arrays only, no shell interpolation, stdin disabled
// - protocol whitelist restricted to local files (+ pipe for lavfi)
// - per-call timeout and bounded stderr capture
// - no inheritance of caller stdio

import { spawn } from 'node:child_process';

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

// Return { format, streams, durationSeconds, sampleRate, channels, codec, sampleCount }
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
  const sampleCount = Number(stream.duration_ts ?? NaN);
  return {
    durationSeconds,
    sampleRate,
    channels,
    codec,
    sampleCount: Number.isFinite(sampleCount) ? sampleCount : null,
    formatName: String(parsed.format?.format_name || ''),
    bitsPerSample: Number(stream.bits_per_sample || 0),
  };
}

// Count samples exactly by asking ffprobe to iterate packets.
export async function countAudioSamples(wavPath) {
  const { stdout } = await ffprobe([
    '-select_streams', 'a:0',
    '-show_entries', 'stream=nb_read_samples',
    '-count_samples', '1',
    '-of', 'default=nw=1:nk=1',
    wavPath,
  ], { timeoutMs: 60_000 });
  const n = Number(String(stdout).trim());
  if (!Number.isFinite(n)) throw new Error(`Could not read sample count from ${wavPath}`);
  return n;
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
