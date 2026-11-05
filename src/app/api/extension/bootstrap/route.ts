import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, extensionCors, getTrustedProfile, profileHasPro, requireFirebaseUser } from '@/lib/api-auth';
import { getFirestore } from '@/lib/firebase-admin';

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: extensionCors(request) });
}

interface BoardItemSummary {
  id: string;
  title: string;
  thumbnailUrl: string;
  mediaUrl: string;
  sourceUrl: string;
  isVideo: boolean;
}

export async function GET(request: NextRequest) {
  const headers = extensionCors(request);
  try {
    const identity = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(identity.uid);
    const db = getFirestore();
    const [boardsSnap, moodboardsSnap, clipsSnap] = await Promise.all([
      db.collection('reference_boards')
        .where('ownerId', '==', identity.uid)
        .limit(100)
        .get(),
      db.collection('users')
        .doc(identity.uid)
        .collection('moodboards')
        .limit(100)
        .get(),
      db.collection('reference_clips')
        .where('creatorId', '==', identity.uid)
        .limit(80)
        .get(),
    ]);

    const recentClips: (BoardItemSummary & { primaryBoardId?: string | null; createdAtSeconds: number })[] = clipsSnap.docs
      .map((doc) => {
        const d = doc.data();
        const thumb = d.thumbnailUrl || d.posterUrl || d.mediaUrl || d.videoUrl || '';
        const media = d.videoUrl || d.mediaUrl || d.thumbnailUrl || '';
        return {
          id: doc.id,
          title: d.title || 'Saved Reference',
          thumbnailUrl: typeof thumb === 'string' ? thumb : '',
          mediaUrl: typeof media === 'string' ? media : '',
          sourceUrl: d.sourceUrl || '',
          isVideo: d.mediaType === 'video' || Boolean(d.videoUrl),
          primaryBoardId: d.primaryBoardId || null,
          createdAtSeconds: d.createdAt?.seconds || 0,
        };
      })
      .filter((c) => Boolean(c.thumbnailUrl || c.mediaUrl))
      .sort((a, b) => b.createdAtSeconds - a.createdAtSeconds);

    const clipsByBoardId = new Map<string, BoardItemSummary[]>();
    for (const clip of recentClips) {
      if (clip.primaryBoardId) {
        const list = clipsByBoardId.get(clip.primaryBoardId) || [];
        list.push(clip);
        clipsByBoardId.set(clip.primaryBoardId, list);
      }
    }

    const moodboardMap = new Map<string, {
      id: string;
      title: string;
      isPrivate: boolean;
      thumbnails: string[];
      items: BoardItemSummary[];
      itemCount: number;
      updatedAtSeconds: number;
    }>();

    for (const doc of moodboardsSnap.docs) {
      const data = doc.data();
      const rawItems = (data.items || []) as any[];
      const parsedItems: BoardItemSummary[] = [];
      const seenItemIds = new Set<string>();

      for (const it of rawItems) {
        const vData = it.videoData || it.video || {};
        const itemId = String(vData.id || it.videoId || it.id || `item_${parsedItems.length}`);
        if (seenItemIds.has(itemId)) continue;
        seenItemIds.add(itemId);

        const thumb = it.imageUrl || vData.thumbnailUrl || vData.posterUrl || it.thumbnailUrl || '';
        const media = vData.videoUrl || it.videoUrl || thumb || '';
        if (!thumb && !media) continue;

        parsedItems.push({
          id: itemId,
          title: vData.title || it.title || it.text || 'Saved Reference',
          thumbnailUrl: thumb || media,
          mediaUrl: media || thumb,
          sourceUrl: vData.sourceUrl || it.sourceUrl || '',
          isVideo: it.type === 'video' || Boolean(vData.videoUrl && /\.(mp4|webm|mov|m3u8)/i.test(vData.videoUrl)),
        });
      }

      // Merge any clips linked via primaryBoardId
      for (const clip of clipsByBoardId.get(doc.id) || []) {
        if (!seenItemIds.has(clip.id)) {
          seenItemIds.add(clip.id);
          parsedItems.unshift(clip);
        }
      }

      const thumbnails = parsedItems
        .map((it) => it.thumbnailUrl)
        .filter((url): url is string => typeof url === 'string' && url.length > 0)
        .slice(0, 4);
      if (thumbnails.length === 0 && data.thumbnailUrl) {
        thumbnails.push(data.thumbnailUrl);
      }

      moodboardMap.set(doc.id, {
        id: doc.id,
        title: data.name || data.title || 'Untitled board',
        isPrivate: Boolean(data.isPrivate),
        thumbnails,
        items: parsedItems.slice(0, 40),
        itemCount: Math.max(parsedItems.length, Number(data.itemCount || 0)),
        updatedAtSeconds: data.updatedAt?.seconds || data.createdAt?.seconds || 0,
      });
    }

    for (const doc of boardsSnap.docs) {
      const data = doc.data();
      const existing = moodboardMap.get(doc.id);
      const boardClips = clipsByBoardId.get(doc.id) || [];

      if (existing) {
        if (existing.thumbnails.length === 0) {
          const fallbackThumbs = Array.isArray(data.coverUrls)
            ? data.coverUrls.slice(0, 4)
            : data.coverUrl
            ? [data.coverUrl]
            : data.thumbnailUrl
            ? [data.thumbnailUrl]
            : [];
          existing.thumbnails = fallbackThumbs;
        }
        existing.itemCount = Math.max(existing.itemCount, Number(data.clipCount || 0));
      } else {
        const thumbnails: string[] = [
          ...boardClips.map((c) => c.thumbnailUrl).filter(Boolean),
          ...(Array.isArray(data.coverUrls) ? data.coverUrls : []),
          ...(data.coverUrl ? [data.coverUrl] : []),
          ...(data.thumbnailUrl ? [data.thumbnailUrl] : []),
        ].slice(0, 4);

        moodboardMap.set(doc.id, {
          id: doc.id,
          title: data.title || 'Untitled board',
          isPrivate: Boolean(data.isPrivate),
          thumbnails: Array.from(new Set(thumbnails)).slice(0, 4),
          items: boardClips.slice(0, 40),
          itemCount: Math.max(boardClips.length, Number(data.clipCount || 0)),
          updatedAtSeconds: data.updatedAt?.seconds || data.createdAt?.seconds || 0,
        });
      }
    }

    const boards = Array.from(moodboardMap.values())
      .sort((a, b) => b.updatedAtSeconds - a.updatedAtSeconds)
      .map(({ updatedAtSeconds, ...board }) => board);

    // Combine all unique items across boards + recentClips for "All Boards"
    const seenAllIds = new Set<string>();
    const allSavedItems: BoardItemSummary[] = [];
    for (const clip of recentClips) {
      if (!seenAllIds.has(clip.id)) {
        seenAllIds.add(clip.id);
        allSavedItems.push(clip);
      }
    }
    for (const b of boards) {
      for (const it of b.items) {
        if (!seenAllIds.has(it.id)) {
          seenAllIds.add(it.id);
          allSavedItems.push(it);
        }
      }
    }

    return NextResponse.json({
      user: {
        uid: identity.uid,
        displayName: profile.displayName || profile.username || identity.name || 'Michael',
        username: profile.username || null,
        avatarUrl: profile.photoURL || null,
      },
      capabilities: { privateBoards: profileHasPro(profile), directUploads: profileHasPro(profile), shotBreakdowns: profileHasPro(profile) },
      boards,
      allSavedItems: allSavedItems.slice(0, 60),
      categories: ['Acting', 'Body Mechanics', 'Combat', 'Creature', 'Dance', 'Facial', 'Locomotion', 'Sports', 'Stunts'],
    }, { headers });
  } catch (error) {
    const response = apiErrorResponse(error);
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }
}
