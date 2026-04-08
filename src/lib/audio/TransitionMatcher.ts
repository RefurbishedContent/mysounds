import { TransitionType, aiGenerationConfig } from '../../config/features';

// ============================================================
// TYPES
// ============================================================

export interface StemAnalysisData {
  stemId: string;
  trackId: string;
  stemType: 'drums' | 'bass' | 'vocals' | 'melody' | 'other';
  bpm: number | null;
  key: string;
  energyLevel: number;
  rmsVolume: number;
  harmonicContent: boolean;
  mixabilityScore: number;
  spectralCentroid: number;
  transientDensity: number;
  frequencyRange: { low: number; high: number };
  onsetPattern: number[];
  mixPoints: number[];
  aiTags: string[];
}

export interface StemInstruction {
  action: 'fade_in' | 'fade_out' | 'cut' | 'cut_in' | 'none' |
          'low_pass_sweep' | 'high_pass_release';
  curve?: 'linear' | 'exponential';
  start_ms?: number;
  end_ms?: number;
  at_ms?: number;
  from_hz?: number;
  to_hz?: number;
  duration_ms?: number;
}

export interface FxSuggestion {
  target: string;
  amount?: number;
  decay_ms?: number;
  feedback?: number;
  time_ms?: number;
}

export interface AIGenerationRequest {
  type: 'transition_fx' | 'musical_bridge' | 'vocal_drop';
  description: string;
  target_slot: string;
  constraints: {
    key: string;
    bpm: number;
    duration_ms: number;
    energy_curve: string;
    frequency_target: string;
  };
  source_api: null;
  generated_audio_url: null;
  fallback: string;
}

export interface MixPlanInstructions {
  transitionType: TransitionType;
  confidence: number;
  mixPointMs: number;
  durationMs: number;
  stemInstructions: Record<string, StemInstruction>;
  fxSuggestions: {
    reverb_send?: FxSuggestion;
    delay_throw?: FxSuggestion;
  };
  aiGenerationHooks: {
    enabled: boolean;
    requests: AIGenerationRequest[];
  };
  alternativeTransitions: Array<{ type: TransitionType; confidence: number }>;
}

export interface CompatibilityMatrix {
  stemScores: Record<string, number>;
  overallScore: number;
}

// ============================================================
// CAMELOT WHEEL
// ============================================================

const CAMELOT_POSITION: Record<string, number> = {
  'B': 1,  'Cbm': 1, 'Cb': 1,
  'F#': 2, 'Gb': 2,
  'Db': 3, 'C#': 3,
  'Ab': 4, 'G#': 4,
  'Eb': 5, 'D#': 5,
  'Bb': 6, 'A#': 6,
  'F':  7,
  'C':  8,
  'G':  9,
  'D':  10,
  'A':  11,
  'E':  12,
  'Abm': 1, 'G#m': 1,
  'Ebm': 2, 'D#m': 2,
  'Bbm': 3, 'A#m': 3,
  'Fm':  4,
  'Cm':  5,
  'Gm':  6,
  'Dm':  7,
  'Am':  8,
  'Em':  9,
  'Bm':  10,
  'F#m': 11, 'Gbm': 11,
  'C#m': 12, 'Dbm': 12,
};

const RELATIVE_MAJOR_MINOR: Record<string, string> = {
  'C': 'Am', 'G': 'Em', 'D': 'Bm', 'A': 'F#m', 'E': 'C#m', 'B': 'G#m',
  'F#': 'D#m', 'Db': 'Bbm', 'Ab': 'Fm', 'Eb': 'Cm', 'Bb': 'Gm', 'F': 'Dm',
  'Am': 'C', 'Em': 'G', 'Bm': 'D', 'F#m': 'A', 'C#m': 'E', 'G#m': 'B',
  'D#m': 'F#', 'Bbm': 'Db', 'Fm': 'Ab', 'Cm': 'Eb', 'Gm': 'Bb', 'Dm': 'F',
};

