import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { REFERENCE_SOURCES, discoverySources, discoveryQuery, type ReferenceSource } from '@/lib/reference-feed';
import { fetchReferenceProvider, providerUnavailableMessage } from '@/lib/reference-providers';
import { generateRichTags, parseSearchIntent, scoreVideoRelevance } from '@/lib/search-intent';

export type { UnifiedSearchResult } from '@/lib/reference-feed';
export const runtime = 'nodejs';

const input = z.object({
  q: z.string().trim().max(200).default(''),
  source: z.enum(['all', ...REFERENCE_SOURCES]).default('all'),
  tab: z.enum(['featured', 'animations', '3d-models', 'visdev', 'character-design', 'community', 'trending', 'latest']).default('featured'),
  type: z.enum(['all', '2D', '3D']).default('all'),
  media: z.enum(['all', 'video', 'image', 'model3d']).default('all'),
  pill: z.enum(['all', 'locomotion', 'combat', 'acting', 'creature', 'mechanics', 'vfx', 'shorts']).default('all'),
  mode: z.enum(['search', 'explore']).optional(),
  cursor: z.string().max(16000).optional(),
});
const cursorSchema = z.object({
  version: z.literal(1), key: z.string(),
  positions: z.record(z.enum(REFERENCE_SOURCES), z.string().min(1).max(4096)),
});

/** Each cursor contains only provider positions, never a client-supplied upstream URL. */
export async function GET(request: NextRequest) {
  const parsed = input.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_SEARCH', message: 'Invalid search or filter.', results: [] }, { status: 400 });
  const options = parsed.data;
  const explore = options.mode === 'explore' || !options.q;
  const key = createHash('sha256').update(JSON.stringify([options.q, explore, options.source, options.tab, options.type, options.pill, options.media])).digest('hex').slice(0, 24);
  let positions: Partial<Record<ReferenceSource, string>> | null = null;
  if (options.cursor) {
    try {
      const cursor = cursorSchema.parse(JSON.parse(Buffer.from(options.cursor, 'base64url').toString()));
      if (cursor.key !== key) throw new Error('Search changed');
      positions = cursor.positions;
    } catch {
      return NextResponse.json({ error: 'INVALID_CURSOR', message: 'This search changed. Start from the first page.', results: [] }, { status: 400 });
    }
  }
  const sources = options.source === 'all' ? discoverySources(options.tab, options.type, options.media) : [options.source];
  const activeSources = positions ? sources.filter(source => positions[source] !== undefined) : sources;
  const query = discoveryQuery(options.q, options.tab, options.pill);
  const pages = await Promise.all(activeSources.map(async source => {
    try {
      const page = await fetchReferenceProvider(source, {
        query, tab: options.tab, type: options.type, explore,
        position: positions?.[source], signal: request.signal,
      });
      return { source, page, error: null };
    } catch {
      return { source, page: null, error: providerUnavailableMessage(source) };
    }
  }));
  const nextPositions: Partial<Record<ReferenceSource, string>> = {};
  const seen = new Set<string>();
  const intent = parseSearchIntent(options.q);
  const ranked = pages.flatMap(({ source, page }) => {
    if (!page) return [];
    if (page.next && page.next !== positions?.[source]) nextPositions[source] = page.next;
    return page.items.flatMap(item => {
      if (!item.id || seen.has(item.id)) return [];
      seen.add(item.id);
      item.tags = generateRichTags({ ...item, authorName: item.authorName });
      const score = explore ? 1 : scoreVideoRelevance({ ...item, videoUrl: item.mediaType === 'video' ? item.mediaUrl : '' } as any, intent);
      return score > 0 ? [{ item, score }] : [];
    });
  });
  // Stable provider order when browsing. Append new pages instead of shuffling existing cards.
  const results = (explore ? ranked : ranked.sort((a, b) => b.score - a.score)).map(result => result.item);
  const nextCursor = Object.keys(nextPositions).length
    ? Buffer.from(JSON.stringify({ version: 1, key, positions: nextPositions })).toString('base64url') : null;
  return NextResponse.json({
    query: options.q, mode: explore ? 'explore' : 'search', count: results.length,
    results, nextCursor, hasMore: Boolean(nextCursor),
    providers: pages.map(({ source, page, error }) => ({
      source, status: error ? 'unavailable' : 'ok',
      ...(error ? { message: error } : {}), ...(page?.limited ? { limited: true } : {}),
    })),
  }, { headers: { 'Cache-Control': pages.some(page => page.error) ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=600' } });
}
