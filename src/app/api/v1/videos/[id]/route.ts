import { after, NextResponse, type NextRequest } from 'next/server';
import {
  parseLimit,
  partnerCors,
  partnerErrorResponse,
  partnerResponse,
  preflightCors,
  recordUsage,
  requirePartnerKey,
  type PartnerKeyRecord,
} from '@/lib/partner-api';
import { getPartnerRelated, getPartnerVideo, serializePartnerVideo } from '@/lib/partner-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: preflightCors(request) });
}

/**
 * GET /api/v1/videos/{id}
 *
 * Query params: related (0-24, default 6) - how many similar videos to include.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let key: PartnerKeyRecord | null = null;
  try {
    key = await requirePartnerKey(request);
    const { id } = await params;

    const video = getPartnerVideo(id);
    const includeStream = key.scopes.includes('media:stream');
    const relatedCount = parseLimit(request.nextUrl.searchParams.get('related'), 6, 24);

    const response = partnerResponse(
      {
        data: serializePartnerVideo(video, { includeStream }),
        related: getPartnerRelated(video, relatedCount).map((related) => serializePartnerVideo(related, { includeStream })),
      },
      key,
      request,
    );

    const record = key;
    after(() => recordUsage(record, 'videos.get'));
    return response;
  } catch (error) {
    return partnerErrorResponse(error, partnerCors(request, key));
  }
}
