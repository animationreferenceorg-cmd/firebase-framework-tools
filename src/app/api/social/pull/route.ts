import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';
import { downloadSocialVideo } from '@/app/actions/downloader';
import { FieldValue } from 'firebase-admin/firestore';
import { isDirectPlayableVideoUrl } from '@/lib/reference-utils';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for server-side video fetch + transcode/CDN upload

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { url, videoId, authorName, authorAvatar, title } = body as {
      url: string;
      videoId?: string;
      authorName?: string;
      authorAvatar?: string;
      title?: string;
    };

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const db = getFirestore();

    // 1. If videoId was supplied, check if already pulled with a direct playable stream
    if (videoId) {
      const doc = await db.collection('videos').doc(videoId).get();
      if (doc.exists) {
        const data = doc.data() || {};
        if (data.videoUrl && isDirectPlayableVideoUrl(data.videoUrl)) {
          return NextResponse.json({
            success: true,
            video: {
              id: doc.id,
              videoUrl: data.videoUrl,
              thumbnailUrl: data.thumbnailUrl,
              posterUrl: data.posterUrl || data.thumbnailUrl,
              uploader: data.uploader || authorName || '@creator',
              authorAvatar: data.authorAvatar || authorAvatar || null,
              title: data.title,
            },
          });
        }
      }
    }

    // 2. Download from social source (Instagram, etc.) and upload to Bunny CDN / Firebase Storage
    const result = await downloadSocialVideo(
      url,
      true, // saveToFirestore
      undefined,
      undefined,
      {
        authorName,
        authorAvatar,
        title,
      }
    );

    if (!result.success || !result.video?.videoUrl) {
      return NextResponse.json(
        { error: result.error || 'Could not pull video from this source.' },
        { status: 502 }
      );
    }

    const finalVideo = result.video;
    const targetId = videoId || finalVideo.id;

    // 3. Update existing video and clip docs if videoId was provided
    if (videoId && videoId !== finalVideo.id) {
      const syncPayload = {
        videoUrl: finalVideo.videoUrl,
        thumbnailUrl: finalVideo.thumbnailUrl,
        posterUrl: finalVideo.posterUrl || finalVideo.thumbnailUrl,
        uploader: authorName || finalVideo.uploader,
        authorAvatar: authorAvatar || (finalVideo as any).authorAvatar || null,
        status: 'published',
        updatedAt: FieldValue.serverTimestamp(),
      };
      await db.collection('videos').doc(videoId).set(syncPayload, { merge: true });
      await db.collection('reference_clips').doc(videoId).set(syncPayload, { merge: true }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      video: {
        id: targetId,
        videoUrl: finalVideo.videoUrl,
        thumbnailUrl: finalVideo.thumbnailUrl,
        posterUrl: finalVideo.posterUrl || finalVideo.thumbnailUrl,
        uploader: authorName || finalVideo.uploader,
        authorAvatar: authorAvatar || (finalVideo as any).authorAvatar || null,
        title: finalVideo.title,
      },
    });
  } catch (error: any) {
    console.error('[SocialPull] Failed to ingest video:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
