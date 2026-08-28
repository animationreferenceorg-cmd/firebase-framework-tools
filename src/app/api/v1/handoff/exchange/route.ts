import { after, NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  PartnerApiError,
  partnerCors,
  partnerErrorResponse,
  preflightCors,
  recordUsage,
  requirePartnerKey,
  type PartnerKeyRecord,
} from '@/lib/partner-api';
import { redeemHandoff } from '@/lib/partner-handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const exchangeSchema = z.object({
  token: z.string().trim().min(1).max(256),
});

export function OPTIONS(request: NextRequest) {
  const headers = preflightCors(request);
  headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  return new NextResponse(null, { status: 204, headers });
}

/**
 * POST /api/v1/handoff/exchange
 *
 * The partner's server redeems a handoff token for the video the user sent.
 * Single use, five minute lifetime, and only redeemable by the partner it was
 * minted for. Never cached.
 */
export async function POST(request: NextRequest) {
  let key: PartnerKeyRecord | null = null;
  try {
    key = await requirePartnerKey(request);

    const parsed = exchangeSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      throw new PartnerApiError(400, 'INVALID_TOKEN', 'A handoff token is required.');
    }

    const redeemed = await redeemHandoff(parsed.data.token, key);

    const response = NextResponse.json({ data: redeemed }, { headers: partnerCors(request, key) });
    response.headers.set('Cache-Control', 'no-store');

    const record = key;
    after(() => recordUsage(record, 'handoff.exchange'));
    return response;
  } catch (error) {
    return partnerErrorResponse(error, partnerCors(request, key));
  }
}
