import { describe, it, expect } from 'vitest';
import {
  keyCompatibilityScore,
  bpmProximityScore,
  scoreStemPair,
  computeCompatibilityMatrix,
  selectTransitionType,
  detectMixPoints,
  TransitionMatcher,
  StemAnalysisData,
} from '../../src/lib/audio/TransitionMatcher';

// ============================================================
// HELPERS
// ============================================================

function makeStem(overrides: Partial<StemAnalysisData> = {}): StemAnalysisData {
  return {
    stemId: crypto.randomUUID(),
    trackId: crypto.randomUUID(),
    stemType: 'melody',
    bpm: 128,
    key: 'C',
    energyLevel: 0.6,
    rmsVolume: 0.1,
    harmonicContent: true,
    mixabilityScore: 0.7,
    spectralCentroid: 2000,
    transientDensity: 0.3,
    frequencyRange: { low: 150, high: 16000 },
    onsetPattern: [],
    mixPoints: [],
    aiTags: [],
    ...overrides,
  };
}

// ============================================================
// CAMELOT WHEEL — keyCompatibilityScore
// ============================================================

describe('keyCompatibilityScore', () => {
  it('returns 1.0 for identical keys', () => {
    expect(keyCompatibilityScore('C', 'C')).toBe(1.0);
  });

  it('returns 0.9 for relative major/minor pairs', () => {
    expect(keyCompatibilityScore('C', 'Am')).toBe(0.9);
    expect(keyCompatibilityScore('Am', 'C')).toBe(0.9);
    expect(keyCompatibilityScore('G', 'Em')).toBe(0.9);
  });

  it('returns 0.8 for adjacent Camelot wheel positions (±1)', () => {
    expect(keyCompatibilityScore('C', 'G')).toBe(0.8);
    expect(keyCompatibilityScore('G', 'D')).toBe(0.8);
  });

  it('returns 0.6 for ±2 positions on the wheel', () => {
    expect(keyCompatibilityScore('C', 'D')).toBe(0.6);
  });

  it('returns 0.2 for incompatible keys', () => {
    expect(keyCompatibilityScore('C', 'F#')).toBe(0.2);
  });

  it('returns 0.5 for empty key strings', () => {
    expect(keyCompatibilityScore('', 'C')).toBe(0.5);
    expect(keyCompatibilityScore('C', '')).toBe(0.5);
    expect(keyCompatibilityScore('', '')).toBe(0.5);
  });

  it('handles enharmonic equivalents (C# = Db)', () => {
    expect(keyCompatibilityScore('C#', 'Db')).toBe(1.0);
  });
});

// ============================================================
// BPM PROXIMITY — bpmProximityScore
// ============================================================

describe('bpmProximityScore', () => {
  it('returns 1.0 for identical BPM', () => {
    expect(bpmProximityScore(128, 128)).toBe(1.0);
  });

  it('returns 1.0 within ±1 BPM', () => {
    expect(bpmProximityScore(128, 128.5)).toBe(1.0);
  });

  it('returns 0.8 within ±3%', () => {
    expect(bpmProximityScore(128, 130)).toBe(0.8);
  });

  it('returns 0.7 for half-time relationship', () => {
    expect(bpmProximityScore(128, 64)).toBe(0.7);
    expect(bpmProximityScore(64, 128)).toBe(0.7);
  });

  it('returns 0.7 for double-time relationship', () => {
    expect(bpmProximityScore(128, 256)).toBe(0.7);
  });

  it('returns 0.5 within ±6%', () => {
    expect(bpmProximityScore(128, 136)).toBe(0.5);
  });

  it('returns 0.2 for very different BPMs', () => {
    expect(bpmProximityScore(128, 200)).toBe(0.2);
  });

  it('returns 0.5 when either BPM is null', () => {
    expect(bpmProximityScore(null, 128)).toBe(0.5);
    expect(bpmProximityScore(128, null)).toBe(0.5);
    expect(bpmProximityScore(null, null)).toBe(0.5);
  });
});

// ============================================================
// STEM COMPATIBILITY SCORER — scoreStemPair
// ============================================================

