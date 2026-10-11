import { NextRequest, NextResponse } from 'next/server';
import { requireFirebaseUser } from '@/lib/api-auth';
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
    const db = getFirestore();
    const uid = user.uid;

    const moodboards: Array<{
      id: string;
      name: string;
      thumbnailUrl: string;
      itemCount: number;
      items: Array<{
        id: string;
        title: string;
        videoUrl: string;
        thumbnailUrl: string;
        duration: number;
        category?: string;
      }>;
    }> = [];

    // 1. Fetch Canvas Moodboards (users/{uid}/moodboards)
    try {
      const mbSnaps = await db.collection('users').doc(uid).collection('moodboards').get();
      const missingVideoIds = new Set<string>();

      const parsedMbList: any[] = [];
      for (const docSnap of mbSnaps.docs) {
        const d = docSnap.data();
        const items = Array.isArray(d.items) ? d.items : [];
        parsedMbList.push({ id: docSnap.id, data: d, items });

        for (const item of items) {
          const vData = item.videoData || item.video;
          const vidId = vData?.id || item.videoId;
          if (vidId && (!vData || !vData.videoUrl)) {
            missingVideoIds.add(vidId);
          }
        }
      }

      // Batch-fetch any missing video documents
      const videoMap = new Map<string, any>();
      if (missingVideoIds.size > 0) {
        const idList = Array.from(missingVideoIds).slice(0, 80);
        try {
          const refs = idList.map((id) => db.collection('videos').doc(id));
          const snaps = await db.getAll(...refs);
          for (const s of snaps) {
            if (s.exists) {
              videoMap.set(s.id, s.data());
            }
          }
        } catch {
          // ignore batch fetch errors
        }
      }

      for (const mb of parsedMbList) {
        const d = mb.data;
        const validItems: any[] = [];

        for (const item of mb.items) {
          const vData = item.videoData || item.video;
          const vidId = vData?.id || item.videoId;
          const fetchedData = vidId ? videoMap.get(vidId) : null;

          const title =
            vData?.title ||
            fetchedData?.title ||
            item.title ||
            item.text ||
            'Reference Clip';

          const videoUrl =
            vData?.videoUrl ||
            fetchedData?.videoUrl ||
            item.videoUrl ||
            '';

          const thumb =
            vData?.thumbnailUrl ||
            vData?.posterUrl ||
            fetchedData?.thumbnailUrl ||
            fetchedData?.previewUrl ||
            item.imageUrl ||
            item.thumbnailUrl ||
            '';

          const duration = Number(vData?.duration || fetchedData?.duration || item.duration || 0);
          const category = vData?.category || fetchedData?.category || 'General';

          if (videoUrl || thumb || vidId) {
            validItems.push({
              id: vidId || item.id || `item_${validItems.length}`,
              title,
              videoUrl,
              thumbnailUrl: thumb,
              duration,
              category,
            });
          }
        }

        moodboards.push({
          id: mb.id,
          name: d.name || 'Untitled Moodboard',
          thumbnailUrl: d.thumbnailUrl || (validItems[0]?.thumbnailUrl || ''),
          itemCount: validItems.length || Number(d.itemCount || 0),
          items: validItems,
        });
      }
    } catch (err) {
      console.error('[API /user/moodboards] Error fetching users moodboards:', err);
    }

    // 2. Fetch Reference Boards (reference_boards where ownerId == uid)
    try {
      const refBoardSnaps = await db
        .collection('reference_boards')
        .where('ownerId', '==', uid)
        .limit(30)
        .get();

      for (const bSnap of refBoardSnaps.docs) {
        const bData = bSnap.data();
        const boardId = bSnap.id;

        // Fetch saved clips for this reference board
        const savesSnap = await db
          .collection('reference_board_saves')
          .where('boardId', '==', boardId)
          .limit(50)
          .get();

        const clipIds = savesSnap.docs.map((s) => s.data()?.clipId).filter(Boolean);
        const boardItems: any[] = [];

        if (clipIds.length > 0) {
          try {
            // First check reference_clips
            const clipRefs = clipIds.map((id) => db.collection('reference_clips').doc(id));
            const clipSnaps = await db.getAll(...clipRefs);
            const foundClipIds = new Set<string>();

            for (const cs of clipSnaps) {
              if (cs.exists) {
                const cd = cs.data();
                foundClipIds.add(cs.id);
                boardItems.push({
                  id: cs.id,
                  title: cd?.title || cd?.name || 'Reference Clip',
                  videoUrl: cd?.videoUrl || cd?.mediaUrl || '',
                  thumbnailUrl: cd?.thumbnailUrl || cd?.posterUrl || '',
                  duration: Number(cd?.duration || 0),
                  category: cd?.category || 'General',
                });
              }
            }

            // Fallback for any clipId that was in 'videos' collection
            const remainingIds = clipIds.filter((id) => !foundClipIds.has(id));
            if (remainingIds.length > 0) {
              const vRefs = remainingIds.map((id) => db.collection('videos').doc(id));
              const vSnaps = await db.getAll(...vRefs);
              for (const vs of vSnaps) {
                if (vs.exists) {
                  const vd = vs.data();
                  boardItems.push({
                    id: vs.id,
                    title: vd?.title || 'Reference Clip',
                    videoUrl: vd?.videoUrl || '',
                    thumbnailUrl: vd?.thumbnailUrl || vd?.previewUrl || '',
                    duration: Number(vd?.duration || 0),
                    category: vd?.category || 'General',
                  });
                }
              }
            }
          } catch {
            // ignore clip fetch errors
          }
        }

        moodboards.push({
          id: boardId,
          name: bData.title || 'Reference Board',
          thumbnailUrl: bData.coverUrl || (boardItems[0]?.thumbnailUrl || ''),
          itemCount: boardItems.length || Number(bData.clipCount || 0),
          items: boardItems,
        });
      }
    } catch (err) {
      console.error('[API /user/moodboards] Error fetching reference boards:', err);
    }

    return NextResponse.json(
      {
        user: { uid },
        moodboards,
      },
      {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Authentication required' },
      { status: 401, headers: corsHeaders }
    );
  }
}
