import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Video } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Pinterest-Style Viral Save & Ingestion Engine
 * 
 * Rules:
 * 1. When any user saves an item to their board:
 *    - Ingests/upserts it into the global library (`videos` collection).
 *    - Increments `saveCount` and `repinCount`.
 *    - Adds the user to `savedByUsers`.
 *    - Recalculates `trendingScore` so viral references are distributed more throughout the app.
 * 
 * 2. When a user deletes a pin from their personal board (Pinterest Rule #1):
 *    - Only removes it from their personal profile/board.
 *    - The reference remains permanently in the global library and on all other users' boards!
 * 
 * 3. Only admin/DMCA actions wipe a reference globally.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, boardId, video, action = 'save' } = body as {
      userId?: string;
      boardId?: string;
      video: Video;
      action?: 'save' | 'unsave';
    };

    if (!video || !video.id) {
      return NextResponse.json({ error: 'Missing video or video.id' }, { status: 400 });
    }

    const db = getFirestore();
    const videoRef = db.collection('videos').doc(video.id);
    const snap = await videoRef.get();

    if (action === 'save') {
      if (!snap.exists) {
        // Auto-ingest external reference into global site catalog
        const cleanThumbnail = video.thumbnailUrl || video.posterUrl || '';
        await videoRef.set({
          id: video.id,
          title: video.title || 'Curated Reference',
          description: video.description || '',
          thumbnailUrl: cleanThumbnail,
          posterUrl: video.posterUrl || cleanThumbnail,
          videoUrl: video.videoUrl || '',
          embedUrl: video.embedUrl || '',
          sourcePlatform: video.sourcePlatform || (video.id.startsWith('sketchfab-') ? 'sketchfab' : video.id.startsWith('artstation-') ? 'artstation' : video.id.startsWith('pin-') ? 'pinterest' : 'web'),
          sourceUrl: video.sourceUrl || '',
          originalUrl: video.originalUrl || video.sourceUrl || '',
          uploader: video.uploader || (video as any).authorName || (video as any).sourceAuthorName || '',
          authorAvatar: video.authorAvatar || (video as any).sourceAuthorAvatar || '',
          tags: video.tags || [],
          categoryIds: video.categoryIds || ['reference'],
          status: 'published',
          isPublic: true,
          isExternalHub: true,
          saveCount: 1,
          repinCount: 1,
          savedByUsers: userId ? [userId] : [],
          curatorCount: 1,
          trendingScore: 25, // Initial boost for being curated by a real user
          createdAt: FieldValue.serverTimestamp(),
          lastSavedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Increment save engagement & repin count
        const currentData = snap.data() || {};
        const currentSaves = (currentData.saveCount || 0) + 1;
        const currentLikes = currentData.likeCount || 0;
        const newTrendingScore = currentSaves * 15 + currentLikes * 5;

        const updatePayload: Record<string, any> = {
          saveCount: FieldValue.increment(1),
          repinCount: FieldValue.increment(1),
          trendingScore: newTrendingScore,
          lastSavedAt: FieldValue.serverTimestamp(),
        };

        if (userId) {
          updatePayload.savedByUsers = FieldValue.arrayUnion(userId);
        }

        await videoRef.update(updatePayload);
      }

      return NextResponse.json({ success: true, action: 'saved', videoId: video.id });
    } else if (action === 'unsave') {
      // Pinterest Rule #1: Deleting from personal board only decrements personal reference.
      // The master reference stays in the global catalog and on all other users' boards!
      if (snap.exists) {
        const updatePayload: Record<string, any> = {
          saveCount: FieldValue.increment(-1),
        };

        if (userId) {
          updatePayload.savedByUsers = FieldValue.arrayRemove(userId);
        }

        await videoRef.update(updatePayload);
      }

      return NextResponse.json({ success: true, action: 'unsaved', videoId: video.id });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/hub/save:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
