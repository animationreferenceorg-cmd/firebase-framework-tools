import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser, getTrustedProfile } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}

export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };

  try {
    const user = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(user.uid);
    const db = getFirestore();

    const savedIds: string[] = (profile.savedVideoIds || []).slice(0, 50);
    const likedIds: string[] = (profile.likedVideoIds || []).slice(0, 50);

    const fetchVideos = async (ids: string[]) => {
      const results = [];
      for (const id of ids) {
        try {
          const docSnap = await db.collection('videos').doc(id).get();
          if (docSnap.exists) {
            const d = docSnap.data();
            results.push({
              id: docSnap.id,
              title: d?.title || 'Reference Clip',
              videoUrl: d?.videoUrl || '',
              category: d?.category || 'General',
              fps: d?.fps || 24,
              thumbnailUrl: d?.thumbnailUrl || d?.previewUrl || '',
              tags: d?.tags || [],
            });
          }
        } catch {
          // ignore single doc fetch errors
        }
      }
      return results;
    };

    const [savedVideos, likedVideos] = await Promise.all([
      fetchVideos(savedIds),
      fetchVideos(likedIds),
    ]);

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: profile.displayName || profile.username || user.name || 'Animator',
      },
      savedVideos,
      likedVideos,
    }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Authentication required' },
      { status: 401, headers: corsHeaders }
    );
  }
}
