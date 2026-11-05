import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, extensionCors, getTrustedProfile, profileHasPro, requireFirebaseUser, ApiError } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';
import { slugifyReference } from '@/lib/reference-utils';
import { z } from 'zod';

export const runtime = 'nodejs';

const createBoardSchema = z.object({
  title: z.string().trim().min(1, 'Please enter a board name').max(100),
  isPrivate: z.boolean().default(false),
});

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: extensionCors(request) });
}

export async function POST(request: NextRequest) {
  const headers = extensionCors(request);
  try {
    const identity = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(identity.uid);
    const body = await request.json().catch(() => ({}));
    const parsed = createBoardSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, 'INVALID_BOARD', parsed.error.issues[0]?.message || 'Invalid board data.');
    }

    const { title, isPrivate } = parsed.data;
    const effectivePrivate = Boolean(isPrivate && profileHasPro(profile));
    const db = getFirestore();
    const docRef = db.collection('users').doc(identity.uid).collection('moodboards').doc();
    const refBoardRef = db.collection('reference_boards').doc(docRef.id);
    const now = new Date();

    const newMoodboard = {
      id: docRef.id,
      userId: identity.uid,
      name: title,
      title: title,
      isPrivate: effectivePrivate,
      items: [],
      itemCount: 0,
      thumbnailUrl: '',
      createdAt: now,
      updatedAt: now,
    };

    const newRefBoard = {
      ownerId: identity.uid,
      ownerName: profile.displayName || profile.username || identity.name || 'Animator',
      ownerUsername: profile.username || null,
      ownerAvatar: profile.photoURL || identity.picture || null,
      title,
      slug: slugifyReference(title),
      description: '',
      isPrivate: effectivePrivate,
      clipCount: 0,
      followerCount: 0,
      duplicatedFromId: null,
      createdAt: now,
      updatedAt: now,
    };

    await Promise.all([
      docRef.set(newMoodboard),
      refBoardRef.set(newRefBoard),
    ]);

    return NextResponse.json(
      {
        ok: true,
        board: {
          id: docRef.id,
          title,
          isPrivate: effectivePrivate,
          thumbnails: [],
        },
      },
      { headers }
    );
  } catch (error) {
    const response = apiErrorResponse(error);
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }
}
