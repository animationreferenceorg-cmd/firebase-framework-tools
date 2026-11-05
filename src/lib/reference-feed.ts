import type { Video } from './types';
import type { TabOption, TypeOption, PillOption, MediaOption } from '@/components/FilterBar';

export const REFERENCE_SOURCES = ['sketchfab', 'artstation', 'pinterest', 'vimeo', 'youtube', 'instagram', 'sakugabooru', 'wikimedia', 'openverse', 'web-images'] as const;
export type ReferenceSource = typeof REFERENCE_SOURCES[number];

export interface UnifiedSearchResult {
  id: string;
  title: string;
  source: ReferenceSource;
  sourceUrl: string;
  thumbnailUrl: string;
  mediaUrl: string;
  mediaType: 'video' | 'image' | 'gif' | 'model3d';
  motionUrl?: string;
  authorName?: string;
  authorAvatar?: string;
  authorUsername?: string;
  tags: string[];
  description?: string;
  embedUrl?: string;
  hasMultipleAssets?: boolean;
  hashId?: string;
  width?: number;
  height?: number;
}

export interface DiscoveryPage {
  results: UnifiedSearchResult[];
  nextCursor: string | null;
  hasMore: boolean;
  providers: Array<{ source: ReferenceSource; status: 'ok' | 'unavailable' | 'unconfigured'; message?: string; limited?: boolean; partial?: boolean }>;
}

function tabSources(tab: TabOption, type: TypeOption): ReferenceSource[] {
  if (tab === '3d-models') return ['sketchfab', 'artstation'];
  if (tab === 'visdev') return ['artstation', 'pinterest', 'wikimedia', 'openverse', 'web-images'];
  if (tab === 'character-design') return ['pinterest', 'artstation', 'wikimedia', 'openverse', 'web-images'];
  if (tab === 'community') return [];
  if (tab === 'animations') return type === '3D' ? ['sketchfab'] : ['sakugabooru', 'instagram', 'wikimedia'];
  return type === '3D' ? ['sketchfab', 'artstation'] : ['sketchfab', 'artstation', 'pinterest', 'instagram', 'sakugabooru', 'wikimedia', 'openverse', 'web-images'];
}

export function discoverySources(tab: TabOption, type: TypeOption = 'all', media: MediaOption = 'all'): ReferenceSource[] {
  return tabSources(tab, type).filter(source => {
    if (media === 'video') return ['sakugabooru', 'instagram', 'wikimedia'].includes(source);
    if (media === 'image') return ['artstation', 'pinterest', 'instagram', 'wikimedia', 'openverse', 'web-images'].includes(source);
    if (media === 'model3d') return ['sketchfab', 'artstation'].includes(source);
    return true;
  });
}

const PILL_QUERIES: Partial<Record<PillOption, string>> = {
  locomotion: 'walk run locomotion', combat: 'combat action', acting: 'character acting expression',
  creature: 'creature animal', mechanics: 'body mechanics weight', vfx: 'effects fire smoke', shorts: 'short animation',
};

export function discoveryQuery(query: string, tab: TabOption, pill: PillOption): string {
  if (query.trim()) return query.trim();
  if (pill !== 'all') return PILL_QUERIES[pill] || '';
  if (tab === '3d-models') return 'character creature';
  if (tab === 'visdev') return 'visual development';
  if (tab === 'character-design') return 'character design';
  return '';
}

const identityCache = new WeakMap<Video, string | null>();
function sourceIdentity(video: Video): string | null {
  if (identityCache.has(video)) return identityCache.get(video)!;
  let identity: string | null = null;
  try {
    const url = new URL(video.originalUrl || video.sourceUrl || '');
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key);
    identity = `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}${url.search}`;
  } catch { /* Some local clips have no source URL. Their ID remains the identity. */ }
  identityCache.set(video, identity);
  return identity;
}

/** Stable append, including references already imported under a different local ID. */
export function mergeReferenceVideos(...batches: Video[][]): Video[] {
  const seen = new Set<string>();
  const sources = new Set<string>();
  return batches.flat().filter(video => {
    const identity = sourceIdentity(video);
    if (seen.has(video.id) || identity && sources.has(identity)) return false;
    seen.add(video.id);
    if (identity) sources.add(identity);
    return true;
  });
}

/** Keep each matching platform visible near the top, preserving its relevance order. */
export function balanceSearchResults(videos: Video[]): Video[] {
  const sources = new Map<string, Video[]>();
  for (const video of videos) {
    const source = video.source || 'library';
    const bucket = sources.get(source);
    if (bucket) bucket.push(video);
    else sources.set(source, [video]);
  }
  const buckets = [...sources.values()];
  const result: Video[] = [];
  for (let index = 0; result.length < videos.length; index++) {
    for (const bucket of buckets) if (index < bucket.length) result.push(bucket[index]);
  }
  return result;
}

export function isArtworkReference(video: Video): boolean {
  return !video.videoUrl && Boolean(video.thumbnailUrl || video.posterUrl) && !video.isShort;
}
