'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from './use-user';
import { getEntitlements } from '@/lib/plans';
import { track } from '@/lib/analytics';
import {
  VIEW_MIN_DURATION_MS,
  clearLegacyWatchCount,
  getSessionViewCount,
  markProNudgeDismissed,
  markProNudgeShown,
  recordSessionView,
  shouldShowProNudge,
} from '@/lib/watch-tracker';
import { ProNudgeCard } from '@/components/ProNudgeCard';

type WatchSource = 'hover' | 'playback';

interface WatchTrackerContextType {
  /** Begin timing a watch. Only `playback` sessions held for 3s+ count; hover previews never do. */
  beginWatch: (key: string, source: WatchSource) => void;
  /** Stop timing. With no other playback active, this is the natural pause where the nudge may appear. */
  endWatch: (key: string) => void;
}

interface WatchSession {
  videoId: string;
  timerId: ReturnType<typeof setTimeout> | null;
  counted: boolean;
}

/** Pages where a corner card would get in the way or be redundant. */
const NUDGE_HIDDEN_PATHS = ['/pricing', '/checkout', '/login', '/sjsu', '/paint', '/admin'];

const WatchTrackerContext = createContext<WatchTrackerContextType | undefined>(undefined);

export function WatchTrackerProvider({ children }: { children: ReactNode }) {
  const { userProfile, loading } = useUser();
  const pathname = usePathname() || '';
  const [showNudge, setShowNudge] = useState(false);

  // Only free accounts (and signed-out visitors) are ever nudged. Paying
  // supporters on legacy tiers are not free, so they are left alone too.
  const isFree = !loading && getEntitlements(userProfile).access === 'free';
  const isFreeRef = useRef(isFree);
  isFreeRef.current = isFree;

  const sessionsRef = useRef<Map<string, WatchSession>>(new Map());
  /** Video IDs counted recently, so replaying or reopening one video counts once. */
  const recentVideosRef = useRef<Map<string, number>>(new Map());
  const nudgePendingRef = useRef(false);
  const nudgeAllowedHere = !NUDGE_HIDDEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const nudgeAllowedRef = useRef(nudgeAllowedHere);
  nudgeAllowedRef.current = nudgeAllowedHere;

  useEffect(() => {
    clearLegacyWatchCount();
  }, []);

  /** Shows a queued nudge only at a natural pause: nothing playing, on a page that allows it. */
  const tryRevealNudge = useCallback(() => {
    if (!nudgePendingRef.current || sessionsRef.current.size > 0 || !isFreeRef.current || !nudgeAllowedRef.current) return;
    nudgePendingRef.current = false;
    markProNudgeShown();
    setShowNudge(true);
    track('upgrade_prompt_viewed', { trigger: 'session_views', source: 'pro_nudge' });
  }, []);

  // A paid account (profile loaded, or just upgraded) is never nudged. For free
  // accounts, also pick up a nudge earned before a full page load or held back on
  // a page where the card is hidden, and show it shortly after arriving.
  useEffect(() => {
    if (!isFree) {
      nudgePendingRef.current = false;
      setShowNudge(false);
      return;
    }
    if (shouldShowProNudge(getSessionViewCount())) nudgePendingRef.current = true;
    if (!nudgePendingRef.current) return;
    const timer = setTimeout(tryRevealNudge, 2000);
    return () => clearTimeout(timer);
  }, [isFree, pathname, tryRevealNudge]);

  const countView = useCallback((session: WatchSession) => {
    if (session.counted) return;
    session.counted = true;
    if (!isFreeRef.current) return;

    const now = Date.now();
    const lastCountedAt = recentVideosRef.current.get(session.videoId);
    if (lastCountedAt && now - lastCountedAt < 60_000) return;
    recentVideosRef.current.set(session.videoId, now);

    if (shouldShowProNudge(recordSessionView(), now)) nudgePendingRef.current = true;
  }, []);

  const beginWatch = useCallback((key: string, source: WatchSource) => {
    if (source !== 'playback' || sessionsRef.current.has(key)) return;

    const videoId = key.replace(/^(hover|play):/, '').replace(/^(short|detail|moodboard):/, '');
    const session: WatchSession = { videoId, timerId: null, counted: false };
    session.timerId = setTimeout(() => {
      session.timerId = null;
      countView(session);
    }, VIEW_MIN_DURATION_MS);
    sessionsRef.current.set(key, session);
  }, [countView]);

  const endWatch = useCallback((key: string) => {
    const session = sessionsRef.current.get(key);
    if (!session) return;
    // A play shorter than 3 seconds never counts: the timer is the only path to countView.
    if (session.timerId) clearTimeout(session.timerId);
    sessionsRef.current.delete(key);

    tryRevealNudge();
  }, [tryRevealNudge]);

  // Pause 3-second timers while the tab is hidden (a backgrounded tab is not
  // watching) and restart them for still-open plays when it comes back.
  useEffect(() => {
    const handleVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      sessionsRef.current.forEach((session) => {
        if (hidden && session.timerId) {
          clearTimeout(session.timerId);
          session.timerId = null;
        } else if (!hidden && !session.timerId && !session.counted) {
          session.timerId = setTimeout(() => {
            session.timerId = null;
            countView(session);
          }, VIEW_MIN_DURATION_MS);
        }
      });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [countView]);

  const dismissNudge = useCallback(() => {
    markProNudgeDismissed();
    setShowNudge(false);
  }, []);

  return (
    <WatchTrackerContext.Provider value={{ beginWatch, endWatch }}>
      {children}
      {showNudge && isFree && nudgeAllowedHere && <ProNudgeCard onDismiss={dismissNudge} />}
    </WatchTrackerContext.Provider>
  );
}

export function useWatchTracker() {
  const context = useContext(WatchTrackerContext);
  if (!context) {
    throw new Error('useWatchTracker must be used within a WatchTrackerProvider');
  }
  return context;
}
