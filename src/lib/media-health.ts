'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Video } from '@/lib/types';

/** Resolves true if the image loads, false on error or after `timeoutMs`. */
export function probeImage(url: string, timeoutMs = 6000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !url) return resolve(false);
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.src = '';
      resolve(false);
    }, timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img.naturalWidth > 0);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

function hostOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function thumbnailOf(video: Video): string | undefined {
  return video.thumbnailUrl || video.posterUrl || undefined;
}

/**
 * Which media hosts are actually serving right now.
 *
 * The library hotlinks thumbnails from a handful of CDNs, and outages happen
 * a whole host at a time — a lapsed CDN account returns 403 for every file,
 * and Instagram's signed links all expire together. So rather than probing
 * hundreds of individual images, this checks one sample per host (typically
 * fewer than ten requests) and lets discovery surfaces skip hosts that are
 * down. When a host recovers, its media reappears on the next visit.
 *
 * Returns null until the probes finish, so callers can hold a skeleton rather
 * than render dead thumbnails and then swap them out.
 */
export function useHealthyHosts(videos: Video[]): Set<string> | null {
  const samples = useMemo(() => {
    const byHost = new Map<string, string>();
    for (const v of videos) {
      const url = thumbnailOf(v);
      const host = hostOf(url);
      if (host && url && !byHost.has(host)) byHost.set(host, url);
    }
    return byHost;
  }, [videos]);

  const [healthy, setHealthy] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (samples.size === 0) return;
    let cancelled = false;
    Promise.all(
      Array.from(samples.entries()).map(async ([host, url]) => [host, await probeImage(url)] as const)
    ).then((results) => {
      if (cancelled) return;
      const ok = new Set(results.filter(([, alive]) => alive).map(([host]) => host));
      const down = results.filter(([, alive]) => !alive).map(([host]) => host);
      if (down.length) console.warn('[media-health] Media hosts not serving:', down.join(', '));
      setHealthy(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [samples]);

  return healthy;
}

/** Keeps only videos whose thumbnail lives on a host that is serving. */
export function withHealthyMedia(videos: Video[], healthy: Set<string> | null): Video[] {
  if (!healthy) return [];
  return videos.filter((v) => {
    const host = hostOf(thumbnailOf(v));
    return host !== null && healthy.has(host);
  });
}