export function keyCompatibilityScore(keyA: string, keyB: string): number {
  if (!keyA || !keyB) return 0.5;
  if (keyA === keyB) return 1.0;
  if (RELATIVE_MAJOR_MINOR[keyA] === keyB) return 0.9;

  const posA = CAMELOT_POSITION[keyA];
  const posB = CAMELOT_POSITION[keyB];
  if (posA === undefined || posB === undefined) return 0.3;

  const diff = Math.min(Math.abs(posA - posB), 12 - Math.abs(posA - posB));
  if (diff === 0) return 1.0;
  if (diff === 1) return 0.8;
  if (diff === 2) return 0.6;
  return 0.2;
}

export function getCamelotPosition(key: string): number | null {
  return CAMELOT_POSITION[key] ?? null;
}

// ============================================================
// BPM PROXIMITY
// ============================================================

export function bpmProximityScore(bpmA: number | null, bpmB: number | null): number {
  if (bpmA === null || bpmB === null || bpmA === 0 || bpmB === 0) return 0.5;
  if (Math.abs(bpmA - bpmB) <= 1) return 1.0;

  const ratio = bpmA / bpmB;
  const pctDiff = Math.abs(ratio - 1);

  if (pctDiff <= 0.03) return 0.8;
  if (Math.abs(ratio - 2.0) <= 0.05 || Math.abs(ratio - 0.5) <= 0.025) return 0.7;
  if (pctDiff <= 0.06) return 0.5;
  return 0.2;
}

// ============================================================
// STEM COMPATIBILITY SCORER
// ============================================================

function energyDeltaScore(eA: number, eB: number): number {
  return Math.max(0, 1.0 - Math.abs(eA - eB) * 2);
}

function spectralOverlapScore(
  rA: { low: number; high: number },
  rB: { low: number; high: number }
): number {
  const overlapLow = Math.max(rA.low, rB.low);
  const overlapHigh = Math.min(rA.high, rB.high);
  if (overlapHigh <= overlapLow) return 0;
  const span = overlapHigh - overlapLow;
  const total = Math.max(rA.high, rB.high) - Math.min(rA.low, rB.low);
  return span / total;
}

function transientAlignmentScore(tdA: number, tdB: number): number {
  return Math.max(0, 1.0 - Math.abs(tdA - tdB));
}

function harmonicCompatibilityScore(hA: boolean, hB: boolean): number {
  if (hA && hB) return 1.0;
  if (!hA && !hB) return 0.8;
  return 0.5;
}

function rmsBalanceScore(rmsA: number, rmsB: number): number {
  const maxVal = Math.max(rmsA, rmsB);
  if (maxVal === 0) return 1.0;
  const ratio = Math.min(rmsA, rmsB) / maxVal;
  return Math.min(1.0, ratio * 1.5);
}

export function scoreStemPair(a: StemAnalysisData, b: StemAnalysisData): number {
  return (
    keyCompatibilityScore(a.key, b.key)                            * 0.25 +
    bpmProximityScore(a.bpm, b.bpm)                                * 0.20 +
    energyDeltaScore(a.energyLevel, b.energyLevel)                 * 0.15 +
    spectralOverlapScore(a.frequencyRange, b.frequencyRange)        * 0.15 +
    transientAlignmentScore(a.transientDensity, b.transientDensity) * 0.10 +
    harmonicCompatibilityScore(a.harmonicContent, b.harmonicContent)* 0.10 +
    rmsBalanceScore(a.rmsVolume, b.rmsVolume)                       * 0.05
  );
}

export function computeCompatibilityMatrix(
  stemsA: StemAnalysisData[],
  stemsB: StemAnalysisData[]
): CompatibilityMatrix {
  const stemTypes = ['drums', 'bass', 'vocals', 'melody', 'other'] as const;
  const stemScores: Record<string, number> = {};

  for (const type of stemTypes) {
    const sA = stemsA.find((s) => s.stemType === type);
    const sB = stemsB.find((s) => s.stemType === type);
    if (sA && sB) {
      stemScores[type] = scoreStemPair(sA, sB);
    }
  }

  const values = Object.values(stemScores);
  const overallScore = values.length > 0
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0.5;

  return { stemScores, overallScore };
}

