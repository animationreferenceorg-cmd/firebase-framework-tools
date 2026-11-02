import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/import/search/route';

async function search(params: Record<string, string> = {}) {
  const response = await GET(new NextRequest(`https://animationreference.org/api/import/search?${new URLSearchParams(params)}`));
  return { status: response.status, headers: response.headers, body: await response.json() };
}

beforeEach(() => { vi.stubEnv('PINTEREST_ACCESS_TOKEN', ''); });

describe('paginated provider discovery', () => {
  it('forwards Sketchfab cursors and carries real image dimensions', async () => {
    const fetcher = vi.fn(async (url: string) => {
      const cursor = new URL(url).searchParams.get('cursor');
      return Response.json({
        results: [{ uid: cursor ? 'second' : 'first', name: 'Dragon', thumbnails: { images: [{ width: 800, height: 500, url: 'https://images.test/model.jpg' }] } }],
        next: cursor ? null : 'https://api.sketchfab.com/v3/search?cursor=opaque%2Bcursor',
      });
    });
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'sketchfab', tab: '3d-models' });
    expect(first.body.results[0]).toMatchObject({ id: 'sf_first', width: 800, height: 500 });
    expect(first.body.hasMore).toBe(true);
    const second = await search({ source: 'sketchfab', tab: '3d-models', cursor: first.body.nextCursor });
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('cursor')).toBe('opaque+cursor');
    expect(second.body.results[0].id).toBe('sf_second');
    expect(second.body.nextCursor).toBeNull();
  });

  it('advances ArtStation pages and removes square-only cache paths', async () => {
    const fetcher = vi.fn(async (url: string) => {
      const page = Number(new URL(url).searchParams.get('page'));
      return Response.json({ total_count: 48, data: [{ id: page, title: 'Environment', url: `https://www.artstation.com/artwork/project${page}`, smaller_square_cover_url: 'https://cdna.artstation.com/p/assets/images/images/001/002/003/20221116065216/smaller_square/scene.jpg' }] });
    });
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'artstation', tab: 'visdev' });
    expect(first.body.results).toHaveLength(1); // same project returned by both expansion queries
    expect(first.body.results[0].thumbnailUrl).toContain('/003/small/scene.jpg');
    expect(first.body.results[0].mediaUrl).toContain('/003/large/scene.jpg');
    const second = await search({ source: 'artstation', tab: 'visdev', cursor: first.body.nextCursor });
    expect(fetcher.mock.calls.slice(2).every(([url]) => new URL(url).searchParams.get('page') === '2')).toBe(true);
    expect(second.body.results[0].id).toBe('as_2');
    expect(second.body.hasMore).toBe(false);
  });

  it('keeps a healthy provider pageable when another fails, without caching the failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('artstation')
      ? new Response('', { status: 503 })
      : Response.json({ results: [{ uid: 'a', name: 'Model' }], next: 'https://api.sketchfab.com/v3/search?cursor=next' })));
    const page = await search({ tab: '3d-models' });
    expect(page.body.results.map((item: any) => item.id)).toEqual(['sf_a']);
    expect(page.body.providers).toContainEqual(expect.objectContaining({ source: 'artstation', status: 'unavailable' }));
    expect(page.body.hasMore).toBe(true);
    expect(page.headers.get('cache-control')).toBe('no-store');
  });

  it('continues through an empty relevance page if the provider has more results', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ results: [], next: 'https://api.sketchfab.com/v3/search?cursor=next' })));
    const page = await search({ source: 'sketchfab', q: 'dragon' });
    expect(page.body.results).toEqual([]);
    expect(page.body.hasMore).toBe(true);
  });

  it('rejects invalid or cross-query cursors before making provider requests', async () => {
    const fetcher = vi.fn(async () => Response.json({ results: [], next: 'https://api.sketchfab.com/v3/search?cursor=next' }));
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'sketchfab', q: 'dragon' });
    expect((await search({ source: 'sketchfab', q: 'horse', cursor: first.body.nextCursor })).status).toBe(400);
    expect((await search({ source: 'sketchfab', cursor: 'bad' })).status).toBe(400);
    expect((await search({ source: 'unknown' })).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('walks finite Pinterest feed batches once rather than inventing endless pages', async () => {
    const fetcher = vi.fn(async (url: string) => {
      const feed = new URL(url).pathname.split('/')[1];
      const id = ['characterdesign', 'artreferences', 'animationart', 'posemuse', 'characterdesignreferences'].indexOf(feed) + 1;
      return new Response(`<rss><item><title>Pose ${id}</title><link>https://www.pinterest.com/pin/${id}/</link><description>&lt;img src=&quot;https://i.pinimg.com/236x/${id}.jpg&quot;/&gt;</description></item></rss>`);
    });
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'pinterest' });
    const second = await search({ source: 'pinterest', cursor: first.body.nextCursor });
    const third = await search({ source: 'pinterest', cursor: second.body.nextCursor });
    expect([...first.body.results, ...second.body.results, ...third.body.results]).toHaveLength(5);
    expect(third.body.hasMore).toBe(false);
    expect(new Set(fetcher.mock.calls.map(([url]) => url)).size).toBe(5);
    expect(first.body.providers[0].limited).toBe(true);
  });

  it('uses the configured Pinterest partner API and forwards bookmark pagination', async () => {
    vi.stubEnv('PINTEREST_ACCESS_TOKEN', 'test-token');
    const fetcher = vi.fn(async (url: string) => Response.json({
      items: [{ id: '123', title: 'Character design', media: { images: { '600x': { url: 'https://i.pinimg.com/image.jpg', width: 600, height: 900 } } } }],
      bookmark: new URL(url).searchParams.has('bookmark') ? null : 'next-bookmark',
    }));
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'pinterest', q: 'character design' });
    expect(first.body.results[0]).toMatchObject({ width: 600, height: 900 });
    await search({ source: 'pinterest', q: 'character design', cursor: first.body.nextCursor });
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('bookmark')).toBe('next-bookmark');
    expect(fetcher.mock.calls[0][0]).toContain('/search/partner/pins?');
  });

  it('forwards Wikimedia offsets and stops when the continuation ends', async () => {
    const fetcher = vi.fn(async (url: string) => {
      const offset = Number(new URL(url).searchParams.get('gsroffset'));
      return Response.json({ query: { pages: { a: { pageid: offset + 1, title: 'File:Study.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/study.jpg', mime: 'image/jpeg', width: 900, height: 600 }] } } }, ...(offset === 0 ? { continue: { gsroffset: 24 } } : {}) });
    });
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'wikimedia' });
    const second = await search({ source: 'wikimedia', cursor: first.body.nextCursor });
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('gsroffset')).toBe('24');
    expect(second.body.hasMore).toBe(false);
  });

  it('pages through Archive and Sakugabooru rather than requesting their first batch again', async () => {
    const fetcher = vi.fn(async (url: string) => {
      const params = new URL(url).searchParams;
      const page = Number(params.get('page'));
      return url.includes('archive.org')
        ? Response.json({ response: { numFound: 48, docs: [{ identifier: `film-${page}`, title: 'Film' }] } })
        : Response.json(Array.from({ length: page === 1 ? 24 : 1 }, (_, index) => ({ id: page * 100 + index, file_url: `https://www.sakugabooru.com/data/${page}-${index}.mp4` })));
    });
    vi.stubGlobal('fetch', fetcher);
    for (const source of ['archive', 'sakugabooru']) {
      const first = await search({ source });
      const second = await search({ source, cursor: first.body.nextCursor });
      expect(first.body.hasMore).toBe(true);
      expect(second.body.hasMore).toBe(false);
      expect(second.body.results[0].id).not.toBe(first.body.results[0].id);
    }
  });
});
