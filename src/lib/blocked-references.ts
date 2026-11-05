/**
 * Denylisted references, images, and external media URLs that should never appear
 * on Animation Reference (e.g. non-reference photos, personal photos, takedown requests).
 */

export const BLOCKED_REFERENCE_PATTERNS = [
  'jason_woodhead',
  'jason woodhead',
  'jasonwoodhead',
  'commons.wikimedia.org/wiki/file:jason_woodhead_and_philip_currie.jpg',
  'commons.wikimedia.org/wiki/file:jason_woodhead',
  'commons.wikimedia.org/wiki/file:philip_currie,_edmonton_dinosour_dig',
  'wiki_36920784',
  '36920784',
  'wiki_69031537',
  '69031537',
  'wiki_41522501',
  '41522501',
  'archive.org',
  'archive_',
  'web.archive.org',
  'youtube-uck9heqfyfm',
  'uck9heqfyfm',
];

export interface ReferenceLike {
  id?: string | null;
  title?: string | null;
  sourceUrl?: string | null;
  originalUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaUrl?: string | null;
  posterUrl?: string | null;
  videoUrl?: string | null;
  description?: string | null;
  authorName?: string | null;
  uploader?: string | null;
}

/**
 * Returns true if the given reference or media URL matches any blocked pattern.
 */
export function isBlockedReference(ref: ReferenceLike | null | undefined): boolean {
  if (!ref) return false;
  const id = (ref.id || '').toLowerCase().trim();
  const title = (ref.title || '').toLowerCase().trim();
  const sourceUrl = (ref.sourceUrl || ref.originalUrl || '').toLowerCase().trim();
  const mediaUrl = (ref.mediaUrl || ref.thumbnailUrl || ref.posterUrl || ref.videoUrl || '').toLowerCase().trim();
  const author = (ref.authorName || ref.uploader || '').toLowerCase().trim();

  for (const pattern of BLOCKED_REFERENCE_PATTERNS) {
    if (id === pattern || id.includes(pattern)) return true;
    if (title.includes(pattern)) return true;
    if (sourceUrl.includes(pattern)) return true;
    if (mediaUrl.includes(pattern)) return true;
    if (author.includes(pattern)) return true;
  }

  return false;
}

export function filterBlockedReferences<T extends ReferenceLike>(items: T[]): T[] {
  return items.filter((item) => !isBlockedReference(item));
}

