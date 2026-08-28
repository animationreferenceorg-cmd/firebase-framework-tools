import type { Category, Video } from './types';
import { getAllSnapshotVideos, getSnapshotVideoById, getRelatedSnapshotVideos, getAllTags, slugifyTag } from './videoSnapshot.server';
import { getFirestore } from './firebase-admin';
import { SITE_URL, PartnerApiError } from './partner-api';

// Read models for the partner API. Everything here is derived from the static
// videos snapshot (public/data/videos-snapshot.json), which is regenerated on
// every deploy, so partner traffic costs zero Firestore reads. Categories are
// the one exception and are cached in memory for CATEGORY_TTL_MS.

export interface PartnerVideoDto {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  posterUrl: string;
  tags: Array<{ name: string; slug: string; url: string }>;
  categoryIds: string[];
  durationSeconds?: number;
  fps?: number;
  width?: number;
  height?: number;
  credit: {
    name: string | null;
    sourceUrl: string | null;
  };
  publishedAt: string | null;
  /** Direct media URL. Only present for keys holding the `media:stream` scope. */
  streamUrl?: string;
}

export interface PartnerCategoryDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  videoCount: number;
}

export function categorySlug(category: Pick<Category, 'slug' | 'title'>): string {
  if (category.slug) return category.slug;
  return (category.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Some legacy category records store their artwork as an inline base64 data
 * URI. Those are hundreds of kilobytes each and useless to a partner, so only
 * real http(s) URLs are exposed.
 */
function httpImageUrl(value?: string): string {
  return value && /^https?:\/\//i.test(value) ? value : '';
}

export function serializePartnerVideo(video: Video, { includeStream = false }: { includeStream?: boolean } = {}): PartnerVideoDto {
  const tags = (video.tags || [])
    .map((name) => ({ name, slug: slugifyTag(name) }))
    .filter((tag) => tag.slug)
    .map((tag) => ({ ...tag, url: `${SITE_URL}/tags/${tag.slug}` }));

  const dto: PartnerVideoDto = {
    id: video.id,
    title: video.title || '',
    description: video.description || '',
    url: `${SITE_URL}/video/${video.id}`,
    thumbnailUrl: video.thumbnailUrl || video.posterUrl || '',
    posterUrl: video.posterUrl || video.thumbnailUrl || '',
    tags,
    categoryIds: video.categoryIds || [],
    durationSeconds: video.duration,
    fps: video.fps,
    width: video.width,
    height: video.height,
    credit: {
      name: video.author_name || video.uploader || null,
      sourceUrl: video.originalUrl || null,
    },
    publishedAt: toIso(video.createdAt),
  };

  if (includeStream && video.videoUrl) {
    dto.streamUrl = video.videoUrl;
  }

  return dto;
}

function toIso(createdAt: unknown): string | null {
  if (typeof createdAt === 'number' && Number.isFinite(createdAt)) return new Date(createdAt).toISOString();
  if (typeof createdAt === 'string') {
    const parsed = Date.parse(createdAt);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  }
  return null;
}

// ---- Video search ----------------------------------------------------------

export interface VideoQuery {
  q?: string;
  tag?: string;
  categoryId?: string;
  minDuration?: number;
  maxDuration?: number;
  sort: 'newest' | 'oldest' | 'relevance';
}

/**
 * Filters the snapshot in memory. The library is ~8k rows, so a linear scan is
 * a fraction of a millisecond and avoids maintaining a search index for a
 * handful of partner requests per minute.
 */
export function queryPartnerVideos(params: VideoQuery): Video[] {
  const all = getAllSnapshotVideos();
  const needle = params.q?.trim().toLowerCase() || '';
  const tagSlug = params.tag ? slugifyTag(params.tag) : '';

  let matches = all.filter((video) => {
    if (tagSlug && !(video.tags || []).some((t) => slugifyTag(t) === tagSlug)) return false;
    if (params.categoryId && !(video.categoryIds || []).includes(params.categoryId)) return false;
    if (params.minDuration !== undefined && (video.duration ?? 0) < params.minDuration) return false;
    if (params.maxDuration !== undefined && (video.duration ?? Number.MAX_SAFE_INTEGER) > params.maxDuration) return false;
    if (needle) {
      const haystack = `${video.title || ''} ${video.description || ''} ${(video.tags || []).join(' ')}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  if (params.sort === 'relevance' && needle) {
    matches = matches
      .map((video) => ({ video, score: relevanceScore(video, needle) }))
      .sort((a, b) => b.score - a.score || createdMillis(b.video) - createdMillis(a.video))
      .map((entry) => entry.video);
  } else if (params.sort === 'oldest') {
    matches = [...matches].sort((a, b) => createdMillis(a) - createdMillis(b));
  } else {
    matches = [...matches].sort((a, b) => createdMillis(b) - createdMillis(a));
  }

  return matches;
}

function createdMillis(video: Video): number {
  return typeof video.createdAt === 'number' ? video.createdAt : 0;
}

function relevanceScore(video: Video, needle: string): number {
  const title = (video.title || '').toLowerCase();
  let score = 0;
  if (title === needle) score += 100;
  if (title.startsWith(needle)) score += 40;
  if (title.includes(needle)) score += 20;
  if ((video.tags || []).some((t) => t.toLowerCase() === needle)) score += 30;
  if ((video.description || '').toLowerCase().includes(needle)) score += 5;
  return score;
}

export function getPartnerVideo(id: string): Video {
  const video = getSnapshotVideoById(id);
  if (!video) {
    throw new PartnerApiError(404, 'VIDEO_NOT_FOUND', `No published video with id "${id}".`);
  }
  return video;
}

/**
 * Whether a video may be pushed into a partner tool, which needs the actual
 * media file. Returns null when eligible, or the reason it is not.
 *
 * Two exclusions: clips sourced from a third party (they carry an originalUrl
 * and we hold no right to hand the file to anyone else), and clips that are
 * only a link to a hosted player rather than a file we can serve.
 */
export function isHandoffEligible(video: Video): string | null {
  if (video.originalUrl) {
    return 'This reference is sourced from a third party and cannot be sent to partner tools.';
  }
  if (!video.videoUrl) {
    return 'This reference has no media file.';
  }
  const host = (() => {
    try {
      return new URL(video.videoUrl).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  if (!host || host.endsWith('youtube.com') || host === 'youtu.be') {
    return 'This reference is an embedded player, not a downloadable file.';
  }
  return null;
}

export function getPartnerRelated(video: Video, count: number): Video[] {
  return getRelatedSnapshotVideos(video, count);
}

// ---- Tags ------------------------------------------------------------------

export function listPartnerTags(): Array<{ name: string; slug: string; videoCount: number; url: string }> {
  return getAllTags()
    .map((tag) => ({
      name: tag.tag,
      slug: tag.slug,
      videoCount: tag.videos.length,
      url: `${SITE_URL}/tags/${tag.slug}`,
    }))
    .sort((a, b) => b.videoCount - a.videoCount);
}

// ---- Categories ------------------------------------------------------------

const CATEGORY_TTL_MS = 5 * 60 * 1000;
let categoryCache: { categories: PartnerCategoryDto[]; expiresAt: number } | null = null;

export async function listPartnerCategories(): Promise<PartnerCategoryDto[]> {
  if (categoryCache && categoryCache.expiresAt > Date.now()) return categoryCache.categories;

  const snapshot = await getFirestore().collection('categories').where('status', '==', 'published').get();
  const videos = getAllSnapshotVideos();

  const counts = new Map<string, number>();
  for (const video of videos) {
    for (const id of video.categoryIds || []) counts.set(id, (counts.get(id) || 0) + 1);
  }

  const categories = snapshot.docs
    .map((doc) => {
      const data = doc.data() as Category;
      const slug = categorySlug({ slug: data.slug, title: data.title });
      return {
        id: doc.id,
        slug,
        title: data.title || '',
        description: data.description || '',
        url: `${SITE_URL}/category/${slug}`,
        imageUrl: httpImageUrl(data.imageUrl),
        videoCount: counts.get(doc.id) || 0,
        sortIndex: data.sortIndex ?? 999,
      };
    })
    .sort((a, b) => a.sortIndex - b.sortIndex || a.title.localeCompare(b.title))
    .map(({ sortIndex, ...category }) => category);

  categoryCache = { categories, expiresAt: Date.now() + CATEGORY_TTL_MS };
  return categories;
}

export async function resolveCategoryId(idOrSlug: string): Promise<string> {
  const categories = await listPartnerCategories();
  const match = categories.find((category) => category.id === idOrSlug || category.slug === idOrSlug.toLowerCase());
  if (!match) {
    throw new PartnerApiError(404, 'CATEGORY_NOT_FOUND', `No published category matching "${idOrSlug}".`);
  }
  return match.id;
}
