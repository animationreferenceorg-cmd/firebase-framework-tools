import { createHash } from 'node:crypto';
import type { ProviderPage, ProviderRequest } from './reference-providers';
import type { UnifiedSearchResult } from './reference-feed';

/**
 * Animation video discovery (YouTube + Vimeo) through Bing's public video
 * index. Keyless, nothing is downloaded or re-hosted: results are played
 * through the platforms' own players.
 *
 * Animators want reference, so the engine:
 *  1. Rewrites the query toward animation ("cat" -> "cat animation reference").
 *  2. Drops AI-generated clips, kids/nursery channels and unrelated media.
 *  3. Ranks craft content (cycles, blocking, breakdowns, reels, film clips)
 *     above viral shorts.
 */

const PAGE_SIZE = 24;
const MAX_OFFSET = 300;

/** Query already speaks "animation"; no need to append it. */
const ANIMATION_QUERY = /\b(animat\w*|sakuga|walk ?cycle|run ?cycle|line ?test|keyframe|blocking|stop ?motion|claymation|lip ?sync|mocap|anime|cartoon|reel|showreel)\b/i;

const AI_CONTENT = /\b(ai|a\.i\.)\b|ai[- ]?(generated|animation|video|art)|#ai\w*|\b(kling|sora|midjourney|runway ?gen|veo ?\d|pika ?labs|hailuo|luma ?dream)\b/i;
const KIDS_CONTENT = /\b(nursery|preschool|kindergarten|toddlers?|for (kids|children)|kids (songs?|cartoons?|videos?)|baby shark|cocomelon|phonics|abc song|lullaby)\b/i;
const OFF_TOPIC = /\b(news|podcast|full album|official music video|lyrics?|asmr|reaction|unboxing|gameplay walkthrough|let'?s play)\b/i;

/** Signals that a clip is useful craft reference, strongest first. */
const CRAFT_SIGNALS: Array<[RegExp, number]> = [
  [/\b(reference|ref)\b/i, 40],
  [/\b(walk|run|jump|fly|flight|idle|attack|fight) ?cycles?\b|\bcycles?\b/i, 35],
  [/\b(blocking|spline|polish|keyframes?|key poses?|in-?betweens?|breakdowns?|timing|spacing|arcs?|overlap|follow[- ]through|anticipation|squash|stretch)\b/i, 35],
  [/\b(body mechanics|locomotion|acting|lip ?sync|facial|weight|motion study|study|studies)\b/i, 30],
  [/\b(line ?test|pencil test|rough animation|sakuga|frame[- ]by[- ]frame|2d animation|hand[- ]drawn|traditional animation|stop ?motion)\b/i, 30],
  [/\b(demo ?reel|showreel|animation reel|reel)\b/i, 25],
  [/\b(tutorial|how to animate|masterclass|guide|tips|lesson|workflow)\b/i, 20],
  [/\b(behind the scenes|making of|vfx breakdown|animation breakdown|layout|animatic|storyboard)\b/i, 20],
  [/\b(pixar|disney|dreamworks|ghibli|sony pictures animation|spider-?verse|illumination|laika|aardman|cartoon saloon|framestore|ilm|weta|blue sky)\b/i, 15],
  [/\b(maya|blender|toon ?boom|harmony|tvpaint|krita|after effects|animate cc|clip studio|cascadeur|unreal|motionbuilder)\b/i, 10],
  [/\b(3d animation|cg animation|character animation|creature animation|animation)\b/i, 10],
];
const LOW_SIGNALS: Array<[RegExp, number]> = [
  [/#shorts?\b/i, -15],
  [/[\u{1F300}-\u{1FAFF}]{2,}/u, -10],
  [/\b(viral|funny|cute|hilarious|satisfying|edit|amv|compilation|top \d+|ranking)\b/i, -10],
  [/(#\w+\s*){4,}/, -10],
];

export function animationVideoQueries(query: string, tab: string): string[] {
  const q = (query || '').trim() || (tab === 'animations' ? 'character animation' : 'animation reference');
  if (ANIMATION_QUERY.test(q)) return [q, `${q} reference`];
  return [`${q} animation reference`, `${q} animation`];
}

export function scoreAnimationTitle(title: string): number {
  let score = 0;
  for (const [re, pts] of CRAFT_SIGNALS) if (re.test(title)) score += pts;
  for (const [re, pts] of LOW_SIGNALS) if (re.test(title)) score += pts;
  return score;
}

export function isRejectedAnimationTitle(title: string): boolean {
  return AI_CONTENT.test(title) || KIDS_CONTENT.test(title) || OFF_TOPIC.test(title);
}

function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

interface RawVideo { url: string; title: string; duration?: string; channel?: string; thumb?: string; motion?: string }

export function parseBingVideoResults(html: string): RawVideo[] {
  const thumbs = new Map<string, string>();
  for (const match of html.matchAll(/mmeta="(\{[^"]+\})"/g)) {
    try {
      const meta = JSON.parse(decode(match[1]));
      const url = meta.murl || meta.pgurl;
      if (url && meta.turl) thumbs.set(url, meta.turl);
    } catch {}
  }
  const rows: RawVideo[] = [];
  for (const match of html.matchAll(/vrhm="(\{[^"]+\})"/g)) {
    try {
      const meta = JSON.parse(decode(match[1]));
      const url = meta.murl || meta.pgurl;
      if (!url || !meta.vt) continue;
      const channel = typeof meta.capt?.crtnamemore === 'string'
        ? meta.capt.crtnamemore.replace(/^More\s+/i, '').replace(/\s+videos?$/i, '').trim()
        : undefined;
      rows.push({ url, title: decode(String(meta.vt)), duration: meta.du, channel, thumb: thumbs.get(url) });
    } catch {}
  }
  return rows;
}

