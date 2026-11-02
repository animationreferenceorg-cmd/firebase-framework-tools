import { describe, expect, it } from 'vitest';
import { embedCode, embedUrl, isEmbeddableMediaUrl } from '@/lib/embed';

describe('unbranded embed links', () => {
  it('generates a stable player URL and muted autoplay options', () => {
    expect(embedUrl('https://animationreference.org', 'portfolio', 'a-b')).toBe('https://animationreference.org/embed/portfolio/a-b');
    const url = new URL(embedUrl('https://animationreference.org', 'clip', 'a/b', { autoplay: true, loop: true }));
    expect(url.pathname).toBe('/embed/clip/a%2Fb');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('muted')).toBe('1');
    expect(url.searchParams.get('loop')).toBe('1');
  });

  it('escapes user titles and URLs in copyable iframe HTML', () => {
    const code = embedCode('https://animationreference.org/embed/video/a?loop=1&muted=1', '"><script>alert(1)</script>');
    expect(code).toContain('&quot;&gt;&lt;script&gt;');
    expect(code).toContain('loop=1&amp;muted=1');
    expect(code).not.toContain('<script>');
    expect(code).toContain('allowfullscreen');
  });

  it('accepts native files and HLS while excluding external embeds and unsafe schemes', () => {
    expect(isEmbeddableMediaUrl('https://cdn.test/playlist.m3u8?token=abc')).toBe(true);
    expect(isEmbeddableMediaUrl('https://firebasestorage.googleapis.com/v0/b/bucket/o/portfolio%2Fshot.mp4?alt=media')).toBe(true);
    expect(isEmbeddableMediaUrl('https://www.youtube.com/watch?v=abc')).toBe(false);
    expect(isEmbeddableMediaUrl('javascript:alert(1).mp4')).toBe(false);
    expect(isEmbeddableMediaUrl('blob:video.mp4')).toBe(false);
  });
});
