import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSpec } from '../src/render.mjs';

function base() {
  return {
    version: 1, mashUpGroup: 't', pairIndex: 0, isFirstPair: true, isLastPair: true,
    renderMode: 'direct_cut', overlapSeconds: 0,
    songA: { uploadId: 'a', inputPath: '/x/a.wav', sourceStart: 0, sourceEnd: 2, sourceDuration: 5 },
    songB: { uploadId: 'b', inputPath: '/x/b.wav', sourceStart: 0, sourceEnd: 2, sourceDuration: 5 },
  };
}

const cases = [
  ['exportOptions.normalize',   { normalize: true },            /normalize/ ],
  ['exportOptions.fadeIn',      { fadeIn: 0.5 },                /fadeIn/    ],
  ['exportOptions.fadeOut',     { fadeOut: 0.5 },               /fadeOut/   ],
  ['exportOptions.format=mp3',  { format: 'mp3' },              /format/    ],
  ['exportOptions.format=flac', { format: 'flac' },             /format/    ],
  ['exportOptions.bitDepth=24', { bitDepth: 24 },               /bitDepth/  ],
  ['exportOptions.sampleRate',  { sampleRate: 48000 },          /sampleRate/],
  ['exportOptions.quality=bad', { quality: 'ultra' },           /quality/   ],
  ['exportOptions.unknown',     { chorusHalfLife: true },       /chorusHalfLife/ ],
];

for (const [label, exp, expected] of cases) {
  test(`rejects unsupported ${label}`, () => {
    const spec = { ...base(), exportOptions: exp };
    assert.throws(() => validateSpec(spec), expected);
  });
}

test('rejects output.format != wav', () => {
  const spec = { ...base(), output: { format: 'mp3' } };
  assert.throws(() => validateSpec(spec), /output\.format/);
});
test('rejects output.sampleRate != 44100', () => {
  const spec = { ...base(), output: { sampleRate: 48000 } };
  assert.throws(() => validateSpec(spec), /output\.sampleRate/);
});
test('rejects output.channels != 2', () => {
  const spec = { ...base(), output: { channels: 1 } };
  assert.throws(() => validateSpec(spec), /output\.channels/);
});
test('rejects output.bitDepth != 16', () => {
  const spec = { ...base(), output: { bitDepth: 24 } };
  assert.throws(() => validateSpec(spec), /output\.bitDepth/);
});
test('rejects renderMode="template"', () => {
  const spec = { ...base(), renderMode: 'template', overlapSeconds: 1, templateRef: { templateId: 't', templateName: 'x', templateAudioUrl: null } };
  assert.throws(() => validateSpec(spec), /template/);
});
