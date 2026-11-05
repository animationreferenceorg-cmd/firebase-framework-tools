import type { Video, Category } from '@/lib/types';

function isUsableVideoThumbnail(v: Video): boolean {
    const u = v.thumbnailUrl || v.posterUrl;
    if (!u) return false;
    const clean = u.toLowerCase();
    return (
        !clean.includes('placehold.co') &&
        !clean.includes('assets.reflix.dev') &&
        !clean.includes('cdninstagram.com') &&
        !clean.endsWith('.mov') &&
        !clean.endsWith('.mp4')
    );
}

/**
 * Finds a matching video for a category to use as a thumbnail source.
 * Uses robust matching logic including ID checks, title matching, and loose tag matching.
 */
export function findCategoryThumbnailMatch(category: Category, videos: Video[]): Video | undefined {
    if (!videos || videos.length === 0) return undefined;

    // 1. Explicit Featured Video (if provided by caller and has usable image)
    if (category.featuredVideoId) {
        const featured = videos.find(v => v.id === category.featuredVideoId && isUsableVideoThumbnail(v));
        if (featured) return featured;
    }

    // 2. Search for matches
    const matches = videos.filter(v => {
        // A. Explicit Category ID link
        const inCategoryIds = (v.categoryIds || []).includes(category.id);
        const inCategories = (v.categories || []).includes(category.id);

        // B. Title Matching (Case insensitive)
        const catTitleLower = category.title.toLowerCase();
        const inCategoriesByTitle = (v.categories || []).some(c => c.toLowerCase() === catTitleLower);

        // C. Tag Matching (Looser)
        const inTagsByTitle = (v.tags || []).some(t => {
            const tLower = t.toLowerCase();
            if (tLower.length < 2 || catTitleLower.length < 2) return tLower === catTitleLower;
            return tLower === catTitleLower || catTitleLower.startsWith(tLower) || tLower.startsWith(catTitleLower);
        });

        // D. Tag Matching by ID
        const inTagsById = (v.tags || []).some(t => t.toLowerCase() === category.id.toLowerCase());

        return inCategoryIds || inCategories || inCategoriesByTitle || inTagsByTitle || inTagsById;
    });

    if (matches.length > 0) {
        const withThumb = matches.find(isUsableVideoThumbnail);
        return withThumb || matches[0];
    }

    return undefined;
}
