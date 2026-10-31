import type { NextRequest } from 'next/server';
import { ApiError, apiErrorResponse, getTrustedProfile, requireFirebaseUser } from '@/lib/api-auth';
import { getFirebaseAuth, getFirestore } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(identity.uid);
    if (identity.admin !== true && profile.role !== 'admin') {
      throw new ApiError(403, 'FORBIDDEN', 'Admin access required.');
    }

    const auth = getFirebaseAuth();
    const db = getFirestore();

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    let totalAccounts = 0;
    let newThisWeek = 0;
    let newThisMonth = 0;
    let pageToken: string | undefined;

    do {
      const page = await auth.listUsers(1000, pageToken);
      totalAccounts += page.users.length;
      for (const u of page.users) {
        const createdAt = Date.parse(u.metadata.creationTime);
        if (createdAt >= sevenDaysAgo) newThisWeek++;
        if (createdAt >= thirtyDaysAgo) newThisMonth++;
      }
      pageToken = page.pageToken;
    } while (pageToken);

    // Get Pro and Free user breakdown from Firestore
    let proCount = 0;
    const usersSnap = await db.collection('users').get();
    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.isPremium || data.isPro || data.plan === 'pro' || data.plan === 'pro_monthly' || data.plan === 'pro_annual') {
        proCount++;
      }
    });

    const freeCount = Math.max(0, totalAccounts - proCount);

    return Response.json(
      {
        totalAccounts,
        proCount,
        freeCount,
        newThisWeek,
        newThisMonth,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
