/**
 * POST /api/videos/[id]/download — the only Pro gate enforced on the server.
 * Firebase Admin is an in-memory fake; the CDN probe is a stubbed fetch.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const store = new Map<string, Record<string, any>>();
const fakeDb = {
  collection: (name: string) => ({
    doc: (id: string) => ({
      async get() {
        const data = store.get(`${name}/${id}`);
        return { exists: data !== undefined, data: () => data };
      },
    }),
  }),
};
const tokens: Record<string, { uid: string; admin?: boolean }> = {
  'token-free': { uid: 'free' },
  'token-pro': { uid: 'pro' },
  'token-lapsed': { uid: 'lapsed' },
};
vi.mock('@/lib/firebase-admin', () => ({
  getFirestore: () => fakeDb,
  getAdminApp: () => ({}),
  getFirebaseAuth: () => ({
    verifyIdToken: async (t: string) => {
      if (!tokens[t]) throw new Error('bad token');
      return tokens[t];
    },
  }),
  getFirebaseStorage: () => ({
    bucket: () => ({ file: (p: string) => ({ getSignedUrl: async () => [`https://signed.test/${p}`] }) }),
  }),
}));

const HLS = 'https://vz-1.b-cdn.net/guid-1/playlist.m3u8';
const cdnFiles = new Set<string>();

function post(id: string, token?: string) {
  return new NextRequest(`https://animationreference.org/api/videos/${id}/download`, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}
async function call(id: string, token?: string) {
  const { POST } = await import('@/app/api/videos/[id]/download/route');
  const res = await POST(post(id, token), { params: Promise.resolve({ id }) });
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  store.clear();
  cdnFiles.clear();
  store.set('users/free', { role: 'user' });
  store.set('users/pro', { role: 'user', isPremium: true, tier: 'tier5', plan: 'pro_monthly', subscriptionStatus: 'active' });
  store.set('users/lapsed', { role: 'user', isPremium: true, tier: 'tier5', plan: 'pro_monthly', subscriptionStatus: 'canceled' });
  store.set('videos/v1', { title: 'Heavy Punch!', videoUrl: HLS });
  store.set('videos/embed', { title: 'YT', videoUrl: 'https://www.youtube.com/watch?v=x' });
  store.set('videos/draft', { title: 'Draft', videoUrl: HLS, status: 'draft' });
  store.set('reference_clips/priv', { title: 'NDA shot', creatorId: 'someone-else', isPrivate: true, storagePath: 'private-reference/x/a.mp4' });
  store.set('reference_clips/mine', { title: 'My clip', creatorId: 'pro', isPrivate: true, storagePath: 'private-reference/pro/a.mp4' });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: cdnFiles.has(url) })));
});

describe('POST /api/videos/[id]/download', () => {
  it('requires sign-in', async () => {
    expect((await call('v1')).status).toBe(401);
  });

  it('refuses free and lapsed accounts with 402 PRO_REQUIRED', async () => {
    expect(await call('v1', 'token-free')).toMatchObject({ status: 402, body: { error: 'PRO_REQUIRED' } });
    expect(await call('v1', 'token-lapsed')).toMatchObject({ status: 402, body: { error: 'PRO_REQUIRED' } });
  });

  it('gives Pro the best MP4 rendition that exists, with a clean filename', async () => {
    cdnFiles.add('https://vz-1.b-cdn.net/guid-1/play_480p.mp4');
    expect(await call('v1', 'token-pro')).toEqual({
      status: 200,
      body: { url: 'https://vz-1.b-cdn.net/guid-1/play_480p.mp4', filename: 'heavy-punch.mp4' },
    });
  });

  it('reports embeds and missing renditions as not downloadable', async () => {
    expect((await call('embed', 'token-pro')).body.error).toBe('NOT_DOWNLOADABLE');
    expect((await call('v1', 'token-pro')).body.error).toBe('NOT_DOWNLOADABLE'); // no renditions in cdnFiles
  });

  it('hides unpublished videos and other people’s private clips', async () => {
    expect((await call('draft', 'token-pro')).status).toBe(404);
    expect((await call('priv', 'token-pro')).status).toBe(403);
    expect((await call('nope', 'token-pro')).status).toBe(404);
  });

  it('serves a creator their own private clip through a short-lived signed URL', async () => {
    expect(await call('mine', 'token-pro')).toEqual({
      status: 200,
      body: { url: 'https://signed.test/private-reference/pro/a.mp4', filename: 'my-clip.mp4' },
    });
  });
});
