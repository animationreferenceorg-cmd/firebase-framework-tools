import type { NextRequest } from 'next/server';
import { ApiError, apiErrorResponse } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim();

    if (!code) {
      throw new ApiError(400, 'CODE_REQUIRED', 'Exclusive invite code is required.');
    }

    const db = getFirestore();
    const snap = await db.collection('exclusive_links').where('code', '==', code).limit(1).get();

    if (snap.empty) {
      return Response.json({
        valid: false,
        status: 'not_found',
        message: 'This exclusive link does not exist or may have been typed incorrectly.',
      });
    }

    const doc = snap.docs[0];
    const data = doc.data();

    // Check if revoked
    if (data.status === 'revoked') {
      return Response.json({
        valid: false,
        status: 'revoked',
        message: 'This exclusive invite link has been revoked.',
      });
    }

    // Check if already redeemed
    if (data.status === 'redeemed' || (data.timesUsed && data.timesUsed > 0) || data.redeemedBy) {
      return Response.json({
        valid: false,
        status: 'redeemed',
        redeemedAt: data.redeemedAt || null,
        message: 'This exclusive link has already been claimed and cannot be reused.',
      });
    }

    // Check if expired
    if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
      return Response.json({
        valid: false,
        status: 'expired',
        message: 'This exclusive invite link has expired.',
      });
    }

    // Valid and unclaimed!
    return Response.json({
      valid: true,
      status: 'active',
      plan: data.plan || 'pro',
      durationMonths: data.durationMonths || null,
      note: data.note || null,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
