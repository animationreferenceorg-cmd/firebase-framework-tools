import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, Record<string, unknown>>();
const sign = vi.fn(async () => ['https://storage.googleapis.com/bucket/shot.mp4?signature=test']);
vi.mock('@/lib/firebase-admin', () => ({
  getFirestore: () => ({ collection: (collection: string) => ({ doc: (id: string) => ({ get: async () => ({ exists: store.has(`${collection}/${id}`), data: () => store.get(`${collection}/${id}`) }) }) }) }),
  getFirebaseStorage: () => ({ bucket: () => ({ file: () => ({ getSignedUrl: sign }) }) }),
}));

async function request(kind: string, id: string) {
  const { GET } = await import('@/app/api/embed/[kind]/[id]/route');
  const response = await GET(new Request(`https://animationreference.org/api/embed/${kind}/${id}`), { params: Promise.resolve({ kind, id }) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
beforeEach(() => { store.clear(); sign.mockClear(); });

describe('public embed metadata', () => {
  it('serves public portfolio uploads without sign-in or a paid subscription', async () => {
    store.set('portfolio_items/a', { title: 'My reel', mediaUrl: 'https://cdn.test/reel.mp4', mediaType: 'video_file' });
    const response = await request('portfolio', 'a');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ title: 'My reel', url: 'https://cdn.test/reel.mp4' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it.each([{ isPrivate: true }, { isPublic: false }, { status: 'draft' }, { visibility: 'private' }, { visibility: 'unlisted' }])('does not expose hidden videos: %j', async privacy => {
    store.set('videos/a', { videoUrl: 'https://cdn.test/a.mp4', ...privacy });
    expect((await request('video', 'a')).status).toBe(404);
    expect(sign).not.toHaveBeenCalled();
  });

  it('honors takedowns and embedding disabled by the publisher', async () => {
    store.set('videos/a', { videoUrl: 'https://cdn.test/a.mp4', status: 'published' });
    store.set('takedowns/a', {});
    expect((await request('video', 'a')).status).toBe(404);
    store.delete('takedowns/a');
    store.set('videos/a', { videoUrl: 'https://cdn.test/a.mp4', embedEnabled: false });
    expect((await request('video', 'a')).status).toBe(403);
  });

  it('signs only the public upload path belonging to this clip', async () => {
    store.set('reference_clips/a', { creatorId: 'owner', isPrivate: false, storagePath: 'reference-uploads/owner/a/shot.mp4' });
    expect((await request('clip', 'a')).status).toBe(200);
    expect(sign).toHaveBeenCalledOnce();
    sign.mockClear();
    store.set('reference_clips/a', { creatorId: 'owner', isPrivate: false, storagePath: 'private-reference/other/secret.mp4' });
    expect((await request('clip', 'a')).status).toBe(404);
    expect(sign).not.toHaveBeenCalled();
  });

  it('rejects images, raw provider embeds, missing records and invalid IDs', async () => {
    store.set('portfolio_items/image', { mediaUrl: 'https://cdn.test/image.jpg', mediaType: 'image' });
    store.set('portfolio_items/youtube', { mediaUrl: 'https://www.youtube.com/watch?v=a' });
    expect((await request('portfolio', 'image')).status).toBe(422);
    expect((await request('portfolio', 'youtube')).status).toBe(422);
    expect((await request('video', 'missing')).status).toBe(404);
    expect((await request('invalid', 'a')).status).toBe(404);
    expect((await request('video', '../a')).status).toBe(404);
  });
});
