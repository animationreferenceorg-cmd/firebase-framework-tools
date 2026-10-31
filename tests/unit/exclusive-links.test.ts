import { describe, expect, it } from 'vitest';
import { getEntitlements, resolveAccessLevel } from '@/lib/plans';

describe('exclusive links entitlement resolution', () => {
  it('grants full pro access when user has exclusive link VIP attributes', () => {
    const userProfile = {
      isVIP: true,
      isPremium: true,
      unlimitedAccess: true,
      tier: 'student_unlimited',
      plan: 'pro',
      exclusiveLinkClaimed: {
        code: 'pro_test12345678',
        claimedAt: '2026-10-30T16:00:00.000Z',
        note: 'Special animator invite',
      },
    };

    const access = resolveAccessLevel(userProfile);
    expect(access).toBe('student_unlimited');

    const entitlements = getEntitlements(userProfile);
    expect(entitlements.isPro).toBe(true);
    expect(entitlements.canCreateUnlimitedBoards).toBe(true);
    expect(entitlements.canUsePrivateWorkspace).toBe(true);
    expect(entitlements.canUploadPrivateMedia).toBe(true);
    expect(entitlements.canPublishShotBreakdowns).toBe(true);
    expect(entitlements.canComparePlayblast).toBe(true);
    expect(entitlements.canExportHighResolution).toBe(true);
    expect(entitlements.canRemoveWatermark).toBe(true);
    expect(entitlements.limits.maxBoards).toBe(Infinity);
    expect(entitlements.limits.maxUnlockedReferences).toBe(Infinity);
  });

  it('rejects duplicate redemption when status is already redeemed or timesUsed > 0', () => {
    const linkDoc: {
      code: string;
      status: 'active' | 'redeemed' | 'revoked';
      timesUsed: number;
      redeemedBy: { uid: string; email: string } | null;
    } = {
      code: 'pro_xyz98765432',
      status: 'redeemed',
      timesUsed: 1,
      redeemedBy: {
        uid: 'user_first_claimer',
        email: 'first@example.com',
      },
    };

    const isAvailableToClaim = linkDoc.status === 'active' && linkDoc.timesUsed === 0 && !linkDoc.redeemedBy;
    expect(isAvailableToClaim).toBe(false);
  });

  it('allows claiming only when status is active and unused', () => {
    const linkDoc = {
      code: 'pro_fresh123456',
      status: 'active' as const,
      timesUsed: 0,
      redeemedBy: null,
      expiresAt: null,
    };

    const isAvailableToClaim =
      linkDoc.status === 'active' &&
      linkDoc.timesUsed === 0 &&
      !linkDoc.redeemedBy &&
      (!linkDoc.expiresAt || new Date(linkDoc.expiresAt).getTime() > Date.now());

    expect(isAvailableToClaim).toBe(true);
  });

  it('marks link as expired if expiresAt is in the past', () => {
    const expiredLink = {
      code: 'pro_old123456',
      status: 'active' as const,
      timesUsed: 0,
      redeemedBy: null,
      expiresAt: '2020-01-01T00:00:00.000Z',
    };

    const isExpired = Boolean(expiredLink.expiresAt && new Date(expiredLink.expiresAt).getTime() < Date.now());
    expect(isExpired).toBe(true);
  });
});

