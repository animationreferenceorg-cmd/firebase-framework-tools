// Lightweight client-side search index over the browse data (categories + tags).
// The whole published library ships in a static snapshot, so we can derive every
// tag and its clip count in-memory and rank matches without a search dependency.

import type { Video, Category } from './types';

export interface TagEntry {
    tag: string;
    count: number;
    /** Cover image, uniquely assigned so no two cards share the same photo. */
    coverUrl?: string;
}

export interface BrowseIndex {
    /** Clips per category (categoryIds membership — matches what the feed shows). */
    categoryCounts: Record<string, number>;
    /** Uniquely-assigned cover image per category id. */
    categoryCovers: Record<string, string>;
    /** All tags, frequency-sorted, each with a uniquely-assigned cover image. */
    tags: TagEntry[];
}

// How many candidate thumbnails to keep per entry so the unique assignment has
// room to avoid collisions.
const MAX_CANDIDATES = 12;

function pushCandidate(list: string[], url: string) {
    if (url && list.length < MAX_CANDIDATES && !list.includes(url)) list.push(url);
}

/**
 * Single pass over the snapshot that builds everything the directory needs:
 * category counts, and unique cover images for every category and tag.
 *
 * Covers are assigned greedily from each entry's candidate thumbnails so that
 * no two cards repeat the same photo. Categories are assigned first (preferring
 * their own configured imageUrl), then tags fill in around them, most-popular
 * first so the prominent tags get the best distinct covers.
 */
export function buildBrowseIndex(categories: Category[], videos: Video[]): BrowseIndex {
    const tagCounts = new Map<string, number>();
    const tagCandidates = new Map<string, string[]>();

    const categoryCounts: Record<string, number> = {};
    const categoryCandidates = new Map<string, string[]>();
    for (const c of categories) {
        categoryCounts[c.id] = 0;
        categoryCandidates.set(c.id, c.imageUrl ? [c.imageUrl] : []);
    }

    for (const v of videos) {
        const cover = v.thumbnailUrl || v.posterUrl || '';

        // Tags
        if (v.tags) {
            const seen = new Set<string>();
            for (const raw of v.tags) {
                const key = String(raw).toLowerCase().trim();
                if (!key || seen.has(key)) continue; // don't double-count within one clip
                seen.add(key);
                tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
                if (cover) {
                    const arr = tagCandidates.get(key) || [];
                    pushCandidate(arr, cover);
                    tagCandidates.set(key, arr);
                }
            }
        }

        // Categories (by categoryIds — the same predicate the feed filters on)
        for (const id of v.categoryIds || []) {
            if (id in categoryCounts) {
                categoryCounts[id] += 1;
                if (cover) pushCandidate(categoryCandidates.get(id)!, cover);
            }
        }
    }

    // Fallback cover candidates for categories with few/none from categoryIds:
    // match clips by title / tag against the category title.
    const lacking = categories.filter((c) => (categoryCandidates.get(c.id)?.length || 0) < 3);
    if (lacking.length) {
        for (const v of videos) {
            const cover = v.thumbnailUrl || v.posterUrl || '';
            if (!cover) continue;
            const title = (v.title || '').toLowerCase();
            const vtags = (v.tags || []).map((t) => t.toLowerCase());
            for (const c of lacking) {
                const arr = categoryCandidates.get(c.id)!;
                if (arr.length >= MAX_CANDIDATES) continue;
                const t = c.title.toLowerCase();
                if (title.includes(t) || vtags.some((vt) => vt === t || vt.includes(t))) {
                    pushCandidate(arr, cover);
                }
            }
        }
    }

    // --- Greedy unique cover assignment ---
    const used = new Set<string>();

    const categoryCovers: Record<string, string> = {};
    for (const c of categories) {
        const cands = categoryCandidates.get(c.id) || [];
        const pick = cands.find((u) => !used.has(u)) ?? cands[0];
        if (pick) {
            used.add(pick);
            categoryCovers[c.id] = pick;
        }
    }

    // Assign tag covers most-constrained first (fewest candidates → first pick) so
    // rare tags claim their only thumbnail before popular tags (which have many
    // alternatives) can take it. Display order stays frequency-sorted.
    const tagList = Array.from(tagCounts.entries()).map(([tag, count]) => ({
        tag,
        count,
        cands: tagCandidates.get(tag) || [],
    }));

    const tagCoverMap = new Map<string, string>();
    [...tagList]
        .sort((a, b) => a.cands.length - b.cands.length || b.count - a.count)
        .forEach((e) => {
            const pick = e.cands.find((u) => !used.has(u)) ?? e.cands[0];
            if (pick) {
                used.add(pick);
                tagCoverMap.set(e.tag, pick);
            }
        });

    const tags: TagEntry[] = tagList
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
        .map(({ tag, count }) => ({ tag, count, coverUrl: tagCoverMap.get(tag) }));

    return { categoryCounts, categoryCovers, tags };
}

/**
 * Relevance score for ranking search matches:
 *   4 exact · 3 whole-string prefix · 2 word-boundary prefix · 1 substring · 0 none.
 * An empty query matches everything at the base tier so callers can reuse it.
 */
export function matchScore(textLower: string, queryLower: string): number {
    if (!queryLower) return 1;
    if (textLower === queryLower) return 4;
    if (textLower.startsWith(queryLower)) return 3;
    if (textLower.split(/[\s\-_/]+/).some((w) => w.startsWith(queryLower))) return 2;
    if (textLower.includes(queryLower)) return 1;
    return 0;
}

/** Best score across a category's title, description and tags. */
export function scoreCategory(category: Category, queryLower: string): number {
    if (!queryLower) return 1;
    let best = matchScore(category.title.toLowerCase(), queryLower);
    if (best < 1 && category.description) {
        best = Math.max(best, matchScore(category.description.toLowerCase(), queryLower) > 0 ? 1 : 0);
    }
    if (best < 1 && category.tags) {
        best = Math.max(best, category.tags.some((t) => t.toLowerCase().includes(queryLower)) ? 1 : 0);
    }
    return best;
}
