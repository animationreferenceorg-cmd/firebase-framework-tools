import type { ReferenceSource, UnifiedSearchResult } from './reference-feed';
import { parseSearchIntent } from './search-intent';
import { searchWebImages } from './reference-web-images';

const PAGE_SIZE = 24;
const FEEDS = ['characterdesign', 'artreferences', 'animationart', 'posemuse', 'characterdesignreferences'];
const NAMES: Record<ReferenceSource, string> = {
  artstation: 'ArtStation', pinterest: 'Pinterest', sketchfab: 'Sketchfab',
  sakugabooru: 'Sakugabooru', wikimedia: 'Wikimedia', archive: 'Internet Archive',
  openverse: 'Openverse (Free CC0)',
  'web-images': 'Web image search',
};

export interface ProviderRequest {
  query: string;
  tab: string;
  type: string;
  explore: boolean;
  position?: string;
  signal?: AbortSignal;
  indexSource?: 'pinterest';
}
export interface ProviderPage {
  items: UnifiedSearchResult[];
  next: string | null;
  limited?: boolean;
  partial?: boolean;
  /** RSS browsing is not a keyword search; its results still require local matching. */
  queryMatched?: boolean;
  unconfigured?: boolean;
  message?: string;
}

async function get(url: string, signal?: AbortSignal, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'AnimationReference/1.0 (+https://animationreference.org)', Accept: 'application/json', ...headers },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    next: { revalidate: 1800 },
  });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response;
}

function pageNumber(position?: string) {
  if (!position) return 1;
  if (!/^\d{1,7}$/.test(position) || Number(position) < 1) throw new Error('Invalid page');
  return Number(position);
}

/** Track each expanded query independently so one failed query can be retried. */
function batchPositions(position: string | undefined, count: number): Array<number | null> {
  if (!position || /^\d{1,7}$/.test(position)) return Array(count).fill(pageNumber(position));
  const parsed: unknown = JSON.parse(position);
  if (!Array.isArray(parsed) || parsed.length !== count || !parsed.some(value => value !== null) ||
      !parsed.every(value => value === null || Number.isInteger(value) && value >= 1 && value <= 9999999)) {
    throw new Error('Invalid provider position');
  }
  return parsed;
}

async function fetchBatches(
  position: string | undefined,
  count: number,
  fetchPage: (index: number, page: number) => Promise<{ items: UnifiedSearchResult[]; hasMore: boolean }>,
): Promise<ProviderPage> {
  if (!count) return { items: [], next: null };
  const positions = batchPositions(position, count);
  const batches = await Promise.allSettled(positions.map((page, index) =>
    page === null ? Promise.resolve(null) : fetchPage(index, page)
  ));
  const active = batches.filter((_, index) => positions[index] !== null);
  if (active.every(batch => batch.status === 'rejected')) throw new Error('All provider queries failed');
  const next = positions.map((page, index) => {
    const batch = batches[index];
    if (page === null) return null;
    if (batch.status === 'rejected') return page;
    return batch.value?.hasMore ? page + 1 : null;
  });
  const items = batches.flatMap(batch => batch.status === 'fulfilled' && batch.value ? batch.value.items : []);
  const partial = active.some(batch => batch.status === 'rejected');
  return { items, next: next.some(page => page !== null) ? JSON.stringify(next) : null, ...(partial ? { partial: true } : {}) };
}

function nextSketchfabCursor(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  try { return new URL(value, 'https://api.sketchfab.com').searchParams.get('cursor'); } catch { return null; }
}

