import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, extensionCors, getTrustedProfile, profileHasPro, requireFirebaseUser } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: extensionCors(request) });
}

export async function GET(request: NextRequest) {
  const headers = extensionCors(request);
  try {
    const identity = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(identity.uid);
    const db = getFirestore();
    const [boardsSnap, moodboardsSnap] = await Promise.all([
      db.collection('reference_boards')
        .where('ownerId', '==', identity.uid)
        .limit(100)
        .get(),
      db.collection('users')
        .doc(identity.uid)
        .collection('moodboards')
        .limit(100)
        .get(),
    ]);

    const refBoards = boardsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled board',
        isPrivate: Boolean(data.isPrivate),
        updatedAtSeconds: data.updatedAt?.seconds || data.createdAt?.seconds || 0,
      };
    });

    const moodboards = moodboardsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.name || data.title || 'Untitled board',
        isPrivate: Boolean(data.isPrivate),
        updatedAtSeconds: data.updatedAt?.seconds || data.createdAt?.seconds || 0,
      };
    });

    const seenIds = new Set<string>();
    const boards = [...refBoards, ...moodboards]
      .filter((b) => {
        if (seenIds.has(b.id)) return false;
        seenIds.add(b.id);
        return true;
      })
      .sort((a, b) => b.updatedAtSeconds - a.updatedAtSeconds)
      .map(({ updatedAtSeconds, ...board }) => board);
    return NextResponse.json({
      user: {
        uid: identity.uid,
        displayName: profile.displayName || profile.username || identity.name || 'Animator',
        username: profile.username || null,
        avatarUrl: profile.photoURL || null,
      },
      capabilities: { privateBoards: profileHasPro(profile), directUploads: profileHasPro(profile), shotBreakdowns: profileHasPro(profile) },
      boards,
      categories: ['Acting', 'Body Mechanics', 'Combat', 'Creature', 'Dance', 'Facial', 'Locomotion', 'Sports', 'Stunts'],
    }, { headers });
  } catch (error) {
    const response = apiErrorResponse(error);
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }
}
