import { MAX_TRANSITION_BLEND_SECONDS } from '../components/mashup/constants';

export const RENDER_SPEC_VERSION = 1;

export type RenderMode = 'direct_cut' | 'smooth_crossfade' | 'template';

export interface RenderSpecSong {
  uploadId: string;
  sourceStart: number;
  sourceEnd: number;
  sourceDuration: number;
}

export interface RenderSpecTemplateRef {
  templateId: string;
  templateName: string;
  templateAudioUrl: string | null;
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
  overlapSeconds: number
): number {
  if (renderMode === 'direct_cut') return lenA + lenB;
  return lenA + lenB - overlapSeconds;
}

export function validateRenderSpecInput(input: BuildRenderSpecInput): void {
  const { songA, songB, renderMode, overlapSeconds, templateRef } = input;

  for (const [label, s] of [['songA', songA], ['songB', songB]] as const) {
    if (!s.uploadId) throw new Error(`RenderSpec: ${label}.uploadId is required`);
    if (!(s.sourceDuration > 0)) throw new Error(`RenderSpec: ${label}.sourceDuration must be > 0`);
    if (!(s.sourceStart >= 0)) throw new Error(`RenderSpec: ${label}.sourceStart must be >= 0`);
    if (!(s.sourceEnd > s.sourceStart)) throw new Error(`RenderSpec: ${label}.sourceEnd must be > sourceStart`);
    if (s.sourceEnd > s.sourceDuration + 0.01) {
      throw new Error(`RenderSpec: ${label}.sourceEnd (${s.sourceEnd}) exceeds sourceDuration (${s.sourceDuration})`);
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
    if (overlapSeconds !== 0) {
      throw new Error('RenderSpec: direct_cut requires overlapSeconds === 0');
    }
    if (templateRef) throw new Error('RenderSpec: direct_cut cannot have templateRef');
  } else {
    if (!(overlapSeconds > 0)) {
      throw new Error(`RenderSpec: ${renderMode} requires overlapSeconds > 0 (explicit zero rejected)`);
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
    },
    songB: {
      uploadId: input.songB.uploadId,
      sourceStart: round3(input.songB.sourceStart),
      sourceEnd: round3(input.songB.sourceEnd),
      sourceDuration: round3(input.songB.sourceDuration),
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

interface LegacyLike {
  metadata?: any;
  songAId: string;
  songBId: string;
  songAEndTime?: number;
  songBStartTime?: number;
  transitionDuration?: number;
  templateId?: string | null;
}

export function reconstructRenderSpec(
  transition: LegacyLike,
  fallbackDurations: { songA?: number; songB?: number } = {}
): RenderSpec | null {
  const md = transition.metadata || {};
  if (md.renderSpec && md.renderSpec.version) {
    return md.renderSpec as RenderSpec;
  }

  const startA = md.songAFullClipStart;
  const endA = md.songAFullClipEnd;
  const startB = md.songBFullClipStart;
  const endB = md.songBFullClipEnd;
  if (
    typeof startA !== 'number' || typeof endA !== 'number' ||
    typeof startB !== 'number' || typeof endB !== 'number'
  ) {
    return null;
  }

  const durationA = fallbackDurations.songA ?? Math.max(endA, startA + 1);
  const durationB = fallbackDurations.songB ?? Math.max(endB, startB + 1);
  const explicitDirect = md.directCut === true || md.renderMode === 'direct_cut';
  const overlap = explicitDirect ? 0 : Math.min(
    MAX_TRANSITION_BLEND_SECONDS,
    Math.max(0, transition.transitionDuration ?? 0),
    Math.max(0, endA - startA),
    Math.max(0, endB - startB)
  );
  const renderMode: RenderMode = explicitDirect
    ? 'direct_cut'
    : (transition.templateId ? 'template' : 'smooth_crossfade');

  const templateRef: RenderSpecTemplateRef | undefined =
    renderMode === 'template' && transition.templateId
      ? {
          templateId: transition.templateId,
          templateName: md.templateName || 'Template',
          templateAudioUrl: md.templateAudioUrl ?? null,
        }
      : undefined;

  try {
    return buildRenderSpec({
      mashUpGroup: md.mashUpGroup || '',
      pairIndex: md.pairIndex ?? 0,
      isFirstPair: (md.pairIndex ?? 0) === 0,
      isLastPair: md.isLastPair === true,
      songA: { uploadId: transition.songAId, sourceStart: startA, sourceEnd: endA, sourceDuration: durationA },
      songB: { uploadId: transition.songBId, sourceStart: startB, sourceEnd: endB, sourceDuration: durationB },
      renderMode,
      overlapSeconds: overlap,
      templateRef,
    });
  } catch {
    return null;
  }
}
