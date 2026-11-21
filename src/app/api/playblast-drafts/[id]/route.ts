import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireFirebaseUser(request);
    const { id } = await params;
    if (!id) throw new ApiError(400, 'INVALID_ID', 'Draft ID is required.');

    const db = getFirestore();
    const snap = await db.collection('playblast_drafts').doc(id).get();
    if (!snap.exists) {
      throw new ApiError(404, 'NOT_FOUND', 'Playblast draft not found or already expired.');
    }

    const data = snap.data()!;
    if (data.userId !== identity.uid && identity.admin !== true) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this draft.');
    }

    return NextResponse.json({
      id: snap.id,
      title: data.title || '',
      description: data.description || '',
      category: data.category || 'Acting',
      wipStage: data.wipStage || 'blocking',
      tags: Array.isArray(data.tags) ? data.tags : [],
      software: Array.isArray(data.software) ? data.software : [],
      mediaUrl: data.mediaUrl || '',
      thumbnailUrl: data.thumbnailUrl || '',
      boardId: data.boardId || '',
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
