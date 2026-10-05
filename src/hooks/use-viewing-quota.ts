'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from './use-user';
import { getEntitlements } from '@/lib/plans';
import {
  FREE_UNLOCKED_LIMIT,
  getUnlockedReferenceIds,
  isReferenceUnlocked,
  unlockReference,
} from '@/lib/viewing-quota';

export function useViewingQuota() {
  const { userProfile, loading } = useUser();
  const entitlements = getEntitlements(userProfile);
  const isPro = !loading && entitlements.isPro;

  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => {
    return getUnlockedReferenceIds((userProfile as any)?.unlockedReferences);
  });

  // Sync when user profile updates
  useEffect(() => {
    const ids = getUnlockedReferenceIds((userProfile as any)?.unlockedReferences);
    setUnlockedIds(ids);
  }, [userProfile]);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'animref_unlocked_references') {
        setUnlockedIds(getUnlockedReferenceIds((userProfile as any)?.unlockedReferences));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [userProfile]);

  const unlockedCount = unlockedIds.length;
  const remaining = Math.max(0, FREE_UNLOCKED_LIMIT - unlockedCount);
  const hasReachedLimit = !isPro && unlockedCount >= FREE_UNLOCKED_LIMIT;

  const isVideoUnlocked = useCallback(
    (videoId: string) => {
      if (isPro) return true;
      if (!videoId) return true;
      return unlockedIds.includes(videoId);
    },
    [isPro, unlockedIds]
  );

  const attemptUnlock = useCallback(
    async (videoId: string): Promise<{ allowed: boolean; alreadyUnlocked: boolean }> => {
      if (isPro) {
        return { allowed: true, alreadyUnlocked: true };
      }
      if (!videoId) {
        return { allowed: true, alreadyUnlocked: true };
      }
      if (unlockedIds.includes(videoId)) {
        return { allowed: true, alreadyUnlocked: true };
      }
      if (unlockedIds.length >= FREE_UNLOCKED_LIMIT) {
        return { allowed: false, alreadyUnlocked: false };
      }

      const res = await unlockReference(
        videoId,
        userProfile?.uid,
        (userProfile as any)?.unlockedReferences,
        FREE_UNLOCKED_LIMIT
      );

      if (res.success) {
        setUnlockedIds(res.ids);
        return { allowed: true, alreadyUnlocked: res.alreadyUnlocked };
      }

      return { allowed: false, alreadyUnlocked: false };
    },
    [isPro, unlockedIds, userProfile]
  );

  return {
    isPro,
    loading,
    unlockedIds,
    unlockedCount,
    limit: FREE_UNLOCKED_LIMIT,
    remaining,
    hasReachedLimit,
    isVideoUnlocked,
    attemptUnlock,
  };
}
