// Orchestrates a single render job from a spec.
//
// Public surface:
//   validateSpec(spec) -> normalized spec (throws on invalid input)
//   render(spec, outputPath, opts) -> summary object
//
// The spec shape mirrors Layer 1's RenderSpec, plus a per-song `inputPath`
// (absolute path to a local audio file) and a top-level `output` block.
// See ../README.md for the exact contract.

import { mkdtemp, rm, rename, writeFile, mkdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, isAbsolute, dirname } from 'node:path';
import {
  ffmpeg,
  probeAudio,
  countAudioSamples,
  measurePeakDbfs,
} from './process.mjs';

export const SAMPLE_RATE = 44100;
export const CHANNELS = 2;
export const BIT_DEPTH = 16;
export const FORMAT = 'wav';
export const MAX_OVERLAP_SECONDS = 10;
export const PEAK_CEILING_DBFS = -1.0;

const SUPPORTED_QUALITIES = new Set(['draft', 'standard', 'high', 'lossless']);
const UNSUPPORTED_EXPORT_FLAGS = ['normalize', 'fadeIn', 'fadeOut'];

function isPlainObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function isNumber(v) { return typeof v === 'number' && Number.isFinite(v); }
function round3(n) { return Math.round(n * 1000) / 1000; }

function ensureAbsolute(label, p) {
  if (typeof p !== 'string' || p.length === 0) {
    throw new Error(`${label} is required and must be a string`);
  }
  if (!isAbsolute(p)) {
    throw new Error(`${label} must be an absolute path (got: ${p})`);
  }
  if (p.includes('\u0000')) {
    throw new Error(`${label} contains an invalid character`);
  }
  return p;
}

function validateSong(label, s) {
  if (!isPlainObject(s)) throw new Error(`${label} must be an object`);
  ensureAbsolute(`${label}.inputPath`, s.inputPath);
  if (typeof s.uploadId !== 'string' || s.uploadId.length === 0) {
    throw new Error(`${label}.uploadId must be a non-empty string`);
  }
  if (!isNumber(s.sourceStart) || s.sourceStart < 0) {
    throw new Error(`${label}.sourceStart must be a finite number >= 0`);
  }
  if (!isNumber(s.sourceEnd) || s.sourceEnd <= s.sourceStart) {
    throw new Error(`${label}.sourceEnd must be a finite number > sourceStart`);
  }
  if (!isNumber(s.sourceDuration) || s.sourceDuration <= 0) {
    throw new Error(`${label}.sourceDuration must be a finite number > 0`);
  }
  if (s.sourceEnd > s.sourceDuration + 0.01) {
    throw new Error(`${label}.sourceEnd (${s.sourceEnd}) exceeds sourceDuration (${s.sourceDuration})`);
  }
}

function validateOutput(out) {
  if (out === undefined) return; // optional; defaults applied below
  if (!isPlainObject(out)) throw new Error('output must be an object');
  if (out.format !== undefined && out.format !== FORMAT) {
    throw new Error(`Unsupported output.format="${out.format}"; worker v1 only produces wav`);
  }
  if (out.sampleRate !== undefined && out.sampleRate !== SAMPLE_RATE) {
    throw new Error(`Unsupported output.sampleRate=${out.sampleRate}; worker v1 only produces ${SAMPLE_RATE}`);
  }
  if (out.channels !== undefined && out.channels !== CHANNELS) {
    throw new Error(`Unsupported output.channels=${out.channels}; worker v1 only produces ${CHANNELS} (stereo)`);
  }
  if (out.bitDepth !== undefined && out.bitDepth !== BIT_DEPTH) {
    throw new Error(`Unsupported output.bitDepth=${out.bitDepth}; worker v1 only produces ${BIT_DEPTH}-bit PCM`);
  }
}

function validateExportOptions(exp) {
  if (exp === undefined) return;
  if (!isPlainObject(exp)) throw new Error('exportOptions must be an object');
  for (const key of UNSUPPORTED_EXPORT_FLAGS) {
    if (exp[key] !== undefined && exp[key] !== false && exp[key] !== 0) {
      throw new Error(`Unsupported exportOptions.${key}: worker v1 does not implement loudness normalization or fades`);
    }
  }
  if (exp.format !== undefined && exp.format !== FORMAT) {
    throw new Error(`Unsupported exportOptions.format="${exp.format}"; worker v1 only produces wav`);
  }
  if (exp.bitDepth !== undefined && exp.bitDepth !== BIT_DEPTH) {
    throw new Error(`Unsupported exportOptions.bitDepth=${exp.bitDepth}; worker v1 only produces ${BIT_DEPTH}-bit PCM`);
  }
  if (exp.sampleRate !== undefined && exp.sampleRate !== SAMPLE_RATE) {
    throw new Error(`Unsupported exportOptions.sampleRate=${exp.sampleRate}`);
  }
  if (exp.quality !== undefined && !SUPPORTED_QUALITIES.has(exp.quality)) {
    throw new Error(`Unsupported exportOptions.quality="${exp.quality}"`);
  }
  // `quality` is accepted but a no-op for the fixed PCM pipeline (documented in README).
  const known = new Set([...UNSUPPORTED_EXPORT_FLAGS, 'format', 'bitDepth', 'sampleRate', 'quality']);
  for (const key of Object.keys(exp)) {
    if (!known.has(key)) {
      throw new Error(`Unsupported exportOptions.${key}`);
    }
  }
}

