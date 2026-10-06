import { db } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export const FREE_DAILY_UNLOCKED_LIMIT = 25;
export const FREE_UNLOCKED_LIMIT = FREE_DAILY_UNLOCKED_LIMIT;

export const ALL_TIME_UNLOCKED_STORAGE_KEY = 'animref_unlocked_references';
export const DAILY_QUOTA_STORAGE_KEY = 'animref_daily_quota';

/** Fired on window after this tab unlocks a reference; `storage` events only reach other tabs. */
export const QUOTA_CHANGED_EVENT = 'animref:quota-changed';

export interface DailyQuotaData {
  date: string; // "YYYY-MM-DD" local date string
  todayUnlockedIds: string[];
}

let memoryAllTimeStorage: string[] = [];
let memoryDailyStorage: DailyQuotaData = {
  date: getTodayDateString(),
  todayUnlockedIds: [],
};

/**
 * Returns today's date formatted as "YYYY-MM-DD" in local time.
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalAllTimeUnlockedIds(): string[] {
  if (typeof window === 'undefined') return memoryAllTimeStorage;
  try {
    const raw = window.localStorage.getItem(ALL_TIME_UNLOCKED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return memoryAllTimeStorage;
  }
}

function saveLocalAllTimeUnlockedIds(ids: string[]): void {
  memoryAllTimeStorage = ids;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ALL_TIME_UNLOCKED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

export function getDailyQuotaData(): DailyQuotaData {
  const today = getTodayDateString();
  if (typeof window === 'undefined') {
    if (memoryDailyStorage.date !== today) {
      memoryDailyStorage = { date: today, todayUnlockedIds: [] };
    }
    return memoryDailyStorage;
  }

  try {
    const raw = window.localStorage.getItem(DAILY_QUOTA_STORAGE_KEY);
    if (!raw) {
      const fresh = { date: today, todayUnlockedIds: [] };
      saveDailyQuotaData(fresh);
      return fresh;
    }
    const parsed: DailyQuotaData = JSON.parse(raw);
    if (parsed && parsed.date === today && Array.isArray(parsed.todayUnlockedIds)) {
      return parsed;
    }
    // New day: reset today's count to 0 while keeping all-time intact
    const reset = { date: today, todayUnlockedIds: [] };
    saveDailyQuotaData(reset);
    return reset;
  } catch {
    return { date: today, todayUnlockedIds: [] };
  }
}

export function saveDailyQuotaData(data: DailyQuotaData): void {
  memoryDailyStorage = data;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DAILY_QUOTA_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearStorageForTesting(): void {
  memoryAllTimeStorage = [];
  memoryDailyStorage = {
    date: getTodayDateString(),
    todayUnlockedIds: [],
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(ALL_TIME_UNLOCKED_STORAGE_KEY);
      window.localStorage.removeItem(DAILY_QUOTA_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Returns the list of all-time unlocked reference IDs (re-playable forever),
 * combining local storage and user profile array if available.
 */
export function getUnlockedReferenceIds(userUnlockedList?: string[]): string[] {
  const local = getLocalAllTimeUnlockedIds();
  if (!userUnlockedList || !Array.isArray(userUnlockedList)) {
    return local;
  }
  // Union of both, preserving order with newest first where possible
  const merged = Array.from(new Set([...local, ...userUnlockedList]));
  return merged;
}

/**
 * Returns comprehensive daily quota status: today's count, remaining daily allowance,
 * whether the 25 daily limit is reached, and all-time unlocked IDs.
 */
export function getDailyQuotaStatus(
  userUnlockedList?: string[],
  limit = FREE_DAILY_UNLOCKED_LIMIT
): {
  date: string;
  todayCount: number;
  todayRemaining: number;
  limit: number;
  isDailyLimitReached: boolean;
  todayUnlockedIds: string[];
  allTimeUnlockedIds: string[];
} {
  const daily = getDailyQuotaData();
  const todayCount = daily.todayUnlockedIds.length;
  const todayRemaining = Math.max(0, limit - todayCount);
  const allTimeUnlockedIds = getUnlockedReferenceIds(userUnlockedList);

  return {
    date: daily.date,
    todayCount,
    todayRemaining,
    limit,
    isDailyLimitReached: todayCount >= limit,
    todayUnlockedIds: daily.todayUnlockedIds,
    allTimeUnlockedIds,
  };
}

/**
 * Checks whether a specific video ID has already been unlocked by this user.
 * Any previously watched video is permanently unlocked and free to re-watch.
 */
export function isReferenceUnlocked(
  videoId: string,
  isPro: boolean,
  userUnlockedList?: string[]
): boolean {
  if (isPro) return true;
  if (!videoId) return true;
  const unlocked = getUnlockedReferenceIds(userUnlockedList);
  return unlocked.includes(videoId);
}

/**
 * Records a reference unlock.
 * - If the video has already been watched before: Allowed for free without consuming daily quota!
 * - If new and user reached their 25 daily quota: Returns success: false (blocked until tomorrow or Pro).
 * - If new and user has quota: Consumes 1 daily quota, saves to all-time, and dispatches event.
 */
export async function unlockReference(
  videoId: string,
  uid?: string,
  userUnlockedList?: string[],
  limit = FREE_DAILY_UNLOCKED_LIMIT
): Promise<{
  success: boolean;
  alreadyUnlocked: boolean;
  count: number;
  ids: string[];
  todayCount: number;
  todayRemaining: number;
}> {
  if (!videoId) {
    return {
      success: false,
      alreadyUnlocked: false,
      count: 0,
      ids: [],
      todayCount: 0,
      todayRemaining: limit,
    };
  }

  const allTime = getUnlockedReferenceIds(userUnlockedList);
  const daily = getDailyQuotaData();

  // 1. If already watched before (today or in the past), it is 100% free to rewatch anytime!
  if (allTime.includes(videoId)) {
    return {
      success: true,
      alreadyUnlocked: true,
      count: allTime.length,
      ids: allTime,
      todayCount: daily.todayUnlockedIds.length,
      todayRemaining: Math.max(0, limit - daily.todayUnlockedIds.length),
    };
  }

  // 2. Check if daily quota of 25 is exhausted
  if (daily.todayUnlockedIds.length >= limit) {
    return {
      success: false,
      alreadyUnlocked: false,
      count: allTime.length,
      ids: allTime,
      todayCount: daily.todayUnlockedIds.length,
      todayRemaining: 0,
    };
  }

  // 3. New video within daily quota: add to today and all-time
  const updatedToday = [videoId, ...daily.todayUnlockedIds];
  const updatedAllTime = [videoId, ...allTime.filter((id) => id !== videoId)];

  saveDailyQuotaData({ date: daily.date, todayUnlockedIds: updatedToday });
  saveLocalAllTimeUnlockedIds(updatedAllTime);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(QUOTA_CHANGED_EVENT));
  }

  // Sync to Firestore if authenticated
  if (uid && db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        unlockedReferences: arrayUnion(videoId),
      });
    } catch (err) {
      console.warn('Failed to sync unlocked reference to Firestore profile:', err);
    }
  }

  return {
    success: true,
    alreadyUnlocked: false,
    count: updatedAllTime.length,
    ids: updatedAllTime,
    todayCount: updatedToday.length,
    todayRemaining: Math.max(0, limit - updatedToday.length),
  };
}
