import { describe, expect, it } from 'vitest';
import { ARTSTATION_USERNAME, parseArtStationFeed, verificationCode } from '@/lib/artstation-import';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Jane Doe on ArtStation</title>
  <description>Animator at Studio &amp; Co · animref-ab12cd34</description>
  <link>https://www.artstation.com/janedoe</link>
  <item>
    <title>Sword Combo by janedoe</title>
    <description><![CDATA[<p>Three-hit combo.<br />Maya, 2026</p>]]></description>
    <content:encoded><![CDATA[<p>Three-hit combo.</p><p><a href="https://cdnb.artstation.com/p/a/large/combo.jpg?1"><img src="https://cdnb.artstation.com/p/a/large/combo.jpg?1" alt=""/></a></p>]]></content:encoded>
    <pubDate>Thu, 04 Sep 2025 12:46:07 -0500</pubDate>
    <link>https://www.artstation.com/artwork/XJ8wWD</link>
  </item>
  <item>
    <title>Evil image by janedoe</title>
    <content:encoded><![CDATA[<img src="https://evil.example.com/x.jpg">]]></content:encoded>
    <link>https://www.artstation.com/artwork/AB12cd</link>
  </item>
  <item>
    <title>Not an artwork</title>
    <link>https://www.artstation.com/janedoe/blog/1</link>
  </item>
</channel></rss>`;

describe('ArtStation import', () => {
  it('reads the headline and projects from the feed', () => {
    const feed = parseArtStationFeed(FEED, 'janedoe');
    expect(feed.headline).toBe('Animator at Studio & Co · animref-ab12cd34');
    expect(feed.items).toHaveLength(2);
    expect(feed.items[0]).toMatchObject({
      artworkId: 'XJ8wWD',
      title: 'Sword Combo',
      description: 'Three-hit combo.\nMaya, 2026',
      link: 'https://www.artstation.com/artwork/XJ8wWD',
      imageUrl: 'https://cdnb.artstation.com/p/a/large/combo.jpg?1',
    });
    expect(feed.items[0].publishedAt).toBe(Date.parse('Thu, 04 Sep 2025 12:46:07 -0500'));
  });

  it('only accepts images from the ArtStation CDN', () => {
    const feed = parseArtStationFeed(FEED, 'janedoe');
    expect(feed.items[1].imageUrl).toBeNull();
  });

  it('validates usernames and makes codes', () => {
    expect(ARTSTATION_USERNAME.test('jane_doe-1')).toBe(true);
    expect(ARTSTATION_USERNAME.test('../etc')).toBe(false);
    expect(ARTSTATION_USERNAME.test('a')).toBe(false);
    expect(verificationCode('AB12CD34EF')).toBe('animref-ab12cd34');
  });
});
