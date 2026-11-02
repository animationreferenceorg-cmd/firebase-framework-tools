import { getFirebaseStorage, getFirestore } from '@/lib/firebase-admin';
import { ApiError, apiErrorResponse } from '@/lib/api-auth';
import { EMBED_KINDS, isEmbeddableMediaUrl, type EmbedKind } from '@/lib/embed';

const COLLECTIONS: Record<EmbedKind, string> = { video: 'videos', clip: 'reference_clips', portfolio: 'portfolio_items' };

/** Public metadata only. IDs are resolved on the server; an arbitrary source URL is never accepted. */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  try {
    const { kind, id } = await params;
    if (!EMBED_KINDS.includes(kind as EmbedKind) || !/^[\w-]{1,200}$/.test(id)) throw new ApiError(404, 'NOT_FOUND', 'This video is unavailable.');
    const db = getFirestore();
    const [snapshot, takedown] = await Promise.all([
      db.collection(COLLECTIONS[kind as EmbedKind]).doc(id).get(),
      db.collection('takedowns').doc(id).get(),
    ]);
    const media = snapshot.data();
    if (!snapshot.exists || !media || takedown.exists || media.isPrivate === true || media.isPublic === false || media.visibility === 'private' || media.visibility === 'unlisted' || media.status && media.status !== 'published') {
      throw new ApiError(404, 'NOT_FOUND', 'This video is unavailable or is not public.');
    }
    if (media.embedEnabled === false) throw new ApiError(403, 'EMBED_DISABLED', 'Embedding is disabled for this video.');
    let url = kind === 'clip' ? media.uploadedMediaUrl : kind === 'portfolio' ? media.mediaUrl : media.videoUrl;
    if (kind === 'clip' && media.storagePath && !String(media.storagePath).startsWith('bunny/')) {
      const path = String(media.storagePath);
      // A public record cannot turn a private Storage object into a public embed.
      if (!media.creatorId || !path.startsWith(`reference-uploads/${media.creatorId}/${id}/`) || path.split('/').some(part => part === '.' || part === '..')) {
        throw new ApiError(404, 'NOT_FOUND', 'This video is unavailable.');
      }
      [url] = await getFirebaseStorage().bucket().file(path).getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
    }
    if (!isEmbeddableMediaUrl(url) || ['image', 'gif', 'model3d'].includes(media.mediaType)) {
      throw new ApiError(422, 'NOT_EMBEDDABLE', 'This reference does not have an embeddable video file.');
    }
    return Response.json({
      title: String(media.title || 'Video'), url,
      poster: media.thumbnailUrl || media.posterUrl || '',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
