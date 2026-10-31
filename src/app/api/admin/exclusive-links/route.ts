import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { ApiError, apiErrorResponse, requireAdmin } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';
import { publicOrigin } from '@/lib/site-origin';
import type { ExclusiveLink } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const db = getFirestore();
    const snap = await db.collection('exclusive_links').orderBy('createdAt', 'desc').limit(300).get();
    
    const origin = publicOrigin(request.headers);
    const links: (ExclusiveLink & { claimUrl: string })[] = snap.docs.map((d) => {
      const data = d.data() as Omit<ExclusiveLink, 'id'>;
      return {
        id: d.id,
        ...data,
        claimUrl: `${origin}/claim/${data.code}`,
      };
    });

    return Response.json({ links });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const count = Math.min(Math.max(Number(body.count) || 1, 1), 25);
    const durationMonths = body.durationMonths ? Number(body.durationMonths) : null;
    const expiresDays = body.expiresDays ? Number(body.expiresDays) : null;

    const db = getFirestore();
    const batch = db.batch();
    const origin = publicOrigin(request.headers);
    const createdLinks: (ExclusiveLink & { claimUrl: string })[] = [];

    const now = new Date().toISOString();
    const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 86400 * 1000).toISOString() : null;

    for (let i = 0; i < count; i++) {
      const randomCode = crypto.randomBytes(9).toString('base64url').replace(/[-_]/g, 'x').toLowerCase();
      const code = `pro_${randomCode}`;
      const docRef = db.collection('exclusive_links').doc();

      const linkData: Omit<ExclusiveLink, 'id'> = {
        code,
        note: count > 1 ? `${note ? note + ' ' : ''}(#${i + 1})` : note,
        status: 'active',
        plan: 'pro',
        tier: 'student_unlimited',
        durationMonths,
        expiresAt,
        createdBy: admin.uid,
        createdAt: now,
        redeemedBy: null,
        redeemedAt: null,
        timesUsed: 0,
      };

      batch.set(docRef, linkData);
      createdLinks.push({
        id: docRef.id,
        ...linkData,
        claimUrl: `${origin}/claim/${code}`,
      });
    }

    await batch.commit();

    return Response.json({ success: true, links: createdLinks });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new ApiError(400, 'ID_REQUIRED', 'Link ID is required.');
    }

    const db = getFirestore();
    const linkRef = db.collection('exclusive_links').doc(id);
    const snap = await linkRef.get();

    if (!snap.exists) {
      throw new ApiError(404, 'NOT_FOUND', 'Exclusive link not found.');
    }

    await linkRef.update({
      status: 'revoked',
      updatedAt: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

