// src/lib/paywall.ts

import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const LOCAL_KEY = 'anim_paywall_views';
const THRESHOLD = 10;

/** Safely get local count from localStorage */
export function getLocalCounter(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(LOCAL_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Synchronously increment view counter and trigger prompt check if count reaches threshold */
export function incrementVideoViews(uid?: string): { count: number; showPrompt: boolean } {
  if (typeof window === 'undefined') return { count: 0, showPrompt: false };

  let current = getLocalCounter() + 1;
  try {
    localStorage.setItem(LOCAL_KEY, current.toString());
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }

  // Silent sync to Firestore for logged in users
  if (uid && db) {
    try {
      const userRef = doc(db, 'users', uid);
      setDoc(userRef, { paywall: { counter: current, lastUpdated: new Date().toISOString() } }, { merge: true }).catch(() => {});
    } catch {
      // Ignore background sync errors
    }
  }

  // Trigger prompt every 10 views
  const showPrompt = current > 0 && current % THRESHOLD === 0;
  return { count: current, showPrompt };
}

/** Check synchronously if prompt should be shown */
export function shouldShowPrompt(): boolean {
  const count = getLocalCounter();
  return count > 0 && count % THRESHOLD === 0;
}

/** Legacy export wrappers for compatibility */
export async function incrementCounter(uid?: string): Promise<number> {
  return incrementVideoViews(uid).count;
}

export async function shouldShowDonatePrompt(uid?: string): Promise<boolean> {
  return shouldShowPrompt();
}