async function sketchfab(options: ProviderRequest): Promise<ProviderPage> {
  const intent = parseSearchIntent(options.query);
  const query = options.explore ? options.query || 'character animation' : intent.externalQueries.sketchfab;
  if (!query) return { items: [], next: null };
  const params = new URLSearchParams({ type: 'models', q: query, count: String(PAGE_SIZE), sort_by: '-likeCount' });
  if (intent.externalQueries.sketchfabAnimated || options.tab === 'animations') params.set('animated', 'true');
  if (intent.externalQueries.sketchfabCategory) params.set('categories', intent.externalQueries.sketchfabCategory);
  if (options.position) params.set('cursor', options.position);
  const data = await (await get(`https://api.sketchfab.com/v3/search?${params}`, options.signal)).json();
  const items = (data.results || []).filter((model: any) => model.uid).map((model: any): UnifiedSearchResult => {
    const images = model.thumbnails?.images || [];
    const thumbnail = images.find((image: any) => image.width >= 700 && image.width <= 1200) || images[0];
    return {
      id: `sf_${model.uid}`, title: model.name || '3D Model', source: 'sketchfab',
      sourceUrl: model.viewerUrl || `https://sketchfab.com/3d-models/${model.uid}`,
      thumbnailUrl: thumbnail?.url || '', mediaUrl: thumbnail?.url || '', mediaType: 'model3d',
      width: thumbnail?.width, height: thumbnail?.height,
      embedUrl: `https://sketchfab.com/models/${model.uid}/embed?autostart=1&preload=1&ui_controls=0`,
      authorName: model.user?.displayName || model.user?.username || 'Sketchfab Creator',
      tags: ['3d-model', 'sketchfab', ...(model.tags || []).map((tag: any) => tag.name || tag).filter((tag: unknown) => typeof tag === 'string')],
      description: model.description?.slice(0, 300) || '',
    };
  });
  return { items, next: nextSketchfabCursor(data.next) || (typeof data.cursors?.next === 'string' ? data.cursors.next : null) };
}

async function artstation(options: ProviderRequest): Promise<ProviderPage> {
  const intent = parseSearchIntent(options.query);
  const queries = options.explore
    ? options.tab === '3d-models' ? ['3d character model', 'creature sculpt']
      : options.tab === 'character-design' ? ['character design', 'character model sheet']
      : [options.query || 'visual development', 'environment concept art']
    : intent.externalQueries.artstation.map(query => (options.tab === '3d-models' && !query.includes('3d')) ? `${query} 3d model` : (options.tab === 'character-design' && !query.includes('character')) ? `${query} character design` : query);
  // One exact keyword request while typing avoids multiplying ArtStation's
  // rate limits. Explore keeps its two complementary browse seeds.
  const selected = queries.slice(0, options.explore ? 2 : 1);
  return fetchBatches(options.position, selected.length, async (index, page) => {
    const query = selected[index];
    const params = new URLSearchParams({ query, page: String(page), per_page: String(PAGE_SIZE) });
    const data = await (await get(`https://www.artstation.com/api/v2/search/projects.json?${params}`, options.signal, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    })).json();
    const projects = data.data || [];
    const total = Number(data.total_count ?? data.total);
    const hasMore = Number.isFinite(total) ? page * PAGE_SIZE < total : projects.length >= PAGE_SIZE;
    const items = projects.filter((item: any) => item.url || item.hash_id).map((item: any): UnifiedSearchResult => {
      // Prefer uncropped covers; the old square thumbnail destroyed the artwork's aspect ratio.
      const square = item.smaller_square_cover_url?.replace(/\/\d{14}\/(?=smaller_square\/)/, '/') || '';
      const cover = item.cover?.small_image_url || item.cover?.medium_image_url || item.cover_asset?.image_url || item.cover_image_url || square.replace('/smaller_square/', '/small/');
      const fullImage = square ? square.replace('/smaller_square/', '/large/') : cover;
      const model3d = Boolean(item.icons?.model3d || item.icons?.marmoset);
      return {
        id: `as_${item.id || item.hash_id}`, title: item.title || 'ArtStation Artwork', source: 'artstation',
        sourceUrl: item.url || `https://www.artstation.com/artwork/${item.hash_id}`,
        thumbnailUrl: cover, mediaUrl: fullImage, mediaType: model3d ? 'model3d' : 'image',
        width: item.cover?.width || item.cover_asset?.width, height: item.cover?.height || item.cover_asset?.height,
        authorName: item.user?.full_name || item.user?.username || 'ArtStation Artist',
        authorAvatar: item.user?.medium_avatar_url || '', authorUsername: item.user?.username || '',
        hasMultipleAssets: Boolean(item.icons?.multiple_images), hashId: item.hash_id,
        tags: ['artstation', model3d || options.tab === '3d-models' ? '3d-model' : options.tab === 'character-design' ? 'character-design' : 'visdev', ...(item.tags || []).map((tag: any) => typeof tag === 'string' ? tag : tag.name).filter(Boolean)],
        description: item.description?.replace(/<[^>]*>/g, '').slice(0, 300) || '',
      };
    });
    return { items, hasMore };
  });
}

