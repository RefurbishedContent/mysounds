import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render, SAMPLE_RATE, BIT_DEPTH, CHANNELS, PEAK_CEILING_DBFS } from '../src/render.mjs';
import { probeAudio } from '../src/process.mjs';
import { generateToneWav, hasFfmpeg, readWav } from './helpers/wav.mjs';

async function assertOutputProperties(outPath, expectedSamples) {
  const wav = await readWav(outPath);
  assert.equal(wav.sampleRate, SAMPLE_RATE);
  assert.equal(wav.channels, CHANNELS);
  assert.equal(wav.bitsPerSample, BIT_DEPTH);
  assert.ok(Math.abs(wav.samples - expectedSamples) <= 1,
    `sample count ${wav.samples} vs expected ${expectedSamples}`);

  const probe = await probeAudio(outPath);
  assert.equal(probe.codec, 'pcm_s16le');
  assert.match(probe.formatName, /wav/i);

  // Peak must sit at or below the documented ceiling.
  let peak = 0;
  for (let i = 0; i < wav.pcm.length; i++) {
    const s = Math.abs(wav.pcm[i]);
    if (s > peak) peak = s;
  }
  const peakDbfs = 20 * Math.log10((peak || 1) / 32768);
  assert.ok(peakDbfs <= PEAK_CEILING_DBFS + 0.1,
    `peak ${peakDbfs.toFixed(2)} dBFS exceeded ceiling ${PEAK_CEILING_DBFS}`);
}

test('output properties: direct_cut yields spec-length 16-bit stereo WAV with safe peak', async (t) => {
  if (!hasFfmpeg()) { t.skip('ffmpeg not on PATH'); return; }
  const dir = await mkdtemp(join(tmpdir(), 'awt-out-'));
  try {
    const a = join(dir, 'a.wav');
    const b = join(dir, 'b.wav');
    await generateToneWav(a, { freq: 440, seconds: 3 });
    await generateToneWav(b, { freq: 880, seconds: 3 });
    const spec = {
      version: 1, mashUpGroup: 't', pairIndex: 0, isFirstPair: true, isLastPair: true,
      renderMode: 'direct_cut', overlapSeconds: 0,
      songA: { uploadId: 'a', inputPath: a, sourceStart: 0.2, sourceEnd: 2.7, sourceDuration: 3 },
      songB: { uploadId: 'b', inputPath: b, sourceStart: 0.5, sourceEnd: 2.5, sourceDuration: 3 },
    };
    const out = join(dir, 'out.wav');
    const r = await render(spec, out);
    assert.equal(r.samples, r.expectedSamples);
    await assertOutputProperties(out, Math.round(4.5 * SAMPLE_RATE));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('output properties: smooth_crossfade yields spec-length 16-bit stereo WAV with safe peak', async (t) => {
  if (!hasFfmpeg()) { t.skip('ffmpeg not on PATH'); return; }
  const dir = await mkdtemp(join(tmpdir(), 'awt-out-'));
  try {
    const a = join(dir, 'a.wav');
    const b = join(dir, 'b.wav');
    await generateToneWav(a, { freq: 440, seconds: 3 });
    await generateToneWav(b, { freq: 880, seconds: 3 });
    const spec = {
      version: 1, mashUpGroup: 't', pairIndex: 0, isFirstPair: true, isLastPair: true,
      renderMode: 'smooth_crossfade', overlapSeconds: 0.5,
      songA: { uploadId: 'a', inputPath: a, sourceStart: 0, sourceEnd: 3, sourceDuration: 3 },
      songB: { uploadId: 'b', inputPath: b, sourceStart: 0, sourceEnd: 3, sourceDuration: 3 },
    };
    const out = join(dir, 'out.wav');
    const r = await render(spec, out);
    await assertOutputProperties(out, r.expectedSamples);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
