import type { Video } from './types';
import type { TabOption, TypeOption, PillOption, MediaOption } from '@/components/FilterBar';

export const REFERENCE_SOURCES = ['sketchfab', 'artstation', 'pinterest', 'sakugabooru', 'wikimedia', 'archive'] as const;
export type ReferenceSource = typeof REFERENCE_SOURCES[number];

export interface UnifiedSearchResult {
  id: string;
  title: string;
  source: ReferenceSource | 'openverse';
  sourceUrl: string;
  thumbnailUrl: string;
  mediaUrl: string;
  mediaType: 'video' | 'image' | 'gif' | 'model3d';
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
  providers: Array<{ source: ReferenceSource; status: 'ok' | 'unavailable'; message?: string; limited?: boolean }>;
}

function tabSources(tab: TabOption, type: TypeOption): ReferenceSource[] {
  if (tab === '3d-models') return ['sketchfab', 'artstation'];
  if (tab === 'visdev') return ['artstation'];
  if (tab === 'character-design') return ['pinterest', 'artstation'];
  if (tab === 'community') return [];
  if (tab === 'animations') return type === '3D' ? ['sketchfab'] : ['sakugabooru', 'wikimedia', 'archive'];
  return type === '3D' ? ['sketchfab', 'artstation'] : [...REFERENCE_SOURCES];
}

export function discoverySources(tab: TabOption, type: TypeOption = 'all', media: MediaOption = 'all'): ReferenceSource[] {
  return tabSources(tab, type).filter(source => {
    if (media === 'video') return ['sakugabooru', 'wikimedia', 'archive'].includes(source);
    if (media === 'image') return ['artstation', 'pinterest', 'wikimedia'].includes(source);
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

export function isArtworkReference(video: Video): boolean {
  return !video.videoUrl && Boolean(video.thumbnailUrl || video.posterUrl) && !video.isShort;
}
