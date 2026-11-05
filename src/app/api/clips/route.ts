import { persistExternalMediaToStorage, isExternalExpiringUrl } from '@/lib/server-media-persist';
import { after, NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { ApiError, apiErrorResponse, extensionCors, getTrustedProfile, profileHasPro, requireFirebaseUser } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';
import { detectClipPlatform, normalizeHttpUrl } from '@/lib/reference-utils';
import { downloadSocialVideo } from '@/app/actions/downloader';
import { analyzeReferenceVisuals, deriveReferenceTags } from '@/lib/reference-discovery';

export const runtime = 'nodejs';
export const maxDuration = 300;

const clipSchema = z.object({
  sourceUrl: z.string().url().max(2000),
  startTime: z.number().finite().min(0).default(0),
  endTime: z.number().finite().positive().default(60),
  title: z.string().trim().min(1).max(5000).default('Video Reference'),
  category: z.string().trim().min(1).max(100).default('Acting'),
  tags: z.array(z.string().trim()).max(50).default([]),
  boardId: z.string().trim().max(128).optional().nullable().or(z.literal('')),
  isPrivate: z.boolean().default(false),
  thumbnailUrl: z.string().max(500000).optional().nullable().or(z.literal('')),
  sourceDescription: z.string().trim().max(5000).optional().nullable(),
  sourceAuthorName: z.string().trim().max(200).optional().nullable(),
  sourceAuthorUrl: z.string().max(2000).optional().nullable(),
  sourceAuthorAvatar: z.string().max(2000).optional().nullable(),
  mediaUrl: z.string().max(500000).optional().nullable(),
  mediaType: z.enum(['video', 'image', 'gif', 'model3d']).optional(),
});

const CAPTURE_MEDIA_HOSTS = [
  'cdninstagram.com',
  'fbcdn.net',
  'googlevideo.com',
  'tiktokcdn.com',
  'tiktokcdn-us.com',
  'byteoversea.com',
  'twimg.com',
  'vimeocdn.com',
  'akamaized.net',
  'pinimg.com',
  'artstation.com',
  'cdna.artstation.com',
  'sakugabooru.com',
  'sketchfab.com',
  'giphy.com',
  'media.giphy.com',
  'tenor.com',
  'unsplash.com',
  'images.unsplash.com',
  'pexels.com',
  'images.pexels.com',
];

function trustedCapturedMediaUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
    const host = parsed.hostname.toLowerCase();
    return CAPTURE_MEDIA_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? parsed.toString() : undefined;
  } catch { return undefined; }
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: extensionCors(request) });
}

export async function GET(request: NextRequest) {
  const headers = extensionCors(request);
  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 100);
    const snapshot = await getFirestore().collection('reference_clips').where('isPrivate', '==', false).limit(limit).get();
    let clips = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (clips.length === 0) {
      const fallbackSnap = await getFirestore().collection('reference_clips').limit(limit).get();
      clips = fallbackSnap.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .filter((c: any) => !c.isPrivate);
    }
    return NextResponse.json({ clips }, { headers });
  } catch (error) {
    const response = apiErrorResponse(error);
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }
}