export function validateSpec(spec) {
  if (!isPlainObject(spec)) throw new Error('spec must be a JSON object');
  if (spec.version !== 1) throw new Error(`spec.version must be 1 (got ${spec.version})`);

  if (typeof spec.mashUpGroup !== 'string') throw new Error('spec.mashUpGroup must be a string');
  if (!Number.isInteger(spec.pairIndex) || spec.pairIndex < 0) {
    throw new Error('spec.pairIndex must be a non-negative integer');
  }
  if (typeof spec.isFirstPair !== 'boolean') throw new Error('spec.isFirstPair must be boolean');
  if (typeof spec.isLastPair !== 'boolean') throw new Error('spec.isLastPair must be boolean');

  validateSong('spec.songA', spec.songA);
  validateSong('spec.songB', spec.songB);

  if (spec.renderMode === 'template') {
    throw new Error('renderMode="template" is not supported by the worker v1');
  }
  if (spec.renderMode !== 'direct_cut' && spec.renderMode !== 'smooth_crossfade') {
    throw new Error(`Unsupported renderMode="${spec.renderMode}"`);
  }

  if (!isNumber(spec.overlapSeconds) || spec.overlapSeconds < 0) {
    throw new Error('overlapSeconds must be a finite number >= 0');
  }
  if (spec.overlapSeconds > MAX_OVERLAP_SECONDS + 1e-6) {
    throw new Error(`overlapSeconds exceeds maximum ${MAX_OVERLAP_SECONDS}s`);
  }

  const lenA = spec.songA.sourceEnd - spec.songA.sourceStart;
  const lenB = spec.songB.sourceEnd - spec.songB.sourceStart;

  if (spec.renderMode === 'direct_cut') {
    if (spec.overlapSeconds !== 0) {
      throw new Error('direct_cut requires overlapSeconds === 0');
    }
    if (spec.templateRef) throw new Error('direct_cut cannot have templateRef');
  } else {
    if (!(spec.overlapSeconds > 0)) {
      throw new Error('smooth_crossfade requires overlapSeconds > 0 (explicit zero rejected)');
    }
    if (spec.overlapSeconds > lenA + 1e-6 || spec.overlapSeconds > lenB + 1e-6) {
      throw new Error('overlapSeconds cannot exceed either selection length');
    }
    if (spec.templateRef) throw new Error('smooth_crossfade cannot carry templateRef');
  }

  validateOutput(spec.output);
  validateExportOptions(spec.exportOptions);

  const expected = spec.renderMode === 'direct_cut'
    ? lenA + lenB
    : lenA + lenB - spec.overlapSeconds;

  return {
    ...spec,
    output: {
      format: FORMAT,
      sampleRate: SAMPLE_RATE,
      channels: CHANNELS,
      bitDepth: BIT_DEPTH,
    },
    _computed: {
      lenA: round3(lenA),
      lenB: round3(lenB),
      overlap: round3(spec.overlapSeconds),
      outputSeconds: round3(expected),
      samplesA: Math.round(lenA * SAMPLE_RATE),
      samplesB: Math.round(lenB * SAMPLE_RATE),
      overlapSamples: Math.round(spec.overlapSeconds * SAMPLE_RATE),
      expectedTotalSamples: Math.round(expected * SAMPLE_RATE),
    },
  };
}

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function extractRange(inputPath, sourceStart, sourceEnd, outPath) {
  const duration = sourceEnd - sourceStart;
  // Accurate seek: -ss after -i decodes from start to the seek point.
  // Force stereo 44100 float PCM so downstream stages are homogeneous.
  await ffmpeg([
    '-i', inputPath,
    '-ss', sourceStart.toFixed(6),
    '-t', duration.toFixed(6),
    '-vn',
    '-map', '0:a:0',
    '-ac', String(CHANNELS),
    '-ar', String(SAMPLE_RATE),
    '-c:a', 'pcm_f32le',
    '-f', 'wav',
    outPath,
  ], { timeoutMs: 180_000 });
}

async function concatFloatWavs(aPath, bPath, tmpDir, outPath) {
  const listPath = join(tmpDir, 'concat.txt');
  // The concat demuxer's list file needs literal paths; single-quote them and escape any quotes.
  const esc = (p) => `'${p.replace(/'/g, "'\\''")}'`;
  await writeFile(listPath, `file ${esc(aPath)}\nfile ${esc(bPath)}\n`);
  await ffmpeg([
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c:a', 'pcm_f32le',
    '-ar', String(SAMPLE_RATE),
    '-ac', String(CHANNELS),
    '-f', 'wav',
    outPath,
  ], { timeoutMs: 180_000 });
}