function toResult(row: RawVideo, query: string): UnifiedSearchResult | null {
  const youtubeId = row.url.match(/youtube\.com\/(?:watch\?v=|shorts\/)([\w-]{11})/)?.[1] || row.url.match(/youtu\.be\/([\w-]{11})/)?.[1];
  const vimeoId = row.url.match(/vimeo\.com\/(?:video\/)?(\d{5,})/)?.[1];
  if (!youtubeId && !vimeoId) return null;
  const source: UnifiedSearchResult['source'] = youtubeId ? 'youtube' : 'vimeo';
  const sourceUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : `https://vimeo.com/${vimeoId}`;
  const thumbnailUrl = youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : (row.thumb || `https://vumbnail.com/${vimeoId}.jpg`);
  const title = row.title.replace(/\s*[|-]\s*(YouTube|Vimeo)$/i, '').trim();
  return {
    id: youtubeId ? `yt_${youtubeId}` : `vimeo_${vimeoId}`,
    title,
    source,
    sourceUrl,
    // Played through the platform's own player (react-player); nothing is re-hosted.
    mediaUrl: sourceUrl,
    thumbnailUrl,
    motionUrl: row.motion,
    mediaType: 'video',
    width: 1280,
    height: 720,
    authorName: row.channel || (youtubeId ? 'YouTube Animator' : 'Vimeo Animator'),
    tags: Array.from(new Set([
      source, 'animations', 'video-reference',
      ...query.toLowerCase().split(/\s+/).filter(word => word.length > 1),
    ])),
    description: [row.duration ? `Duration ${row.duration}.` : '', `Watch on ${youtubeId ? 'YouTube' : 'Vimeo'} for full credit and context.`].filter(Boolean).join(' '),
  };
}

async function fetchDuckDuckGoVideos(query: string, signal: AbortSignal): Promise<RawVideo[]> {
  try {
    const vqdRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal,
    });
    const html = await vqdRes.text();
    const match = html.match(/vqd=([0-9-]+)/) || html.match(/vqd="([0-9-]+)"/);
    const vqd = match ? match[1] : null;
    if (!vqd) return [];

    const res = await fetch(`https://duckduckgo.com/v.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/',
      },
      signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      url: r.content,
      title: r.title,
      duration: r.duration,
      channel: r.uploader,
      thumb: r.images?.large || r.images?.medium,
      motion: r.images?.motion,
    }));
  } catch {
    return [];
  }
}

async function fetchBingVideos(query: string, offset: number, signal: AbortSignal): Promise<RawVideo[]> {
  const params = new URLSearchParams({ q: query, FORM: 'HDRSC3' });
  if (offset > 0) params.set('first', String(offset + 1));
  const response = await fetch(`https://www.bing.com/videos/search?${params}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal, next: { revalidate: 900 },
  });
  if (!response.ok) throw new Error(`Video search returned ${response.status}`);
  return parseBingVideoResults(await response.text());
}

/**
 * @param platform restrict to one platform, or both when omitted.
 */
export async function searchAnimationVideos(options: ProviderRequest, platform?: 'youtube' | 'vimeo'): Promise<ProviderPage> {
  if (process.env.OPEN_IMAGE_SEARCH !== 'true') {
    return { items: [], next: null, unconfigured: true, message: 'Animation video search is not enabled (set OPEN_IMAGE_SEARCH=true).' };
  }
  const match = options.position?.match(/^vid:(\d{1,4})$/);
  if (options.position && !match) throw new Error('Invalid video search cursor');
  const offset = match ? Number(match[1]) : 0;
  if (offset > MAX_OFFSET) throw new Error('Invalid video search page');

  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(6000)]) : AbortSignal.timeout(6000);
  const queries = animationVideoQueries(options.query, options.tab);
  const ddgTask = offset === 0 ? fetchDuckDuckGoVideos(queries[0], signal) : Promise.resolve([]);
  const bingTasks = queries.map(query => fetchBingVideos(query, offset, signal));
  const [ddgResult, ...bingResults] = await Promise.allSettled([ddgTask, ...bingTasks]);

  const ddgRaw = ddgResult.status === 'fulfilled' ? ddgResult.value : [];
  const bingRaw = bingResults.flatMap(b => b.status === 'fulfilled' ? b.value : []);
  const raw = [...ddgRaw, ...bingRaw];
  if (raw.length === 0 && bingResults.every(b => b.status === 'rejected')) throw new Error('Animation video search unavailable');
  const seen = new Set<string>();
  const ranked: Array<{ item: UnifiedSearchResult; score: number; order: number }> = [];
  raw.forEach((row, order) => {
    if (isRejectedAnimationTitle(row.title)) return;
    const item = toResult(row, options.query || '');
    if (!item || seen.has(item.id)) return;
    if (platform && item.source !== platform) return;
    seen.add(item.id);
    // Bing already ranked by relevance; craft signals re-order within it.
    ranked.push({ item, score: scoreAnimationTitle(row.title) - order * 0.25, order });
  });
  ranked.sort((a, b) => b.score - a.score);

  const next = raw.length >= PAGE_SIZE && offset + PAGE_SIZE <= MAX_OFFSET ? `vid:${offset + PAGE_SIZE}` : null;
  return { items: ranked.map(entry => entry.item), next };
}

