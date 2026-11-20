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

export function isVideoSourceAvailable(videoUrl: string | null | undefined): boolean {
  if (!videoUrl) return true; // embeds/iframes and empty URLs are judged elsewhere
  const host = hostOf(videoUrl.trim());
  if (!host) return true;
  for (const unavailable of UNAVAILABLE_HOSTS) {
    if (host === unavailable || host.endsWith('.' + unavailable)) {
      return false;
    }
  }
  return true;
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
  // Convert Bunny CDN HLS playlist.m3u8 into universal MP4 stream
  if (target.includes('b-cdn.net') && target.includes('playlist.m3u8')) {
    return target.replace('playlist.m3u8', 'play_720p.mp4');
  }
  return target;
}

const CORS_VIDEO_HOSTS = [
  'b-cdn.net',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
];

const PROXYABLE_VIDEO_HOSTS = [
  'sakugabooru.com',
  'cdninstagram.com',
  'fbcdn.net',
  'instagram.com',
  'pinimg.com',
  'artstation.com',
  'vimeocdn.com',
  'cloudfront.net',
  'amazonaws.com',
  'giphy.com',
  'tenor.com',
  'imgur.com',
  'tumblr.com',
  'wikimedia.org',
];

/**
 * Returns true if the URL is same-origin or served from a CDN configured with
 * Access-Control-Allow-Origin, so setting crossOrigin="anonymous" will not
 * cause the browser to block playback.
 */
export function isCorsEnabledVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return true;
  }
  const host = hostOf(trimmed);
  if (!host) return false;
  return CORS_VIDEO_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function canProxyExternalVideo(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (trimmed.startsWith('/api/proxy/')) return false;
  const host = hostOf(trimmed);
  if (!host) return false;
  if (host.includes('youtube.com') || host.includes('youtu.be')) return false;
  return PROXYABLE_VIDEO_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function toVideoProxyUrl(url: string): string {
  if (!url || url.startsWith('/api/proxy/')) return url;
  return `/api/proxy/video?url=${encodeURIComponent(url)}`;
}

