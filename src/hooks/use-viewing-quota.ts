'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from './use-user';
import { getEntitlements } from '@/lib/plans';
import { QUOTA_CHANGED_EVENT, getUnlockedReferenceIds, unlockReference } from '@/lib/viewing-quota';

const STORAGE_KEY = 'animref_unlocked_references';

/**
 * Free-plan reference quota: each plan can open a limited number of distinct
 * library references, and anything already opened stays playable forever.
 * The limit comes from the account's entitlements (Pro, SJSU and admin are
 * unlimited). Until the profile has loaded nothing is blocked or counted, so
 * a Pro member never sees the slate flash while their plan is still loading.
 */
export function useViewingQuota() {
  const { userProfile, loading } = useUser();
  const ready = !loading;
  const limit = getEntitlements(userProfile).limits.maxUnlockedReferences;
  const unlimited = !Number.isFinite(limit);
  const profileList = (userProfile as { unlockedReferences?: string[] } | null)?.unlockedReferences;
  const uid = userProfile?.uid;

  // Start empty and read storage after mount: the server render has no
  // localStorage, so reading it during the first render would mismatch.
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  useEffect(() => {
    setUnlockedIds(getUnlockedReferenceIds(profileList));
  }, [profileList]);

  // Keep every counter in sync: other tabs (storage) and other components in this tab.
  useEffect(() => {
    const refresh = () => setUnlockedIds(getUnlockedReferenceIds(profileList));
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(QUOTA_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(QUOTA_CHANGED_EVENT, refresh);
    };
  }, [profileList]);

  const unlockedCount = unlockedIds.length;
  const remaining = unlimited ? Infinity : Math.max(0, limit - unlockedCount);
  const hasReachedLimit = ready && !unlimited && unlockedCount >= limit;

  const isVideoUnlocked = useCallback(
    (videoId: string) => unlimited || !videoId || unlockedIds.includes(videoId),
    [unlimited, unlockedIds]
  );

  /** Records a deliberate view. Returns allowed=false only when the quota is used up. */
  const attemptUnlock = useCallback(
    async (videoId: string): Promise<{ allowed: boolean; alreadyUnlocked: boolean }> => {
      if (!ready || unlimited || !videoId) return { allowed: true, alreadyUnlocked: true };
      const res = await unlockReference(videoId, uid, profileList, limit);
      if (res.success) setUnlockedIds(res.ids);
      return { allowed: res.success, alreadyUnlocked: res.alreadyUnlocked };
    },
    [ready, unlimited, uid, profileList, limit]
  );

  return {
    ready,
    unlimited,
    loading,
    unlockedIds,
    unlockedCount,
    limit,
    remaining,
    hasReachedLimit,
    isVideoUnlocked,
    attemptUnlock,
  };
}
