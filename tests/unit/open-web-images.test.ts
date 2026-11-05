import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchWebImages } from '@/lib/reference-web-images';

describe('Open Web & Pinterest Image Discovery', () => {
  beforeEach(() => {
    vi.stubEnv('SERPER_API_KEY', '');
    vi.stubEnv('BRAVE_SEARCH_API_KEY', '');
    vi.stubEnv('OPEN_IMAGE_SEARCH', 'true');
  });

  it('queries open web index when OPEN_IMAGE_SEARCH is true and parses high-res media hotlinks', async () => {
    const mockHtml = `
      <html>
        <body>
          <div m="{&quot;murl&quot;:&quot;https://i.pinimg.com/cat-design.jpg&quot;,&quot;turl&quot;:&quot;https://ts3.mm.bing.net/thumb.jpg&quot;,&quot;t&quot;:&quot;Cat Character Design Reference&quot;,&quot;purl&quot;:&quot;https://www.pinterest.com/pin/123456/&quot;,&quot;w&quot;:800,&quot;h&quot;:1200}"></div>
          <div m="{&quot;murl&quot;:&quot;https://cdnb.artstation.com/art.jpg&quot;,&quot;turl&quot;:&quot;https://ts3.mm.bing.net/art-thumb.jpg&quot;,&quot;t&quot;:&quot;ArtStation - Fantasy Cat turnaround&quot;,&quot;purl&quot;:&quot;https://www.artstation.com/artwork/999&quot;,&quot;w&quot;:1920,&quot;h&quot;:1080}"></div>
        </body>
      </html>
    `;

    const fetcher = vi.fn(async (_url: string) => new Response(mockHtml, { status: 200 }));
    vi.stubGlobal('fetch', fetcher);

    const res = await searchWebImages({
      query: 'cat character design',
      tab: 'character-design',
      type: 'all',
      explore: false,
    });

    expect(fetcher).toHaveBeenCalled();
    expect(res.items).toHaveLength(2);

    // Item 1: Pinterest Pin
    expect(res.items[0]).toMatchObject({
      title: 'Cat Character Design Reference',
      source: 'pinterest',
      sourceUrl: 'https://www.pinterest.com/pin/123456/',
      mediaUrl: 'https://i.pinimg.com/cat-design.jpg',
      thumbnailUrl: 'https://ts3.mm.bing.net/thumb.jpg',
      mediaType: 'image',
      width: 800,
      height: 1200,
    });

    // Item 2: ArtStation
    expect(res.items[1]).toMatchObject({
      title: 'ArtStation - Fantasy Cat turnaround',
      source: 'artstation',
      sourceUrl: 'https://www.artstation.com/artwork/999',
      mediaUrl: 'https://cdnb.artstation.com/art.jpg',
      width: 1920,
      height: 1080,
    });
  });

  it('filters by Pinterest when indexSource is pinterest', async () => {
    const mockHtml = `
      <div m="{&quot;murl&quot;:&quot;https://i.pinimg.com/cat.jpg&quot;,&quot;t&quot;:&quot;Cat Pin&quot;,&quot;purl&quot;:&quot;https://www.pinterest.com/pin/1/&quot;}"></div>
      <div m="{&quot;murl&quot;:&quot;https://other.com/cat.jpg&quot;,&quot;t&quot;:&quot;Other&quot;,&quot;purl&quot;:&quot;https://other.com/cat&quot;}"></div>
    `;

    vi.stubGlobal('fetch', vi.fn(async () => new Response(mockHtml, { status: 200 })));

    const res = await searchWebImages({
      query: 'cat',
      tab: 'character-design',
      type: 'all',
      explore: false,
      indexSource: 'pinterest',
    });

    expect(res.items).toHaveLength(1);
    expect(res.items[0].source).toBe('pinterest');
  });

  it('extracts Vimeo animation videos with embed player when indexSource is vimeo', async () => {
    const mockHtml = `
      <div m="{&quot;murl&quot;:&quot;https://i.vimeocdn.com/video/138731139.jpg&quot;,&quot;t&quot;:&quot;Cat walk-cycle animation on Vimeo&quot;,&quot;purl&quot;:&quot;https://vimeo.com/21555384&quot;}"></div>
    `;

    vi.stubGlobal('fetch', vi.fn(async () => new Response(mockHtml, { status: 200 })));

    const res = await searchWebImages({
      query: 'cat walk cycle',
      tab: 'animations',
      type: 'all',
      explore: false,
      indexSource: 'vimeo',
    });

    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({
      title: 'Cat walk-cycle animation',
      source: 'vimeo',
      sourceUrl: 'https://vimeo.com/21555384',
      mediaType: 'video',
      embedUrl: 'https://player.vimeo.com/video/21555384?autoplay=1',
    });
  });

  it('extracts Instagram artist studies and skips junk stock domains', async () => {
    const mockHtml = `
      <div m="{&quot;murl&quot;:&quot;https://lookaside.instagram.com/pic.jpg&quot;,&quot;t&quot;:&quot;Artist @drewtoon on Instagram: Cat sketches&quot;,&quot;purl&quot;:&quot;https://www.instagram.com/p/CvqaXo5/&quot;}"></div>
      <div m="{&quot;murl&quot;:&quot;https://img.freepik.com/cat.jpg&quot;,&quot;t&quot;:&quot;Cute cat vector&quot;,&quot;purl&quot;:&quot;https://www.freepik.com/cat&quot;}"></div>
    `;

    vi.stubGlobal('fetch', vi.fn(async () => new Response(mockHtml, { status: 200 })));

    const res = await searchWebImages({
      query: 'cat',
      tab: 'character-design',
      type: 'all',
      explore: false,
      indexSource: 'instagram',
    });

    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({
      source: 'instagram',
      sourceUrl: 'https://www.instagram.com/p/CvqaXo5/',
      authorName: '@drewtoon',
    });
  });
});
