'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useUser } from './use-user';
import {
  getWatchCount,
  setWatchCount,
  resetWatchCount,
  recordVideoWatch,
  WATCH_COUNT_THRESHOLD,
  VIEW_MIN_DURATION_MS,
} from '@/lib/watch-tracker';
import { DonateDialog } from '@/components/DonateDialog';

type WatchSource = 'hover' | 'playback';

interface WatchSession {
  key: string;
  videoId: string;
  source: WatchSource;
  startedAt: number;
  timerId: ReturnType<typeof setTimeout> | null;
  counted: boolean;
}

interface WatchTrackerContextType {
  /** Begin timing. A view is counted if watched for > 3 seconds. */
  beginWatch: (key: string, source: WatchSource) => void;
  /** Stop timing. Also the natural pause where a queued donate prompt is shown. */
  endWatch: (key: string) => void;
  showDonatePopup: boolean;
  setShowDonatePopup: (show: boolean) => void;
  triggerDonatePopup: (force?: boolean) => void;
  watchCount: number;
  remainingWatches: number;
}

const WatchTrackerContext = createContext<WatchTrackerContextType | undefined>(undefined);

export function WatchTrackerProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useUser();
  const [showDonatePopup, setShowDonatePopup] = useState(false);
  const [forceTimer, setForceTimer] = useState(false);
  const [watchCount, setWatchCountState] = useState(0);

  const isPremium = userProfile?.isPremium;
  const isPremiumRef = useRef(isPremium);
  isPremiumRef.current = isPremium;

  const sessionsRef = useRef<Map<string, WatchSession>>(new Map());
  /** Recently counted video IDs to avoid double-charging the same video if user hovers then opens player. */
  const recentVideosRef = useRef<Map<string, number>>(new Map());
  /** Threshold (30 watches) was crossed; waiting for a natural pause to show the donate prompt. */
  const promptPendingRef = useRef(false);

  // Sync initial watch count from localStorage on mount
  useEffect(() => {
    const current = getWatchCount();
    setWatchCountState(current);
    if (!isPremiumRef.current && current >= WATCH_COUNT_THRESHOLD) {
      promptPendingRef.current = true;
    }
  }, []);

  const triggerDonatePopup = useCallback((force = false) => {
    if (isPremiumRef.current && !force) {
      console.log('[Watch Tracker] Paid plan active — donate popup suppressed.');
      return;
    }
    setForceTimer(false);
    setShowDonatePopup(true);
  }, []);

  const countSessionView = useCallback((session: WatchSession) => {
    if (session.counted || isPremiumRef.current) return;

    // Check if this exact video was counted within the last 60 seconds
    const lastCountedAt = recentVideosRef.current.get(session.videoId);
    const now = Date.now();
    if (lastCountedAt && now - lastCountedAt < 60000) {
      session.counted = true;
      return;
    }

    session.counted = true;
    recentVideosRef.current.set(session.videoId, now);

    const { count, reachedLimit } = recordVideoWatch(isPremiumRef.current);
    setWatchCountState(count);

    if (reachedLimit) {
      promptPendingRef.current = true;
    }
  }, []);

  const beginWatch = useCallback((key: string, source: WatchSource) => {
    if (isPremiumRef.current) return;
    if (sessionsRef.current.has(key)) return;

    // Extract video ID from key e.g. "hover:video123", "play:video123", "play:detail:video123"
    const videoId = key.replace(/^(hover|play):/, '').replace(/^(short|detail|moodboard):/, '');

    const session: WatchSession = {
      key,
      videoId,
      source,
      startedAt: Date.now(),
      timerId: null,
      counted: false,
    };

    // A view is counted if user watches for more than 3 seconds
    session.timerId = setTimeout(() => {
      const activeSession = sessionsRef.current.get(key);
      if (activeSession && !activeSession.counted) {
        countSessionView(activeSession);
      }
    }, VIEW_MIN_DURATION_MS);

    sessionsRef.current.set(key, session);
  }, [countSessionView]);

  const endWatch = useCallback((key: string) => {
    const session = sessionsRef.current.get(key);
    if (!session) return;

    if (session.timerId) {
      clearTimeout(session.timerId);
      session.timerId = null;
    }

    // Check if the watch lasted >= 3 seconds before being ended
    if (!session.counted && !isPremiumRef.current) {
      const elapsed = Date.now() - session.startedAt;
      if (elapsed >= VIEW_MIN_DURATION_MS) {
        countSessionView(session);
      }
    }

    sessionsRef.current.delete(key);

    // Natural pause: Once the user finishes watching/closing the video or leaving hover,
    // if 30 video watches was reached, present the donate popup.
    if (promptPendingRef.current && sessionsRef.current.size === 0) {
      promptPendingRef.current = false;
      resetWatchCount();
      setWatchCountState(0);
      triggerDonatePopup();
    }
  }, [countSessionView, triggerDonatePopup]);

  // Clean up timers on visibility change or tab hiding
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Clear active 3s timers while tab is hidden
        sessionsRef.current.forEach((session) => {
          if (session.timerId) {
            clearTimeout(session.timerId);
            session.timerId = null;
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Devtools helpers for testing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__animref = {
      beginWatch,
      endWatch,
      triggerDonatePopup: (force = true) => triggerDonatePopup(force),
      getWatchCount: () => {
        const count = getWatchCount();
        console.log(`[Watch Tracker] Current count: ${count}/${WATCH_COUNT_THRESHOLD}`);
        return count;
      },
      setWatchCount: (count: number) => {
        setWatchCount(count);
        setWatchCountState(count);
        if (count >= WATCH_COUNT_THRESHOLD) {
          promptPendingRef.current = true;
        }
        console.log(`[Watch Tracker] Watch count set to ${count}/${WATCH_COUNT_THRESHOLD}`);
      },
      resetWatchCount: () => {
        resetWatchCount();
        setWatchCountState(0);
        promptPendingRef.current = false;
        console.log('[Watch Tracker] Reset watch count to 0.');
      },
      _debug: () => ({
        count: getWatchCount(),
        threshold: WATCH_COUNT_THRESHOLD,
        sessions: [...sessionsRef.current.entries()],
        promptPending: promptPendingRef.current,
        recentVideos: [...recentVideosRef.current.entries()],
      }),
    };
  }, [beginWatch, endWatch, triggerDonatePopup]);

  const remainingWatches = Math.max(0, WATCH_COUNT_THRESHOLD - watchCount);

  return (
    <WatchTrackerContext.Provider
      value={{
        beginWatch,
        endWatch,
        showDonatePopup,
        setShowDonatePopup,
        triggerDonatePopup,
        watchCount,
        remainingWatches,
      }}
    >
      {children}
      <DonateDialog
        open={showDonatePopup}
        forceTimer={forceTimer}
        onOpenChange={(val) => {
          setShowDonatePopup(val);
          if (!val) setForceTimer(false);
        }}
      />
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
