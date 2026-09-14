#!/usr/bin/env node
// Local CLI: render one spec.json to one WAV.
// Usage: node scripts/render-local.mjs --spec <path> --out <path> [--keep-temp]

import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { render } from '../src/render.mjs';

const EXIT = {
  OK: 0,
  USAGE: 1,
  VALIDATION: 2,
  FFMPEG: 3,
  VERIFICATION: 4,
};

function parseArgs(argv) {
  const args = { keepTemp: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--spec') args.spec = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--keep-temp') args.keepTemp = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function printUsage() {
  process.stdout.write(
    'Usage: render-local.mjs --spec <spec.json> --out <output.wav> [--keep-temp]\n'
  );
}

function classifyError(err) {
  const m = String(err && err.message || err);
  if (/^(ffmpeg|ffprobe)\b/i.test(m)) return EXIT.FFMPEG;
  if (/(sample count|differs from expected|does not exist)/i.test(m)) return EXIT.VERIFICATION;
  return EXIT.VALIDATION;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) {
    process.stderr.write(JSON.stringify({ ok: false, error: e.message }) + '\n');
    printUsage();
    process.exit(EXIT.USAGE);
  }
  if (args.help || !args.spec || !args.out) {
    printUsage();
    process.exit(args.help ? EXIT.OK : EXIT.USAGE);
  }

  const specPath = isAbsolute(args.spec) ? args.spec : resolve(process.cwd(), args.spec);
  const outPath = isAbsolute(args.out) ? args.out : resolve(process.cwd(), args.out);

  let spec;
  try {
    const raw = await readFile(specPath, 'utf8');
    spec = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(JSON.stringify({ ok: false, error: `Failed to read spec: ${e.message}` }) + '\n');
    process.exit(EXIT.VALIDATION);
  }

  try {
    const summary = await render(spec, outPath, { keepTemp: args.keepTemp });
    process.stdout.write(JSON.stringify(summary) + '\n');
    process.exit(EXIT.OK);
  } catch (e) {
    const code = classifyError(e);
    process.stderr.write(JSON.stringify({ ok: false, error: e.message }) + '\n');
    process.exit(code);
  }
}

main();
