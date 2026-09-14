import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render, SAMPLE_RATE } from '../src/render.mjs';
import { generateToneWav, hasFfmpeg, readWav, monoWindow, goertzelMagnitude } from './helpers/wav.mjs';

test('direct_cut: length = A + B, order preserved, tones do not bleed', async (t) => {
  if (!hasFfmpeg()) { t.skip('ffmpeg not on PATH'); return; }
  const dir = await mkdtemp(join(tmpdir(), 'awt-dc-'));
  try {
    const a = join(dir, 'a.wav');
    const b = join(dir, 'b.wav');
    await generateToneWav(a, { freq: 440, seconds: 5 });
    await generateToneWav(b, { freq: 880, seconds: 4 });

    const spec = {
      version: 1, mashUpGroup: 't', pairIndex: 0, isFirstPair: true, isLastPair: true,
      renderMode: 'direct_cut', overlapSeconds: 0,
      songA: { uploadId: 'a', inputPath: a, sourceStart: 1.0, sourceEnd: 4.0, sourceDuration: 5 },
      songB: { uploadId: 'b', inputPath: b, sourceStart: 0.5, sourceEnd: 2.5, sourceDuration: 4 },
    };
    const out = join(dir, 'out.wav');
    const r = await render(spec, out);
    assert.equal(r.samples, 5 * SAMPLE_RATE);

    const wav = await readWav(out);
    assert.equal(wav.sampleRate, SAMPLE_RATE);
    assert.equal(wav.channels, 2);
    assert.equal(wav.bitsPerSample, 16);
    assert.equal(wav.samples, 5 * SAMPLE_RATE);

    // First half should be dominated by 440 Hz, second half by 880 Hz.
    const half = Math.floor(1.2 * SAMPLE_RATE);
    const firstA = monoWindow(wav, Math.floor(0.5 * SAMPLE_RATE), half);
    const secondA = monoWindow(wav, Math.floor(3.5 * SAMPLE_RATE), half);
    const mag440First = goertzelMagnitude(firstA, SAMPLE_RATE, 440);
    const mag880First = goertzelMagnitude(firstA, SAMPLE_RATE, 880);
    const mag440Second = goertzelMagnitude(secondA, SAMPLE_RATE, 440);
    const mag880Second = goertzelMagnitude(secondA, SAMPLE_RATE, 880);

    assert.ok(mag440First > 0.3, `first half 440Hz magnitude too low: ${mag440First}`);
    assert.ok(mag880First < 0.05, `first half 880Hz leakage too high: ${mag880First}`);
    assert.ok(mag880Second > 0.3, `second half 880Hz magnitude too low: ${mag880Second}`);
    assert.ok(mag440Second < 0.05, `second half 440Hz leakage too high: ${mag440Second}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
