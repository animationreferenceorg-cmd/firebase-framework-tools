'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from './use-user';
import { getEntitlements } from '@/lib/plans';
import {
  FREE_DAILY_UNLOCKED_LIMIT,
  QUOTA_CHANGED_EVENT,
  ALL_TIME_UNLOCKED_STORAGE_KEY,
  DAILY_QUOTA_STORAGE_KEY,
  getDailyQuotaStatus,
  unlockReference,
} from '@/lib/viewing-quota';

/**
 * Daily reference quota:
 * Free users get 25 new reference video views per day.
 * When 25 are used up, users must come back tomorrow or upgrade to Pro.
 * Any video previously watched remains 100% free to re-watch anytime without consuming quota.
 */
export function useViewingQuota() {
  const { userProfile, loading } = useUser();
  const ready = !loading;
  const rawLimit = getEntitlements(userProfile).limits.maxUnlockedReferences;
  const unlimited = !Number.isFinite(rawLimit);
  const limit = unlimited ? Infinity : (rawLimit || FREE_DAILY_UNLOCKED_LIMIT);
  const profileList = (userProfile as { unlockedReferences?: string[] } | null)?.unlockedReferences;
  const uid = userProfile?.uid;

  const [status, setStatus] = useState(() =>
    getDailyQuotaStatus(profileList, Number.isFinite(limit) ? limit : FREE_DAILY_UNLOCKED_LIMIT)
  );

  const refresh = useCallback(() => {
    setStatus(getDailyQuotaStatus(profileList, Number.isFinite(limit) ? limit : FREE_DAILY_UNLOCKED_LIMIT));
  }, [profileList, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep every counter in sync: other tabs (storage) and other components in this tab.
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ALL_TIME_UNLOCKED_STORAGE_KEY || e.key === DAILY_QUOTA_STORAGE_KEY) {
        refresh();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(QUOTA_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(QUOTA_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  const unlockedIds = status.allTimeUnlockedIds;
  const unlockedCount = unlockedIds.length;
  const todayCount = status.todayCount;
  const todayRemaining = unlimited ? Infinity : Math.max(0, limit - todayCount);
  const remaining = todayRemaining;
  const hasReachedLimit = ready && !unlimited && todayCount >= limit;

  const isVideoUnlocked = useCallback(
    (videoId: string) => unlimited || !videoId || unlockedIds.includes(videoId),
    [unlimited, unlockedIds]
  );

  /** Records a deliberate view. Returns allowed=false only when daily quota is used up and video is new. */
  const attemptUnlock = useCallback(
    async (videoId: string): Promise<{ allowed: boolean; alreadyUnlocked: boolean }> => {
      if (!ready || unlimited || !videoId) return { allowed: true, alreadyUnlocked: true };
      const res = await unlockReference(videoId, uid, profileList, limit);
      refresh();
      return { allowed: res.success, alreadyUnlocked: res.alreadyUnlocked };
    },
    [ready, unlimited, uid, profileList, limit, refresh]
  );

  return {
    ready,
    unlimited,
    loading,
    unlockedIds,
    unlockedCount,
    todayCount,
    todayRemaining,
    limit,
    remaining,
    hasReachedLimit,
    isVideoUnlocked,
    attemptUnlock,
  };
}
