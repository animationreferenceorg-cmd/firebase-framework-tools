import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';
import { categorizeReferenceWithGemma4 } from '@/lib/gemma-taxonomy';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Admin batch endpoint to run free Gemma 4 vision/text categorization over
 * existing uncategorized clips & videos and populate clean animation taxonomies.
 */
export async function POST(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    if (identity.admin !== true) {
      throw new ApiError(403, 'FORBIDDEN', 'Admin access is required.');
    }

    const body = await request.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(30, Number(body?.limit || 10)));
    const force = Boolean(body?.force);

    const db = getFirestore();
    const snap = await db.collection('videos').limit(limit * 3).get();

    const targets = snap.docs
      .filter((doc) => {
        const d = doc.data() || {};
        if (!force && d.aiCategorizedBy) return false;
        return Boolean(d.title || d.thumbnailUrl);
      })
      .slice(0, limit);

    const results: Array<{ id: string; title: string; category: string; subCategory: string; provider: string; model: string }> = [];

    for (const doc of targets) {
      const d = doc.data() || {};
      const tax = await categorizeReferenceWithGemma4({
        title: d.title,
        description: d.description,
        suppliedCategory: d.category,
        suppliedTags: Array.isArray(d.tags) ? d.tags : [],
        thumbnailUrl: d.thumbnailUrl || d.posterUrl || null,
      });

      const updates = {
        category: tax.category,
        subCategory: tax.subCategory || null,
        tags: tax.tags,
        categoryIds: [tax.category.toLowerCase()],
        subject: tax.subject,
        cameraAngle: tax.cameraAngle,
        energy: tax.energy,
        aiSummary: tax.aiSummary || null,
        aiCategorizedBy: `${tax.provider}:${tax.model}`,
        updatedAt: FieldValue.serverTimestamp(),
      };

      await doc.ref.set(updates, { merge: true });
      // Keep matching reference_clips doc in sync if it exists
      const clipRef = db.collection('reference_clips').doc(doc.id);
      const clipSnap = await clipRef.get();
      if (clipSnap.exists) {
        await clipRef.set(updates, { merge: true });
      }

      results.push({
        id: doc.id,
        title: String(d.title || ''),
        category: tax.category,
        subCategory: tax.subCategory,
        provider: tax.provider,
        model: tax.model,
      });
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
