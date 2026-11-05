import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/import/search/route';

async function search(params: Record<string, string> = {}) {
  const response = await GET(new NextRequest(`https://animationreference.org/api/import/search?${new URLSearchParams(params)}`));
  return { status: response.status, headers: response.headers, body: await response.json() };
}

beforeEach(() => {
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', '');
  vi.stubEnv('SERPER_API_KEY', '');
  vi.stubEnv('BRAVE_SEARCH_API_KEY', '');
});

describe('paginated provider discovery', () => {
  it('searches Pinterest directly through the configured index and forwards its page', async () => {
    vi.stubEnv('SERPER_API_KEY', 'test-key');
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.q).toContain('dragon site:pinterest.com/pin/');
      return Response.json({ images: Array.from({ length: body.page === 1 ? 24 : 1 }, (_, index) => ({
        title: 'Dragon', link: `https://www.pinterest.com/pin/${body.page}${index}/`, imageUrl: `https://i.pinimg.com/${body.page}-${index}.jpg`,
      })) });
    });
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'pinterest', q: 'dragon' });
    const second = await search({ source: 'pinterest', q: 'dragon', cursor: first.body.nextCursor });
    expect(first.body.results).toHaveLength(24);
    expect(first.body.results.every((item: any) => item.source === 'pinterest')).toBe(true);
    expect(first.body.providers[0]).not.toHaveProperty('limited');
    expect(second.body.results).toHaveLength(1);
    expect(second.body.hasMore).toBe(false);
    expect(JSON.parse(fetcher.mock.calls[1][1].body as string).page).toBe(2);
  });

  it('finds fallback Pinterest matches from later feeds immediately and tolerates a failed feed', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes('/characterdesign/')) return new Response('', { status: 503 });
      return new Response(url.includes('/characterdesignreferences/')
        ? '<rss><item><title>Dragon creature design</title><link>https://www.pinterest.com/pin/42/</link><description>&lt;img src=&quot;https://i.pinimg.com/dragon.jpg&quot;/&gt;</description></item></rss>' : '<rss/>');
    });
    vi.stubGlobal('fetch', fetcher);
    const page = await search({ source: 'pinterest', q: 'dragon' });
    expect(page.body.results.map((item: any) => item.id)).toEqual(['pin_42']);
    expect(page.body.providers[0]).toMatchObject({ status: 'ok', limited: true, partial: true });
    expect(page.body.hasMore).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it('keeps query-matched artwork with sparse metadata while filtering unrelated RSS pins', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('artstation.com')
      ? Response.json({ data: [{ id: 1, title: 'Study 07', url: 'https://www.artstation.com/artwork/study' }] })
      : new Response('<rss><item><title>Unrelated landscape</title><link>https://www.pinterest.com/pin/1/</link><description>&lt;img src=&quot;https://i.pinimg.com/image.jpg&quot;/&gt;</description></item></rss>')));
    expect((await search({ source: 'artstation', q: 'female robot turnaround' })).body.results).toHaveLength(1);
    expect((await search({ source: 'pinterest', q: 'female robot turnaround' })).body.results).toEqual([]);
  });

  it('reports an unconfigured image index without performing requests or advertising more pages', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const page = await search({ source: 'web-images', q: 'dragon' });
    expect(page.body.providers[0].status).toBe('unconfigured');
    expect(page.body.hasMore).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('pages Google image results, preserves platform identity, and keeps the key in server headers', async () => {
    vi.stubEnv('SERPER_API_KEY', 'private-test-key');
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.q).toContain('dragon');
      expect(body.q).toContain('site:artstation.com/artwork');
      return Response.json({ images: Array.from({ length: body.page === 1 ? 24 : 1 }, (_, i) => ({
        title: 'Study', link: i % 2 ? `https://www.pinterest.com/pin/${body.page}${i}/` : `https://www.artstation.com/artwork/${body.page}-${i}`,
        imageUrl: `https://images.test/${body.page}-${i}.jpg`, thumbnailUrl: 'https://images.test/thumb.jpg', imageWidth: 800, imageHeight: 1200,
      })) });
    });
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'web-images', q: 'dragon' });
    expect(first.body.results[0]).toMatchObject({ source: 'artstation', width: 800, height: 1200 });
    expect(first.body.results[1].source).toBe('pinterest');
    expect(JSON.stringify(first.body)).not.toContain('private-test-key');
    const second = await search({ source: 'web-images', q: 'dragon', cursor: first.body.nextCursor });
    expect(second.body.results).toHaveLength(1);
    expect(second.body.hasMore).toBe(false);
    expect(JSON.parse(fetcher.mock.calls[1][1].body as string).page).toBe(2);
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({ 'X-API-KEY': 'private-test-key' });
  });

  it('pages only the actual Brave image set and never invents an upstream offset', async () => {
    vi.stubEnv('BRAVE_SEARCH_API_KEY', 'brave-test-key');
    const fetcher = vi.fn(async (url: string) => {
      expect(new URL(url).searchParams.has('offset')).toBe(false);
      return Response.json({ results: Array.from({ length: 25 }, (_, i) => ({
        title: 'Artwork', url: `https://artist.test/work/${i}`, thumbnail: { src: 'https://images.test/thumb.jpg' },
        properties: { url: `https://images.test/${i}.jpg`, width: 900, height: 600 },
      })) });
    });
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'web-images', q: 'dragon' });
    const second = await search({ source: 'web-images', q: 'dragon', cursor: first.body.nextCursor });
    expect(first.body.results).toHaveLength(24);
    expect(second.body.results).toHaveLength(1);
    expect(second.body.hasMore).toBe(false);
    expect(first.body.results[0].id).not.toBe(second.body.results[0].id);
  });

  it('isolates image-index failures and rejects unsafe result links', async () => {
    vi.stubEnv('SERPER_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));
    const failed = await search({ source: 'web-images', q: 'dragon' });
    expect(failed.body.providers[0].status).toBe('unavailable');
    expect(failed.headers.get('cache-control')).toBe('no-store');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ images: [
      { link: 'javascript:alert(1)', imageUrl: 'https://images.test/a.jpg' },
      { link: 'https://artist.test/work', imageUrl: 'data:image/png;base64,AA' },
    ] })));
    expect((await search({ source: 'web-images', q: 'dragon' })).body.results).toEqual([]);
  });

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

  it('retains successful ArtStation results and retries only the failed expanded query', async () => {
    let firstPass = true;
    const fetcher = vi.fn(async (url: string) => {
      const params = new URL(url).searchParams;
      const query = params.get('query');
      if (query === 'environment concept art' && firstPass) return new Response('', { status: 503 });
      return Response.json({ total_count: 24, data: [{ id: query === 'environment concept art' ? 'recovered' : 'first', title: 'Artwork', url: `https://www.artstation.com/artwork/${query}` }] });
    });
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'artstation', tab: 'visdev' });
    expect(first.body.results.map((item: any) => item.id)).toEqual(['as_first']);
    expect(first.body.providers[0]).toMatchObject({ status: 'ok', partial: true });
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(first.body.hasMore).toBe(true);
    firstPass = false;
    const second = await search({ source: 'artstation', tab: 'visdev', cursor: first.body.nextCursor });
    expect(second.body.results.map((item: any) => item.id)).toEqual(['as_recovered']);
    expect(second.body.hasMore).toBe(false);
    expect(fetcher.mock.calls).toHaveLength(3);
    expect(new URL(fetcher.mock.calls[2][0]).searchParams.get('page')).toBe('1');
  });

  it('stops requesting an exhausted ArtStation query while another query continues', async () => {
    const fetcher = vi.fn(async (url: string) => {
      const params = new URL(url).searchParams;
      const query = params.get('query');
      const page = Number(params.get('page'));
      return Response.json({ total_count: query === 'visual development' ? 24 : 48, data: [{ id: `${query}-${page}`, title: 'Artwork', url: `https://www.artstation.com/artwork/${query}-${page}` }] });
    });
    vi.stubGlobal('fetch', fetcher);
    const first = await search({ source: 'artstation', tab: 'visdev' });
    const second = await search({ source: 'artstation', tab: 'visdev', cursor: first.body.nextCursor });
    expect(second.body.hasMore).toBe(false);
    expect(fetcher.mock.calls).toHaveLength(3);
    expect(new URL(fetcher.mock.calls[2][0]).searchParams.get('query')).toBe('environment concept art');
    expect(new URL(fetcher.mock.calls[2][0]).searchParams.get('page')).toBe('2');
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

  it('searches Wikimedia images for ordinary visual queries and preserves creator and license details', async () => {
    const fetcher = vi.fn(async (url: string) => { expect(url).toContain('commons.wikimedia.org'); return Response.json({ query: { pages: {
      a: { pageid: 10, title: 'File:Dragon.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/dragon.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Dragon.jpg', mime: 'image/jpeg', extmetadata: { Artist: { value: 'Artist' }, LicenseShortName: { value: 'CC BY 4.0' } } }] },
      b: { pageid: 11, title: 'File:Dragon.webm', imageinfo: [{ url: 'https://upload.wikimedia.org/dragon.webm', mime: 'video/webm' }] },
    } } }); });
    vi.stubGlobal('fetch', fetcher);
    const page = await search({ source: 'wikimedia', q: 'dragon', tab: 'visdev' });
    expect(page.body.results).toHaveLength(1);
    expect(page.body.results[0]).toMatchObject({ authorName: 'Artist', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dragon.jpg', description: expect.stringContaining('CC BY 4.0') });
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.get('gsrsearch')).toContain('dragon');
  });

  it('pages through Sakugabooru rather than requesting its first batch again', async () => {
    const fetcher = vi.fn(async (url: string) => {
      const params = new URL(url).searchParams;
      const page = Number(params.get('page'));
      return Response.json(Array.from({ length: page === 1 ? 24 : 1 }, (_, index) => ({ id: page * 100 + index, file_url: `https://www.sakugabooru.com/data/${page}-${index}.mp4` })));
    });
    vi.stubGlobal('fetch', fetcher);
    for (const source of ['sakugabooru']) {
      const first = await search({ source });
      const second = await search({ source, cursor: first.body.nextCursor });
      expect(first.body.hasMore).toBe(true);
      expect(second.body.hasMore).toBe(false);
      expect(second.body.results[0].id).not.toBe(first.body.results[0].id);
    }
  });
});