// ============================================================
// TRANSITION TYPE SELECTOR
// ============================================================

export function selectTransitionType(
  matrix: CompatibilityMatrix,
  stemsA: StemAnalysisData[],
  stemsB: StemAnalysisData[]
): Array<{ type: TransitionType; confidence: number }> {
  const { stemScores, overallScore } = matrix;
  const get = (arr: StemAnalysisData[], type: string) => arr.find((s) => s.stemType === type);

  const drumsA = get(stemsA, 'drums');
  const drumsB = get(stemsB, 'drums');
  const bassA  = get(stemsA, 'bass');
  const bassB  = get(stemsB, 'bass');
  const vocalsA = get(stemsA, 'vocals');
  const melodyA = get(stemsA, 'melody');
  const melodyB = get(stemsB, 'melody');

  const repBpm = drumsA?.bpm ?? stemsA[0]?.bpm ?? null;
  const repBpmB = drumsB?.bpm ?? stemsB[0]?.bpm ?? null;
  const bpmScore = bpmProximityScore(repBpm, repBpmB);

  const keyScore = stemScores['vocals'] ?? stemScores['melody'] ?? 0.5;

  const avgEnergyA = stemsA.reduce((s, x) => s + x.energyLevel, 0) / Math.max(1, stemsA.length);
  const avgEnergyB = stemsB.reduce((s, x) => s + x.energyLevel, 0) / Math.max(1, stemsB.length);

  const candidates: Array<{ type: TransitionType; confidence: number }> = [];

  if (keyScore >= 0.8 && bpmScore >= 0.8 && Math.abs(avgEnergyA - avgEnergyB) < 0.2) {
    candidates.push({ type: 'harmonic_mix', confidence: Math.min(1, 0.5 + keyScore * 0.3 + bpmScore * 0.2) });
  }

  if (bassA && bassB && (stemScores['bass'] ?? 0) >= 0.6 && bpmScore >= 0.6) {
    candidates.push({ type: 'bass_swap', confidence: Math.min(1, 0.45 + (stemScores['bass'] ?? 0) * 0.4 + bpmScore * 0.15) });
  }

  if (vocalsA?.harmonicContent && melodyB && (stemScores['melody'] ?? 0) >= 0.5) {
    candidates.push({ type: 'acapella_over_instrumental', confidence: Math.min(1, 0.4 + (stemScores['vocals'] ?? 0) * 0.5) });
  }

  if (drumsA && drumsB && drumsA.energyLevel > 0.7 && drumsB.energyLevel > 0.7 && drumsA.transientDensity > 0.5) {
    candidates.push({ type: 'drop_swap', confidence: Math.min(1, 0.4 + drumsA.energyLevel * 0.4 + drumsB.energyLevel * 0.2) });
  }

  if (avgEnergyA - avgEnergyB > 0.3) {
    candidates.push({ type: 'echo_out', confidence: Math.min(1, 0.5 + (avgEnergyA - avgEnergyB) * 0.4) });
  }

  if (melodyA && melodyB && melodyA.energyLevel < 0.4 && melodyB.energyLevel < 0.4) {
    candidates.push({ type: 'breakdown_blend', confidence: 0.55 + overallScore * 0.1 });
  }

  if (drumsA && drumsB && (stemScores['drums'] ?? 0) >= 0.6 &&
      (stemScores['melody'] ?? 0) < 0.4 && (stemScores['vocals'] ?? 0) < 0.4) {
    candidates.push({ type: 'drum_swap', confidence: Math.min(1, 0.4 + (stemScores['drums'] ?? 0) * 0.4) });
  }

  if (overallScore >= 0.45 && overallScore < 0.75) {
    candidates.push({ type: 'stem_by_stem_crossfade', confidence: 0.3 + overallScore * 0.5 });
  }

  if (keyScore >= 0.9 && bpmScore >= 0.9 && avgEnergyA > 0.6 && avgEnergyB > 0.6) {
    candidates.push({ type: 'cold_cut', confidence: Math.min(1, 0.6 + bpmScore * 0.2 + keyScore * 0.2) });
  }

  candidates.push({ type: 'filter_fade', confidence: Math.max(0.2, 0.25 + overallScore * 0.35) });

  const seen = new Set<TransitionType>();
  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .filter((c) => {
      if (seen.has(c.type)) return false;
      seen.add(c.type);
      return true;
    })
    .slice(0, 5);
}

