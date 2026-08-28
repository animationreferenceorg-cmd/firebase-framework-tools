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
import { listPartnerTags } from '@/lib/partner-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: preflightCors(request) });
}

/**
 * GET /api/v1/tags - tags ordered by how many videos carry them.
 *
 * Query params: q (substring filter), limit (1-200), cursor.
 */
export async function GET(request: NextRequest) {
  let key: PartnerKeyRecord | null = null;
  try {
    key = await requirePartnerKey(request);
    const params = request.nextUrl.searchParams;

    const needle = (params.get('q') || '').trim().toLowerCase();
    const limit = parseLimit(params.get('limit'), 100, 200);
    const offset = decodeCursor(params.get('cursor'));

    const all = needle ? listPartnerTags().filter((tag) => tag.name.toLowerCase().includes(needle)) : listPartnerTags();
    const page = all.slice(offset, offset + limit);
    const nextOffset = offset + page.length;

    const response = partnerResponse(
      {
        data: page,
        pagination: {
          limit,
          total: all.length,
          nextCursor: nextOffset < all.length ? encodeCursor(nextOffset) : null,
        },
      },
      key,
      request,
      { maxAge: 900 },
    );

    const record = key;
    after(() => recordUsage(record, 'tags.list'));
    return response;
  } catch (error) {
    return partnerErrorResponse(error, partnerCors(request, key));
  }
}
