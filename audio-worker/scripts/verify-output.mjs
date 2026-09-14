#!/usr/bin/env node
// Verify a WAV against an (optional) spec: container, codec, sample rate,
// channels, bit depth, and sample count. Exits non-zero on any mismatch.
//
// Usage:
//   node scripts/verify-output.mjs --out <path.wav>
//   node scripts/verify-output.mjs --out <path.wav> --spec <spec.json>

import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import {
  SAMPLE_RATE, CHANNELS, BIT_DEPTH,
  validateSpec,
} from '../src/render.mjs';
import { probeAudio, countAudioSamples } from '../src/process.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--spec') args.spec = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function abspath(p) {
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

export async function verify(outPath, spec) {
  const probe = await probeAudio(outPath);
  const failures = [];
  if (!/wav/i.test(probe.formatName)) failures.push(`format=${probe.formatName} (expected wav)`);
  if (probe.codec !== 'pcm_s16le') failures.push(`codec=${probe.codec} (expected pcm_s16le)`);
  if (probe.sampleRate !== SAMPLE_RATE) failures.push(`sampleRate=${probe.sampleRate} (expected ${SAMPLE_RATE})`);
  if (probe.channels !== CHANNELS) failures.push(`channels=${probe.channels} (expected ${CHANNELS})`);
  if (probe.bitsPerSample && probe.bitsPerSample !== BIT_DEPTH) {
    failures.push(`bitsPerSample=${probe.bitsPerSample} (expected ${BIT_DEPTH})`);
  }
  const samples = await countAudioSamples(outPath);
  let expectedSamples = null;
  if (spec) {
    const v = validateSpec(spec);
    expectedSamples = v._computed.expectedTotalSamples;
    if (Math.abs(samples - expectedSamples) > 1) {
      failures.push(`samples=${samples} (expected ${expectedSamples})`);
    }
  }
  return { ok: failures.length === 0, failures, probe, samples, expectedSamples };
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`${e.message}\n`); process.exit(1); }
  if (args.help || !args.out) {
    process.stdout.write('Usage: verify-output.mjs --out <path.wav> [--spec <spec.json>]\n');
    process.exit(args.help ? 0 : 1);
  }
  let spec = null;
  if (args.spec) {
    spec = JSON.parse(await readFile(abspath(args.spec), 'utf8'));
  }
  try {
    const result = await verify(abspath(args.out), spec);
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(result.ok ? 0 : 4);
  } catch (e) {
    process.stderr.write(JSON.stringify({ ok: false, error: e.message }) + '\n');
    process.exit(3);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
