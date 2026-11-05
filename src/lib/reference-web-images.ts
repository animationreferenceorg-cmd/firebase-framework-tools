import { buildInstagramHashtagQuery, getSocialHashtagsForQuery } from './social-hashtags';
import { createHash } from 'node:crypto';
import type { ProviderPage, ProviderRequest } from './reference-providers';
import type { UnifiedSearchResult } from './reference-feed';

const PAGE_SIZE = 24;
const BRAVE_LIMIT = 200;

const JUNK_STOCK_DOMAINS = [
  'freepik.com',
  'etsy.com',
  'rawpixel.com',
  'vectorstock.com',
  'shutterstock.com',
  'istockphoto.com',
  'dreamstime.com',
  'depositphotos.com',
  'adobe.com/express',
  'flixier.com',
];

function httpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}

function sourceFor(url: string, mediaUrl?: string): UnifiedSearchResult['source'] {
  try {
    const host = new URL(url).hostname;
    const mediaHost = mediaUrl ? new URL(mediaUrl).hostname : '';
    if (/(^|\.)artstation\.com$/i.test(host) || /(^|\.)artstation\.com$/i.test(mediaHost)) return 'artstation';
    if (/(^|\.)pinterest\.(com|co\.uk|ca|fr|de|jp|es|it|com\.au)$/i.test(host) || /(^|\.)pinimg\.com$/i.test(mediaHost)) return 'pinterest';
    if (/(^|\.)vimeo\.com$/i.test(host) || /(^|\.)vimeocdn\.com$/i.test(mediaHost)) return 'vimeo';
    if (/(^|\.)instagram\.com$/i.test(host) || /(^|\.)cdninstagram\.com$/i.test(mediaHost)) return 'instagram';
    return 'web-images';
  } catch {
    return 'web-images';
  }
}

function parseOpenImageResults(html: string): any[] {
  const matches = [...html.matchAll(/m="(\{[^"]+\})"/g)];
  const rows: any[] = [];
  for (const match of matches) {
    try {
      const decoded = match[1].replace(/&quot;/g, '"');
      const json = JSON.parse(decoded);
      if (json.murl) {
        rows.push({
          title: json.t || 'Image reference',
          link: json.purl || json.murl,
          imageUrl: json.murl,
          thumbnailUrl: json.turl || json.murl,
          imageWidth: Number(json.w) || undefined,
          imageHeight: Number(json.h) || undefined,
        });
      }
    } catch {}
  }
  return rows;
}

/** Independent indexed discovery across Web, Pinterest, Vimeo, Instagram, ArtStation */
async function fetchDuckDuckGoImages(query: string, signal: AbortSignal): Promise<any[]> {
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

    const res = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/',
      },
      signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      link: r.url,
      imageUrl: r.image,
      thumbnailUrl: r.thumbnail,
      imageWidth: r.width,
      imageHeight: r.height,
    }));
  } catch {
    return [];
  }
}