function decodeXml(text: string) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
}

async function pinterest(options: ProviderRequest): Promise<ProviderPage> {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  // Give Pinterest a dedicated keyword query instead of hoping a general web
  // result set contains pins. This source retains its own real index cursor.
  if (!token && (process.env.SERPER_API_KEY || process.env.BRAVE_SEARCH_API_KEY)) {
    return searchWebImages({ ...options, indexSource: 'pinterest' });
  }
  if (token) {
    // Global keyword discovery is a partner API, not the user's own-pin search endpoint.
    const params = new URLSearchParams({ term: options.query || 'character design', country_code: process.env.PINTEREST_COUNTRY_CODE || 'US', limit: String(PAGE_SIZE) });
    if (options.position) params.set('bookmark', options.position);
    const data = await (await get(`https://api.pinterest.com/v5/search/partner/pins?${params}`, options.signal, { Authorization: `Bearer ${token}` })).json();
    const items = (data.items || []).map((pin: any): UnifiedSearchResult => {
      const images = pin.media?.images || {};
      const image: any = images['600x'] || images['1200x'] || images.originals || Object.values(images)[0] || pin.image || {};
      return {
        id: `pin_${pin.id}`, title: pin.title || pin.description?.slice(0, 90) || 'Pinterest Reference', source: 'pinterest',
        sourceUrl: pin.url?.includes('pinterest.com/pin/') ? pin.url : `https://www.pinterest.com/pin/${pin.id}/`,
        thumbnailUrl: image.url || '', mediaUrl: image.url || '', mediaType: 'image',
        width: image.width, height: image.height, authorName: pin.board_owner?.username || 'Pinterest Creator',
        tags: ['pinterest', 'character-design'], description: pin.description || '',
      };
    }).filter((item: UnifiedSearchResult) => item.thumbnailUrl);
    return { items, next: typeof data.bookmark === 'string' && data.bookmark && data.bookmark !== options.position ? data.bookmark : null };
  }

  // RSS has a finite set of pins. Move through feed batches once, then stop honestly.
  const page = pageNumber(options.position);
  // Search every available fallback feed on a keyword request. Matching pins
  // in later feeds should not require scrolling through empty search pages.
  const feeds = options.explore ? FEEDS.slice((page - 1) * 2, page * 2) : FEEDS;
  const batches = await Promise.allSettled(feeds.map(async feed => {
    const xml = await (await get(`https://www.pinterest.com/${feed}/feed.rss`, options.signal)).text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(match => {
      const text = decodeXml(match[1]);
      const url = text.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
      const image = text.match(/<img[^>]+src=["']([^"']+)/i)?.[1];
      const id = url?.match(/\/pin\/(\d+)/)?.[1];
      if (!url || !image || !id) return [];
      const title = text.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<[^>]*>/g, '').trim() || 'Character Design Reference';
      return [{
        id: `pin_${id}`, title, source: 'pinterest' as const, sourceUrl: url,
        thumbnailUrl: image.replace('/236x/', '/736x/'), mediaUrl: image.replace('/236x/', '/736x/'),
        mediaType: image.endsWith('.gif') ? 'gif' as const : 'image' as const,
        authorName: `@${feed}`, tags: ['pinterest', 'character-design'], description: title,
      }];
    });
  }));
  if (batches.length && batches.every(batch => batch.status === 'rejected')) throw new Error('Pinterest feeds unavailable');
  const items = batches.flatMap(batch => batch.status === 'fulfilled' ? batch.value : []);
  return {
    items, next: options.explore && page * 2 < FEEDS.length ? String(page + 1) : null,
    limited: true, queryMatched: false,
    ...(batches.some(batch => batch.status === 'rejected') ? { partial: true } : {}),
  };
}

async function sakugabooru(options: ProviderRequest): Promise<ProviderPage> {
  const intent = parseSearchIntent(options.query);
  const queries = options.explore ? ['order:score', 'smears', 'effects'] : intent.externalQueries.sakugabooru;
  const selected = queries.slice(0, 3);
  return fetchBatches(options.position, selected.length, async (index, page) => {
    const tags = selected[index];
    const params = new URLSearchParams({ tags, limit: String(PAGE_SIZE), page: String(page) });
    const data = await (await get(`https://www.sakugabooru.com/post.json?${params}`, options.signal)).json();
    const posts = Array.isArray(data) ? data : [];
    return {
      hasMore: posts.length >= PAGE_SIZE,
      items: posts.filter((post: any) => post.file_url).map((post: any): UnifiedSearchResult => ({
        id: `saku_${post.id}`, title: post.source ? `${post.source} — #${post.id}` : `Animation Cut #${post.id}`,
        source: 'sakugabooru', sourceUrl: `https://www.sakugabooru.com/post/show/${post.id}`,
        thumbnailUrl: post.preview_url || post.file_url, mediaUrl: post.file_url,
        mediaType: post.file_url.endsWith('.gif') ? 'gif' : 'video', width: post.width, height: post.height,
        authorName: post.author || 'Sakugabooru Animator', tags: ['sakugabooru', '2d', ...(post.tags || '').split(' ').filter(Boolean)],
        description: `Source: ${post.source || 'Anime'}`,
      })),
    };
  });
}

async function wikimedia(options: ProviderRequest): Promise<ProviderPage> {
  const offset = options.position ? pageNumber(options.position) : 0;
  const imagesOnly = options.tab === 'visdev' || options.tab === 'character-design';
  const params = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: `${options.query || 'Muybridge locomotion animal human'} filetype:${imagesOnly ? 'bitmap' : 'bitmap|video'}`, gsrnamespace: '6', gsrlimit: String(PAGE_SIZE), gsroffset: String(offset), prop: 'imageinfo', iiprop: 'url|mime|extmetadata|size', iiurlwidth: '800', format: 'json' });
  const data = await (await get(`https://commons.wikimedia.org/w/api.php?${params}`, options.signal)).json();
  const items = Object.values(data.query?.pages || {}).flatMap((page: any): UnifiedSearchResult[] => {
    const info = page.imageinfo?.[0];
    if (!info?.url || !/^(image|video)\//.test(info.mime || '') || imagesOnly && !info.mime.startsWith('image/')) return [];
    const description = info.extmetadata?.ImageDescription?.value?.replace(/<[^>]*>/g, '').slice(0, 300) || '';
    const license = info.extmetadata?.LicenseShortName?.value?.replace(/<[^>]*>/g, '') || '';
    return [{
      id: `wiki_${page.pageid}`, title: (page.title || '').replace(/^File:/i, '').replace(/\.[^.]+$/, ''), source: 'wikimedia',
      sourceUrl: info.descriptionurl || info.url, thumbnailUrl: info.thumburl || info.url, mediaUrl: info.url,
      mediaType: info.mime.startsWith('video/') ? 'video' : info.mime.includes('gif') ? 'gif' : 'image',
      width: info.thumbwidth || info.width, height: info.thumbheight || info.height,
      authorName: info.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, '') || 'Wikimedia', tags: ['wikimedia', 'study'],
      description: [description, license ? `License: ${license}. See the original source for full attribution.` : 'See the original source for attribution and license details.'].filter(Boolean).join(' '),
    }];
  });
  return { items, next: typeof data.continue?.gsroffset === 'number' ? String(data.continue.gsroffset) : null };
}

