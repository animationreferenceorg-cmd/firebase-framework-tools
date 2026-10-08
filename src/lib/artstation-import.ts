/**
 * Import an artist's ArtStation projects into their portfolio, from the
 * public RSS feed (https://www.artstation.com/{username}.rss). The JSON API
 * is bot-protected; the feed gives each project's title, link, description
 * and cover image.
 *
 * Ownership: the importer must put a one-time code in their ArtStation
 * headline, which the feed exposes as the channel <description>.
 */

export const ARTSTATION_USERNAME = /^[A-Za-z0-9_-]{2,60}$/;
export const MAX_IMPORT_ITEMS = 30;

export interface ArtStationItem {
  artworkId: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string | null;
  publishedAt: number | null;
}

export interface ArtStationFeed {
  headline: string;
  items: ArtStationItem[];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

function stripCdata(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (m ? m[1] : s).trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? stripCdata(m[1]) : '';
}

function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/\n{3,}/g, '\n\n').trim();
}

export function parseArtStationFeed(xml: string, username: string): ArtStationFeed {
  const channel = xml.split('<item>')[0];
  const headline = htmlToText(tag(channel, 'description'));
  const items: ArtStationItem[] = [];
  const suffix = new RegExp(`\\s+by\\s+${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');

  for (const block of xml.split('<item>').slice(1)) {
    const link = decodeEntities(tag(block, 'link'));
    const idMatch = link.match(/artstation\.com\/artwork\/([A-Za-z0-9]+)/);
    if (!idMatch) continue;
    const content = tag(block, 'content:encoded') || tag(block, 'description');
    const img = content.match(/<img[^>]+src="([^"]+)"/i);
    const imageUrl = img && /^https:\/\/cdn[a-z]?\.artstation\.com\//.test(decodeEntities(img[1])) ? decodeEntities(img[1]) : null;
    const date = Date.parse(tag(block, 'pubDate'));
    items.push({
      artworkId: idMatch[1],
      title: decodeEntities(tag(block, 'title')).replace(suffix, '').trim().slice(0, 140) || 'Untitled',
      description: htmlToText(tag(block, 'description')).slice(0, 2000),
      link: `https://www.artstation.com/artwork/${idMatch[1]}`,
      imageUrl,
      publishedAt: Number.isNaN(date) ? null : date,
    });
  }
  return { headline, items };
}

/** A short code the artist pastes into their ArtStation headline. */
export function verificationCode(random: string): string {
  return `animref-${random.slice(0, 8).toLowerCase()}`;
}
