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
  const isArtStation = item.source === 'artstation';
  const isPinterest = item.source === 'pinterest';

  const specializedTags: string[] = [];
  const specializedCategories: string[] = [item.source];
  const specializedCategoryIds: string[] = ['external-hub', item.source];

  // Only tab-level tags here. Specific concept tags (storyboard, turnaround…)
  // are added by the search route from each item's own metadata.
  if (is3D) {
    specializedTags.push('3d-models', '3d-model');
    specializedCategories.push('3D Models');
    specializedCategoryIds.push('3d-models', '3d');
  } else if (isArtStation) {
    specializedTags.push('visdev');
    specializedCategories.push('VisDev');
    specializedCategoryIds.push('visdev', 'visual-development');
  } else if (isPinterest) {
    specializedTags.push('character-design');
    specializedCategories.push('Character Design');
    specializedCategoryIds.push('character-design');
  } else if (isVideo) {
    specializedTags.push('animations');
    specializedCategories.push('Animations');
    specializedCategoryIds.push('animations');
  }

  return {
    id: item.id,
    type: isVideo ? 'video' : 'social',
    title: item.title,
    description: item.description || `Reference from ${item.source} by ${item.authorName || 'Creator'}`,
    thumbnailUrl: item.thumbnailUrl,
    posterUrl: item.mediaUrl || item.thumbnailUrl,
    videoUrl: isVideo ? item.mediaUrl : '',
    tags: Array.from(new Set([...item.tags, item.source, ...specializedTags])),
    categoryIds: Array.from(new Set(specializedCategoryIds)),
    categories: Array.from(new Set(specializedCategories)),
    author_name: item.authorName || `@${item.source}`,
    authorUsername: item.authorUsername,
    hashId: item.hashId,
    authorAvatar: item.authorAvatar,
    sourceUrl: item.sourceUrl,
    originalUrl: item.sourceUrl,
    status: 'published',
    isShort: false,
    likeCount: Math.floor(Math.random() * 45) + 10,
    viewCount: Math.floor(Math.random() * 300) + 50,
    createdAt: Date.now(),
    // Preserve custom provider metadata
    dataAiHint: `${item.source} ${item.tags.join(' ')}`,
    ...((item.embedUrl ? { embedUrl: item.embedUrl } : {}) as any),
    mediaType: item.mediaType,
    source: item.source,
  } as Video;
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
