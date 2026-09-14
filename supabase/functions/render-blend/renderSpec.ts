// Deno-side copy of src/lib/renderSpec.ts.
// KEEP IN SYNC. One canonical schema; two runtimes can't share a file.

export const RENDER_SPEC_VERSION = 1;
export const MAX_TRANSITION_BLEND_SECONDS = 10;

export type RenderMode = 'direct_cut' | 'smooth_crossfade' | 'template';

export interface RenderSpecSong {
  uploadId: string;
  sourceStart: number;
  sourceEnd: number;
  sourceDuration: number;
  storageBucket: string;
  storagePath: string;
  sourceContentHash: string;
}

export interface RenderSpecTemplateRef {
  templateId: string;
  templateName: string;
  templateStorageBucket: string | null;
  templateStoragePath: string | null;
}

export interface RenderSpec {
  version: number;
  mashUpGroup: string;
  pairIndex: number;
  isFirstPair: boolean;
  isLastPair: boolean;
  songA: RenderSpecSong;
  songB: RenderSpecSong;
  renderMode: RenderMode;
  overlapSeconds: number;
  templateRef?: RenderSpecTemplateRef;
  expectedContribution: {
    songASeconds: number;
    songBSeconds: number;
    outputSeconds: number;
  };
}

export interface BuildRenderSpecInput {
  mashUpGroup: string;
  pairIndex: number;
  isFirstPair: boolean;
  isLastPair: boolean;
  songA: RenderSpecSong;
  songB: RenderSpecSong;
  renderMode: RenderMode;
  overlapSeconds: number;
  templateRef?: RenderSpecTemplateRef;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeOutputSeconds(
  lenA: number,
  lenB: number,
  renderMode: RenderMode,
  overlapSeconds: number,
): number {
  if (renderMode === 'direct_cut') return lenA + lenB;
  return lenA + lenB - overlapSeconds;
}

export function validateRenderSpecInput(input: BuildRenderSpecInput): void {
  const { songA, songB, renderMode, overlapSeconds, templateRef } = input;

  for (const [label, s] of [['songA', songA], ['songB', songB]] as const) {
    if (!s.uploadId) throw new Error(`RenderSpec: ${label}.uploadId is required`);
    if (!s.storagePath) throw new Error(`RenderSpec: ${label}.storagePath is required`);
    if (!s.storageBucket) throw new Error(`RenderSpec: ${label}.storageBucket is required`);
    if (!s.sourceContentHash) throw new Error(`RenderSpec: ${label}.sourceContentHash is required`);
    if (!(s.sourceDuration > 0)) throw new Error(`RenderSpec: ${label}.sourceDuration must be > 0`);
    if (!(s.sourceStart >= 0)) throw new Error(`RenderSpec: ${label}.sourceStart must be >= 0`);
    if (!(s.sourceEnd > s.sourceStart)) throw new Error(`RenderSpec: ${label}.sourceEnd must be > sourceStart`);
    if (s.sourceEnd > s.sourceDuration + 0.01) {
      throw new Error(`RenderSpec: ${label}.sourceEnd exceeds sourceDuration`);
    }
  }

  const lenA = songA.sourceEnd - songA.sourceStart;
  const lenB = songB.sourceEnd - songB.sourceStart;

  if (overlapSeconds < 0) throw new Error('RenderSpec: overlapSeconds must be >= 0');
  if (overlapSeconds > MAX_TRANSITION_BLEND_SECONDS + 1e-6) {
    throw new Error(`RenderSpec: overlapSeconds exceeds maximum ${MAX_TRANSITION_BLEND_SECONDS}s`);
  }
  if (overlapSeconds > lenA + 1e-6 || overlapSeconds > lenB + 1e-6) {
    throw new Error('RenderSpec: overlapSeconds cannot exceed either selection length');
  }

  if (renderMode === 'direct_cut') {
    if (overlapSeconds !== 0) throw new Error('RenderSpec: direct_cut requires overlapSeconds === 0');
    if (templateRef) throw new Error('RenderSpec: direct_cut cannot have templateRef');
  } else {
    if (!(overlapSeconds > 0)) {
      throw new Error(`RenderSpec: ${renderMode} requires overlapSeconds > 0`);
    }
  }

  if (renderMode === 'template') {
    if (!templateRef || !templateRef.templateId) {
      throw new Error('RenderSpec: template mode requires templateRef.templateId');
    }
  } else if (renderMode === 'smooth_crossfade' && templateRef) {
    throw new Error('RenderSpec: smooth_crossfade cannot carry templateRef');
  }
}

export function buildRenderSpec(input: BuildRenderSpecInput): RenderSpec {
  validateRenderSpecInput(input);
  const lenA = input.songA.sourceEnd - input.songA.sourceStart;
  const lenB = input.songB.sourceEnd - input.songB.sourceStart;
  return {
    version: RENDER_SPEC_VERSION,
    mashUpGroup: input.mashUpGroup,
    pairIndex: input.pairIndex,
    isFirstPair: input.isFirstPair,
    isLastPair: input.isLastPair,
    songA: {
      uploadId: input.songA.uploadId,
      sourceStart: round3(input.songA.sourceStart),
      sourceEnd: round3(input.songA.sourceEnd),
      sourceDuration: round3(input.songA.sourceDuration),
      storageBucket: input.songA.storageBucket,
      storagePath: input.songA.storagePath,
      sourceContentHash: input.songA.sourceContentHash,
    },
    songB: {
      uploadId: input.songB.uploadId,
      sourceStart: round3(input.songB.sourceStart),
      sourceEnd: round3(input.songB.sourceEnd),
      sourceDuration: round3(input.songB.sourceDuration),
      storageBucket: input.songB.storageBucket,
      storagePath: input.songB.storagePath,
      sourceContentHash: input.songB.sourceContentHash,
    },
    renderMode: input.renderMode,
    overlapSeconds: round3(input.overlapSeconds),
    ...(input.templateRef ? { templateRef: input.templateRef } : {}),
    expectedContribution: {
      songASeconds: round3(lenA),
      songBSeconds: round3(lenB),
      outputSeconds: round3(computeOutputSeconds(lenA, lenB, input.renderMode, input.overlapSeconds)),
    },
  };
}
