import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireFirebaseUser, ApiError } from '@/lib/api-auth';
import { PartnerApiError, partnerErrorResponse } from '@/lib/partner-api';
import { mintHandoff } from '@/lib/partner-handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handoffSchema = z.object({
  videoId: z.string().trim().min(1).max(200),
  /** Public partner identifier, e.g. `pk_anim_works`. */
  keyId: z.string().trim().min(1).max(120),
});

/**
 * POST /api/v1/handoff
 *
 * First-party endpoint behind the "open in partner tool" button. Unlike the
 * rest of /api/v1 this authenticates the *user* with a Firebase ID token, not a
 * partner with an API key - the partner authenticates later, at /exchange.
 *
 * Returns the URL to send the browser to. The destination comes from the
 * partner's key document, never from the request, so this cannot be turned into
 * an open redirect.
 */
export async function POST(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);

    const parsed = handoffSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      throw new PartnerApiError(422, 'INVALID_REQUEST', parsed.error.issues[0]?.message || 'Invalid handoff request.');
    }

    const handoff = await mintHandoff(identity.uid, parsed.data.videoId, parsed.data.keyId);

    const response = NextResponse.json({ data: handoff });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    // requireFirebaseUser throws the extension-flavoured ApiError; translate it
    // so partners and our own client see one error envelope.
    if (error instanceof ApiError) {
      return partnerErrorResponse(new PartnerApiError(error.status, error.code, error.message));
    }
    return partnerErrorResponse(error);
  }
}
