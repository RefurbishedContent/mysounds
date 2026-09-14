#!/usr/bin/env node
// End-to-end smoke test using two synthetic tone WAVs.
// Renders a direct_cut and a smooth_crossfade, then verifies both outputs.
// Requires ffmpeg + ffprobe on PATH (or configured via env).

import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ffmpeg } from '../src/process.mjs';
import { render } from '../src/render.mjs';
import { verify } from './verify-output.mjs';

async function makeTone(outPath, freq, seconds) {
  await ffmpeg([
    '-f', 'lavfi',
    '-i', `sine=frequency=${freq}:sample_rate=44100:duration=${seconds}`,
    '-ac', '2',
    '-c:a', 'pcm_s16le',
    outPath,
  ]);
}

function specBase(dir, aPath, bPath) {
  return {
    version: 1,
    mashUpGroup: 'smoke',
    pairIndex: 0,
    isFirstPair: true,
    isLastPair: true,
    songA: { uploadId: 'a', inputPath: aPath, sourceStart: 0, sourceEnd: 3, sourceDuration: 5 },
    songB: { uploadId: 'b', inputPath: bPath, sourceStart: 0, sourceEnd: 2, sourceDuration: 4 },
  };
}

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'audio-worker-smoke-'));
  try {
    const a = join(dir, 'a.wav');
    const b = join(dir, 'b.wav');
    await makeTone(a, 440, 5);
    await makeTone(b, 880, 4);

    const outDirect = join(dir, 'direct.wav');
    const specDirect = { ...specBase(dir, a, b), renderMode: 'direct_cut', overlapSeconds: 0 };
    const rDirect = await render(specDirect, outDirect);
    const vDirect = await verify(outDirect, specDirect);
    process.stdout.write(JSON.stringify({ direct: { render: rDirect, verify: vDirect } }) + '\n');
    if (!vDirect.ok) throw new Error('direct_cut verification failed');

    const outCross = join(dir, 'cross.wav');
    const specCross = { ...specBase(dir, a, b), renderMode: 'smooth_crossfade', overlapSeconds: 1 };
    const rCross = await render(specCross, outCross);
    const vCross = await verify(outCross, specCross);
    process.stdout.write(JSON.stringify({ crossfade: { render: rCross, verify: vCross } }) + '\n');
    if (!vCross.ok) throw new Error('smooth_crossfade verification failed');
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(e => {
  process.stderr.write(`smoke failed: ${e.message}\n`);
  process.exit(1);
});
