import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { ApiError, apiErrorResponse, optionalFirebaseUser } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';
import { REPORT_COLLECTION, reportSchema, targetCollection } from '@/lib/content-reports';

/** Anyone may report content. Reports are stored server-side for admins to review. */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const recent = new Map<string, number[]>();

function rateLimited(key: string, now: number): boolean {
  const hits = (recent.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) { recent.set(key, hits); return true; }
  hits.push(now);
  recent.set(key, hits);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = reportSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(422, 'INVALID_REPORT', 'Choose a reason and try again.');
    const input = parsed.data;

    const now = Date.now();
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 24);
    if (rateLimited(ipHash, now)) throw new ApiError(429, 'RATE_LIMITED', 'Too many reports. Please try again later.');

    const db = getFirestore();
    const target = await db.collection(targetCollection(input.targetType)).doc(input.targetId).get();
    if (!target.exists) throw new ApiError(404, 'NOT_FOUND', 'That item no longer exists.');

    const reporterUid = await optionalFirebaseUser(request);
    const data = target.data() || {};
    await db.collection(REPORT_COLLECTION).add({
      targetType: input.targetType,
      targetId: input.targetId,
      targetTitle: String(data.title || '').slice(0, 200),
      reason: input.reason,
      details: input.details,
      contactEmail: input.contactEmail || null,
      reporterUid,
      ipHash,
      status: 'open',
      createdAt: now,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