async function crossfadeFloatWavs(aPath, bPath, overlapSeconds, outPath) {
  // Triangular curves at both ends produce a linear equal-gain crossfade.
  const filter = `[0:a][1:a]acrossfade=d=${overlapSeconds.toFixed(6)}:c1=tri:c2=tri`;
  await ffmpeg([
    '-i', aPath,
    '-i', bPath,
    '-filter_complex', filter,
    '-c:a', 'pcm_f32le',
    '-ar', String(SAMPLE_RATE),
    '-ac', String(CHANNELS),
    '-f', 'wav',
    outPath,
  ], { timeoutMs: 180_000 });
}

async function encodeFinalPcm16(inputFloatWav, gainLinear, outPath) {
  const args = ['-i', inputFloatWav];
  if (gainLinear !== 1) {
    args.push('-af', `volume=${gainLinear.toFixed(6)}`);
  }
  args.push(
    '-c:a', 'pcm_s16le',
    '-ar', String(SAMPLE_RATE),
    '-ac', String(CHANNELS),
    '-f', 'wav',
    outPath,
  );
  await ffmpeg(args, { timeoutMs: 180_000 });
}

export async function render(rawSpec, outputPath, { keepTemp = false } = {}) {
  const spec = validateSpec(rawSpec);
  ensureAbsolute('outputPath', outputPath);
  await mkdir(dirname(outputPath), { recursive: true });

  for (const [label, s] of [['songA', spec.songA], ['songB', spec.songB]]) {
    if (!(await fileExists(s.inputPath))) {
      throw new Error(`${label}.inputPath does not exist: ${s.inputPath}`);
    }
    const probe = await probeAudio(s.inputPath);
    if (!Number.isFinite(probe.durationSeconds) || probe.durationSeconds <= 0) {
      throw new Error(`${label}: could not read duration from ${s.inputPath}`);
    }
    if (s.sourceEnd > probe.durationSeconds + 0.01) {
      throw new Error(
        `${label}: sourceEnd=${s.sourceEnd}s exceeds actual duration ${probe.durationSeconds.toFixed(3)}s`
      );
    }
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'audio-worker-'));
  const aExtract = join(tmpDir, 'a.f32.wav');
  const bExtract = join(tmpDir, 'b.f32.wav');
  const mixedFloat = join(tmpDir, 'mixed.f32.wav');
  const outTmp = join(tmpDir, 'out.wav');

  let appliedGainDb = 0;
  let peakDbfs = null;
  let mixedSamples = 0;

  try {
    await extractRange(spec.songA.inputPath, spec.songA.sourceStart, spec.songA.sourceEnd, aExtract);
    await extractRange(spec.songB.inputPath, spec.songB.sourceStart, spec.songB.sourceEnd, bExtract);

    const samplesA = await countAudioSamples(aExtract);
    const samplesB = await countAudioSamples(bExtract);
    const tolerance = 1;
    if (Math.abs(samplesA - spec._computed.samplesA) > tolerance) {
      throw new Error(
        `Extracted A sample count ${samplesA} differs from expected ${spec._computed.samplesA}`
      );
    }
    if (Math.abs(samplesB - spec._computed.samplesB) > tolerance) {
      throw new Error(
        `Extracted B sample count ${samplesB} differs from expected ${spec._computed.samplesB}`
      );
    }

    if (spec.renderMode === 'direct_cut') {
      await concatFloatWavs(aExtract, bExtract, tmpDir, mixedFloat);
    } else {
      await crossfadeFloatWavs(aExtract, bExtract, spec.overlapSeconds, mixedFloat);
    }

    mixedSamples = await countAudioSamples(mixedFloat);
    if (Math.abs(mixedSamples - spec._computed.expectedTotalSamples) > tolerance) {
      throw new Error(
        `Mixed sample count ${mixedSamples} differs from expected ${spec._computed.expectedTotalSamples}`
      );
    }

    const peak = await measurePeakDbfs(mixedFloat);
    peakDbfs = peak.peakDbfs;

    // Apply a single static linear gain if the mix exceeds the peak ceiling.
    // This is peak-limiting for clip protection ONLY. See README: this is
    // not loudness normalization.
    let gainLinear = 1;
    if (Number.isFinite(peakDbfs) && peakDbfs > PEAK_CEILING_DBFS) {
      appliedGainDb = PEAK_CEILING_DBFS - peakDbfs;
      gainLinear = Math.pow(10, appliedGainDb / 20);
    }

    await encodeFinalPcm16(mixedFloat, gainLinear, outTmp);
    await rename(outTmp, outputPath);
  } finally {
    if (!keepTemp) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  return {
    ok: true,
    outputPath,
    renderMode: spec.renderMode,
    samples: mixedSamples,
    seconds: round3(mixedSamples / SAMPLE_RATE),
    expectedSamples: spec._computed.expectedTotalSamples,
    peakDbfs,
    appliedGainDb: round3(appliedGainDb),
    tmpDir: keepTemp ? tmpDir : null,
  };
}
