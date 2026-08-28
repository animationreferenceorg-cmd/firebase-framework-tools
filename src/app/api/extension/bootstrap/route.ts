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
    const boardsSnap = await getFirestore().collection('users').doc(identity.uid).collection('moodboards').limit(100).get();
    const boards = boardsSnap.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().name || 'Untitled board',
      // Board organization is personal; reference privacy is chosen separately.
      isPrivate: false,
    }));
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