// ============================================================
// MIX POINT DETECTOR
// ============================================================

export function detectMixPoints(
  trackDurationMs: number,
  bpm: number | null,
  onsetPattern: number[]
): number[] {
  const points: number[] = [];

  if (bpm && bpm > 0) {
    const barMs = (60 / bpm) * 4 * 1000;
    const phraseLengths = [8, 16, 32];

    for (const phraseLen of phraseLengths) {
      const phraseMs = barMs * phraseLen;
      let t = phraseMs;
      while (t < trackDurationMs - phraseMs) {
        points.push(Math.round(t));
        t += phraseMs;
      }
    }
  }

  if (onsetPattern.length > 0) {
    for (let i = 1; i < onsetPattern.length - 1; i++) {
      const gap = onsetPattern[i + 1] - onsetPattern[i];
      if (gap > 2000) {
        points.push(onsetPattern[i]);
      }
    }
  }

  if (points.length === 0) {
    points.push(Math.floor(trackDurationMs * 0.75));
    points.push(Math.floor(trackDurationMs * 0.8));
    points.push(Math.floor(trackDurationMs * 0.85));
  }

  return [...new Set(points)].sort((a, b) => a - b);
}

// ============================================================
// STEM INSTRUCTIONS BUILDER
// ============================================================

function buildStemInstructions(
  transitionType: TransitionType,
  mixPointMs: number,
  durationMs: number
): Record<string, StemInstruction> {
  const endMs = mixPointMs + durationMs;
  const midMs = mixPointMs + Math.floor(durationMs / 2);

  if (transitionType === 'cold_cut') {
    const stems = ['drums', 'bass', 'vocals', 'melody', 'other'];
    return Object.fromEntries(
      stems.flatMap((s) => [
        [`${s}_A`, { action: 'cut' as const, at_ms: mixPointMs }],
        [`${s}_B`, { action: 'cut_in' as const, at_ms: mixPointMs }],
      ])
    );
  }

  const base: Record<string, StemInstruction> = {
    drums_A:  { action: 'fade_out', curve: 'linear',      start_ms: mixPointMs, end_ms: endMs },
    drums_B:  { action: 'fade_in',  curve: 'linear',      start_ms: mixPointMs, end_ms: endMs },
    bass_A:   { action: 'fade_out', curve: 'linear',      start_ms: mixPointMs, end_ms: endMs },
    bass_B:   { action: 'fade_in',  curve: 'linear',      start_ms: mixPointMs, end_ms: endMs },
    vocals_A: { action: 'fade_out', curve: 'exponential', start_ms: mixPointMs, end_ms: endMs },
    vocals_B: { action: 'none' },
    melody_A: { action: 'fade_out', curve: 'linear',      start_ms: mixPointMs, end_ms: endMs },
    melody_B: { action: 'fade_in',  curve: 'linear',      start_ms: mixPointMs, end_ms: endMs },
    other_A:  { action: 'fade_out', curve: 'linear',      start_ms: midMs,      end_ms: endMs },
    other_B:  { action: 'fade_in',  curve: 'linear',      start_ms: midMs,      end_ms: endMs },
  };

  switch (transitionType) {
    case 'bass_swap':
      base.bass_A  = { action: 'cut', at_ms: midMs };
      base.bass_B  = { action: 'cut_in', at_ms: midMs };
      base.melody_A = { action: 'low_pass_sweep', from_hz: 20000, to_hz: 500, duration_ms: durationMs };
      base.melody_B = { action: 'high_pass_release', from_hz: 2000, to_hz: 20, duration_ms: durationMs };
      break;
    case 'filter_fade':
      base.melody_A = { action: 'low_pass_sweep', from_hz: 20000, to_hz: 200, duration_ms: durationMs };
      base.melody_B = { action: 'high_pass_release', from_hz: 4000, to_hz: 20, duration_ms: durationMs };
      break;
    case 'drum_swap':
      base.drums_A = { action: 'cut', at_ms: midMs };
      base.drums_B = { action: 'cut_in', at_ms: midMs };
      break;
    case 'echo_out':
      base.vocals_A = { action: 'fade_out', curve: 'exponential', start_ms: mixPointMs, end_ms: endMs };
      base.melody_A = { action: 'low_pass_sweep', from_hz: 20000, to_hz: 100, duration_ms: durationMs };
      break;
    case 'drop_swap':
      base.drums_A = { action: 'cut', at_ms: midMs };
      base.drums_B = { action: 'cut_in', at_ms: midMs };
      base.bass_A  = { action: 'cut', at_ms: midMs };
      base.bass_B  = { action: 'cut_in', at_ms: midMs };
      break;
    case 'acapella_over_instrumental':
      base.vocals_B = { action: 'fade_in', curve: 'linear', start_ms: mixPointMs, end_ms: endMs };
      base.melody_A = { action: 'fade_out', curve: 'linear', start_ms: midMs, end_ms: endMs };
      base.melody_B = { action: 'fade_in', curve: 'linear', start_ms: mixPointMs, end_ms: midMs };
      break;
  }

  return base;
}

