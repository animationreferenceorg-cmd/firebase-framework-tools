import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { parseSourcePage } from '@/lib/source-page';

// The rules ship as a classic content script that also supports require().
const rules = createRequire(import.meta.url)('../../extension/save-rules.js');

function fakeElement(attributes: Record<string, string>, parent: unknown = null) {
  return {
    hasAttribute: (name: string) => name in attributes,
    parentElement: parent,
  };
}

describe('extension save rules', () => {
  it('skips our own site, localhost and webmail', () => {
    for (const host of ['animationreference.org', 'www.animationreference.org', 'localhost', 'mail.google.com', 'outlook.live.com', 'www.icloud.com']) {
      expect(rules.isHostExcluded(host)).toBe(true);
    }
    for (const host of ['www.youtube.com', 'sakugabooru.com', 'blog.example.com', 'animationreference.org.evil.com']) {
      expect(rules.isHostExcluded(host)).toBe(false);
    }
  });

  it('honours page-wide opt-outs, including Pinterest’s', () => {
    expect(rules.pageOptsOut([{ name: 'pinterest', content: 'nopin' }])).toBe(true);
    expect(rules.pageOptsOut([{ name: 'Pinterest', content: ' NoPin ' }])).toBe(true);
    expect(rules.pageOptsOut([{ name: 'animationreference', content: 'nosave' }])).toBe(true);
    expect(rules.pageOptsOut([{ name: 'pinterest', content: 'yes' }, { name: 'viewport', content: 'width=device-width' }])).toBe(false);
    expect(rules.pageOptsOut([])).toBe(false);
  });

  it('honours element opt-outs on the media or a nearby wrapper', () => {
    expect(rules.elementOptsOut(fakeElement({ nopin: '' }))).toBe(true);
    expect(rules.elementOptsOut(fakeElement({ 'data-pin-nopin': 'true' }))).toBe(true);
    const wrapped = fakeElement({}, fakeElement({}, fakeElement({ 'data-animref-nosave': '' })));
    expect(rules.elementOptsOut(wrapped)).toBe(true);
    expect(rules.elementOptsOut(fakeElement({ alt: 'x' }))).toBe(false);
    // Opt-outs far up the tree (beyond 6 levels) don't apply to deep media.
    let deep: unknown = fakeElement({ nopin: '' });
    for (let i = 0; i < 8; i += 1) deep = fakeElement({}, deep);
    expect(rules.elementOptsOut(deep)).toBe(false);
  });

  it('only offers saving for media big enough to study', () => {
    expect(rules.mediaKind({ tagName: 'IMG' })).toBe('image');
    expect(rules.mediaKind({ tagName: 'video' })).toBe('video');
    expect(rules.mediaKind({ tagName: 'DIV' })).toBeNull();
    expect(rules.meetsSize({ kind: 'image', renderedWidth: 400, renderedHeight: 300, naturalWidth: 800, naturalHeight: 600 })).toBe(true);
    // A big rendering of a tiny file (upscaled icon) doesn't qualify.
    expect(rules.meetsSize({ kind: 'image', renderedWidth: 400, renderedHeight: 300, naturalWidth: 128, naturalHeight: 128 })).toBe(false);
    expect(rules.meetsSize({ kind: 'image', renderedWidth: 150, renderedHeight: 150, naturalWidth: 800, naturalHeight: 800 })).toBe(false);
    // 16:9 video at 200px wide is the smallest that qualifies.
    expect(rules.meetsSize({ kind: 'video', renderedWidth: 200, renderedHeight: 112, naturalWidth: 0, naturalHeight: 0 })).toBe(true);
    expect(rules.meetsSize({ kind: 'video', renderedWidth: 199, renderedHeight: 112, naturalWidth: 0, naturalHeight: 0 })).toBe(false);
  });

  it('chooses how a save travels', () => {
    expect(rules.saveMode({ kind: 'image', mediaUrl: 'https://cdn.example.com/a.jpg', pageUrl: 'https://example.com/' })).toBe('file');
    expect(rules.saveMode({ kind: 'video', mediaUrl: 'https://cdn.example.com/a.mp4', pageUrl: 'https://example.com/' })).toBe('file');
    // Streamed players (blob:) on supported post pages save by link.
    expect(rules.saveMode({ kind: 'video', mediaUrl: 'blob:https://www.youtube.com/123', pageUrl: 'https://www.youtube.com/watch?v=abc' })).toBe('link');
    expect(rules.saveMode({ kind: 'video', mediaUrl: 'blob:https://example.com/123', pageUrl: 'https://example.com/clip' })).toBe('unsupported');
    expect(rules.saveMode({ kind: 'image', mediaUrl: 'data:image/png;base64,AAA', pageUrl: 'https://www.youtube.com/watch?v=abc' })).toBe('unsupported');
    expect(rules.linkSaveMode('https://www.instagram.com/p/abc/')).toBe('link');
    expect(rules.linkSaveMode('https://example.com/article')).toBe('unsupported');
  });

  it('suggests a readable title', () => {
    expect(rules.suggestedTitle({ alt: '  Sword   draw  ', pageTitle: 'Blog' })).toBe('Sword draw');
    expect(rules.suggestedTitle({ alt: 'IMG_2041.jpg', titleAttribute: 'Run cycle', pageTitle: 'Blog' })).toBe('Run cycle');
    expect(rules.suggestedTitle({ pageTitle: 'x'.repeat(300) })).toHaveLength(120);
    expect(rules.suggestedTitle({})).toBe('Saved reference');
  });

  it('resolves file types like the upload API', () => {
    expect(rules.resolveMediaType('image/jpeg; charset=binary', 'https://x/y')).toBe('image/jpeg');
    expect(rules.resolveMediaType('application/octet-stream', 'https://x/clip.webm?sig=1')).toBe('video/webm');
    expect(rules.resolveMediaType('image/avif', 'https://x/a.avif')).toBeNull();
    expect(rules.resolveMediaType('', 'not a url')).toBeNull();
    expect(rules.MAX_BYTES.image).toBe(25 * 1024 * 1024);
    expect(rules.MAX_BYTES.video).toBe(250 * 1024 * 1024);
  });
});

describe('parseSourcePage', () => {
  it('keeps http(s) pages, drops the fragment and tidies the title', () => {
    expect(parseSourcePage('https://www.example.com/post?id=1#comments', '  Run   cycle ')).toEqual({
      url: 'https://www.example.com/post?id=1', host: 'example.com', title: 'Run cycle',
    });
  });
  it('rejects other schemes, junk and oversized URLs', () => {
    expect(parseSourcePage('javascript:alert(1)', '')).toBeNull();
    expect(parseSourcePage('file:///C:/secret', '')).toBeNull();
    expect(parseSourcePage('not a url', '')).toBeNull();
    expect(parseSourcePage(`https://example.com/${'a'.repeat(2100)}`, '')).toBeNull();
    expect(parseSourcePage(null, null)).toBeNull();
  });
});
