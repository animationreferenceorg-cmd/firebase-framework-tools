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
  thumbnailUrl: z.string().optional().nullable().or(z.literal('')),
  sourceDescription: z.string().trim().max(5000).optional().nullable(),
  sourceAuthorName: z.string().trim().max(200).optional().nullable(),
  sourceAuthorUrl: z.string().max(2000).optional().nullable(),
  sourceAuthorAvatar: z.string().max(2000).optional().nullable(),
  mediaUrl: z.string().max(4000).optional().nullable(),
});

const CAPTURE_MEDIA_HOSTS = ['cdninstagram.com', 'fbcdn.net', 'googlevideo.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'byteoversea.com', 'twimg.com', 'vimeocdn.com', 'akamaized.net'];

function trustedCapturedMediaUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return undefined;
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
    const identity = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(identity.uid);
    
    const body = await request.json().catch(() => ({}));
    const parsed = clipSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Invalid clip parameters.';
      throw new ApiError(422, 'INVALID_CLIP', issue);
    }

    const input = parsed.data;
    const cleanBoardId = input.boardId && input.boardId.trim() !== '' ? input.boardId.trim() : null;
    const cleanThumbnail = input.thumbnailUrl && input.thumbnailUrl.trim() !== '' && input.thumbnailUrl.startsWith('http') ? input.thumbnailUrl.trim() : null;
    const cleanTags = [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0 && t.length < 50))];
    const cleanTitle = (input.title || 'Video Reference').trim().slice(0, 140);

    if (input.isPrivate && !profileHasPro(profile)) {
      throw new ApiError(403, 'PRO_REQUIRED', 'Private clips require Pro.');
    }

    const sourceUrl = normalizeHttpUrl(input.sourceUrl);
    const db = getFirestore();
    const clipRef = db.collection('reference_clips').doc();
    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    const idempotencyRef = idempotencyKey ? db.collection('clip_idempotency').doc(`${identity.uid}_${idempotencyKey}`) : null;

    let board = null;
    if (cleanBoardId) {
      const boardRef = db.collection('reference_boards').doc(cleanBoardId);
      const boardSnap = await boardRef.get();
      if (!boardSnap.exists || boardSnap.data()?.ownerId !== identity.uid) {
        throw new ApiError(403, 'BOARD_FORBIDDEN', 'Choose one of your own boards.');
      }
      board = { ref: boardRef, data: boardSnap.data()! };
      if (input.isPrivate !== Boolean(board.data.isPrivate)) {
        throw new ApiError(422, 'PRIVACY_MISMATCH', 'The clip privacy must match the destination board.');
      }
    }

    const now = FieldValue.serverTimestamp();
    const clip = {
      creatorId: identity.uid,
      creatorName: profile.displayName || profile.username || identity.name || 'Animator',
      creatorUsername: profile.username || null,
      creatorAvatar: profile.photoURL || identity.picture || null,
      sourceUrl,
      sourcePlatform: detectClipPlatform(sourceUrl),
      sourceDescription: input.sourceDescription || null,
      sourceAuthorName: input.sourceAuthorName || null,
      sourceAuthorUrl: input.sourceAuthorUrl || null,
      sourceAuthorAvatar: input.sourceAuthorAvatar || null,
      startTime: input.startTime || 0,
      endTime: input.endTime || 60,
      title: cleanTitle,
      category: input.category,
      tags: cleanTags,
      visualTags: deriveReferenceTags({ title: cleanTitle, description: input.sourceDescription, tags: cleanTags, sourcePlatform: detectClipPlatform(sourceUrl) }),
      palette: [],
      paletteBuckets: [],
      thumbnailUrl: cleanThumbnail,
      isPrivate: input.isPrivate,
      // Captures remain personal until an explicit Community publishing flow exists.
      communityVisible: false,
      removedFromCreatorAt: null,
      primaryBoardId: cleanBoardId,
      saveCount: cleanBoardId ? 1 : 0,
      createdAt: now,
      updatedAt: now,
      bunnySyncStatus: 'pending',
      captureStatus: 'queued',
      captureStage: 'Queued for capture',
      captureProgress: 5,
    };

    await db.runTransaction(async (transaction) => {
      if (idempotencyRef) {
        const prior = await transaction.get(idempotencyRef);
        if (prior.exists) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This clip was already saved.');
      }
      transaction.create(clipRef, clip);
      if (board) {
        const saveRef = db.collection('reference_board_saves').doc(`${board.ref.id}_${clipRef.id}`);
        transaction.create(saveRef, { boardId: board.ref.id, clipId: clipRef.id, ownerId: identity.uid, createdAt: now });
        transaction.update(board.ref, { clipCount: FieldValue.increment(1), updatedAt: now });
      }
      if (idempotencyRef) transaction.create(idempotencyRef, { uid: identity.uid, clipId: clipRef.id, createdAt: now });
    });

    after(async () => {
      try {
        const updateProgress = async (captureProgress: number, captureStage: string) => {
          await clipRef.update({ captureProgress, captureStage, captureStatus: 'processing', updatedAt: FieldValue.serverTimestamp() });
        };
        const downloaded = await downloadSocialVideo(sourceUrl, false, trustedCapturedMediaUrl(input.mediaUrl), updateProgress);
        const media = downloaded.success ? downloaded.video : null;
        if (!media?.videoUrl) throw new Error(downloaded.error || 'The source did not provide a downloadable public video.');
        const discovery = await analyzeReferenceVisuals({
          title: cleanTitle,
          description: input.sourceDescription,
          tags: cleanTags,
          sourcePlatform: detectClipPlatform(sourceUrl),
          imageUrl: media.thumbnailUrl || cleanThumbnail,
        });
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
          ...discovery,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (error: any) {
        await clipRef.update({
          bunnySyncStatus: 'failed',
          captureStatus: 'failed',
          captureStage: 'Capture failed',
          captureProgress: 100,
          syncError: error.message || 'Capture failed.',
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
