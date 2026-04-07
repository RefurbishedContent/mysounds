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
