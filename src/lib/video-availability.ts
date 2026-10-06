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
