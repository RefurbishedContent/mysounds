import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render, SAMPLE_RATE } from '../src/render.mjs';
import { generateToneWav, hasFfmpeg, readWav, monoWindow, goertzelMagnitude } from './helpers/wav.mjs';

test('smooth_crossfade: length = A + B - overlap, both tones present in overlap window', async (t) => {
  if (!hasFfmpeg()) { t.skip('ffmpeg not on PATH'); return; }
  const dir = await mkdtemp(join(tmpdir(), 'awt-cf-'));
  try {
    const a = join(dir, 'a.wav');
    const b = join(dir, 'b.wav');
    await generateToneWav(a, { freq: 440, seconds: 5 });
    await generateToneWav(b, { freq: 880, seconds: 4 });

    // A range = [1, 4] (3s), B range = [0.5, 2.5] (2s), overlap = 1s.
    // Expected output = 3 + 2 - 1 = 4s.
    const spec = {
      version: 1, mashUpGroup: 't', pairIndex: 0, isFirstPair: true, isLastPair: true,
      renderMode: 'smooth_crossfade', overlapSeconds: 1.0,
      songA: { uploadId: 'a', inputPath: a, sourceStart: 1.0, sourceEnd: 4.0, sourceDuration: 5 },
      songB: { uploadId: 'b', inputPath: b, sourceStart: 0.5, sourceEnd: 2.5, sourceDuration: 4 },
    };
    const out = join(dir, 'out.wav');
    const r = await render(spec, out);
    assert.equal(r.samples, 4 * SAMPLE_RATE);

    const wav = await readWav(out);
    assert.equal(wav.samples, 4 * SAMPLE_RATE);

    // Windows:
    //   pure A: [0.2s .. 1.5s)  -> only 440 Hz
    //   overlap: [2.05s .. 2.95s) -> both 440 Hz and 880 Hz
    //   pure B: [3.2s .. 3.9s)  -> only 880 Hz
    const winSamples = Math.floor(0.8 * SAMPLE_RATE);
    const pureA = monoWindow(wav, Math.floor(0.2 * SAMPLE_RATE), winSamples);
    const overlap = monoWindow(wav, Math.floor(2.05 * SAMPLE_RATE), Math.floor(0.9 * SAMPLE_RATE));
    const pureB = monoWindow(wav, Math.floor(3.2 * SAMPLE_RATE), Math.floor(0.7 * SAMPLE_RATE));

    const mag440A = goertzelMagnitude(pureA, SAMPLE_RATE, 440);
    const mag880A = goertzelMagnitude(pureA, SAMPLE_RATE, 880);
    assert.ok(mag440A > 0.3, `pureA 440 low: ${mag440A}`);
    assert.ok(mag880A < 0.05, `pureA 880 leak: ${mag880A}`);

    const mag440O = goertzelMagnitude(overlap, SAMPLE_RATE, 440);
    const mag880O = goertzelMagnitude(overlap, SAMPLE_RATE, 880);
    assert.ok(mag440O > 0.05, `overlap 440 too low (both should be present): ${mag440O}`);
    assert.ok(mag880O > 0.05, `overlap 880 too low (both should be present): ${mag880O}`);

    const mag440B = goertzelMagnitude(pureB, SAMPLE_RATE, 440);
    const mag880B = goertzelMagnitude(pureB, SAMPLE_RATE, 880);
    assert.ok(mag880B > 0.3, `pureB 880 low: ${mag880B}`);
    assert.ok(mag440B < 0.05, `pureB 440 leak: ${mag440B}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
