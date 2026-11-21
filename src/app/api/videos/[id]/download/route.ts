import type { NextRequest } from 'next/server';
import { ApiError, apiErrorResponse, getTrustedProfile, profileHasPro, requireFirebaseUser } from '@/lib/api-auth';
import { getFirebaseStorage, getFirestore } from '@/lib/firebase-admin';
import { resolveDownloadUrl } from '@/lib/download-url';

// Pro-only clean MP4 download. The player streams for free; this route is the
// one place that hands out a download link, and it re-checks Pro server-side
// from the Admin SDK profile rather than trusting anything the client sends.

function slugify(title: string) {
  return (title || 'reference').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/\s+/g, '-') || 'reference';
}

const FREE_PLUGIN_DAILY_IMPORTS = 15;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireFirebaseUser(request);
    const profile = await getTrustedProfile(identity.uid);
    const body = await request.json().catch(() => ({}));
    const client = typeof body?.client === 'string' ? body.client.toLowerCase() : '';
    const isFreeQuotaClient = client === 'blender' || client === 'maya' || client === 'moodboard';
    const isProOrAdmin = identity.admin === true || profileHasPro(profile);

    const db = getFirestore();
    const todayKey = new Date().toISOString().slice(0, 10);

    if (!isProOrAdmin) {
      if (!isFreeQuotaClient) {
        throw new ApiError(402, 'PRO_REQUIRED', 'Downloading reference MP4s is a Pro feature.');
      }
      // Allow free users 15 daily reference imports across 3D plugins and moodboards
      const userSnap = await db.collection('users').doc(identity.uid).get();
      const userData = userSnap.data() || {};
      const usedToday = userData.pluginImportsDate === todayKey ? Number(userData.pluginImportsToday || 0) : 0;
      if (usedToday >= FREE_PLUGIN_DAILY_IMPORTS) {
        throw new ApiError(
          402,
          'PRO_REQUIRED',
          `You've used all ${FREE_PLUGIN_DAILY_IMPORTS} free daily reference imports. Upgrade to Pro ($1 first month) for unlimited imports.`
        );
      }
      await db.collection('users').doc(identity.uid).set(
        { pluginImportsDate: todayKey, pluginImportsToday: usedToday + 1 },
        { merge: true }
      );
    }

    const { id } = await params;
    const [videoSnap, clipSnap] = await Promise.all([
      db.collection('videos').doc(id).get(),
      db.collection('reference_clips').doc(id).get(),
    ]);

    let url: string | null = null;
    let title = '';
    if (videoSnap.exists) {
      const video = videoSnap.data()!;
      if (video.status && video.status !== 'published') throw new ApiError(404, 'NOT_FOUND', 'Video not found.');
      title = video.title;
      url = await resolveDownloadUrl(video.videoUrl);
    } else if (clipSnap.exists) {
      const clip = clipSnap.data()!;
      if (clip.isPrivate && clip.creatorId !== identity.uid) throw new ApiError(403, 'FORBIDDEN', 'This clip is private.');
      title = clip.title;
      if (clip.storagePath && !String(clip.storagePath).startsWith('bunny/')) {
        [url] = await getFirebaseStorage().bucket().file(clip.storagePath).getSignedUrl({ action: 'read', expires: Date.now() + 5 * 60 * 1000 });
      } else {
        url = (await resolveDownloadUrl(clip.uploadedMediaUrl)) || (await resolveDownloadUrl(clip.sourceUrl));
      }
    } else {
      throw new ApiError(404, 'NOT_FOUND', 'Video not found.');
    }

    if (!url) throw new ApiError(422, 'NOT_DOWNLOADABLE', 'This reference is hosted externally and has no downloadable file.');
    return Response.json({ url, filename: `${slugify(title)}.mp4` });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
