import config from './unavailable-video-hosts.json';

/**
 * Whether a library video can still be played. Some videos were hotlinked
 * from third-party hosts that have since gone offline; listing them only
 * produces cards and players that fail with "Video couldn't load".
 * The host list lives in unavailable-video-hosts.json so the build-time
 * snapshot export (scripts/export-videos-snapshot.cjs) shares it.
 */

const UNAVAILABLE_HOSTS = new Set(config.hosts.map((h) => h.toLowerCase()));

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** True unless the video's file lives on a host known to be offline. */
export function isVideoSourceAvailable(videoUrl: string | null | undefined): boolean {
  if (!videoUrl) return true; // embeds/iframes and empty URLs are judged elsewhere
  const host = hostOf(videoUrl.trim());
  return !host || !UNAVAILABLE_HOSTS.has(host);
}

export function filterAvailableVideos<T extends { videoUrl?: string | null }>(videos: T[]): T[] {
  return videos.filter((v) => isVideoSourceAvailable(v.videoUrl));
}

/**
 * Normalizes video URLs, extracting src from raw <iframe> strings and converting
 * YouTube embed URLs to standard watch URLs for ReactPlayer compatibility.
 */
export function sanitizeVideoUrl(url?: string | null): string {
  if (!url) return '';
  let target = url.trim();
  if (target.startsWith('<iframe')) {
    const match = target.match(/src=["']([^"']+)["']/i);
    if (match) target = match[1];
  }
  // Convert YouTube /embed/ into watch format so players don't choke
  const ytMatch = target.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([\w-]{11})/i);
  if (ytMatch) {
    return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
  }
  return target;
}

