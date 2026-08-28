import { after, NextResponse, type NextRequest } from 'next/server';
import {
  decodeCursor,
  encodeCursor,
  parseLimit,
  partnerCors,
  partnerErrorResponse,
  partnerResponse,
  preflightCors,
  recordUsage,
  requirePartnerKey,
  type PartnerKeyRecord,
} from '@/lib/partner-api';
import { queryPartnerVideos, resolveCategoryId, serializePartnerVideo } from '@/lib/partner-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: preflightCors(request) });
}

/**
 * GET /api/v1/videos
 *
 * Query params: q, tag, category (id or slug), minDuration, maxDuration,
 * sort (newest|oldest|relevance), limit (1-100), cursor.
 */
export async function GET(request: NextRequest) {
  let key: PartnerKeyRecord | null = null;
  try {
    key = await requirePartnerKey(request);
    const params = request.nextUrl.searchParams;

    const limit = parseLimit(params.get('limit'));
    const offset = decodeCursor(params.get('cursor'));
    const categoryParam = params.get('category');
    const sortParam = params.get('sort');

    const matches = queryPartnerVideos({
      q: params.get('q') || undefined,
      tag: params.get('tag') || undefined,
      categoryId: categoryParam ? await resolveCategoryId(categoryParam) : undefined,
      minDuration: numberParam(params.get('minDuration')),
      maxDuration: numberParam(params.get('maxDuration')),
      sort: sortParam === 'oldest' || sortParam === 'relevance' ? sortParam : 'newest',
    });

    const page = matches.slice(offset, offset + limit);
    const includeStream = key.scopes.includes('media:stream');
    const nextOffset = offset + page.length;

    const response = partnerResponse(
      {
        data: page.map((video) => serializePartnerVideo(video, { includeStream })),
        pagination: {
          limit,
          total: matches.length,
          nextCursor: nextOffset < matches.length ? encodeCursor(nextOffset) : null,
        },
      },
      key,
      request,
    );

    const record = key;
    after(() => recordUsage(record, 'videos.list'));
    return response;
  } catch (error) {
    return partnerErrorResponse(error, partnerCors(request, key));
  }
}

function numberParam(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
