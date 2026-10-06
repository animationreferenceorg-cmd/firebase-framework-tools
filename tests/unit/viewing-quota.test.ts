import { describe, it, expect, beforeEach } from 'vitest';
import {
  FREE_UNLOCKED_LIMIT,
  FREE_DAILY_UNLOCKED_LIMIT,
  isReferenceUnlocked,
  unlockReference,
  getUnlockedReferenceIds,
  getDailyQuotaData,
  saveDailyQuotaData,
  clearStorageForTesting,
  getDailyQuotaStatus,
} from '@/lib/viewing-quota';

describe('viewing-quota', () => {
  beforeEach(() => {
    clearStorageForTesting();
  });

  it('has a default daily limit of 25 unlocked references', () => {
    expect(FREE_UNLOCKED_LIMIT).toBe(25);
    expect(FREE_DAILY_UNLOCKED_LIMIT).toBe(25);
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
    expect(res1.todayCount).toBe(1);
    expect(res1.todayRemaining).toBe(24);

    // Re-unlocking the same video is a free rewatch and does not increment today's quota
    const res2 = await unlockReference('vid-1');
    expect(res2.success).toBe(true);
    expect(res2.alreadyUnlocked).toBe(true);
    expect(res2.count).toBe(1);
    expect(res2.todayCount).toBe(1);
    expect(res2.todayRemaining).toBe(24);
  });

  it('blocks new unlocks once 25 daily limit is reached, while allowing previously unlocked', async () => {
    // Fill 25 slots for today
    for (let i = 0; i < 25; i++) {
      const res = await unlockReference(`vid-${i}`);
      expect(res.success).toBe(true);
    }

    const status = getDailyQuotaStatus();
    expect(status.todayCount).toBe(25);
    expect(status.todayRemaining).toBe(0);
    expect(status.isDailyLimitReached).toBe(true);

    // An existing clip remains unlocked and free to re-watch
    expect(isReferenceUnlocked('vid-10', false)).toBe(true);
    const rewatch = await unlockReference('vid-10');
    expect(rewatch.success).toBe(true);
    expect(rewatch.alreadyUnlocked).toBe(true);

    // A 26th new video cannot be unlocked today
    const res26 = await unlockReference('vid-26');
    expect(res26.success).toBe(false);
    expect(res26.alreadyUnlocked).toBe(false);
    expect(res26.count).toBe(25);
    expect(res26.todayRemaining).toBe(0);
  });

  it('resets daily allowance on the next day while keeping all-time watched clips permanently free', async () => {
    // Watch video on "yesterday"
    saveDailyQuotaData({
      date: '2026-10-05',
      todayUnlockedIds: Array.from({ length: 25 }, (_, i) => `yesterday-vid-${i}`),
    });

    // In today's session (2026-10-06), getDailyQuotaData should reset today's quota
    const status = getDailyQuotaStatus();
    expect(status.todayCount).toBe(0);
    expect(status.todayRemaining).toBe(25);
    expect(status.isDailyLimitReached).toBe(false);

    // Any previously unlocked video is still unlocked and playable forever
    expect(isReferenceUnlocked('yesterday-vid-5', false, ['yesterday-vid-5'])).toBe(true);

    // Can unlock 25 new videos today
    const newWatch = await unlockReference('today-new-vid-1');
    expect(newWatch.success).toBe(true);
    expect(newWatch.todayCount).toBe(1);
    expect(newWatch.todayRemaining).toBe(24);
  });
});
