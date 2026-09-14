import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render, validateSpec } from '../src/render.mjs';
import { generateToneWav, hasFfmpeg } from './helpers/wav.mjs';

function baseSpec(a, b) {
  return {
    version: 1, mashUpGroup: 't', pairIndex: 0, isFirstPair: true, isLastPair: true,
    renderMode: 'direct_cut', overlapSeconds: 0,
    songA: { uploadId: 'a', inputPath: a, sourceStart: 0, sourceEnd: 2, sourceDuration: 5 },
    songB: { uploadId: 'b', inputPath: b, sourceStart: 0, sourceEnd: 2, sourceDuration: 4 },
  };
}

async function fileExists(p) { try { await access(p); return true; } catch { return false; } }

test('invalid bounds: sourceEnd > sourceDuration is rejected before I/O', () => {
  const spec = baseSpec('/nonexistent/a.wav', '/nonexistent/b.wav');
  spec.songA.sourceEnd = 999;
  assert.throws(() => validateSpec(spec), /sourceEnd .* exceeds sourceDuration/);
});

test('invalid bounds: sourceStart >= sourceEnd is rejected', () => {
  const spec = baseSpec('/x/a.wav', '/x/b.wav');
  spec.songA.sourceStart = 3; spec.songA.sourceEnd = 3;
  assert.throws(() => validateSpec(spec), /sourceEnd must be a finite number > sourceStart/);
});

test('invalid bounds: overlapSeconds exceeds a selection length is rejected', () => {
  const spec = baseSpec('/x/a.wav', '/x/b.wav');
  spec.renderMode = 'smooth_crossfade';
  spec.overlapSeconds = 5;
  assert.throws(() => validateSpec(spec), /overlapSeconds cannot exceed either selection length/);
});

test('invalid bounds: direct_cut with non-zero overlap is rejected', () => {
  const spec = baseSpec('/x/a.wav', '/x/b.wav');
  spec.overlapSeconds = 1;
  assert.throws(() => validateSpec(spec), /direct_cut requires overlapSeconds === 0/);
});

test('probe-time rejection: sourceEnd beyond real file duration and no output written', async (t) => {
  if (!hasFfmpeg()) { t.skip('ffmpeg not on PATH'); return; }
  const dir = await mkdtemp(join(tmpdir(), 'awt-inv-'));
  try {
    const a = join(dir, 'a.wav');
    const b = join(dir, 'b.wav');
    await generateToneWav(a, { freq: 440, seconds: 2 });
    await generateToneWav(b, { freq: 880, seconds: 2 });

    const spec = baseSpec(a, b);
    // Claim more than actually exists (sourceDuration lies).
    spec.songA.sourceEnd = 5;
    spec.songA.sourceDuration = 5;

    const out = join(dir, 'out.wav');
    await assert.rejects(render(spec, out), /exceeds actual duration/);
    assert.equal(await fileExists(out), false, 'output must not exist on rejection');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
