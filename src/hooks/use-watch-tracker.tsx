'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useUser } from './use-user';
import {
  addWatchSeconds,
  getWatchSeconds,
  setWatchSeconds,
  resetWatchSeconds,
  clearLegacyWatchCount,
  HOVER_GRACE_MS,
  WATCH_MINUTES_BEFORE_DONATE_POPUP,
  WATCH_SECONDS_BEFORE_DONATE_POPUP,
} from '@/lib/watch-tracker';
import { DonateDialog } from '@/components/DonateDialog';

type WatchSource = 'hover' | 'playback';

interface WatchSession {
  source: WatchSource;
  /** Timestamp we last converted into accrued seconds. */
  lastFlush: number;
  /** Hover only: the moment the grace period ends and time starts counting. */
  countsFrom: number;
}

interface WatchTrackerContextType {
  /** Begin timing. `hover` waits out a grace period first; `playback` counts at once. */
  beginWatch: (key: string, source: WatchSource) => void;
  /** Stop timing. Also the natural pause at which a queued prompt is shown. */
  endWatch: (key: string) => void;
  showDonatePopup: boolean;
  setShowDonatePopup: (show: boolean) => void;
  triggerDonatePopup: (force?: boolean) => void;
}

const WatchTrackerContext = createContext<WatchTrackerContextType | undefined>(undefined);

/** How often open sessions are converted into accrued time. */
const FLUSH_INTERVAL_MS = 5000;

export function WatchTrackerProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useUser();
  const [showDonatePopup, setShowDonatePopup] = useState(false);
  const [forceTimer, setForceTimer] = useState(false);

  const isPremium = userProfile?.isPremium;
  const isPremiumRef = useRef(isPremium);
  isPremiumRef.current = isPremium;

  const sessionsRef = useRef<Map<string, WatchSession>>(new Map());
  /** Threshold was crossed; waiting for a natural pause to show the prompt. */
  const promptPendingRef = useRef(false);

  useEffect(() => {
    clearLegacyWatchCount();
  }, []);

  const triggerDonatePopup = useCallback((force = false) => {
    if (isPremiumRef.current && !force) {
      console.log('[Watch Tracker] Paid plan active — donate popup suppressed.');
      return;
    }
    setForceTimer(false);
    setShowDonatePopup(true);
  }, []);

  /**
   * Converts time elapsed on open sessions into accrued seconds.
   * Hover sessions only start counting once past their grace point, so a quick
   * pass over a card contributes exactly nothing.
   */
  const flushSessions = useCallback(() => {
    if (isPremiumRef.current) return;
    const now = Date.now();
    let gained = 0;

    sessionsRef.current.forEach((session) => {
      const countableFrom = Math.max(session.lastFlush, session.countsFrom);
      if (now > countableFrom) {
        gained += (now - countableFrom) / 1000;
      }
      session.lastFlush = now;
    });

    if (gained > 0 && addWatchSeconds(gained, isPremiumRef.current)) {
      promptPendingRef.current = true;
    }
  }, []);

  const beginWatch = useCallback((key: string, source: WatchSource) => {
    if (isPremiumRef.current) return;
    // Re-entering the same card mid-session must not restart or double-count.
    if (sessionsRef.current.has(key)) return;

    const now = Date.now();
    sessionsRef.current.set(key, {
      source,
      lastFlush: now,
      countsFrom: source === 'hover' ? now + HOVER_GRACE_MS : now,
    });
  }, []);

  const endWatch = useCallback((key: string) => {
    const session = sessionsRef.current.get(key);
    if (!session) return;

    if (!isPremiumRef.current) {
      const now = Date.now();
      const countableFrom = Math.max(session.lastFlush, session.countsFrom);
      if (now > countableFrom) {
        if (addWatchSeconds((now - countableFrom) / 1000, isPremiumRef.current)) {
          promptPendingRef.current = true;
        }
      }
    }

    sessionsRef.current.delete(key);

    // A pause is only "natural" once nothing is playing, so the prompt never
    // interrupts a video mid-flow.
    if (promptPendingRef.current && sessionsRef.current.size === 0) {
      promptPendingRef.current = false;
      resetWatchSeconds();
      triggerDonatePopup();
    }
  }, [triggerDonatePopup]);

  // Periodic flush so long sessions still accrue, plus a pause when the tab is
  // hidden — time spent in another tab is not viewing time.
  useEffect(() => {
    const interval = setInterval(flushSessions, FLUSH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushSessions();
        // Park every session at "now" so the hidden stretch is not counted.
        const now = Date.now();
        sessionsRef.current.forEach((session) => {
          session.lastFlush = now;
        });
      } else {
        const now = Date.now();
        sessionsRef.current.forEach((session) => {
          session.lastFlush = now;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [flushSessions]);

  // Devtools helpers.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__animref = {
      beginWatch,
      endWatch,
      triggerDonatePopup: (force = true) => triggerDonatePopup(force),
      resetWatchTime: () => {
        resetWatchSeconds();
        console.log('[Watch Tracker] Reset viewing time to 0.');
      },
      setWatchMinutes: (minutes: number) => {
        setWatchSeconds(minutes * 60);
        console.log(`[Watch Tracker] Viewing time set to ${minutes} min.`);
      },
      getWatchMinutes: () => {
        const seconds = getWatchSeconds();
        console.log(
          `[Watch Tracker] ${(seconds / 60).toFixed(2)} / ${WATCH_MINUTES_BEFORE_DONATE_POPUP} min` +
            ` (${sessionsRef.current.size} active session(s))`
        );
        return seconds / 60;
      },
      _debug: () => ({
        seconds: getWatchSeconds(),
        threshold: WATCH_SECONDS_BEFORE_DONATE_POPUP,
        sessions: [...sessionsRef.current.entries()],
        promptPending: promptPendingRef.current,
      }),
    };
  }, [beginWatch, endWatch, triggerDonatePopup]);

  return (
    <WatchTrackerContext.Provider
      value={{
        beginWatch,
        endWatch,
        showDonatePopup,
        setShowDonatePopup,
        triggerDonatePopup,
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
