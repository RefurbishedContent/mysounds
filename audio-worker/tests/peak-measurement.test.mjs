// Regression tests for the raw-f32le peak measurement path.
//
// Locks in the deterministic replacement for the old astats stderr parser:
//   * full-scale synthetic tone -> peakDbfs ~ 0
//   * silence -> peakDbfs = -Infinity, silent = true, does NOT throw
//   * over-unity float audio -> peakDbfs > 0 (limiter would engage)
//   * NaN / +Infinity samples -> descriptive throw
//   * odd chunk boundaries (Float32 split across chunks) match a one-shot read
//   * byte length not divisible by 4 -> descriptive throw

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import {
  ffmpeg,
  measurePeakDbfs,
  computePeakFromRawF32Stream,
} from '../src/process.mjs';
import { hasFfmpeg } from './helpers/wav.mjs';

function streamFromChunks(chunks) {
  const bufs = chunks.map(c => Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Readable.from(bufs);
}

function bufferOfFloats(floats) {
  const buf = Buffer.alloc(floats.length * 4);
  for (let i = 0; i < floats.length; i++) {
    buf.writeFloatLE(floats[i], i * 4);
  }
  return buf;
}

test('measurePeakDbfs: full-scale synthetic tone reads near 0 dBFS', async (t) => {
  if (!hasFfmpeg()) { t.skip('ffmpeg not on PATH'); return; }
  const dir = await mkdtemp(join(tmpdir(), 'peak-tone-'));
  try {
    const wav = join(dir, 'tone.wav');
    await ffmpeg([
      '-f', 'lavfi',
      '-i', 'sine=frequency=440:sample_rate=44100:duration=0.5',
      '-ac', '2',
      '-c:a', 'pcm_s16le',
      wav,
    ]);
    const result = await measurePeakDbfs(wav);
    assert.equal(result.silent, false);
    assert.ok(Number.isFinite(result.peakDbfs));
    assert.ok(
      Math.abs(result.peakDbfs) < 0.5,
      `full-scale tone peak ${result.peakDbfs} dBFS should be near 0`,
    );
    assert.ok(result.sampleCount > 0);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

test('measurePeakDbfs: silence returns -Infinity without throwing', async (t) => {
  if (!hasFfmpeg()) { t.skip('ffmpeg not on PATH'); return; }
  const dir = await mkdtemp(join(tmpdir(), 'peak-silence-'));
  try {
    const wav = join(dir, 'silence.wav');
    await ffmpeg([
      '-f', 'lavfi',
      '-i', 'anullsrc=r=44100:cl=stereo',
      '-t', '0.5',
      '-c:a', 'pcm_s16le',
      wav,
    ]);
    const result = await measurePeakDbfs(wav);
    assert.equal(result.silent, true);
    assert.equal(result.peakDbfs, -Infinity);
    assert.equal(result.maxAbs, 0);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

test('measurePeakDbfs: over-unity float32 WAV reports peakDbfs > 0', async (t) => {
  if (!hasFfmpeg()) { t.skip('ffmpeg not on PATH'); return; }
  const dir = await mkdtemp(join(tmpdir(), 'peak-overunity-'));
  try {
    const wav = join(dir, 'hot.wav');
    // Sum two full-scale tones into a single float32 channel -> peaks ~ +6 dBFS.
    await ffmpeg([
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=0.5',
      '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=44100:duration=0.5',
      '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=shortest:normalize=0[a]',
      '-map', '[a]',
      '-ac', '2',
      '-c:a', 'pcm_f32le',
      wav,
    ]);
    const result = await measurePeakDbfs(wav);
    assert.equal(result.silent, false);
    assert.ok(result.peakDbfs > 0, `expected peak > 0 dBFS, got ${result.peakDbfs}`);
    assert.ok(result.maxAbs > 1, `expected maxAbs > 1, got ${result.maxAbs}`);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

test('computePeakFromRawF32Stream: rejects NaN samples', async () => {
  const buf = bufferOfFloats([0.1, 0.2, Number.NaN, 0.3]);
  await assert.rejects(
    () => computePeakFromRawF32Stream(streamFromChunks([buf])),
    /non-finite sample/,
  );
});

test('computePeakFromRawF32Stream: rejects +Infinity samples', async () => {
  const buf = bufferOfFloats([0.1, Number.POSITIVE_INFINITY]);
  await assert.rejects(
    () => computePeakFromRawF32Stream(streamFromChunks([buf])),
    /non-finite sample/,
  );
});

test('computePeakFromRawF32Stream: rejects -Infinity samples', async () => {
  const buf = bufferOfFloats([0.1, Number.NEGATIVE_INFINITY]);
  await assert.rejects(
    () => computePeakFromRawF32Stream(streamFromChunks([buf])),
    /non-finite sample/,
  );
});

test('computePeakFromRawF32Stream: matches reference across odd chunk boundaries', async () => {
  const samples = [];
  for (let i = 0; i < 4096; i++) {
    samples.push(Math.sin(i * 0.017) * 0.9);
  }
  samples[1234] = -0.9999;
  samples[3000] = 0.75;
  const whole = bufferOfFloats(samples);

  const reference = await computePeakFromRawF32Stream(streamFromChunks([whole]));
  assert.equal(reference.silent, false);
  assert.ok(Math.abs(reference.maxAbs - 0.9999) < 1e-6);

  for (const step of [1, 3, 5, 7, 13, 17]) {
    const chunks = [];
    for (let off = 0; off < whole.length; off += step) {
      chunks.push(whole.subarray(off, Math.min(off + step, whole.length)));
    }
    const streamed = await computePeakFromRawF32Stream(streamFromChunks(chunks));
    assert.equal(streamed.sampleCount, reference.sampleCount, `step=${step} sampleCount`);
    assert.equal(streamed.byteCount, reference.byteCount, `step=${step} byteCount`);
    assert.equal(streamed.maxAbs, reference.maxAbs, `step=${step} maxAbs`);
    assert.equal(streamed.peakDbfs, reference.peakDbfs, `step=${step} peakDbfs`);
  }
});

test('computePeakFromRawF32Stream: byte length not divisible by 4 throws descriptively', async () => {
  const buf = Buffer.concat([bufferOfFloats([0.1, 0.2]), Buffer.from([0x00, 0x00, 0x00])]);
  await assert.rejects(
    () => computePeakFromRawF32Stream(streamFromChunks([buf])),
    /not divisible by 4/,
  );
});

test('computePeakFromRawF32Stream: empty stream is treated as silent', async () => {
  const result = await computePeakFromRawF32Stream(streamFromChunks([]));
  assert.equal(result.silent, true);
  assert.equal(result.peakDbfs, -Infinity);
  assert.equal(result.sampleCount, 0);
  assert.equal(result.byteCount, 0);
});