export async function POST(request: NextRequest) {
  const headers = extensionCors(request);
  try {
    const [identity, body] = await Promise.all([
      requireFirebaseUser(request),
      request.json().catch(() => ({})),
    ]);
    const parsed = clipSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Invalid clip parameters.';
      throw new ApiError(422, 'INVALID_CLIP', issue);
    }

    const input = parsed.data;
    const cleanBoardId = input.boardId && input.boardId.trim() !== '' ? input.boardId.trim() : null;
    const cleanThumbnail = input.thumbnailUrl && input.thumbnailUrl.trim() !== '' && (input.thumbnailUrl.startsWith('http') || input.thumbnailUrl.startsWith('data:image/')) ? input.thumbnailUrl.trim() : null;
    const cleanTags = [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0 && t.length < 50))];
    const cleanTitle = (input.title || 'Video Reference').trim().slice(0, 140);

    const sourceUrl = normalizeHttpUrl(input.sourceUrl);
    const db = getFirestore();
    const clipRef = db.collection('reference_clips').doc();
    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    const idempotencyRef = idempotencyKey ? db.collection('clip_idempotency').doc(`${identity.uid}_${idempotencyKey}`) : null;
    const boardRef = cleanBoardId ? db.collection('reference_boards').doc(cleanBoardId) : null;
    const mbRef = cleanBoardId ? db.collection('users').doc(identity.uid).collection('moodboards').doc(cleanBoardId) : null;

    // Single parallel read batch for profile + board(s) + idempotency
    const [profile, boardSnap, mbSnap, priorIdem] = await Promise.all([
      getTrustedProfile(identity.uid),
      boardRef ? boardRef.get() : Promise.resolve(null),
      mbRef ? mbRef.get() : Promise.resolve(null),
      idempotencyRef ? idempotencyRef.get() : Promise.resolve(null),
    ]);

    if (priorIdem?.exists) {
      throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This clip was already saved.');
    }
    if (input.isPrivate && !profileHasPro(profile)) {
      throw new ApiError(403, 'PRIVATE_REQUIRES_PRO', 'Private clips are a Pro feature. Free saves are shared with the community.');
    }

    let refBoardDoc: { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData } | null = null;
    let moodboardDoc: { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData } | null = null;
    if (cleanBoardId) {
      if (boardSnap?.exists && boardSnap.data()?.ownerId === identity.uid) {
        refBoardDoc = { ref: boardRef!, data: boardSnap.data()! };
      }
      if (mbSnap?.exists) {
        moodboardDoc = { ref: mbRef!, data: mbSnap.data()! };
      }
      if (!refBoardDoc && !moodboardDoc) {
        throw new ApiError(403, 'BOARD_FORBIDDEN', 'Choose one of your own boards.');
      }
    }

    const platform = detectClipPlatform(sourceUrl);
    const inferredMediaType = input.mediaType || 
      (['pinterest', 'artstation', 'unsplash'].includes(platform) ? 'image' : 
       platform === 'giphy' ? 'gif' : 
       platform === 'sketchfab' ? 'model3d' : 'video');

    const immediateThumb = cleanThumbnail || (inferredMediaType !== 'video' && input.mediaUrl ? input.mediaUrl : null);
    const immediateMedia = input.mediaUrl || cleanThumbnail || sourceUrl;

    const now = FieldValue.serverTimestamp();
    const clip = {
      creatorId: identity.uid,
      creatorName: profile.displayName || profile.username || identity.name || 'Animator',
      creatorUsername: profile.username || null,
      creatorAvatar: profile.photoURL || identity.picture || null,
      sourceUrl,
      sourcePlatform: platform,
      mediaType: inferredMediaType,
      uploadedMediaUrl: immediateMedia,
      sourceDescription: input.sourceDescription || null,
      sourceAuthorName: input.sourceAuthorName || null,
      sourceAuthorUrl: input.sourceAuthorUrl || null,
      sourceAuthorAvatar: input.sourceAuthorAvatar || null,
      startTime: input.startTime || 0,
      endTime: input.endTime || 60,
      title: cleanTitle,
      category: input.category,
      tags: cleanTags,
      visualTags: deriveReferenceTags({ title: cleanTitle, description: input.sourceDescription, tags: cleanTags, sourcePlatform: platform }),
      palette: [],
      paletteBuckets: [],
      thumbnailUrl: immediateThumb,
      isPrivate: input.isPrivate,
      communityVisible: false,
      removedFromCreatorAt: null,
      primaryBoardId: cleanBoardId,
      saveCount: cleanBoardId ? 1 : 0,
      createdAt: now,
      updatedAt: now,
      bunnySyncStatus: inferredMediaType === 'video' ? 'pending' : 'ready',
      captureStatus: inferredMediaType === 'video' ? 'queued' : 'ready',
      captureStage: inferredMediaType === 'video' ? 'Queued for capture' : 'Reference ready',
      captureProgress: inferredMediaType === 'video' ? 5 : 100,
    };

    // Single fast WriteBatch (no multi-roundtrip transaction lock)
    const batch = db.batch();
    batch.create(clipRef, clip);

    // Also add to users/{uid}/moodboard_references so "All Saves" on /moodboard shows it immediately
    const mbRefDoc = db.collection('users').doc(identity.uid).collection('moodboard_references').doc(clipRef.id);
    batch.set(mbRefDoc, {
      id: clipRef.id,
      title: cleanTitle,
      videoUrl: immediateMedia,
      thumbnailUrl: immediateThumb || immediateMedia,
      posterUrl: immediateThumb || immediateMedia,
      categories: [input.category || 'Reference'],
      category: input.category || 'Reference',
      tags: cleanTags,
      sourceUrl,
      sourcePlatform: platform,
      sourceAuthorName: input.sourceAuthorName || '',
      mediaType: inferredMediaType,
      createdAt: new Date(),
    }, { merge: true });

    if (moodboardDoc) {
      const mbData = moodboardDoc.data || {};
      const currentItems = (mbData.items || []) as any[];
      const thumb = immediateThumb || immediateMedia || '';
      const newItem = {
        id: `reference-${clipRef.id}-${Date.now()}`,
        type: inferredMediaType === 'video' ? 'video' : 'image',
        videoId: clipRef.id,
        videoData: {
          id: clipRef.id,
          title: cleanTitle,
          videoUrl: immediateMedia,
          thumbnailUrl: thumb,
          posterUrl: thumb,
          categories: [input.category || 'Reference'],
          tags: cleanTags,
          sourceUrl,
          sourceAuthorName: input.sourceAuthorName || '',
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
      batch.set(moodboardDoc.ref, mbUpdates, { merge: true });
    }
    if (refBoardDoc) {
      const saveRef = db.collection('reference_board_saves').doc(`${refBoardDoc.ref.id}_${clipRef.id}`);
      batch.set(saveRef, { boardId: refBoardDoc.ref.id, clipId: clipRef.id, ownerId: identity.uid, createdAt: now });
      const rbUpdates: Record<string, unknown> = { clipCount: FieldValue.increment(1), updatedAt: now };
      const thumb = immediateThumb || immediateMedia || '';
      if (thumb && !refBoardDoc.data?.coverUrl) rbUpdates.coverUrl = thumb;
      batch.update(refBoardDoc.ref, rbUpdates);
    }
    if (idempotencyRef) {
      batch.set(idempotencyRef, { uid: identity.uid, clipId: clipRef.id, createdAt: now });
    }
    await batch.commit();

    after(async () => {
      try {
        if (inferredMediaType !== 'video') {
          const trustedUrl = trustedCapturedMediaUrl(input.mediaUrl);
          let mediaUrl = trustedUrl || input.mediaUrl || cleanThumbnail || '';
          let thumbUrl = cleanThumbnail || mediaUrl;

          // If from Instagram or has expiring tokens, persist to OUR storage
          if (platform === 'instagram' || isExternalExpiringUrl(mediaUrl) || isExternalExpiringUrl(thumbUrl)) {
            const target = mediaUrl || thumbUrl;
            if (target) {
              const persisted = await persistExternalMediaToStorage(target, 'clips', clipRef.id, {
                uploader: input.sourceAuthorName || undefined,
                title: cleanTitle,
              });
              if (persisted?.publicUrl) {
                mediaUrl = persisted.publicUrl;
                thumbUrl = persisted.publicUrl;
              }
            }
          }

          const discovery = await analyzeReferenceVisuals({
            title: cleanTitle,
            description: input.sourceDescription,
            tags: cleanTags,
            sourcePlatform: platform,
            imageUrl: thumbUrl || undefined,
          });
          await clipRef.update({
            uploadedMediaUrl: mediaUrl,
            thumbnailUrl: thumbUrl,
            mediaType: inferredMediaType,
            mimeType: inferredMediaType === 'gif' ? 'image/gif' : inferredMediaType === 'image' ? 'image/jpeg' : 'model3d/gltf',
            bunnySyncStatus: 'ready',
            captureStatus: 'ready',
            captureStage: 'Reference ready',
            captureProgress: 100,
            ...discovery,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return;
        }

        const updateProgress = async (captureProgress: number, captureStage: string) => {
          await clipRef.update({ captureProgress, captureStage, captureStatus: 'processing', updatedAt: FieldValue.serverTimestamp() });
        };
        const downloaded = await downloadSocialVideo(
          sourceUrl,
          false,
          trustedCapturedMediaUrl(input.mediaUrl),
          updateProgress,
          {
            authorName: input.sourceAuthorName || undefined,
            authorAvatar: input.sourceAuthorAvatar || undefined,
            title: cleanTitle,
            description: input.sourceDescription || undefined,
            tags: cleanTags,
            startTime: input.startTime > 0 ? input.startTime : undefined,
            endTime: input.endTime > 0 ? input.endTime : undefined,
          }
        );
        const media = downloaded.success ? downloaded.video : null;
        if (!media?.videoUrl) throw new Error(downloaded.error || 'The source did not provide a downloadable public video.');
        const discovery = await analyzeReferenceVisuals({
          title: cleanTitle,
          description: input.sourceDescription,
          tags: cleanTags,
          sourcePlatform: platform,
          imageUrl: media.thumbnailUrl || cleanThumbnail,
        });
        const uploaderName = input.sourceAuthorName || (media as any).uploader || 'Animator';
        const avatarUrl = input.sourceAuthorAvatar || (media as any).authorAvatar || null;

        await clipRef.update({
          uploadedMediaUrl: media.videoUrl,
          thumbnailUrl: media.thumbnailUrl || cleanThumbnail,
          storagePath: 'storagePath' in media ? media.storagePath || null : null,
          externalBunnyId: media.externalBunnyId || null,
          mediaType: 'video',
          mimeType: 'video/mp4',
          bunnySyncStatus: 'ready',
          captureStatus: 'ready',
          captureStage: 'Reference ready',
          captureProgress: 100,
          sourceAuthorName: uploaderName,
          sourceAuthorAvatar: avatarUrl,
          uploader: uploaderName,
          authorAvatar: avatarUrl,
          ...discovery,
          updatedAt: FieldValue.serverTimestamp(),
        });

        if (!input.isPrivate) {
          await db.collection('videos').doc(clipRef.id).set({
            id: clipRef.id,
            title: cleanTitle,
            description: input.sourceDescription || cleanTitle,
            videoUrl: media.videoUrl,
            thumbnailUrl: media.thumbnailUrl || cleanThumbnail,
            posterUrl: media.thumbnailUrl || cleanThumbnail,
            originalUrl: sourceUrl,
            sourceUrl,
            sourcePlatform: platform,
            uploader: uploaderName,
            authorAvatar: avatarUrl,
            tags: cleanTags,
            categoryIds: [input.category ? input.category.toLowerCase() : 'reference'],
            status: 'published',
            isPublic: true,
            type: 'social',
            saveCount: cleanBoardId ? 1 : 0,
            repinCount: cleanBoardId ? 1 : 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      } catch (error: any) {
        await clipRef.update({
          bunnySyncStatus: 'failed',
          captureStatus: 'failed',
          captureStage: 'Capture failed',
          captureProgress: 100,
          syncError: error?.message && !error.message.toLowerCase().includes('bunny')
            ? error.message
            : 'Capture failed. The source video could not be processed.',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return NextResponse.json({ id: clipRef.id, url: `/clip/${clipRef.id}`, captureStatus: 'queued' }, { status: 202, headers });
  } catch (error) {
    const response = apiErrorResponse(error);
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }
}
