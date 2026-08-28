import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { getFirebaseStorage, getFirestore } from '@/lib/firebase-admin';
import { bunnyMp4Url, getBunnyVideoStatus } from '@/lib/bunny-stream';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const snap = await getFirestore().collection('reference_clips').doc(id).get();
    if (!snap.exists || !snap.data()?.storagePath) throw new ApiError(404, 'NOT_FOUND', 'Uploaded clip not found.');
    const clip = snap.data()!;
    if (clip.isPrivate) {
      const identity = await requireFirebaseUser(request);
      if (identity.uid !== clip.creatorId) throw new ApiError(403, 'FORBIDDEN', 'This clip is private.');
    }
    if (String(clip.storagePath).startsWith('bunny/') && clip.uploadedMediaUrl) {
      const guid = clip.externalBunnyId || String(clip.storagePath).split('/').pop();
      const bunnyVideo = guid ? await getBunnyVideoStatus(guid) : null;
      if (guid && bunnyVideo?.status === 4) {
        return NextResponse.json({ url: bunnyMp4Url(guid, bunnyVideo.availableResolutions), status: 'ready' });
      }
      return NextResponse.json({ status: 'processing', progress: bunnyVideo?.encodeProgress || 0 }, { status: 202 });
    }
    const [url] = await getFirebaseStorage().bucket().file(clip.storagePath).getSignedUrl({ action: 'read', expires: Date.now() + 5 * 60 * 1000 });
    return NextResponse.json({ url });
  } catch (error) { return apiErrorResponse(error); }
}