export async function searchWebImages(options: ProviderRequest): Promise<ProviderPage> {
  const serperKey = process.env.SERPER_API_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  const openEnabled = process.env.OPEN_IMAGE_SEARCH === 'true';

  if (!serperKey && !braveKey && !openEnabled) return {
    items: [], next: null, unconfigured: true,
    message: 'Web image search is not connected yet. Direct platform searches are still available.',
  };

  const backend = serperKey ? 'serper' : braveKey ? 'brave' : 'open';
  const match = options.position?.match(/^(serper|brave|open):(\d{1,4})$/);
  if (options.position && (!match || match[1] !== backend)) throw new Error('Invalid image search cursor');
  const position = match ? Number(match[2]) : backend === 'serper' ? 1 : 0;
  if (
    (backend === 'serper' && (position < 1 || position > 100)) ||
    (backend === 'brave' && (position >= BRAVE_LIMIT || position % PAGE_SIZE !== 0))
  ) {
    throw new Error('Invalid image search page');
  }

  const query = options.query || 'animation character visual development reference';
  const context = options.tab === 'visdev' ? ' concept art' : options.tab === 'character-design' ? ' character design' : '';
  
  let indexedQuery: string;
  if (options.indexSource === 'pinterest') {
    indexedQuery = backend === 'open' ? `${query}${context} pinterest pin` : `${query}${context} site:pinterest.com/pin/`;
  } else if (options.indexSource === 'vimeo') {
    indexedQuery = `${query} animation vimeo`;
  } else if (options.indexSource === 'instagram') {
    indexedQuery = buildInstagramHashtagQuery(query);
  } else {
    indexedQuery = `${query}${context} (site:artstation.com/artwork OR site:pinterest.com/pin OR site:behance.net)`;
  }

  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000);
  let rows: any[];
  let next: string | null;

  if (backend === 'serper') {
    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST', headers: { 'X-API-KEY': serperKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: indexedQuery, num: PAGE_SIZE, page: position, safe: 'active' }),
      signal, next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Image search returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.images)) throw new Error('Invalid image search response');
    rows = data.images;
    next = rows.length >= PAGE_SIZE && position < 100 ? `serper:${position + 1}` : null;
  } else if (backend === 'brave') {
    const params = new URLSearchParams({ q: indexedQuery, count: String(BRAVE_LIMIT), safesearch: 'strict' });
    const response = await fetch(`https://api.search.brave.com/res/v1/images/search?${params}`, {
      headers: { 'X-Subscription-Token': braveKey!, Accept: 'application/json' },
      signal, next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Image search returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.results)) throw new Error('Invalid image search response');
    rows = data.results.slice(position, position + PAGE_SIZE).map((row: any) => ({
      title: row.title, link: row.url, imageUrl: row.properties?.url,
      thumbnailUrl: row.thumbnail?.src, imageWidth: row.properties?.width, imageHeight: row.properties?.height,
    }));
    next = position + PAGE_SIZE < Math.min(data.results.length, BRAVE_LIMIT) ? `brave:${position + PAGE_SIZE}` : null;
  } else {
    // Open Web indexing with DuckDuckGo + Bing (100% free, zero API keys required)
    const ddgTask = position === 0 ? fetchDuckDuckGoImages(indexedQuery, signal) : Promise.resolve([]);
    const params = new URLSearchParams({ q: indexedQuery, FORM: 'HDRSC2' });
    if (position > 0) params.set('first', String(position));
    const bingTask = fetch(`https://www.bing.com/images/search?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal, next: { revalidate: 300 },
    }).then(async r => {
      if (!r.ok) return [];
      return parseOpenImageResults(await r.text());
    }).catch(() => []);

    const [ddgRows, bingRows] = await Promise.all([ddgTask, bingTask]);
    const combined = [...ddgRows, ...bingRows];
    if (combined.length === 0) throw new Error('Open image search unavailable');
    rows = combined.slice(0, PAGE_SIZE);
    next = combined.length >= PAGE_SIZE ? `open:${position + PAGE_SIZE}` : null;
  }

  const items = rows.flatMap((row: any): UnifiedSearchResult[] => {
    const sourceUrl = httpUrl(row.link);
    const mediaUrl = httpUrl(row.imageUrl);
    const thumbnailUrl = httpUrl(row.thumbnailUrl) || mediaUrl;
    if (!sourceUrl || !mediaUrl || !thumbnailUrl) return [];

    const isPin = sourceFor(sourceUrl, mediaUrl) === 'pinterest' || sourceUrl.includes('pinterest.com') || mediaUrl.includes('pinimg.com');
    const isVimeo = sourceFor(sourceUrl, mediaUrl) === 'vimeo' || sourceUrl.includes('vimeo.com') || mediaUrl.includes('vimeocdn.com') || String(row.title || '').toLowerCase().includes('vimeo');
    const isInsta = sourceFor(sourceUrl, mediaUrl) === 'instagram' || sourceUrl.includes('instagram.com') || mediaUrl.includes('cdninstagram.com') || String(row.title || '').toLowerCase().includes('instagram');

    if (options.indexSource === 'pinterest' && !isPin) return [];
    if (options.indexSource === 'vimeo' && !isVimeo) return [];
    if (options.indexSource === 'instagram' && !isInsta) return [];

    // Filter out junk stock vector templates for Instagram/inspiration
    if ((options.indexSource === 'instagram' || isInsta) && JUNK_STOCK_DOMAINS.some(d => sourceUrl.includes(d) || mediaUrl.includes(d))) {
      return [];
    }

    let source: UnifiedSearchResult['source'] = 'web-images';
    if (options.indexSource === 'pinterest' || isPin) source = 'pinterest';
    else if (options.indexSource === 'vimeo' || isVimeo) source = 'vimeo';
    else if (options.indexSource === 'instagram' || isInsta) source = 'instagram';
    else source = sourceFor(sourceUrl, mediaUrl);

    let mediaType: UnifiedSearchResult['mediaType'] = 'image';
    let embedUrl: string | undefined = undefined;
    let authorName: string | undefined = undefined;

    if (source === 'vimeo' || isVimeo) {
      mediaType = 'video';
      const vimeoMatch = sourceUrl.match(/vimeo\.com\/(?:channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|video\/)?(\d+)/i) ||
                         mediaUrl.match(/vimeocdn\.com\/video\/(\d+)/i);
      const videoId = vimeoMatch ? vimeoMatch[1] : null;
      if (videoId) {
        embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
      }
      authorName = 'Vimeo Animator';
    } else if (source === 'instagram' || isInsta) {
      const authorMatch = String(row.title || '').match(/@([a-zA-Z0-9._]+)/) || String(row.title || '').match(/^([a-zA-Z0-9._]+)\s+on\s+Instagram/i);
      authorName = authorMatch ? `@${authorMatch[1]}` : 'Instagram Artist';
    }

    const cleanTitle = typeof row.title === 'string'
      ? row.title.replace(/\s*on Vimeo$/i, '').replace(/\|\s*Vimeo$/i, '').replace(/\|\s*Instagram$/i, '').trim()
      : 'Reference';

    const cleanId = `${source}_${createHash('sha256').update(sourceUrl + '\n' + mediaUrl).digest('hex').slice(0, 24)}`;

    const isInstagramAsset = source === 'instagram' || isInsta || mediaUrl.includes('cdninstagram.com') || thumbnailUrl.includes('cdninstagram.com');
    const safeMediaUrl = isInstagramAsset && !embedUrl ? `/api/proxy/image?url=${encodeURIComponent(mediaUrl)}` : (embedUrl || mediaUrl);
    const safeThumbnailUrl = isInstagramAsset ? `/api/proxy/image?url=${encodeURIComponent(thumbnailUrl)}` : thumbnailUrl;

    return [{
      id: cleanId,
      title: cleanTitle,
      source,
      sourceUrl,
      mediaUrl: safeMediaUrl,
      thumbnailUrl: safeThumbnailUrl,
      mediaType,
      embedUrl,
      authorName,
      width: Number(row.imageWidth) > 0 ? Number(row.imageWidth) : undefined,
      height: Number(row.imageHeight) > 0 ? Number(row.imageHeight) : undefined,
      tags: [
        source,
        ...query.toLowerCase().split(/\s+/).filter(w => w.length > 1),
        ...(source === 'instagram' ? getSocialHashtagsForQuery(query) : []),
        ...(mediaType === 'video' ? ['video-reference', 'animations'] : []),
        ...(options.tab === 'visdev' ? ['visdev'] : options.tab === 'character-design' ? ['character-design'] : [])
      ],
      description: source === 'vimeo'
        ? `Watch "${cleanTitle}" on Vimeo for high-quality animation motion and performance reference.`
        : source === 'instagram'
          ? `View this animation study and inspiration from ${authorName || 'artist'} on Instagram.`
          : 'View the original post for artist credit, context, and usage rights.',
    }];
  });
  return { items, next };
}
