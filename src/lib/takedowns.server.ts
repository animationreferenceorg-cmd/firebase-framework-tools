import { getFirestore } from './firebase-admin';

/**
 * Library videos removed after a report. Video pages read from the static
 * snapshot, which only changes on deploy, so this list makes a takedown take
 * effect immediately. Cached per server instance for a few minutes.
 */

export const TAKEDOWN_COLLECTION = 'takedowns';
const TTL_MS = 5 * 60 * 1000;
let cache: { ids: Set<string>; at: number } | null = null;

export async function getTakenDownVideoIds(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.ids;
  try {
    const snap = await getFirestore().collection(TAKEDOWN_COLLECTION).select().get();
    cache = { ids: new Set(snap.docs.map((d) => d.id)), at: Date.now() };
  } catch (error) {
    console.error('Could not load takedowns:', error);
    cache = { ids: cache?.ids ?? new Set(), at: Date.now() };
  }
  return cache.ids;
}

export async function isVideoTakenDown(id: string): Promise<boolean> {
  return (await getTakenDownVideoIds()).has(id);
}
