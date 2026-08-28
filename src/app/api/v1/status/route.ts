import { NextResponse, type NextRequest } from 'next/server';
import {
  API_VERSION,
  partnerCors,
  partnerErrorResponse,
  preflightCors,
  rateLimitSnapshot,
  requirePartnerKey,
  type PartnerKeyRecord,
} from '@/lib/partner-api';
import { getAllSnapshotVideos } from '@/lib/videoSnapshot.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: preflightCors(request) });
}

/**
 * GET /api/v1/status - what a partner hits first to confirm their key works.
 * Deliberately not usage-logged and never cached.
 */
export async function GET(request: NextRequest) {
  let key: PartnerKeyRecord | null = null;
  try {
    key = await requirePartnerKey(request);
    const response = NextResponse.json(
      {
        data: {
          apiVersion: API_VERSION,
          partner: key.partner,
          keyId: key.keyId,
          scopes: key.scopes,
          rateLimit: rateLimitSnapshot(key),
          library: { videoCount: getAllSnapshotVideos().length },
        },
      },
      { headers: partnerCors(request, key) },
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    return partnerErrorResponse(error, partnerCors(request, key));
  }
}
