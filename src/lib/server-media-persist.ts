import { getFirebaseStorage } from './firebase-admin';
import { publicStorageUrl } from '@/app/actions/downloader';

const EXPIRING_HOSTS = [
  'cdninstagram.com',
  'fbcdn.net',
  'instagram.com',
  'scontent.cdninstagram.com',
  'lookaside.fbsbx.com',
];

/**
 * Checks whether a given URL is from Instagram or another service with expiring tokens.
 */
export function isExternalExpiringUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (EXPIRING_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) return true;
    if (parsed.searchParams.has('oe') || parsed.searchParams.has('oh')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Persists an external media asset (e.g. from Instagram, Pinterest, or web)
 * directly into our own Firebase Storage bucket so that when saved to boards,
 * it is permanently hosted on our infrastructure and never breaks.
 */
export async function persistExternalMediaToStorage(
  sourceUrl: string,
  folder: string,
  filenamePrefix: string,
  options?: { contentType?: string; uploader?: string; title?: string }
): Promise<{ publicUrl: string; storagePath: string }> {
  const fallbackProxyUrl = `/api/proxy/image?url=${encodeURIComponent(sourceUrl)}`;
  const defaultStoragePath = `references/${folder}/${filenamePrefix}.jpg`;

  try {
    const parsed = new URL(sourceUrl);
    const res = await fetch(sourceUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer: `${parsed.protocol}//${parsed.hostname}/`,
        Accept: 'image/avif,image/webp,image/apng,image/jpeg,image/png,video/mp4,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[MediaPersist] Failed to download media from ${parsed.hostname} (status ${res.status}), using proxy fallback.`);
      return { publicUrl: fallbackProxyUrl, storagePath: defaultStoragePath };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const upstreamContentType = res.headers.get('content-type') || options?.contentType || 'image/jpeg';
    
    const ext = upstreamContentType.includes('png')
      ? 'png'
      : upstreamContentType.includes('gif')
      ? 'gif'
      : upstreamContentType.includes('mp4')
      ? 'mp4'
      : upstreamContentType.includes('webp')
      ? 'webp'
      : 'jpg';

    const storagePath = `references/${folder}/${filenamePrefix}.${ext}`;

    const storage = getFirebaseStorage();
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      metadata: {
        contentType: upstreamContentType,
        cacheControl: 'public, max-age=31536000',
        metadata: {
          originalUrl: sourceUrl,
          uploader: options?.uploader || 'Instagram Creator',
          title: options?.title || 'Saved Reference',
          persistedAt: new Date().toISOString(),
        },
      },
    });

    await file.makePublic().catch(() => {});
    const publicUrl = await publicStorageUrl(bucket.name, storagePath);

    console.log(`[MediaPersist] Successfully saved external media to our storage: ${storagePath}`);
    return { publicUrl, storagePath };
  } catch (err: any) {
    console.warn(`[MediaPersist] Error persisting to Firebase Storage: ${err?.message}. Falling back to proxy.`);
    return { publicUrl: fallbackProxyUrl, storagePath: defaultStoragePath };
  }
}

