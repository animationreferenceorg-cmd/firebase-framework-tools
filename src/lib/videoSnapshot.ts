import type { Video } from './types';

// Static snapshot of all published, non-short videos, generated at build/deploy
// time by scripts/export-videos-snapshot.cjs. Reading it costs zero Firestore
// reads. Videos are ordered oldest-first; createdAt is serialized as millis.
let cache: Promise<Video[]> | null = null;

export function getSnapshotVideos(): Promise<Video[]> {
  if (!cache) {
    cache = fetch('/data/videos-snapshot.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load video snapshot (${res.status})`);
        return res.json() as Promise<Video[]>;
      })
      .catch(err => {
        console.warn('Unable to fetch /data/videos-snapshot.json, using fallback:', err);
        cache = null; // allow retry on next call
        return [] as Video[];
      });
  }
  return cache;
}
