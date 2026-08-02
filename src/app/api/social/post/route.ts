import { NextResponse } from 'next/server';
import { dispatchSocialPost } from '@/lib/social/socialManager';
import type { PostRequest } from '@/lib/social/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSnapshotVideoById } from '@/lib/videoSnapshot.server';

export async function POST(req: Request) {
  try {
    const body: PostRequest = await req.json();

    if (!body.videoId || !body.platforms || body.platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: videoId and platforms array are required.' },
        { status: 400 }
      );
    }

    let video: any = null;

    // Try fetching from Firestore first if DB exists
    if (db) {
      const docRef = doc(db, 'videos', body.videoId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        video = { id: docSnap.id, ...docSnap.data() };
      }
    }

    // Fallback to static snapshot if video not found in Firestore
    if (!video) {
      video = getSnapshotVideoById(body.videoId);
    }

    if (!video) {
      return NextResponse.json({ error: `Video with ID ${body.videoId} not found.` }, { status: 404 });
    }

    const log = await dispatchSocialPost(video, body, 'manual');

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    console.error('Error in /api/social/post API route:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
