import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render, SAMPLE_RATE } from '../src/render.mjs';
import { generateToneWav, hasFfmpeg, readWav, monoWindow, rms } from './helpers/wav.mjs';

test('sourceStart > 0 is respected: silence-lead file must produce non-silent output at t=0', async (t) => {
  if (!hasFfmpeg()) { t.skip('ffmpeg not on PATH'); return; }
  const dir = await mkdtemp(join(tmpdir(), 'awt-pos-'));
  try {
    // A: 1s silence + 4s of 440 Hz  (total 5s)
    // B: 1s silence + 3s of 880 Hz  (total 4s)
    const a = join(dir, 'a.wav');
    const b = join(dir, 'b.wav');
    await generateToneWav(a, { freq: 440, seconds: 5, silenceLeadSeconds: 1 });
    await generateToneWav(b, { freq: 880, seconds: 4, silenceLeadSeconds: 1 });

    // Pick source ranges that start AFTER the silence lead.
    const spec = {
      version: 1, mashUpGroup: 't', pairIndex: 0, isFirstPair: true, isLastPair: true,
      renderMode: 'direct_cut', overlapSeconds: 0,
      songA: { uploadId: 'a', inputPath: a, sourceStart: 1.5, sourceEnd: 3.5, sourceDuration: 5 },
      songB: { uploadId: 'b', inputPath: b, sourceStart: 1.2, sourceEnd: 2.7, sourceDuration: 4 },
    };
    const out = join(dir, 'out.wav');
    await render(spec, out);
    const wav = await readWav(out);

    // First 200ms of the output should be well above silence (tone, not lead-in silence).
    const head = monoWindow(wav, 0, Math.floor(0.2 * SAMPLE_RATE));
    const headRms = rms(head);
    assert.ok(headRms > 0.1, `output opens with silence — sourceStart ignored (rms=${headRms})`);

    // First 200ms after the boundary between A and B (A contributes 2s) should also be tone.
    const post = monoWindow(wav, Math.floor(2.0 * SAMPLE_RATE), Math.floor(0.2 * SAMPLE_RATE));
    const postRms = rms(post);
    assert.ok(postRms > 0.1, `B's sourceStart ignored — silence at boundary (rms=${postRms})`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
