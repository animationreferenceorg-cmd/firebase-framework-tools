import { db } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export const FREE_UNLOCKED_LIMIT = 25;
const STORAGE_KEY = 'animref_unlocked_references';

let memoryStorage: string[] = [];

function getLocalUnlockedIds(): string[] {
  if (typeof window === 'undefined') return memoryStorage;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return memoryStorage;
  }
}

function saveLocalUnlockedIds(ids: string[]) {
  if (typeof window === 'undefined') {
    memoryStorage = ids;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    memoryStorage = ids;
  }
}

export function clearStorageForTesting(): void {
  memoryStorage = [];
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Returns the list of unlocked reference IDs, combining local storage
 * and user profile array if available.
 */
export function getUnlockedReferenceIds(userUnlockedList?: string[]): string[] {
  const local = getLocalUnlockedIds();
  if (!userUnlockedList || !Array.isArray(userUnlockedList)) {
    return local;
  }
  // Union of both
  const merged = Array.from(new Set([...local, ...userUnlockedList]));
  return merged;
}

/**
 * Checks whether a specific video ID has already been unlocked by this user.
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
 * Records a new reference unlock if the user has remaining quota.
 */
export async function unlockReference(
  videoId: string,
  uid?: string,
  userUnlockedList?: string[],
  limit = FREE_UNLOCKED_LIMIT
): Promise<{ success: boolean; alreadyUnlocked: boolean; count: number; ids: string[] }> {
  if (!videoId) {
    return { success: false, alreadyUnlocked: false, count: 0, ids: [] };
  }

  const current = getUnlockedReferenceIds(userUnlockedList);

  if (current.includes(videoId)) {
    return { success: true, alreadyUnlocked: true, count: current.length, ids: current };
  }

  if (current.length >= limit) {
    return { success: false, alreadyUnlocked: false, count: current.length, ids: current };
  }

  const updated = [...current, videoId];
  saveLocalUnlockedIds(updated);

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

  return { success: true, alreadyUnlocked: false, count: updated.length, ids: updated };
}
