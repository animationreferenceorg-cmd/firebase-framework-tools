import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  try {
    const urlObj = new URL(targetUrl);
    const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');

    // 1. YouTube oEmbed
    if (host === 'youtu.be' || host.endsWith('youtube.com')) {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        const authorName = data.author_name || 'YouTube Creator';
        const ytId = extractYouTubeId(targetUrl);
        const tags = extractHashtags(data.title || '').concat(['youtube', 'reference']);
        return NextResponse.json({
          url: targetUrl,
          title: data.title || 'YouTube Video Reference',
          description: data.title || '',
          authorName,
          authorUrl: data.author_url || '',
          authorAvatar: `https://yt3.googleusercontent.com/${ytId}`,
          providerName: 'YouTube',
          thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
          tags: [...new Set(tags)],
        });
      }
    }

    // 2. Vimeo oEmbed
    if (host.endsWith('vimeo.com')) {
      const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(targetUrl)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        const authorName = data.author_name || 'Vimeo Creator';
        return NextResponse.json({
          url: targetUrl,
          title: data.title || 'Vimeo Video Reference',
          description: data.description || data.title || '',
          authorName,
          authorUrl: data.author_url || '',
          authorAvatar: '',
          providerName: 'Vimeo',
          thumbnailUrl: data.thumbnail_url || '',
          tags: ['vimeo', 'animation', 'reference'],
        });
      }
    }

    // 3. TikTok oEmbed
    if (host.endsWith('tiktok.com')) {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        const authorName = data.author_name || extractUsernameFromUrl(targetUrl) || 'TikTok Creator';
        const tags = extractHashtags(data.title || '').concat(['tiktok', 'animation']);
        return NextResponse.json({
          url: targetUrl,
          title: data.title || `TikTok Video by @${authorName}`,
          description: data.title || '',
          authorName,
          authorUrl: data.author_url || '',
          authorAvatar: '',
          providerName: 'TikTok',
          thumbnailUrl: data.thumbnail_url || '',
          tags: [...new Set(tags)],
        });
      }
    }

    // 4. Facebook Video / Reel Fallback
    if (host.endsWith('facebook.com') || host === 'fb.watch') {
      const authorName = extractUsernameFromUrl(targetUrl) || 'Facebook Creator';
      return NextResponse.json({
        url: targetUrl,
        title: `Facebook Video Reference (${authorName})`,
        description: 'Facebook video reference clip',
        authorName,
        authorUrl: targetUrl,
        authorAvatar: '',
        providerName: 'Facebook',
        thumbnailUrl: '',
        tags: ['facebook', 'animation', 'reference'],
      });
    }

    // 5. Instagram / Web scraper fallback
    const htmlRes = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(4500),
    });

    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                        html.match(/<title>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/<meta\s+property=["']twitter:creator["']\s+content=["']([^"']+)["']/i);
      const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

      const title = titleMatch ? decodeHTMLEntities(titleMatch[1]) : '';
      const description = descMatch ? decodeHTMLEntities(descMatch[1]) : title;
      const authorName = authorMatch ? decodeHTMLEntities(authorMatch[1]) : extractUsernameFromUrl(targetUrl) || host;
      const tags = extractHashtags(`${title} ${description}`).concat([host.replace('.com', ''), 'reference']);

      return NextResponse.json({
        url: targetUrl,
        title: title || `Reference Clip from ${host}`,
        description: description || title,
        authorName,
        authorUrl: targetUrl,
        authorAvatar: '',
        providerName: host,
        thumbnailUrl: imageMatch ? imageMatch[1] : '',
        tags: [...new Set(tags)],
      });
    }

    return NextResponse.json({
      url: targetUrl,
      title: `Reference Clip (${host})`,
      description: '',
      authorName: extractUsernameFromUrl(targetUrl) || host,
      authorAvatar: '',
      providerName: host,
      thumbnailUrl: '',
      tags: [host, 'reference'],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch metadata' }, { status: 500 });
  }
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : '';
}

function extractUsernameFromUrl(url: string): string {
  const instaMatch = url.match(/instagram\.com\/([^/?#]+)/i);
  if (instaMatch && !['p', 'reel', 'reels', 'stories'].includes(instaMatch[1])) return instaMatch[1];
  const tiktokMatch = url.match(/tiktok\.com\/@([^/?#]+)/i);
  if (tiktokMatch) return tiktokMatch[1];
  const fbMatch = url.match(/facebook\.com\/([^/?#]+)/i);
  if (fbMatch && !['watch', 'reel', 'reels', 'share'].includes(fbMatch[1])) return fbMatch[1];
  return '';
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#([\w\u0590-\u05ff]+)/g);
  if (!matches) return [];
  return matches.map((tag) => tag.replace('#', '').toLowerCase()).filter((t) => t.length > 1).slice(0, 10);
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
