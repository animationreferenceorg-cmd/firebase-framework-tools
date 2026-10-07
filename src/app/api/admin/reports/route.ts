import type { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { ApiError, apiErrorResponse, requireAdmin } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';
import {
  REPEAT_INFRINGER_STRIKES,
  REPORT_COLLECTION,
  ownerField,
  takedownUpdate,
  targetCollection,
  type ReportReason,
  type ReportTarget,
} from '@/lib/content-reports';

/** Admin review queue for content reports: list them, remove the content or dismiss. */

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const status = request.nextUrl.searchParams.get('status') === 'closed' ? 'closed' : 'open';
    const snap = await getFirestore().collection(REPORT_COLLECTION).where('status', status === 'open' ? '==' : '!=', 'open').limit(200).get();
    const reports = snap.docs
      .map((d) => {
        const { ipHash: _ipHash, ...rest } = d.data();
        return { id: d.id, ...rest };
      })
      .sort((a, b) => Number((b as { createdAt?: number }).createdAt || 0) - Number((a as { createdAt?: number }).createdAt || 0));
    return Response.json({ reports });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const actionSchema = z.object({
  reportId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  action: z.enum(['remove', 'dismiss']),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const parsed = actionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(422, 'INVALID_ACTION', 'Unknown action.');
    const { reportId, action } = parsed.data;

    const db = getFirestore();
    const reportRef = db.collection(REPORT_COLLECTION).doc(reportId);
    const report = (await reportRef.get()).data();
    if (!report) throw new ApiError(404, 'NOT_FOUND', 'Report not found.');
    const now = Date.now();

    if (action === 'dismiss') {
      await reportRef.update({ status: 'dismissed', resolvedAt: now, resolvedBy: admin.uid });
      return Response.json({ ok: true });
    }

    const targetType = report.targetType as ReportTarget;
    const reason = report.reason as ReportReason;
    const targetRef = db.collection(targetCollection(targetType)).doc(String(report.targetId));
    const target = (await targetRef.get()).data();

    let strikes: number | null = null;
    let ownerId: string | null = null;
    if (target) {
      const field = ownerField(targetType);
      ownerId = field && typeof target[field] === 'string' ? target[field] : null;
      const update = takedownUpdate(targetType, reason, now);
      if (update) await targetRef.update(update);
      else await targetRef.delete();
      // Library pages read a deploy-time snapshot; this hides the video right away.
      if (targetType === 'video') await db.collection('takedowns').doc(String(report.targetId)).set({ reason, at: now, reportId });

      if (ownerId && reason === 'copyright') {
        // Server-only record (profiles are public and owner-editable).
        const strikeRef = db.collection('moderation').doc(ownerId);
        await strikeRef.set({ copyrightStrikes: FieldValue.increment(1), lastStrikeAt: now }, { merge: true });
        strikes = Number((await strikeRef.get()).data()?.copyrightStrikes || 0);
      }
    }

    // Close every open report on the same item.
    const siblings = await db.collection(REPORT_COLLECTION).where('targetId', '==', String(report.targetId)).get();
    const batch = db.batch();
    for (const doc of siblings.docs) {
      if (doc.data().status === 'open' || doc.id === reportId) batch.update(doc.ref, { status: 'removed', resolvedAt: now, resolvedBy: admin.uid });
    }
    await batch.commit();

    return Response.json({
      ok: true,
      ownerId,
      strikes,
      repeatInfringer: strikes !== null && strikes >= REPEAT_INFRINGER_STRIKES,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