async function archive(options: ProviderRequest): Promise<ProviderPage> {
  if (!options.explore && !parseSearchIntent(options.query).externalQueries.archive) return { items: [], next: null };
  const page = pageNumber(options.position);
  const params = new URLSearchParams({ q: `${options.query || 'slapstick stunts comedy acrobatics'} AND mediatype:(movies)`, rows: String(PAGE_SIZE), page: String(page), output: 'json' });
  for (const field of ['identifier', 'title', 'description', 'creator']) params.append('fl[]', field);
  const data = await (await get(`https://archive.org/advancedsearch.php?${params}`, options.signal)).json();
  const items = (data.response?.docs || []).filter((doc: any) => doc.identifier).map((doc: any): UnifiedSearchResult => ({
    id: `archive_${doc.identifier}`, title: doc.title || 'Archive Reference', source: 'archive',
    sourceUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
    thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
    mediaUrl: `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${encodeURIComponent(doc.identifier)}.mp4`, mediaType: 'video',
    authorName: Array.isArray(doc.creator) ? doc.creator.join(', ') : doc.creator || 'Internet Archive',
    tags: ['archive', 'vintage'], description: String(doc.description || '').slice(0, 300),
  }));
  return { items, next: page * PAGE_SIZE < (data.response?.numFound || 0) ? String(page + 1) : null };
}

