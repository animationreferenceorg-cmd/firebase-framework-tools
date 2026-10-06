import type { NextRequest } from 'next/server';
import { ApiError, apiErrorResponse, getTrustedProfile, requireFirebaseUser } from '@/lib/api-auth';
import { getFirebaseAuth } from '@/lib/firebase-admin';

/**
 * Admin-only map of uid -> account email. Emails are no longer stored on the
 * world-readable users/{uid} documents, so the admin user list reads them
 * from Firebase Auth through this route instead.
 */
export async function GET(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(identity.uid);
    if (identity.admin !== true && profile.role !== 'admin') {
      throw new ApiError(403, 'FORBIDDEN', 'Admin access required.');
    }

    const emails: Record<string, string> = {};
    let pageToken: string | undefined;
    do {
      const page = await getFirebaseAuth().listUsers(1000, pageToken);
      for (const u of page.users) if (u.email) emails[u.uid] = u.email;
      pageToken = page.pageToken;
    } while (pageToken);

    return Response.json({ emails }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
