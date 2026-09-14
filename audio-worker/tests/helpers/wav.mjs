// Minimal 16-bit PCM WAV reader + tone-fixture helper.
// Reads the header, extracts a flat Int16Array of interleaved samples.

import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { FFMPEG_BIN } from '../../src/process.mjs';

export function hasFfmpeg() {
  try {
    const r = spawnSync(FFMPEG_BIN, ['-version'], { stdio: 'ignore' });
    return r.status === 0;
  } catch { return false; }
}

export async function readWav(path) {
  const buf = await readFile(path);
  if (buf.slice(0, 4).toString('ascii') !== 'RIFF' ||
      buf.slice(8, 12).toString('ascii') !== 'WAVE') {
    throw new Error(`Not a RIFF/WAVE file: ${path}`);
  }
  let offset = 12;
  let fmt = null;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.slice(offset, offset + 4).toString('ascii');
    const chunkSize = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (chunkId === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(body + 0),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        byteRate: buf.readUInt32LE(body + 8),
        blockAlign: buf.readUInt16LE(body + 12),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (chunkId === 'data') {
      dataOffset = body;
      dataSize = chunkSize;
      break;
    }
    offset = body + chunkSize + (chunkSize % 2);
  }
  if (!fmt) throw new Error(`Missing fmt chunk in ${path}`);
  if (dataOffset < 0) throw new Error(`Missing data chunk in ${path}`);
  if (fmt.bitsPerSample !== 16) {
    throw new Error(`readWav only supports 16-bit PCM (got ${fmt.bitsPerSample})`);
  }
  const totalSamples = dataSize / 2; // int16
  const perChannelSamples = totalSamples / fmt.channels;
  const pcm = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    pcm[i] = buf.readInt16LE(dataOffset + i * 2);
  }
  return {
    sampleRate: fmt.sampleRate,
    channels: fmt.channels,
    bitsPerSample: fmt.bitsPerSample,
    samples: perChannelSamples,
    pcm,
  };
}

// Copy a single-channel view (interleaved -> mono average) into a Float32Array
// in [-1, 1] for a specific sample window.
export function monoWindow(wav, startSample, sampleCount) {
  const out = new Float32Array(sampleCount);
  const ch = wav.channels;
  for (let i = 0; i < sampleCount; i++) {
    let sum = 0;
    const base = (startSample + i) * ch;
    for (let c = 0; c < ch; c++) sum += wav.pcm[base + c];
    out[i] = (sum / ch) / 32768;
  }
  return out;
}

// Goertzel single-frequency magnitude estimate (linear amplitude 0..~1).
export function goertzelMagnitude(samples, sampleRate, targetHz) {
  const N = samples.length;
  const k = Math.round((N * targetHz) / sampleRate);
  const w = (2 * Math.PI * k) / N;
  const cosw = Math.cos(w);
  const coeff = 2 * cosw;
  let sPrev = 0, sPrev2 = 0;
  for (let i = 0; i < N; i++) {
    const s = samples[i] + coeff * sPrev - sPrev2;
    sPrev2 = sPrev;
    sPrev = s;
  }
  const real = sPrev - sPrev2 * cosw;
  const imag = sPrev2 * Math.sin(w);
  const power = real * real + imag * imag;
  return Math.sqrt(power) / (N / 2);
}

// Compute RMS in [0, 1] for a sample window.
export function rms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

// Generate a mono/stereo sine tone WAV via ffmpeg. Silence-prefixed if requested.
export async function generateToneWav(outPath, {
  freq, seconds, sampleRate = 44100, channels = 2, silenceLeadSeconds = 0,
}) {
  await mkdir(join(outPath, '..'), { recursive: true });
  const args = ['-y', '-hide_banner', '-nostdin', '-loglevel', 'error'];
  if (silenceLeadSeconds > 0) {
    args.push(
      '-f', 'lavfi', '-i',
        `anullsrc=r=${sampleRate}:cl=${channels === 2 ? 'stereo' : 'mono'}:d=${silenceLeadSeconds}`,
      '-f', 'lavfi', '-i',
        `sine=frequency=${freq}:sample_rate=${sampleRate}:duration=${seconds - silenceLeadSeconds}`,
      '-filter_complex', channels === 2
        ? '[0][1:a]concat=n=2:v=0:a=1[a];[a]pan=stereo|c0=c0|c1=c0[out]'
        : '[0][1:a]concat=n=2:v=0:a=1[out]',
      '-map', '[out]',
    );
  } else {
    args.push(
      '-f', 'lavfi', '-i',
        `sine=frequency=${freq}:sample_rate=${sampleRate}:duration=${seconds}`,
      '-ac', String(channels),
    );
  }
  args.push('-ar', String(sampleRate), '-c:a', 'pcm_s16le', outPath);
  const r = spawnSync(FFMPEG_BIN, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  if (r.status !== 0) {
    throw new Error(`ffmpeg fixture generation failed: ${r.stderr?.toString() || ''}`);
  }
}
