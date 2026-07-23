import fs from 'fs';
import path from 'path';
import type { Video } from './types';

// Server-side access to the static video snapshot generated at build time by
// scripts/export-videos-snapshot.cjs. Reading it costs zero Firestore reads,
// which matters because Googlebot crawls thousands of these pages per day.
// Videos are ordered oldest-first; createdAt is serialized as millis.

interface SnapshotCache {
    videos: Video[];
    byId: Map<string, Video>;
    mtimeMs: number;
}

let cache: SnapshotCache | null = null;

function load(): SnapshotCache {
    const file = path.join(process.cwd(), 'public', 'data', 'videos-snapshot.json');
    const mtimeMs = fs.statSync(file).mtimeMs;
    if (!cache || cache.mtimeMs !== mtimeMs) {
        const videos = JSON.parse(fs.readFileSync(file, 'utf8')) as Video[];
        cache = { videos, byId: new Map(videos.map(v => [v.id, v])), mtimeMs };
    }
    return cache;
}

export function getAllSnapshotVideos(): Video[] {
    return load().videos;
}

export function getSnapshotVideoById(id: string): Video | null {
    return load().byId.get(id) ?? null;
}

export function getRelatedSnapshotVideos(video: Video, count = 12): Video[] {
    const tags = new Set(video.tags || []);
    if (tags.size === 0) return [];
    const scored: { v: Video; score: number }[] = [];
    for (const v of load().videos) {
        if (v.id === video.id) continue;
        let score = 0;
        for (const t of v.tags || []) if (tags.has(t)) score++;
        if (score > 0) scored.push({ v, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map(s => s.v);
}

// ---- Tag index -------------------------------------------------------------

export function slugifyTag(tag: string): string {
    if (!tag || tag === 'null' || tag === 'undefined') return '';
    const res = tag
        .toLowerCase()
        .trim()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    return (res === 'null' || res === 'undefined') ? '' : res;
}

interface TagIndex {
    // slug -> { tag, videos } for tags with enough content to deserve a page
    bySlug: Map<string, { tag: string; videos: Video[] }>;
    mtimeMs: number;
}

const MIN_VIDEOS_PER_TAG_PAGE = 2;
let tagCache: TagIndex | null = null;

export function getTagIndex(): TagIndex {
    const snap = load();
    if (tagCache && tagCache.mtimeMs === snap.mtimeMs) return tagCache;

    const byTag = new Map<string, Video[]>();
    for (const v of snap.videos) {
        for (const t of v.tags || []) {
            const key = t.toLowerCase().trim();
            if (!key) continue;
            let list = byTag.get(key);
            if (!list) byTag.set(key, (list = []));
            list.push(v);
        }
    }

    const bySlug = new Map<string, { tag: string; videos: Video[] }>();
    for (const [tag, videos] of byTag) {
        if (videos.length < MIN_VIDEOS_PER_TAG_PAGE) continue;
        const slug = slugifyTag(tag);
        if (!slug) continue;
        const existing = bySlug.get(slug);
        if (existing) {
            // Slug collision (e.g. "get up" vs "get-up") — merge, keeping the bigger tag's name
            const merged = [...existing.videos];
            const seen = new Set(merged.map(v => v.id));
            for (const v of videos) if (!seen.has(v.id)) merged.push(v);
            bySlug.set(slug, {
                tag: videos.length > existing.videos.length ? tag : existing.tag,
                videos: merged,
            });
        } else {
            bySlug.set(slug, { tag, videos });
        }
    }

    tagCache = { bySlug, mtimeMs: snap.mtimeMs };
    return tagCache;
}

export function getTagBySlug(slug: string): { tag: string; videos: Video[] } | null {
    return getTagIndex().bySlug.get(slug) ?? null;
}

/** Tags that co-occur most often with the given tag's videos (for interlinking). */
export function getRelatedTags(tag: string, count = 12): { tag: string; slug: string; count: number }[] {
    const entry = getTagIndex().bySlug.get(slugifyTag(tag));
    if (!entry) return [];
    const co = new Map<string, number>();
    for (const v of entry.videos) {
        for (const t of v.tags || []) {
            const key = t.toLowerCase().trim();
            if (key === entry.tag) continue;
            co.set(key, (co.get(key) || 0) + 1);
        }
    }
    const index = getTagIndex().bySlug;
    return [...co.entries()]
        .filter(([t]) => index.has(slugifyTag(t)))
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([t, n]) => ({ tag: t, slug: slugifyTag(t), count: n }));
}

// ---- Shared helpers for SEO surfaces --------------------------------------

export function toIsoDuration(seconds?: number): string | undefined {
    if (!seconds || seconds <= 0) return undefined;
    return `PT${Math.max(1, Math.round(seconds))}S`;
}

export function toIsoDate(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
        const seconds = (value as { seconds?: number }).seconds;
        if (typeof seconds === 'number') return new Date(seconds * 1000).toISOString();
    }
    return undefined;
}
