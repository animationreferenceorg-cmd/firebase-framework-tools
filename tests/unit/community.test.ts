import { describe, expect, it } from 'vitest';
import { countPublicSharesToday } from '@/lib/contribution';
import { ownerField, reportSchema, takedownUpdate, targetCollection } from '@/lib/content-reports';

describe('countPublicSharesToday', () => {
  const now = new Date(2026, 9, 7, 15, 0, 0);
  const today = new Date(2026, 9, 7, 9, 0, 0).getTime();
  const yesterday = new Date(2026, 9, 6, 23, 59, 0).getTime();

  it('counts only public, live clips created today (local time)', () => {
    const clips = [
      { isPrivate: false, createdAt: today },
      { isPrivate: false, createdAt: { toMillis: () => today } },
      { isPrivate: false, createdAt: { seconds: today / 1000 } },
      { isPrivate: true, createdAt: today },
      { isPrivate: false, createdAt: yesterday },
      { isPrivate: false, createdAt: today, removedFromCreatorAt: today },
      { isPrivate: false },
    ];
    expect(countPublicSharesToday(clips, now)).toBe(3);
  });
});

describe('content reports', () => {
  it('validates reports', () => {
    expect(reportSchema.safeParse({ targetType: 'clip', targetId: 'abc_123', reason: 'copyright' }).success).toBe(true);
    expect(reportSchema.safeParse({ targetType: 'clip', targetId: '../users/x', reason: 'copyright' }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: 'user', targetId: 'abc', reason: 'copyright' }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: 'video', targetId: 'abc', reason: 'nope' }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: 'video', targetId: 'abc', reason: 'spam', contactEmail: 'not-an-email' }).success).toBe(false);
  });

  it('maps targets to collections and owners', () => {
    expect(targetCollection('clip')).toBe('reference_clips');
    expect(targetCollection('video')).toBe('videos');
    expect(targetCollection('portfolio')).toBe('portfolio_items');
    expect(ownerField('clip')).toBe('creatorId');
    expect(ownerField('video')).toBeNull(); // library videos are admin-curated: no strikes
  });

  it('hides clips (owner-only), removes videos and deletes portfolio posts', () => {
    expect(takedownUpdate('clip', 'copyright', 1)).toEqual({ takenDownAt: 1, takenDownReason: 'copyright', isPrivate: true, communityVisible: false });
    expect(takedownUpdate('video', 'spam', 1)).toMatchObject({ status: 'removed' });
    expect(takedownUpdate('portfolio', 'copyright', 1)).toBeNull();
  });
});
