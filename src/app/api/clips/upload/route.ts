import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, apiErrorResponse, getTrustedProfile, profileHasPro, requireFirebaseUser } from '@/lib/api-auth';
import { getFirebaseStorage, getFirestore } from '@/lib/firebase-admin';
import { bunnyMp4Url, bunnyStreamConfig, waitForBunnyVideo } from '@/lib/bunny-stream';
import { analyzeReferenceVisuals } from '@/lib/reference-discovery';

export const runtime = 'nodejs';
export const maxDuration = 300;

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(identity.uid);
    if (!profileHasPro(profile)) throw new ApiError(403, 'PRO_REQUIRED', 'Direct media uploads require Pro.');

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new ApiError(422, 'FILE_REQUIRED', 'Choose a video, photo, or GIF.');

    const isVideo = VIDEO_TYPES.has(file.type);
    const isImage = IMAGE_TYPES.has(file.type);
    if (!isVideo && !isImage) throw new ApiError(422, 'INVALID_FILE', 'Use MP4, WebM, MOV, JPG, PNG, WebP, or GIF.');
    if ((isVideo && file.size > MAX_VIDEO_BYTES) || (isImage && file.size > MAX_IMAGE_BYTES)) {
      throw new ApiError(422, 'FILE_TOO_LARGE', isVideo ? 'Videos must be no larger than 250 MB.' : 'Images must be no larger than 25 MB.');
    }

    const mediaType = isVideo ? 'video' : file.type === 'image/gif' ? 'gif' : 'image';
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const title = String(form.get('title') || file.name).trim().slice(0, 120);
    const category = String(form.get('category') || 'Personal Reference').trim().slice(0, 60);
    const tags = String(form.get('tags') || '').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 20);
    const isPrivate = String(form.get('isPrivate')) !== 'false';
    const boardId = String(form.get('boardId') || '').trim();

    const db = getFirestore();
    if (boardId) {
      const board = await db.collection('reference_boards').doc(boardId).get();
      if (!board.exists || board.data()?.ownerId !== identity.uid || Boolean(board.data()?.isPrivate) !== isPrivate) {
        throw new ApiError(403, 'BOARD_FORBIDDEN', 'Choose one of your matching boards.');
      }
    }

    const clipRef = db.collection('reference_clips').doc();
    let uploadedMediaUrl = '';
    let storagePath = '';
    let externalBunnyId: string | null = null;
    let thumbnailUrl = '';

    const { apiKey: bunnyApiKey, libraryId: bunnyLibraryId, host: bunnyHost } = bunnyStreamConfig();

    if (isVideo && bunnyApiKey && bunnyLibraryId) {
      // 🚀 Upload Video to Bunny Stream CDN for cheap storage & adaptive HLS playback
      const createRes = await fetch(`https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`, {
        method: 'POST',
        headers: { AccessKey: bunnyApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${title} (${clipRef.id})` }),
      });

      if (!createRes.ok) {
        throw new Error(`Failed to initialize video upload on Bunny Stream (${createRes.statusText})`);
      }

      const createData = await createRes.json();
      const bunnyGuid = String(createData.guid || '');
      if (!bunnyGuid) throw new Error('Bunny Stream did not return a video id.');
      externalBunnyId = bunnyGuid;

      // Upload binary video data to Bunny Stream
      const uploadRes = await fetch(`https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${externalBunnyId}`, {
        method: 'PUT',
        headers: { AccessKey: bunnyApiKey, 'Content-Type': 'application/octet-stream' },
        body: fileBuffer,
      });

      if (!uploadRes.ok) {
        throw new Error(`Failed to transfer video to Bunny Stream (${uploadRes.statusText})`);
      }

      const encoded = await waitForBunnyVideo(bunnyGuid);
      uploadedMediaUrl = bunnyMp4Url(bunnyGuid, encoded.availableResolutions);
      thumbnailUrl = `https://${bunnyHost}/${externalBunnyId}/thumbnail.jpg`;
      storagePath = `bunny/${bunnyLibraryId}/${externalBunnyId}`;
    } else {
      // Fallback: Firebase Storage for images and non-Bunny uploads
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      storagePath = `private-reference/${identity.uid}/${clipRef.id}/${cleanName}`;
      await getFirebaseStorage().bucket().file(storagePath).save(fileBuffer, {
        resumable: false,
        metadata: { contentType: file.type, cacheControl: 'private,max-age=300' },
      });
      uploadedMediaUrl = `/api/clips/${clipRef.id}/playback`;
    }

    const now = FieldValue.serverTimestamp();
    const discovery = await analyzeReferenceVisuals({
      title,
      tags,
      sourcePlatform: 'upload',
      imageBuffer: isImage ? fileBuffer : null,
    });
    await db.runTransaction(async (transaction) => {
      transaction.create(clipRef, {
        creatorId: identity.uid,
        creatorName: profile.displayName || profile.username || identity.name || 'Animator',
        creatorUsername: profile.username || null,
        creatorAvatar: profile.photoURL || null,
        sourceUrl: '',
        sourcePlatform: 'upload',
        storagePath,
        externalBunnyId,
        uploadedMediaUrl,
        thumbnailUrl: thumbnailUrl || null,
        mediaType,
        mimeType: file.type,
        startTime: 0,
        endTime: isVideo ? Math.max(0.05, Number(form.get('duration') || 10)) : 1,
        title,
        category,
        tags,
        ...discovery,
        isPrivate,
        // Direct uploads are personal references, never automatic Community posts.
        communityVisible: false,
        removedFromCreatorAt: null,
        primaryBoardId: boardId || null,
        saveCount: boardId ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      });

      if (boardId) {
        transaction.create(db.collection('reference_board_saves').doc(`${boardId}_${clipRef.id}`), {
          boardId,
          clipId: clipRef.id,
          ownerId: identity.uid,
          createdAt: now,
        });
        transaction.update(db.collection('reference_boards').doc(boardId), { clipCount: FieldValue.increment(1), updatedAt: now });
      }
    });

    return NextResponse.json({ id: clipRef.id, url: `/clip/${clipRef.id}`, uploadedMediaUrl }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
