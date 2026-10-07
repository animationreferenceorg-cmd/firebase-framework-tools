import { describe, expect, it } from 'vitest';
import { CHALLENGES, challengeStatus, daysLeft, getActiveChallenge, getChallenge, rankEntries } from '@/lib/challenges';

describe('challenges', () => {
  it('has unique slugs and one challenge per month', () => {
    expect(new Set(CHALLENGES.map((c) => c.slug)).size).toBe(CHALLENGES.length);
    expect(new Set(CHALLENGES.map((c) => c.month)).size).toBe(CHALLENGES.length);
    for (const c of CHALLENGES) expect(c.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('opens and closes by UTC month', () => {
    const oct = getChallenge('heavy-lifts-2026-10')!;
    expect(challengeStatus(oct, new Date('2026-10-01T00:00:00Z'))).toBe('active');
    expect(challengeStatus(oct, new Date('2026-10-31T23:59:59Z'))).toBe('active');
    expect(challengeStatus(oct, new Date('2026-11-01T00:00:00Z'))).toBe('ended');
    expect(challengeStatus(oct, new Date('2026-09-30T23:59:59Z'))).toBe('upcoming');
    expect(getActiveChallenge(new Date('2026-10-15T12:00:00Z'))?.slug).toBe('heavy-lifts-2026-10');
    expect(getActiveChallenge(new Date('2030-01-01T00:00:00Z'))).toBeNull();
  });

  it('counts days left to the end of the month', () => {
    const oct = getChallenge('heavy-lifts-2026-10')!;
    expect(daysLeft(oct, new Date('2026-10-30T00:00:00Z'))).toBe(2);
    expect(daysLeft(oct, new Date('2026-12-01T00:00:00Z'))).toBe(0);
  });

  it('ranks entries by saves, newest first on ties', () => {
    const ranked = rankEntries([
      { id: 'a', saveCount: 2, createdAt: 1 },
      { id: 'b', saveCount: 5, createdAt: 1 },
      { id: 'c', saveCount: 2, createdAt: { seconds: 10 } },
      { id: 'd' },
    ]);
    expect(ranked.map((e) => e.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('rejects unknown slugs', () => {
    expect(getChallenge('nope')).toBeNull();
    expect(getChallenge('')).toBeNull();
  });
});
