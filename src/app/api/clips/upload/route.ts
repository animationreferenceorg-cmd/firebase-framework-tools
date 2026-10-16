import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, apiErrorResponse, getTrustedProfile, profileHasPro, requireFirebaseUser } from '@/lib/api-auth';
import { getFirebaseStorage, getFirestore } from '@/lib/firebase-admin';
import { bunnyStreamConfig } from '@/lib/bunny-stream';
import { analyzeReferenceVisuals } from '@/lib/reference-discovery';
import { challengeStatus, getChallenge } from '@/lib/challenges';
import { detectClipPlatform } from '@/lib/reference-utils';
import { parseSourcePage } from '@/lib/source-page';

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

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new ApiError(422, 'FILE_REQUIRED', 'Choose a video, photo, or GIF.');

    const isVideo = VIDEO_TYPES.has(file.type);
    const isImage = IMAGE_TYPES.has(file.type);
    if (!isVideo && !isImage) throw new ApiError(422, 'INVALID_FILE', 'Use MP4, WebM, MOV, JPG, PNG, WebP, or GIF.');
    if ((isVideo && file.size > MAX_VIDEO_BYTES) || (isImage && file.size > MAX_IMAGE_BYTES)) {
      throw new ApiError(422, 'FILE_TOO_LARGE', isVideo ? 'Videos must be no larger than 250 MB.' : 'Images must be no larger than 25 MB.');
    }

    const isPrivate = String(form.get('isPrivate')) === 'true';
    // Free uploads are public and feed the community library; private uploads are Pro.
    if (isPrivate && !profileHasPro(profile)) {
      throw new ApiError(403, 'PRIVATE_REQUIRES_PRO', 'Private uploads are a Pro feature. Free uploads are shared with the community.');
    }

    // Monthly challenge entry: must be public and the challenge must be running.
    const challengeSlug = String(form.get('challengeId') || '').trim();
    const challenge = challengeSlug ? getChallenge(challengeSlug) : null;
    if (challengeSlug && (!challenge || challengeStatus(challenge) !== 'active')) {
      throw new ApiError(422, 'CHALLENGE_CLOSED', 'That challenge is not open for entries.');
    }
    if (challenge && isPrivate) throw new ApiError(422, 'CHALLENGE_PUBLIC', 'Challenge entries must be public.');

    const mediaType = isVideo ? 'video' : file.type === 'image/gif' ? 'gif' : 'image';
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const title = String(form.get('title') || file.name).trim().slice(0, 120);
    const category = String(form.get('category') || 'Acting').trim().slice(0, 60);
    const tags = String(form.get('tags') || '').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 20);
    const boardId = String(form.get('boardId') || '').trim();
    // Saves from the browser extension carry the page they came from, so the
    // clip credits and links back to its source.
    const source = parseSourcePage(form.get('sourceUrl'), form.get('sourceTitle'));
    const authorName = String(form.get('authorName') || '').trim();
    const authorUrl = String(form.get('authorUrl') || '').trim();
    const authorAvatar = String(form.get('authorAvatar') || '').trim();

    const db = getFirestore();
    let boardDoc: { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData; isMoodboard: boolean } | null = null;
    if (boardId) {
      const board = await db.collection('reference_boards').doc(boardId).get();
      if (board.exists && board.data()?.ownerId === identity.uid) {
        if (Boolean(board.data()?.isPrivate) !== isPrivate) {
          throw new ApiError(403, 'BOARD_FORBIDDEN', 'Choose one of your matching boards.');
        }
        boardDoc = { ref: board.ref, data: board.data()!, isMoodboard: false };
      } else {
        const mb = await db.collection('users').doc(identity.uid).collection('moodboards').doc(boardId).get();
        if (mb.exists) {
          boardDoc = { ref: mb.ref, data: mb.data()!, isMoodboard: true };
        } else {
          throw new ApiError(403, 'BOARD_FORBIDDEN', 'Choose one of your matching boards.');
        }
      }
    }

    const clipRef = db.collection('reference_clips').doc();
    let uploadedMediaUrl = '';
    let storagePath = '';
    let externalBunnyId: string | null = null;
    let thumbnailUrl = '';

    const { apiKey: bunnyApiKey, libraryId: bunnyLibraryId, host: bunnyHost } = bunnyStreamConfig();

    let uploadedToBunny = false;
    if (isVideo && bunnyApiKey && bunnyLibraryId) {
      try {
        // Upload Video to Bunny Stream CDN
        const createRes = await fetch(`https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`, {
          method: 'POST',
          headers: { AccessKey: bunnyApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `${title} (${clipRef.id})` }),
        });

        if (createRes.ok) {
          const createData = await createRes.json();
          const bunnyGuid = String(createData.guid || '');
          if (bunnyGuid) {
            externalBunnyId = bunnyGuid;
            const uploadRes = await fetch(`https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${externalBunnyId}`, {
              method: 'PUT',
              headers: { AccessKey: bunnyApiKey, 'Content-Type': 'application/octet-stream' },
              body: fileBuffer,
            });

            if (uploadRes.ok) {
              uploadedMediaUrl = `https://${bunnyHost}/${externalBunnyId}/playlist.m3u8`;
              thumbnailUrl = `https://${bunnyHost}/${externalBunnyId}/thumbnail.jpg`;
              storagePath = `bunny/${bunnyLibraryId}/${externalBunnyId}`;
              uploadedToBunny = true;
            }
          }
        }
      } catch (bunnyErr: any) {
        console.warn('Bunny upload failed, falling back to Firebase Storage:', bunnyErr?.message);
      }
    }

    if (!uploadedToBunny) {
      // Fallback: Firebase Storage for videos, images, GIFs
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      storagePath = isPrivate
        ? `private-reference/${identity.uid}/${clipRef.id}/${cleanName}`
        : `reference-uploads/${identity.uid}/${clipRef.id}/${cleanName}`;
      const bucket = getFirebaseStorage().bucket();
      const fileRef = bucket.file(storagePath);
      const downloadToken = crypto.randomUUID();
      await fileRef.save(fileBuffer, {
        resumable: false,
        metadata: {
          contentType: file.type,
          cacheControl: isPrivate ? 'private,max-age=300' : 'public,max-age=31536000',
          metadata: { firebaseStorageDownloadTokens: downloadToken },
        },
      });
      if (!isPrivate) {
        const encoded = encodeURIComponent(storagePath);
        uploadedMediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${downloadToken}`;
        thumbnailUrl = isImage ? uploadedMediaUrl : '';
      } else {
        uploadedMediaUrl = `/api/clips/${clipRef.id}/playback`;
      }
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
        sourceUrl: source?.url ?? '',
        sourcePlatform: source ? detectClipPlatform(source.url) : 'upload',
        sourceAuthorName: authorName || (source ? source.host : null),
        sourceAuthorUrl: authorUrl || (source ? source.url : null),
        sourceAuthorAvatar: authorAvatar || null,
        sourceDescription: source?.title || null,
        uploader: authorName || (source ? `@${source.host}` : profile.displayName || 'Animator'),
        authorAvatar: authorAvatar || null,
        originalUrl: source?.url ?? '',
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
        communityVisible: !isPrivate,
        challengeId: challenge?.slug ?? null,
        removedFromCreatorAt: null,
        primaryBoardId: boardId || null,
        saveCount: boardId ? 1 : 0,
        captureStatus: 'ready',
        captureStage: 'Reference ready',
        captureProgress: 100,
        bunnySyncStatus: externalBunnyId ? 'ready' : null,
        createdAt: now,
        updatedAt: now,
      });

      if (!isPrivate && isVideo && uploadedMediaUrl) {
        transaction.set(db.collection('videos').doc(clipRef.id), {
          id: clipRef.id,
          title,
          description: source?.title || title,
          videoUrl: uploadedMediaUrl,
          thumbnailUrl: thumbnailUrl || uploadedMediaUrl,
          posterUrl: thumbnailUrl || uploadedMediaUrl,
          originalUrl: source?.url || '',
          sourceUrl: source?.url || '',
          sourcePlatform: source ? detectClipPlatform(source.url) : 'web',
          uploader: authorName || (source ? `@${source.host}` : profile.displayName || 'Animator'),
          authorAvatar: authorAvatar || null,
          tags,
          categoryIds: [category.toLowerCase()],
          status: 'published',
          isPublic: true,
          type: 'social',
          saveCount: boardId ? 1 : 0,
          repinCount: boardId ? 1 : 0,
          createdAt: now,
          updatedAt: now,
        }, { merge: true });
      }

      if (boardDoc) {
        if (boardDoc.isMoodboard) {
          const mbData = boardDoc.data || {};
          const currentItems = (mbData.items || []) as any[];
          const thumb = thumbnailUrl || uploadedMediaUrl || '';
          const newItem = {
            id: `reference-${clipRef.id}-${Date.now()}`,
            type: isVideo ? 'video' : 'image',
            videoId: clipRef.id,
            videoData: {
              id: clipRef.id,
              title,
              videoUrl: uploadedMediaUrl,
              thumbnailUrl: thumb,
              posterUrl: thumb,
              categories: [category],
              tags,
              sourceUrl: source?.url || '',
              sourceAuthorName: authorName || source?.host || '',
              uploader: authorName || (source ? `@${source.host}` : 'Animator'),
              authorAvatar: authorAvatar || null,
            },
            imageUrl: thumb,
            x: 120 + (currentItems.length % 4) * 300,
            y: 120 + Math.floor(currentItems.length / 4) * 200,
            width: 280,
            height: 160,
            zIndex: currentItems.length + 1,
          };
          const nextItems = [...currentItems, newItem];
          const mbUpdates: any = {
            items: nextItems,
            itemCount: nextItems.length,
            updatedAt: now,
          };
          if (thumb && !mbData.thumbnailUrl) mbUpdates.thumbnailUrl = thumb;
          transaction.set(boardDoc.ref, mbUpdates, { merge: true });
        } else {
          transaction.create(db.collection('reference_board_saves').doc(`${boardId}_${clipRef.id}`), {
            boardId,
            clipId: clipRef.id,
            ownerId: identity.uid,
            createdAt: now,
          });
          transaction.update(boardDoc.ref, { clipCount: FieldValue.increment(1), updatedAt: now });
        }
      }
    });

    return NextResponse.json({ id: clipRef.id, url: `/clip/${clipRef.id}`, uploadedMediaUrl }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