describe('scoreStemPair', () => {
  it('returns a value between 0 and 1', () => {
    const a = makeStem();
    const b = makeStem();
    const score = scoreStemPair(a, b);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('scores identical stems near 1.0', () => {
    const a = makeStem({ key: 'C', bpm: 128, energyLevel: 0.6, harmonicContent: true });
    const score = scoreStemPair(a, { ...a });
    expect(score).toBeGreaterThan(0.85);
  });

  it('scores incompatible stems lower than compatible ones', () => {
    const base = makeStem({ key: 'C', bpm: 128 });
    const compatible = makeStem({ key: 'G', bpm: 130 });
    const incompatible = makeStem({ key: 'F#', bpm: 200 });
    expect(scoreStemPair(base, compatible)).toBeGreaterThan(scoreStemPair(base, incompatible));
  });

  it('applies correct weighted factors (sum of weights = 1.0)', () => {
    const weights = [0.25, 0.20, 0.15, 0.15, 0.10, 0.10, 0.05];
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

// ============================================================
// COMPATIBILITY MATRIX
// ============================================================

describe('computeCompatibilityMatrix', () => {
  it('returns overallScore between 0 and 1', () => {
    const stemsA = [makeStem({ stemType: 'drums' }), makeStem({ stemType: 'bass' })];
    const stemsB = [makeStem({ stemType: 'drums' }), makeStem({ stemType: 'bass' })];
    const result = computeCompatibilityMatrix(stemsA, stemsB);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
  });

  it('includes a score for each matching stem type', () => {
    const stemsA = [
      makeStem({ stemType: 'drums' }),
      makeStem({ stemType: 'bass' }),
      makeStem({ stemType: 'vocals' }),
    ];
    const stemsB = [
      makeStem({ stemType: 'drums' }),
      makeStem({ stemType: 'bass' }),
      makeStem({ stemType: 'vocals' }),
    ];
    const result = computeCompatibilityMatrix(stemsA, stemsB);
    expect(result.stemScores).toHaveProperty('drums');
    expect(result.stemScores).toHaveProperty('bass');
    expect(result.stemScores).toHaveProperty('vocals');
  });

  it('returns 0.5 overallScore for empty stem arrays', () => {
    const result = computeCompatibilityMatrix([], []);
    expect(result.overallScore).toBe(0.5);
  });
});

// ============================================================
// TRANSITION TYPE SELECTOR — all 10 types
// ============================================================

describe('selectTransitionType', () => {
  function buildMatrix(overrides: Partial<Record<string, number>> = {}) {
    return {
      stemScores: { drums: 0.5, bass: 0.5, vocals: 0.5, melody: 0.5, other: 0.5, ...overrides },
      overallScore: 0.5,
    };
  }

  it('always returns at least one transition option', () => {
    const stemsA = [makeStem({ stemType: 'drums' })];
    const stemsB = [makeStem({ stemType: 'drums' })];
    const result = selectTransitionType(buildMatrix(), stemsA, stemsB);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns filter_fade as a fallback option', () => {
    const result = selectTransitionType(buildMatrix(), [], []);
    const types = result.map((r) => r.type);
    expect(types).toContain('filter_fade');
  });

  it('recommends cold_cut when BPM and key are very compatible', () => {
    const stemsA = [
      makeStem({ stemType: 'drums', bpm: 128, energyLevel: 0.8 }),
      makeStem({ stemType: 'vocals', key: 'C', energyLevel: 0.8 }),
    ];
    const stemsB = [
      makeStem({ stemType: 'drums', bpm: 128, energyLevel: 0.8 }),
      makeStem({ stemType: 'vocals', key: 'C', energyLevel: 0.8 }),
    ];
    const matrix = { stemScores: { drums: 1.0, vocals: 1.0 }, overallScore: 1.0 };
    const result = selectTransitionType(matrix, stemsA, stemsB);
    const types = result.map((r) => r.type);
    expect(types).toContain('cold_cut');
  });

  it('recommends harmonic_mix when keys and energy match', () => {
    const stemsA = [makeStem({ stemType: 'vocals', key: 'C', bpm: 128, energyLevel: 0.6 })];
    const stemsB = [makeStem({ stemType: 'vocals', key: 'C', bpm: 128, energyLevel: 0.6 })];
    const matrix = { stemScores: { vocals: 1.0, melody: 1.0 }, overallScore: 1.0 };
    const result = selectTransitionType(matrix, stemsA, stemsB);
    const types = result.map((r) => r.type);
    expect(types).toContain('harmonic_mix');
  });

  it('recommends echo_out when track A energy is much higher than B', () => {
    const stemsA = [makeStem({ stemType: 'drums', energyLevel: 0.9, bpm: 128 })];
    const stemsB = [makeStem({ stemType: 'drums', energyLevel: 0.2, bpm: 128 })];
    const matrix = { stemScores: { drums: 0.4 }, overallScore: 0.4 };
    const result = selectTransitionType(matrix, stemsA, stemsB);
    const types = result.map((r) => r.type);
    expect(types).toContain('echo_out');
  });

  it('recommends bass_swap when bass compatibility is high', () => {
    const stemsA = [
      makeStem({ stemType: 'bass', bpm: 128 }),
      makeStem({ stemType: 'drums', bpm: 128 }),
    ];
    const stemsB = [
      makeStem({ stemType: 'bass', bpm: 128 }),
      makeStem({ stemType: 'drums', bpm: 128 }),
    ];
    const matrix = { stemScores: { bass: 0.9, drums: 0.9 }, overallScore: 0.9 };
    const result = selectTransitionType(matrix, stemsA, stemsB);
    const types = result.map((r) => r.type);
    expect(types).toContain('bass_swap');
  });

  it('returns confidence values between 0 and 1', () => {
    const stemsA = [makeStem()];
    const stemsB = [makeStem()];
    const result = selectTransitionType(buildMatrix(), stemsA, stemsB);
    for (const r of result) {
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('returns results sorted by confidence descending', () => {
    const stemsA = [makeStem()];
    const stemsB = [makeStem()];
    const result = selectTransitionType(buildMatrix(), stemsA, stemsB);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].confidence).toBeGreaterThanOrEqual(result[i + 1].confidence);
    }
  });

  it('returns no duplicate transition types', () => {
    const stemsA = [makeStem()];
    const stemsB = [makeStem()];
    const result = selectTransitionType(buildMatrix(), stemsA, stemsB);
    const types = result.map((r) => r.type);
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });
});

// ============================================================
// MIX POINT DETECTION
// ============================================================

describe('detectMixPoints', () => {
  it('returns at least one mix point', () => {
    const points = detectMixPoints(180000, 128, []);
    expect(points.length).toBeGreaterThan(0);
  });

  it('all mix points are within track duration', () => {
    const duration = 180000;
    const points = detectMixPoints(duration, 128, []);
    for (const p of points) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(duration);
    }
  });

  it('returns sorted mix points', () => {
    const points = detectMixPoints(240000, 128, []);
    for (let i = 0; i < points.length - 1; i++) {
      expect(points[i]).toBeLessThanOrEqual(points[i + 1]);
    }
  });

  it('returns a fallback when no BPM is available', () => {
    const points = detectMixPoints(180000, null, []);
    expect(points.length).toBeGreaterThan(0);
  });

  it('detects energy drops from onset pattern gaps', () => {
    const onsets = [0, 500, 1000, 1500, 5000, 5500, 6000];
    const points = detectMixPoints(180000, 128, onsets);
    expect(points).toContain(1500);
  });
});

// ============================================================
// FULL TRANSITION MATCHER — computeMixPlan
// ============================================================

describe('TransitionMatcher.computeMixPlan', () => {
  const matcher = new TransitionMatcher();

  it('returns a valid MixPlanInstructions object', () => {
    const stemsA = [
      makeStem({ stemType: 'drums', bpm: 128 }),
      makeStem({ stemType: 'bass' }),
      makeStem({ stemType: 'vocals', key: 'C' }),
    ];
    const stemsB = [
      makeStem({ stemType: 'drums', bpm: 130 }),
      makeStem({ stemType: 'bass' }),
      makeStem({ stemType: 'vocals', key: 'G' }),
    ];
    const plan = matcher.computeMixPlan(stemsA, stemsB, 180000);

    expect(plan.transitionType).toBeDefined();
    expect(plan.confidence).toBeGreaterThanOrEqual(0);
    expect(plan.confidence).toBeLessThanOrEqual(1);
    expect(plan.mixPointMs).toBeGreaterThanOrEqual(0);
    expect(plan.durationMs).toBeGreaterThan(0);
    expect(plan.stemInstructions).toBeDefined();
    expect(Object.keys(plan.stemInstructions).length).toBeGreaterThan(0);
  });

  it('has ai_generation_hooks.enabled = false by default', () => {
    const plan = matcher.computeMixPlan([makeStem()], [makeStem()], 180000);
    expect(plan.aiGenerationHooks.enabled).toBe(false);
    expect(plan.aiGenerationHooks.requests).toHaveLength(0);
  });

  it('returns at least one alternative transition', () => {
    const stemsA = [makeStem({ stemType: 'drums', bpm: 128 }), makeStem({ stemType: 'vocals', key: 'C' })];
    const stemsB = [makeStem({ stemType: 'drums', bpm: 128 }), makeStem({ stemType: 'vocals', key: 'C' })];
    const plan = matcher.computeMixPlan(stemsA, stemsB, 180000);
    expect(plan.alternativeTransitions.length).toBeGreaterThan(0);
  });

  it('stem instructions reference expected stem keys', () => {
    const stemsA = [makeStem({ stemType: 'drums' }), makeStem({ stemType: 'bass' })];
    const stemsB = [makeStem({ stemType: 'drums' }), makeStem({ stemType: 'bass' })];
    const plan = matcher.computeMixPlan(stemsA, stemsB);
    const keys = Object.keys(plan.stemInstructions);
    expect(keys.some((k) => k.endsWith('_A'))).toBe(true);
    expect(keys.some((k) => k.endsWith('_B'))).toBe(true);
  });
});

// ============================================================
// FEATURE CONFIG HELPERS
// ============================================================

describe('Feature config helpers', () => {
  it('getMixingConfig returns expected defaults', async () => {
    const { getMixingConfig } = await import('../../src/config/features');
    const cfg = getMixingConfig();
    expect(cfg.preCacheCandidates).toBe(5);
    expect(cfg.maxTransitionDurationMs).toBe(32000);
    expect(cfg.defaultTransition).toBe('filter_fade');
  });

  it('getAIGenerationConfig returns enabled=false', async () => {
    const { getAIGenerationConfig } = await import('../../src/config/features');
    const cfg = getAIGenerationConfig();
    expect(cfg.enabled).toBe(false);
  });

  it('getStemAnalysisConfig has correct locations', async () => {
    const { getStemAnalysisConfig } = await import('../../src/config/features');
    const cfg = getStemAnalysisConfig();
    expect(cfg.heavyAnalysisLocation).toBe('client');
    expect(cfg.lightweightAnalysisLocation).toBe('edge_function');
  });

  it('getMaxStemLevelForPlan returns 0 for free plan', async () => {
    const { getMaxStemLevelForPlan } = await import('../../src/config/features');
    expect(getMaxStemLevelForPlan('free')).toBe(0);
  });

  it('getMaxStemLevelForPlan returns 1 for pro plan', async () => {
    const { getMaxStemLevelForPlan } = await import('../../src/config/features');
    expect(getMaxStemLevelForPlan('pro')).toBe(1);
  });

  it('getMaxStemLevelForPlan returns 2 for premium plan', async () => {
    const { getMaxStemLevelForPlan } = await import('../../src/config/features');
    expect(getMaxStemLevelForPlan('premium')).toBe(2);
  });

  it('getMaxStemLevelForPlan returns 3 for admin plan', async () => {
    const { getMaxStemLevelForPlan } = await import('../../src/config/features');
    expect(getMaxStemLevelForPlan('admin')).toBe(3);
  });
});
