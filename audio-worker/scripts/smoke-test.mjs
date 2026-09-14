#!/usr/bin/env node
// End-to-end smoke test using two synthetic tone WAVs.
// Runs the same startup self-test the worker runs on boot (which exercises the
// probe + decoded-sample-count paths against the shipped ffmpeg + ffprobe),
// then renders a direct_cut and a smooth_crossfade and verifies both outputs.
// Run this INSIDE the final Docker image so it exercises the exact binaries
// that will run in production:
//   docker run --rm --entrypoint node <image> scripts/smoke-test.mjs

import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ffmpeg,
  probeAudio,
  countDecodedPcmSamples,
  runStartupSelfTest,
} from '../src/process.mjs';
import { render, SAMPLE_RATE } from '../src/render.mjs';
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

async function assertOutput(outPath, spec) {
  const probe = await probeAudio(outPath);
  if (probe.codec !== 'pcm_s16le') throw new Error(`smoke: codec ${probe.codec}`);
  if (probe.sampleRate !== SAMPLE_RATE) throw new Error(`smoke: sr ${probe.sampleRate}`);
  if (probe.channels !== 2) throw new Error(`smoke: channels ${probe.channels}`);
  if (!/wav/i.test(probe.formatName)) throw new Error(`smoke: format ${probe.formatName}`);
  const samples = await countDecodedPcmSamples(outPath);
  const expected = spec.renderMode === 'direct_cut'
    ? Math.round((3 + 2) * SAMPLE_RATE)
    : Math.round((3 + 2 - spec.overlapSeconds) * SAMPLE_RATE);
  if (Math.abs(samples - expected) > 1) {
    throw new Error(`smoke: samples ${samples} vs expected ${expected}`);
  }
}

async function main() {
  // Exercise the exact probe + decoded-sample-count paths that fail fast in the
  // presence of a bad ffmpeg/ffprobe build. This is the check that would have
  // caught the "-count_samples 1" regression before deploy.
  const selfTest = await runStartupSelfTest();
  process.stdout.write(JSON.stringify({ selfTest }) + '\n');

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
    await assertOutput(outDirect, specDirect);

    const outCross = join(dir, 'cross.wav');
    const specCross = { ...specBase(dir, a, b), renderMode: 'smooth_crossfade', overlapSeconds: 1 };
    const rCross = await render(specCross, outCross);
    const vCross = await verify(outCross, specCross);
    process.stdout.write(JSON.stringify({ crossfade: { render: rCross, verify: vCross } }) + '\n');
    if (!vCross.ok) throw new Error('smooth_crossfade verification failed');
    await assertOutput(outCross, specCross);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(e => {
  process.stderr.write(`smoke failed: ${e.message}\n`);
  process.exit(1);
});
