import type { Video } from './types';
import { filterAvailableVideos } from './video-availability';

// In-memory caches to eliminate redundant network fetches and JSON parsing
let memoryFullCache: Video[] | null = null;
let memoryInitialCache: Video[] | null = null;
let fullSnapshotPromise: Promise<Video[]> | null = null;
let initialSnapshotPromise: Promise<Video[]> | null = null;

/**
 * Fast initial slice (~55 KB, 60 videos) so home page and catalog render
 * in under 50ms without waiting for the full 7.5 MB catalog snapshot.
 */
export function getInitialVideos(): Promise<Video[]> {
  if (memoryInitialCache) return Promise.resolve(memoryInitialCache);
  if (memoryFullCache) return Promise.resolve(memoryFullCache.slice(0, 60));

  if (!initialSnapshotPromise) {
    initialSnapshotPromise = fetch('/data/initial-videos.json', { cache: 'default' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load initial videos (${res.status})`);
        return res.json() as Promise<Video[]>;
      })
      .then((data) => {
        const filtered = filterAvailableVideos(data);
        memoryInitialCache = filtered;
        return filtered;
      })
      .catch((err) => {
        console.warn('Unable to fetch /data/initial-videos.json, falling back:', err);
        initialSnapshotPromise = null;
        return [] as Video[];
      });
  }
  return initialSnapshotPromise;
}

/**
 * Full catalog of published reference videos. Uses standard HTTP caching so
 * repeated visits and navigations return instantly from memory or disk cache.
 */
export function getSnapshotVideos(): Promise<Video[]> {
  if (memoryFullCache) return Promise.resolve(memoryFullCache);

  if (!fullSnapshotPromise) {
    fullSnapshotPromise = fetch('/data/videos-snapshot.json', { cache: 'default' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load video snapshot (${res.status})`);
        return res.json() as Promise<Video[]>;
      })
      .then((data) => {
        const filtered = filterAvailableVideos(data);
        memoryFullCache = filtered;
        return filtered;
      })
      .catch((err) => {
        console.warn('Unable to fetch /data/videos-snapshot.json, using fallback:', err);
        fullSnapshotPromise = null;
        return memoryInitialCache || ([] as Video[]);
      });
  }
  return fullSnapshotPromise;
}
