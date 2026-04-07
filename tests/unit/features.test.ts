import { describe, it, expect } from 'vitest';
import { getFeatureFlags, canAccessStemLevel } from '../../src/config/features';

describe('getFeatureFlags', () => {
  it('free plan has no stem access', () => {
    const flags = getFeatureFlags('free');
    expect(flags.stemLevel1).toBe(false);
    expect(flags.stemLevel2).toBe(false);
    expect(flags.stemLevel3).toBe(false);
  });

  it('pro plan has level 1 stem access only', () => {
    const flags = getFeatureFlags('pro');
    expect(flags.stemLevel1).toBe(true);
    expect(flags.stemLevel2).toBe(false);
    expect(flags.stemLevel3).toBe(false);
  });

  it('premium plan has level 1 and 2 stem access', () => {
    const flags = getFeatureFlags('premium');
    expect(flags.stemLevel1).toBe(true);
    expect(flags.stemLevel2).toBe(true);
    expect(flags.stemLevel3).toBe(false);
  });

  it('admin plan has all stem levels', () => {
    const flags = getFeatureFlags('admin');
    expect(flags.stemLevel1).toBe(true);
    expect(flags.stemLevel2).toBe(true);
    expect(flags.stemLevel3).toBe(true);
  });

  it('unknown plan defaults to free restrictions', () => {
    const flags = getFeatureFlags('unknown_plan');
    expect(flags.stemLevel1).toBe(false);
    expect(flags.stemLevel2).toBe(false);
    expect(flags.stemLevel3).toBe(false);
  });
});

describe('canAccessStemLevel', () => {
  it('blocks free users from all stem levels', () => {
    expect(canAccessStemLevel('free', 1)).toBe(false);
    expect(canAccessStemLevel('free', 2)).toBe(false);
    expect(canAccessStemLevel('free', 3)).toBe(false);
  });

  it('allows pro users level 1 only', () => {
    expect(canAccessStemLevel('pro', 1)).toBe(true);
    expect(canAccessStemLevel('pro', 2)).toBe(false);
    expect(canAccessStemLevel('pro', 3)).toBe(false);
  });

  it('allows premium users levels 1 and 2', () => {
    expect(canAccessStemLevel('premium', 1)).toBe(true);
    expect(canAccessStemLevel('premium', 2)).toBe(true);
    expect(canAccessStemLevel('premium', 3)).toBe(false);
  });

  it('allows admin users all levels', () => {
    expect(canAccessStemLevel('admin', 1)).toBe(true);
    expect(canAccessStemLevel('admin', 2)).toBe(true);
    expect(canAccessStemLevel('admin', 3)).toBe(true);
  });
});
