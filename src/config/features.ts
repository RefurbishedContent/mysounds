export type UserPlan = 'free' | 'pro' | 'premium' | 'admin';

export interface StemFeatureFlags {
  stemLevel1: boolean;
  stemLevel2: boolean;
  stemLevel3: boolean;
}

export interface FeatureFlags extends StemFeatureFlags {
  canUploadTracks: boolean;
  canCreateTransitions: boolean;
  canExportBlends: boolean;
  maxMonthlyUploads: number;
}

const PLAN_FLAGS: Record<UserPlan, FeatureFlags> = {
  free: {
    canUploadTracks: true,
    canCreateTransitions: true,
    canExportBlends: false,
    maxMonthlyUploads: 10,
    stemLevel1: false,
    stemLevel2: false,
    stemLevel3: false,
  },
  pro: {
    canUploadTracks: true,
    canCreateTransitions: true,
    canExportBlends: true,
    maxMonthlyUploads: 50,
    stemLevel1: true,
    stemLevel2: false,
    stemLevel3: false,
  },
  premium: {
    canUploadTracks: true,
    canCreateTransitions: true,
    canExportBlends: true,
    maxMonthlyUploads: 200,
    stemLevel1: true,
    stemLevel2: true,
    stemLevel3: false,
  },
  admin: {
    canUploadTracks: true,
    canCreateTransitions: true,
    canExportBlends: true,
    maxMonthlyUploads: Infinity,
    stemLevel1: true,
    stemLevel2: true,
    stemLevel3: true,
  },
};

export function getFeatureFlags(plan: UserPlan | string): FeatureFlags {
  return PLAN_FLAGS[(plan as UserPlan)] ?? PLAN_FLAGS.free;
}

export function getStemFlags(plan: UserPlan | string): StemFeatureFlags {
  const flags = getFeatureFlags(plan);
  return {
    stemLevel1: flags.stemLevel1,
    stemLevel2: flags.stemLevel2,
    stemLevel3: flags.stemLevel3,
  };
}

export function canAccessStemLevel(plan: UserPlan | string, level: 1 | 2 | 3): boolean {
  const flags = getFeatureFlags(plan);
  if (level === 1) return flags.stemLevel1;
  if (level === 2) return flags.stemLevel2;
  return flags.stemLevel3;
}

// ============================================================
// STEM SEPARATION CONFIG
// ============================================================

export interface StemSeparationConfig {
  defaultLevel: 1 | 2 | 3;
  maxLevel: 1 | 2 | 3;
  engine: 'replicate';
  autoSeparateOnUpload: boolean;
  planGating: Record<UserPlan, { enabled: boolean; maxLevel?: 1 | 2 | 3 }>;
}

export const stemSeparationConfig: StemSeparationConfig = {
  defaultLevel: 1,
  maxLevel: 3,
  engine: 'replicate',
  autoSeparateOnUpload: true,
  planGating: {
    free: { enabled: false },
    pro: { enabled: true, maxLevel: 1 },
    premium: { enabled: true, maxLevel: 2 },
    admin: { enabled: true, maxLevel: 3 },
  },
};

// ============================================================
// STEM ANALYSIS CONFIG
// ============================================================

export interface StemAnalysisConfig {
  autoAnalyzeAfterSeparation: boolean;
  heavyAnalysisLocation: 'client' | 'edge_function';
  lightweightAnalysisLocation: 'client' | 'edge_function';
}

export const stemAnalysisConfig: StemAnalysisConfig = {
  autoAnalyzeAfterSeparation: true,
  heavyAnalysisLocation: 'client',
  lightweightAnalysisLocation: 'edge_function',
};

// ============================================================
// AI GENERATION CONFIG
// ============================================================

export interface AIProviderConfig {
  provider: string | null;
  apiKeyEnv: string;
}

export interface AIGenerationConfig {
  enabled: boolean;
  providers: {
    transitionFx: AIProviderConfig;
    musicalBridge: AIProviderConfig;
    vocalGeneration: AIProviderConfig;
  };
  fallbackOnFailure: boolean;
  maxGenerationTimeMs: number;
  maxRetries: number;
}

export const aiGenerationConfig: AIGenerationConfig = {
  enabled: false,
  providers: {
    transitionFx: { provider: null, apiKeyEnv: 'STABLE_AUDIO_KEY' },
    musicalBridge: { provider: null, apiKeyEnv: 'MUSICGEN_KEY' },
    vocalGeneration: { provider: null, apiKeyEnv: 'ELEVENLABS_KEY' },
  },
  fallbackOnFailure: true,
  maxGenerationTimeMs: 10000,
  maxRetries: 2,
};

// ============================================================
// MIXING CONFIG
// ============================================================

export type TransitionType =
  | 'harmonic_mix'
  | 'bass_swap'
  | 'acapella_over_instrumental'
  | 'drop_swap'
  | 'filter_fade'
  | 'echo_out'
  | 'breakdown_blend'
  | 'drum_swap'
  | 'stem_by_stem_crossfade'
  | 'cold_cut';

export interface MixingConfig {
  preCacheCandidates: number;
  maxTransitionDurationMs: number;
  realTimeTargetMs: number;
  defaultTransition: TransitionType;
}

export const mixingConfig: MixingConfig = {
  preCacheCandidates: 5,
  maxTransitionDurationMs: 32000,
  realTimeTargetMs: 50,
  defaultTransition: 'filter_fade',
};

// ============================================================
// ANALYSIS CONFIG
// ============================================================

export interface AnalysisConfig {
  autoAnalyzeOnUpload: boolean;
  preComputeCompatibility: boolean;
  compatibilityScope: 'playlist' | 'library';
  recomputeOnPlaylistChange: boolean;
}

export const analysisConfig: AnalysisConfig = {
  autoAnalyzeOnUpload: true,
  preComputeCompatibility: true,
  compatibilityScope: 'playlist',
  recomputeOnPlaylistChange: true,
};

// ============================================================
// ACCESSOR HELPERS
// ============================================================

export function getStemSeparationConfig(): StemSeparationConfig {
  return stemSeparationConfig;
}

export function getStemAnalysisConfig(): StemAnalysisConfig {
  return stemAnalysisConfig;
}

export function getAIGenerationConfig(): AIGenerationConfig {
  return aiGenerationConfig;
}

export function getMixingConfig(): MixingConfig {
  return mixingConfig;
}

export function getAnalysisConfig(): AnalysisConfig {
  return analysisConfig;
}

export function getMaxStemLevelForPlan(plan: UserPlan | string): 0 | 1 | 2 | 3 {
  const gating = stemSeparationConfig.planGating[(plan as UserPlan)];
  if (!gating || !gating.enabled) return 0;
  return gating.maxLevel ?? 1;
}
