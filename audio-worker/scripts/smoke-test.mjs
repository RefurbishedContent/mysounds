#!/usr/bin/env node
// End-to-end smoke test using synthetic tone WAVs.
//
// This test MUST be run inside the final Docker image so it exercises the
// EXACT ffmpeg + ffprobe binaries that will run in production:
//     docker run --rm --entrypoint node <image> scripts/smoke-test.mjs
//
// It covers:
//   * runStartupSelfTest      — probe + decoded-sample-count path (v1 regression)
//   * render (direct_cut)     — extract + concat + peak measurement + limiter
//   * render (smooth_crossfade) — extract + acrossfade + peak measurement + limiter
//   * verify()                — output verifier used by production
//   * measurePeakDbfs         — deterministic raw-f32le peak on the real output
//   * measurePeakDbfs (silence) — never throws, returns -Infinity

import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ffmpeg,
  probeAudio,
  countDecodedPcmSamples,
  measurePeakDbfs,
  runStartupSelfTest,
} from '../src/process.mjs';
import { render, SAMPLE_RATE, PEAK_CEILING_DBFS } from '../src/render.mjs';
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

async function makeSilence(outPath, seconds) {
  await ffmpeg([
    '-f', 'lavfi',
    '-i', `anullsrc=r=44100:cl=stereo`,
    '-t', String(seconds),
    '-c:a', 'pcm_s16le',
    outPath,
  ]);
}

function specBase(aPath, bPath) {
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

  const peak = await measurePeakDbfs(outPath);
  if (!Number.isFinite(peak.peakDbfs)) {
    throw new Error(`smoke: production peak path returned non-finite ${peak.peakDbfs}`);
  }
  if (peak.peakDbfs > PEAK_CEILING_DBFS + 0.05) {
    throw new Error(
      `smoke: output exceeds peak ceiling ${PEAK_CEILING_DBFS} dBFS (got ${peak.peakDbfs})`,
    );
  }
}

async function main() {
  const selfTest = await runStartupSelfTest();
  process.stdout.write(JSON.stringify({ selfTest }) + '\n');

  const dir = await mkdtemp(join(tmpdir(), 'audio-worker-smoke-'));
  try {
    const a = join(dir, 'a.wav');
    const b = join(dir, 'b.wav');
    await makeTone(a, 440, 5);
    await makeTone(b, 880, 4);

    const outDirect = join(dir, 'direct.wav');
    const specDirect = { ...specBase(a, b), renderMode: 'direct_cut', overlapSeconds: 0 };
    const rDirect = await render(specDirect, outDirect);
    const vDirect = await verify(outDirect, specDirect);
    process.stdout.write(JSON.stringify({ direct: { render: rDirect, verify: vDirect } }) + '\n');
    if (!vDirect.ok) throw new Error('direct_cut verification failed');
    await assertOutput(outDirect, specDirect);

    const outCross = join(dir, 'cross.wav');
    const specCross = { ...specBase(a, b), renderMode: 'smooth_crossfade', overlapSeconds: 1 };
    const rCross = await render(specCross, outCross);
    const vCross = await verify(outCross, specCross);
    process.stdout.write(JSON.stringify({ crossfade: { render: rCross, verify: vCross } }) + '\n');
    if (!vCross.ok) throw new Error('smooth_crossfade verification failed');
    await assertOutput(outCross, specCross);

    // Silence must NEVER throw and must report -Infinity.
    const silentPath = join(dir, 'silence.wav');
    await makeSilence(silentPath, 0.5);
    const silentPeak = await measurePeakDbfs(silentPath);
    if (silentPeak.peakDbfs !== -Infinity || silentPeak.silent !== true) {
      throw new Error(`smoke: silence peak wrong: ${JSON.stringify(silentPeak)}`);
    }
    process.stdout.write(JSON.stringify({ silence: silentPeak }) + '\n');
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(e => {
  process.stderr.write(`smoke failed: ${e.message}\n`);
  process.exit(1);
});
