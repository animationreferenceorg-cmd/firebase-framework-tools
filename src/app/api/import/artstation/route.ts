import type { NextRequest } from 'next/server';
import { randomBytes, randomUUID } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { ApiError, apiErrorResponse, getTrustedProfile, requireFirebaseUser } from '@/lib/api-auth';
import { getFirebaseStorage, getFirestore } from '@/lib/firebase-admin';
import { ARTSTATION_USERNAME, MAX_IMPORT_ITEMS, parseArtStationFeed, verificationCode } from '@/lib/artstation-import';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST { username, action: 'start' }  -> a code to put in the ArtStation headline
 * POST { username, action: 'import' } -> checks the code, then imports up to 30 projects
 */

const schema = z.object({
  username: z.string().trim().regex(ARTSTATION_USERNAME),
  action: z.enum(['start', 'import']),
});

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const CODE_TTL_MS = 60 * 60 * 1000;

async function fetchFeed(username: string): Promise<string> {
  const res = await fetch(`https://www.artstation.com/${encodeURIComponent(username)}.rss`, {
    headers: { 'User-Agent': 'AnimationReference/1.0 (+https://animationreference.org)', Accept: 'application/rss+xml' },
    cache: 'no-store',
  });
  if (res.status === 404) throw new ApiError(404, 'NOT_FOUND', 'No ArtStation account with that username.');
  if (!res.ok) throw new ApiError(502, 'ARTSTATION_UNAVAILABLE', 'ArtStation did not respond. Please try again in a minute.');
  return res.text();
}

async function copyImage(uid: string, artworkId: string, url: string): Promise<string | null> {
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null;
  const type = res.headers.get('content-type') || '';
  if (!/^image\/(jpeg|png|webp|gif)$/.test(type.split(';')[0])) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) return null;
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
  const path = `portfolio/${uid}/artstation/${artworkId}.${ext}`;
  const bucket = getFirebaseStorage().bucket();
  const token = randomUUID();
  await bucket.file(path).save(buffer, {
    resumable: false,
    metadata: { contentType: type, cacheControl: 'public,max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

export async function POST(request: NextRequest) {
  try {
    const identity = await requireFirebaseUser(request);
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(422, 'INVALID_USERNAME', 'Enter your ArtStation username (the part after artstation.com/).');
    const { username, action } = parsed.data;
    const db = getFirestore();
    const verifyRef = db.collection('import_verifications').doc(identity.uid);

    if (action === 'start') {
      const code = verificationCode(randomBytes(8).toString('hex'));
      await verifyRef.set({ provider: 'artstation', username: username.toLowerCase(), code, createdAt: Date.now() });
      return Response.json({ code });
    }

    const pending = (await verifyRef.get()).data();
    if (!pending || pending.username !== username.toLowerCase() || Date.now() - Number(pending.createdAt) > CODE_TTL_MS) {
      throw new ApiError(409, 'START_AGAIN', 'Start the import again to get a fresh code.');
    }

    const feed = parseArtStationFeed(await fetchFeed(username), username);
    if (!feed.headline.toLowerCase().includes(String(pending.code))) {
      throw new ApiError(403, 'CODE_NOT_FOUND', `We couldn't find ${pending.code} in your ArtStation headline yet. Save your profile on ArtStation, wait a minute, then try again.`);
    }

    const profile = await getTrustedProfile(identity.uid);
    const authorName = String(profile.displayName || profile.username || identity.name || 'Animator');
    const authorAvatar = profile.photoURL || identity.picture || null;

    let imported = 0;
    let skipped = 0;
    for (const item of feed.items.slice(0, MAX_IMPORT_ITEMS)) {
      const docRef = db.collection('portfolio_items').doc(`as_${identity.uid.slice(0, 12)}_${item.artworkId}`);
      if ((await docRef.get()).exists) { skipped++; continue; }
      const imageUrl = item.imageUrl ? await copyImage(identity.uid, item.artworkId, item.imageUrl) : null;
      if (!imageUrl) { skipped++; continue; }
      await docRef.set({
        userId: identity.uid,
        authorName,
        authorAvatar,
        title: item.title,
        description: [item.description, `Originally posted on ArtStation: ${item.link}`].filter(Boolean).join('\n\n'),
        type: 'portfolio',
        wipStage: 'completed',
        mediaType: 'image',
        mediaUrl: imageUrl,
        thumbnailUrl: imageUrl,
        tags: ['artstation'],
        software: [],
        isFeatured: false,
        sourceUrl: item.link,
        importedFrom: 'artstation',
        likesCount: 0,
        viewsCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        likedBy: [],
        createdAt: item.publishedAt ? new Date(item.publishedAt) : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      imported++;
    }

    await verifyRef.delete();
    await db.collection('users').doc(identity.uid).set({ artstationUsername: username }, { merge: true });
    return Response.json({ imported, skipped, total: feed.items.length });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
