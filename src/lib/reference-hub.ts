import type { Video } from './types';
import type { UnifiedSearchResult } from '@/app/api/import/search/route';

/**
 * Transforms external multi-source search results (ArtStation, Pinterest,
 * Sketchfab, Sakugabooru, Wikimedia, Archive) into first-class Video objects
 * for seamless integration into AnimationReference.org's library grids,
 * search engines, and moodboards.
 */
export function searchResultToVideo(item: UnifiedSearchResult): Video {
  const isVideo = item.mediaType === 'video';
  const is3D = item.source === 'sketchfab' || item.mediaType === 'model3d';

  return {
    id: item.id,
    type: isVideo ? 'video' : 'social',
    title: item.title,
    description: item.description || `Reference from ${item.source} by ${item.authorName || 'Creator'}`,
    thumbnailUrl: item.thumbnailUrl,
    posterUrl: item.mediaUrl || item.thumbnailUrl,
    videoUrl: isVideo ? item.mediaUrl : '',
    tags: [
      ...item.tags,
      item.source,
      is3D ? '3d-model' : isVideo ? 'animation-clip' : 'character-art',
    ],
    categoryIds: ['external-hub', item.source, is3D ? '3d' : '2d'],
    categories: [item.source, is3D ? '3D Models' : 'Concept & Vis Dev'],
    author_name: item.authorName || `@${item.source}`,
    originalUrl: item.sourceUrl,
    status: 'published',
    isShort: false,
    likeCount: Math.floor(Math.random() * 45) + 10,
    viewCount: Math.floor(Math.random() * 300) + 50,
    createdAt: Date.now(),
    // Preserve custom provider metadata
    dataAiHint: `${item.source} ${item.tags.join(' ')}`,
    ...((item.embedUrl ? { embedUrl: item.embedUrl } : {}) as any),
  };
}

/**
 * Fetch and convert live multi-source external references
 */
export async function fetchLiveHubReferences(query?: string): Promise<Video[]> {
  try {
    const url = query?.trim()
      ? `/api/import/search?q=${encodeURIComponent(query.trim())}`
      : `/api/import/search?mode=explore`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const results: UnifiedSearchResult[] = data.results || [];
    return results.map(searchResultToVideo);
  } catch (err) {
    console.error('Failed to fetch live hub references:', err);
    return [];
  }
}