async function openverse(options: ProviderRequest): Promise<ProviderPage> {
  const page = pageNumber(options.position);
  const query = options.query?.trim() || (options.tab === 'character-design' ? 'character turnaround' : 'animation motion reference');
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    page_size: '20',
  });

  try {
    const response = await get(`https://api.openverse.org/v1/images/?${params}`, options.signal);
    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    const hasMore = page < (data.page_count || 1);

    const items: UnifiedSearchResult[] = results
      .filter((img: any) => img.url || img.thumbnail)
      .map((img: any): UnifiedSearchResult => {
        const title = img.title || 'Free Creative Reference';
        const thumb = img.thumbnail || img.url;
        const license = (img.license || 'CC').toUpperCase();
        return {
          id: `openverse_${img.id}`,
          title,
          source: 'openverse',
          sourceUrl: img.foreign_landing_url || `https://openverse.org/image/${img.id}`,
          thumbnailUrl: thumb,
          mediaUrl: img.url || thumb,
          mediaType: 'image',
          width: img.width,
          height: img.height,
          authorName: img.creator || 'Openverse / CC0',
          tags: ['openverse', 'free-reference', 'creative-commons', license.toLowerCase(), ...(img.tags || []).map((t: any) => (typeof t === 'string' ? t : t.name)).filter(Boolean)],
          description: `License: ${license}. Free creative reference from ${img.creator || 'Openverse'}.`,
        };
      });

    return { items, next: hasMore ? String(page + 1) : null };
  } catch {
    return { items: [], next: null };
  }
}

const PROVIDERS = { sketchfab, artstation, pinterest, sakugabooru, wikimedia, archive, openverse, 'web-images': searchWebImages };
export function fetchReferenceProvider(source: ReferenceSource, options: ProviderRequest) {
  return PROVIDERS[source](options);
}
export function providerUnavailableMessage(source: ReferenceSource) {
  return `${NAMES[source]} is temporarily unavailable. You can keep browsing other sources or try again.`;
}
