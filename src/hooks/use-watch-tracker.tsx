'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from './use-user';
import { recordReferenceView, WATCH_LIMIT_BEFORE_DONATE_POPUP } from '@/lib/watch-tracker';
import { DonateDialog } from '@/components/DonateDialog';

interface WatchTrackerContextType {
  recordWatch: () => void;
  showDonatePopup: boolean;
  setShowDonatePopup: (show: boolean) => void;
  triggerDonatePopup: () => void;
}

const WatchTrackerContext = createContext<WatchTrackerContextType | undefined>(undefined);

export function WatchTrackerProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useUser();
  const [showDonatePopup, setShowDonatePopup] = useState(false);
  const [forceTimer, setForceTimer] = useState(false);

  const isPremium = userProfile?.isPremium;

  const triggerDonatePopup = useCallback((force = false) => {
    if (isPremium && !force) {
      console.log('[Watch Tracker] User has an active paid plan (isPremium: true) - donate popup suppressed.');
      return;
    }
    console.log('[Watch Tracker] Opening 12-second Donate Popup.');
    setForceTimer(true);
    setShowDonatePopup(true);
  }, [isPremium]);

  const recordWatch = useCallback(() => {
    if (isPremium) {
      console.log('[Watch Tracker] User is Premium - skipping watch count.');
      return;
    }
    const limitReached = recordReferenceView(isPremium);
    if (limitReached) {
      triggerDonatePopup();
    }
  }, [isPremium, triggerDonatePopup]);

  // Expose global helper for easy testing in browser DevTools
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__animref = {
        recordWatch,
        triggerDonatePopup: (force = true) => triggerDonatePopup(force),
        resetWatchCount: () => {
          localStorage.setItem('animref_watch_count', '0');
          console.log('[Watch Tracker] Reset count to 0.');
        },
        setWatchCount: (val: number) => {
          localStorage.setItem('animref_watch_count', val.toString());
          console.log(`[Watch Tracker] Set count to ${val}.`);
        },
        getWatchCount: () => {
          const val = localStorage.getItem('animref_watch_count') || '0';
          console.log(`[Watch Tracker] Current count: ${val}/${WATCH_LIMIT_BEFORE_DONATE_POPUP}`);
          return val;
        }
      };
    }
  }, [recordWatch, triggerDonatePopup]);

  return (
    <WatchTrackerContext.Provider
      value={{
        recordWatch,
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