// ============================================================
// TRANSITION MATCHER (main entry point)
// ============================================================

export class TransitionMatcher {
  computeMixPlan(
    stemsA: StemAnalysisData[],
    stemsB: StemAnalysisData[],
    trackADurationMs = 180000
  ): MixPlanInstructions {
    const matrix = computeCompatibilityMatrix(stemsA, stemsB);
    const transitions = selectTransitionType(matrix, stemsA, stemsB);
    const best = transitions[0] ?? { type: 'filter_fade' as TransitionType, confidence: 0.3 };

    const repBpm = stemsA.find((s) => s.bpm)?.bpm ?? null;
    const onsets = stemsA.flatMap((s) => s.onsetPattern ?? []);
    const mixPoints = detectMixPoints(trackADurationMs, repBpm, onsets);
    const mixPointMs = mixPoints[Math.floor(mixPoints.length * 0.75)] ?? Math.floor(trackADurationMs * 0.8);
    const durationMs = 16000;

    const stemInstructions = buildStemInstructions(best.type, mixPointMs, durationMs);

    const keyA = stemsA.find((s) => s.key)?.key ?? '';
    const repBpmVal = repBpm ?? 128;

    const aiHookRequest: AIGenerationRequest = {
      type: 'transition_fx',
      description: 'riser_sweep',
      target_slot: 'between_A_and_B',
      constraints: {
        key: keyA,
        bpm: repBpmVal,
        duration_ms: 4000,
        energy_curve: 'ascending',
        frequency_target: 'mid_high',
      },
      source_api: null,
      generated_audio_url: null,
      fallback: 'standard_filter_sweep',
    };

    return {
      transitionType: best.type,
      confidence: best.confidence,
      mixPointMs,
      durationMs,
      stemInstructions,
      fxSuggestions: {
        reverb_send: { target: 'vocals_A', amount: 0.6, decay_ms: 3000 },
        delay_throw:  { target: 'melody_A', feedback: 0.4, time_ms: Math.round((60 / repBpmVal) * 1000 * 0.375) },
      },
      aiGenerationHooks: {
        enabled: aiGenerationConfig.enabled,
        requests: aiGenerationConfig.enabled ? [aiHookRequest] : [],
      },
      alternativeTransitions: transitions.slice(1),
    };
  }
}

export const transitionMatcher = new TransitionMatcher();
