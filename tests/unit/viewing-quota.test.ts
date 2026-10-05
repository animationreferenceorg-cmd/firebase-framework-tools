import { describe, it, expect, beforeEach } from 'vitest';
import {
  FREE_UNLOCKED_LIMIT,
  isReferenceUnlocked,
  unlockReference,
  getUnlockedReferenceIds,
  clearStorageForTesting,
} from '@/lib/viewing-quota';

describe('viewing-quota', () => {
  beforeEach(() => {
    clearStorageForTesting();
  });

  it('has a default limit of 25 unlocked references', () => {
    expect(FREE_UNLOCKED_LIMIT).toBe(25);
  });

  it('pro users always have references unlocked', () => {
    expect(isReferenceUnlocked('vid-1', true)).toBe(true);
    expect(isReferenceUnlocked('vid-999', true)).toBe(true);
  });

  it('free users only have unlocked references available', () => {
    expect(isReferenceUnlocked('vid-1', false)).toBe(false);
    expect(isReferenceUnlocked('vid-1', false, ['vid-1', 'vid-2'])).toBe(true);
    expect(isReferenceUnlocked('vid-3', false, ['vid-1', 'vid-2'])).toBe(false);
  });

  it('unlocks references up to the limit and deduplicates', async () => {
    const res1 = await unlockReference('vid-1');
    expect(res1.success).toBe(true);
    expect(res1.alreadyUnlocked).toBe(false);
    expect(res1.count).toBe(1);

    // Re-unlocking the same video is a no-op and permitted
    const res2 = await unlockReference('vid-1');
    expect(res2.success).toBe(true);
    expect(res2.alreadyUnlocked).toBe(true);
    expect(res2.count).toBe(1);
  });

  it('blocks new unlocks once 25 limit is reached, while allowing previously unlocked', async () => {
    // Fill 25 slots
    const mock25 = Array.from({ length: 25 }, (_, i) => `vid-${i}`);
    
    // An existing clip remains unlocked
    expect(isReferenceUnlocked('vid-10', false, mock25)).toBe(true);

    // A 26th new video cannot be unlocked
    const res26 = await unlockReference('vid-26', undefined, mock25, 25);
    expect(res26.success).toBe(false);
    expect(res26.alreadyUnlocked).toBe(false);
    expect(res26.count).toBe(25);
  });
});
