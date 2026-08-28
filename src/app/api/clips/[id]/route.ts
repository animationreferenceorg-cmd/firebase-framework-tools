import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, apiErrorResponse, getTrustedProfile, requireFirebaseUser } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(identity.uid);
    const { id } = await params;
    const db = getFirestore();
    const clipRef = db.collection('reference_clips').doc(id);
    const clipSnap = await clipRef.get();
    if (!clipSnap.exists) throw new ApiError(404, 'NOT_FOUND', 'Reference clip not found.');
    const clip = clipSnap.data()!;
    if (clip.creatorId !== identity.uid && profile.role !== 'admin') {
      throw new ApiError(403, 'FORBIDDEN', 'Only the clip owner can delete this reference.');
    }

    const [saves, canvases] = await Promise.all([
      db.collection('reference_board_saves').where('clipId', '==', id).get(),
      db.collection('users').doc(clip.creatorId).collection('moodboards').get(),
    ]);
    const batch = db.batch();
    for (const save of saves.docs.filter((item) => item.data().ownerId === clip.creatorId)) {
      batch.delete(save.ref);
      const boardId = save.data().boardId;
      if (boardId) batch.update(db.collection('reference_boards').doc(boardId), { clipCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
    }
    for (const canvas of canvases.docs) {
      const items = Array.isArray(canvas.data().items) ? canvas.data().items : [];
      const nextItems = items.filter((item: any) => item.videoId !== id && item.videoData?.id !== id);
      if (nextItems.length !== items.length) batch.update(canvas.ref, { items: nextItems, itemCount: nextItems.length, updatedAt: FieldValue.serverTimestamp() });
    }
    // Preserve the captured media and categorization. Removing a reference is a
    // personal-library action, not a destructive database deletion.
    batch.update(clipRef, {
      primaryBoardId: null,
      removedFromCreatorAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return NextResponse.json({ removed: true, retained: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
