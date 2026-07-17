// src/lib/paywall.ts

/**
 * Helper utilities for the free‑user paywall counter.
 * For authenticated users we store the counter in Firestore under the
 * user document (`paywall.counter` and `paywall.lastShown`).
 * For anonymous visitors we keep the data in `localStorage`.
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const LOCAL_KEY = 'paywallCounter';
const DAILY_THRESHOLD = 10; // free view limit per day
// After each dismissal, require more views before showing again:
// 1st dismissal → 20 more, 2nd dismissal → 35 more, further dismissals keep 35
const POST_CLOSE_LIMITS = [20, 35];

/** Increment the counter and return the new value. */
export async function incrementCounter(uid?: string): Promise<number> {
  if (uid) {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const data = snap.data() as any;
    const current = (data?.paywall?.counter ?? 0) + 1;
    await setDoc(
      userRef,
      { paywall: { counter: current, lastShown: data?.paywall?.lastShown ?? null } },
      { merge: true }
    );
    return current;
  } else {
    // anonymous – use localStorage
    const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}');
    const current = (stored.counter ?? 0) + 1;
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...stored, counter: current }));
    return current;
  }
}

/** Reset the counter (used when the user clicks “Remind me later”). */
export async function resetCounter(uid?: string): Promise<void> {
  if (uid) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { 'paywall.counter': 0 });
  } else {
    const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}');
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...stored, counter: 0 }));
  }
}

/** Return true if the counter has reached the threshold. */
/**
 * Check and reset daily counter if a new day has started (UTC).
 * Returns true if the user has reached the daily limit.
 */
export async function hasReachedDailyLimit(uid?: string): Promise<boolean> {
  const now = Date.now();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();

  if (uid) {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const data = snap.data() as any;
    const lastReset = data?.paywall?.lastReset?.toMillis?.() ?? 0;
    let count = data?.paywall?.counter ?? 0;

    if (lastReset < dayStartMs) {
      // New day – reset counter and dismissal flags
      await setDoc(
        userRef,
        {
          paywall: {
            counter: 0,
            lastReset: new Date(dayStartMs),
            donationDismissed: false,
            dismissedAtCount: 0,
          },
        },
        { merge: true }
      );
      count = 0;
    }
    return count >= DAILY_THRESHOLD;
  } else {
    const storedRaw = localStorage.getItem(LOCAL_KEY);
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    const lastReset = stored.lastReset ?? 0;
    let count = stored.counter ?? 0;

    if (lastReset < dayStartMs) {
      // Reset for anonymous user and clear dismissal flags
      const newStored = {
        counter: 0,
        lastReset: dayStartMs,
        donationDismissed: false,
        dismissedAtCount: 0,
      };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(newStored));
      count = 0;
    }
    return (count ?? 0) >= DAILY_THRESHOLD;
  }
}

/** Helper to determine if social links should be accessible */
// Helper to record that the user dismissed the donation prompt
export async function recordDonationPromptDismiss(uid?: string): Promise<void> {
  if (uid) {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const data = snap.data() as any;
    const currentCount = data?.paywall?.counter ?? 0;
    const previousDismissCount = data?.paywall?.donationDismissCount ?? 0;
    await setDoc(
      userRef,
      {
        paywall: {
          donationDismissed: true,
          dismissedAtCount: currentCount,
          // Increment dismissal count each time the prompt is dismissed
          donationDismissCount: previousDismissCount + 1,
        },
      },
      { merge: true }
    );
  } else {
    const storedRaw = localStorage.getItem(LOCAL_KEY);
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    const currentCount = stored.counter ?? 0;
    const previousDismissCount = stored.donationDismissCount ?? 0;
    const newStored = {
      ...stored,
      donationDismissed: true,
      dismissedAtCount: currentCount,
      donationDismissCount: previousDismissCount + 1,
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(newStored));
  }
}

// Decide whether to show the donation prompt overlay
export async function shouldShowDonatePrompt(uid?: string): Promise<boolean> {
  let count = 0;
  if (uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    const data = snap.data() as any;
    count = data?.paywall?.counter ?? 0;
  } else {
    const storedRaw = localStorage.getItem(LOCAL_KEY);
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    count = stored.counter ?? 0;
  }
  return count > 0 && count % 10 === 0;
}

export const PAYWALL_THRESHOLD = DAILY_THRESHOLD;

