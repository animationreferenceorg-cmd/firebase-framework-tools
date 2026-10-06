/**
 * Resolves a library video to a downloadable MP4.
 *
 * Library videos are stored as Bunny HLS playlists. Bunny also serves MP4
 * renditions next to the playlist, but only the resolutions that were
 * encoded exist (a 480p source has no 720p file), and the pull zone rejects
 * requests that do not come from the site. So we probe the ladder from best
 * to worst with the site as referrer and return the first file that exists.
 */

export const SITE_REFERER = 'https://animationreference.org/';
const RENDITIONS = [1080, 720, 480, 360, 240] as const;
const DIRECT_FILE = /\.(mp4|webm|mov)(\?|$)|firebasestorage|b-cdn\.net\/.+\.mp4|assets\.reflix\.dev/i;
const PROBE_TIMEOUT_MS = 4000;

type Fetcher = (url: string, init: { method: string; headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean }>;

async function exists(url: string, fetcher: Fetcher): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetcher(url, { method: 'HEAD', headers: { Referer: SITE_REFERER }, signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Returns an https URL to a downloadable file, or null when the source has none (embeds, missing renditions). */
export async function resolveDownloadUrl(raw: unknown, fetcher: Fetcher = fetch as unknown as Fetcher): Promise<string | null> {
  if (typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!url.startsWith('https://')) return null;

  if (url.includes('playlist.m3u8')) {
    const base = url.slice(0, url.indexOf('playlist.m3u8'));
    for (const height of RENDITIONS) {
      const candidate = `${base}play_${height}p.mp4`;
      if (await exists(candidate, fetcher)) return candidate;
    }
    return null;
  }

  return DIRECT_FILE.test(url) ? url : null;
}
