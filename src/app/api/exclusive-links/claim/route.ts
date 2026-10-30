import type { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    if (!code) {
      throw new ApiError(400, 'CODE_REQUIRED', 'Exclusive invite code is required.');
    }

    const db = getFirestore();

    // Transactional redemption prevents double-claiming
    const result = await db.runTransaction(async (transaction) => {
      const linkQuery = db.collection('exclusive_links').where('code', '==', code).limit(1);
      const querySnap = await transaction.get(linkQuery);

      if (querySnap.empty) {
        throw new ApiError(404, 'NOT_FOUND', 'This exclusive link was not found.');
      }

      const linkDoc = querySnap.docs[0];
      const linkData = linkDoc.data();

      if (linkData.status === 'revoked') {
        throw new ApiError(400, 'REVOKED', 'This exclusive link has been revoked.');
      }

      if (linkData.status === 'redeemed' || (linkData.timesUsed && linkData.timesUsed > 0) || linkData.redeemedBy) {
        throw new ApiError(400, 'ALREADY_REDEEMED', 'This exclusive link has already been claimed by another account.');
      }

      if (linkData.expiresAt && new Date(linkData.expiresAt).getTime() < Date.now()) {
        throw new ApiError(400, 'EXPIRED', 'This exclusive link has expired.');
      }

      const userRef = db.collection('users').doc(identity.uid);
      const userSnap = await transaction.get(userRef);
      const userData = userSnap.exists ? userSnap.data() || {} : {};

      const now = new Date().toISOString();

      // 1. Mark the exclusive link as redeemed
      transaction.update(linkDoc.ref, {
        status: 'redeemed',
        timesUsed: 1,
        redeemedBy: {
          uid: identity.uid,
          email: identity.email || userData.email || null,
          displayName: identity.name || userData.displayName || null,
        },
        redeemedAt: now,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 2. Grant full Pro access to the user profile
      const userUpdates: Record<string, any> = {
        isVIP: true,
        isPremium: true,
        unlimitedAccess: true,
        plan: 'pro',
        tier: 'student_unlimited', // Resolves to unlimited Pro access in plans.ts
        grantedAt: now,
        exclusiveLinkClaimed: {
          code,
          claimedAt: now,
          note: linkData.note || 'Exclusive Invite Link',
          durationMonths: linkData.durationMonths || null,
        },
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (!userSnap.exists) {
        userUpdates.uid = identity.uid;
        userUpdates.email = identity.email || null;
        userUpdates.displayName = identity.name || null;
        userUpdates.createdAt = FieldValue.serverTimestamp();
        userUpdates.role = 'user';
        transaction.set(userRef, userUpdates);
      } else {
        transaction.set(userRef, userUpdates, { merge: true });
      }

      return {
        code,
        durationMonths: linkData.durationMonths || null,
        note: linkData.note || null,
      };
    });

    return Response.json({
      success: true,
      message: 'Pro access successfully activated!',
      ...result,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
