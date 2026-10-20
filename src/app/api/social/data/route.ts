import type { NextRequest } from 'next/server';
import { apiErrorResponse, requireAdmin } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';

/** Private data used by the Social Manager. Keep publishing history out of client-readable Firestore. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const db = getFirestore();
    const [videos, posts] = await Promise.all([
      db.collection('videos').orderBy('createdAt', 'desc').limit(250).get(),
      db.collection('social_posts').orderBy('createdAt', 'desc').limit(15).get(),
    ]);

    return Response.json({
      videos: videos.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string })
        .filter((video) => video.status === 'published' || !video.status),
      logs: posts.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
