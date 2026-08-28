import { NextResponse, type NextRequest } from 'next/server';
import { API_VERSION, SITE_URL, preflightCors } from '@/lib/partner-api';

export const runtime = 'nodejs';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: preflightCors(request) });
}

/**
 * GET /api/v1 - unauthenticated discovery document, so a partner integrating
 * against us can see the shape of the API before their key is issued.
 */
export function GET() {
  return NextResponse.json({
    name: 'Animation Reference Partner API',
    version: API_VERSION,
    documentation: `${SITE_URL}/docs/partner-api`,
    authentication: {
      type: 'api-key',
      header: 'X-API-Key',
      note: 'Keys are issued per partner. Keep them server-side; contact us to allowlist a browser origin.',
    },
    endpoints: {
      status: `${SITE_URL}/api/v1/status`,
      videos: `${SITE_URL}/api/v1/videos`,
      video: `${SITE_URL}/api/v1/videos/{id}`,
      categories: `${SITE_URL}/api/v1/categories`,
      tags: `${SITE_URL}/api/v1/tags`,
    },
    terms: `${SITE_URL}/terms`,
  });
}
