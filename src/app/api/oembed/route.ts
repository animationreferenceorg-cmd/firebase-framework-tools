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

    // 4. Sakugabooru (2D Animation Database)
    if (host.endsWith('sakugabooru.com')) {
      const postMatch = targetUrl.match(/post\/show\/(\d+)/) || targetUrl.match(/tags=id:(\d+)/);
      if (postMatch) {
        const postId = postMatch[1];
        const res = await fetch(`https://www.sakugabooru.com/post.json?tags=id:${postId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          next: { revalidate: 3600 },
        }).catch(() => null);

        if (res && res.ok) {
          const list = await res.json().catch(() => []);
          if (Array.isArray(list) && list.length > 0) {
            const post = list[0];
            const tags = (post.tags || '').split(' ').filter(Boolean);
            const title = post.source ? `${post.source} — Cut #${post.id}` : `Sakugabooru Animation Cut #${post.id}`;
            return NextResponse.json({
              url: targetUrl,
              title,
              description: `Animator: ${post.author || 'Unknown'}. Source: ${post.source || 'Anime'}. Tags: ${tags.slice(0, 10).join(', ')}`,
              authorName: post.author || 'Sakugabooru Animator',
              authorUrl: `https://www.sakugabooru.com/post/show/${post.id}`,
              authorAvatar: '',
              providerName: 'Sakugabooru',
              thumbnailUrl: post.preview_url || post.file_url || '',
              mediaUrl: post.file_url || '',
              mediaType: (post.file_url || '').endsWith('.gif') ? 'gif' : 'video',
              tags: [...new Set(['sakugabooru', '2d', 'animation', ...tags])].slice(0, 20),
            });
          }
        }
      }
    }

    // 5. ArtStation (Portfolios, Turnarounds & 3D)
    if (host.endsWith('artstation.com')) {
      const projectMatch = targetUrl.match(/(?:artwork|projects)\/([a-zA-Z0-9_-]+)/);
      if (projectMatch) {
        const hash = projectMatch[1];
        const res = await fetch(`https://www.artstation.com/projects/${hash}.json`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
          next: { revalidate: 3600 },
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data) {
            const firstAsset = data.assets?.[0];
            const isVideo = Boolean(firstAsset?.has_embedded_player);
            const mediaUrl = isVideo ? (firstAsset?.player_embedded || firstAsset?.image_url) : (firstAsset?.image_url || data.cover_url);
            const cleanDesc = (data.description || '').replace(/<[^>]*>/g, '').trim();
            const tags = (data.tags || []).concat(['artstation', 'character-design', 'reference']);
            return NextResponse.json({
              url: targetUrl,
              title: data.title || 'ArtStation Artwork',
              description: cleanDesc || data.title || '',
              authorName: data.user?.full_name || data.user?.username || 'ArtStation Artist',
              authorUrl: data.user?.permalink || targetUrl,
              authorAvatar: data.user?.medium_avatar_url || '',
              providerName: 'ArtStation',
              thumbnailUrl: data.cover_url || firstAsset?.image_url || '',
              mediaUrl: mediaUrl || '',
              mediaType: isVideo ? 'video' : 'image',
              tags: [...new Set(tags)].slice(0, 15),
            });
          }
        }
      }
    }

    // 6. Pinterest Pins & Boards
    if (host.endsWith('pinterest.com') || host === 'pin.it') {
      const pinRes = await fetch(`https://www.pinterest.com/oembed.json?url=${encodeURIComponent(targetUrl)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 },
      }).catch(() => null);

      if (pinRes && pinRes.ok) {
        const pinData = await pinRes.json().catch(() => null);
        if (pinData) {
          const tags = extractHashtags(pinData.title || '').concat(['pinterest', 'reference', 'moodboard']);
          return NextResponse.json({
            url: targetUrl,
            title: pinData.title || 'Pinterest Reference Pin',
            description: pinData.title || '',
            authorName: pinData.author_name || 'Pinterest Creator',
            authorUrl: pinData.author_url || targetUrl,
            authorAvatar: '',
            providerName: 'Pinterest',
            thumbnailUrl: pinData.thumbnail_url || '',
            mediaUrl: pinData.thumbnail_url || '',
            mediaType: 'image',
            tags: [...new Set(tags)],
          });
        }
      }
    }

    // 7. Sketchfab (3D Turnarounds & Models)
    if (host.endsWith('sketchfab.com')) {
      const sketchRes = await fetch(`https://sketchfab.com/oembed?url=${encodeURIComponent(targetUrl)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 },
      }).catch(() => null);

      if (sketchRes && sketchRes.ok) {
        const data = await sketchRes.json().catch(() => null);
        if (data) {
          return NextResponse.json({
            url: targetUrl,
            title: data.title || 'Sketchfab 3D Model',
            description: `3D model reference by ${data.author_name || 'creator'} on Sketchfab`,
            authorName: data.author_name || 'Sketchfab Creator',
            authorUrl: data.author_url || targetUrl,
            authorAvatar: '',
            providerName: 'Sketchfab',
            thumbnailUrl: data.thumbnail_url || '',
            mediaUrl: data.thumbnail_url || '',
            mediaType: 'model3d',
            tags: ['sketchfab', '3d', 'model', 'turnaround', 'reference'],
          });
        }
      }
    }

    // 8. Giphy (Animation Smears & Micro-Timing Loops)
    if (host.endsWith('giphy.com')) {
      const giphyRes = await fetch(`https://giphy.com/services/oembed?url=${encodeURIComponent(targetUrl)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 },
      }).catch(() => null);

      if (giphyRes && giphyRes.ok) {
        const data = await giphyRes.json().catch(() => null);
        if (data) {
          return NextResponse.json({
            url: targetUrl,
            title: data.title || 'Giphy Animation Loop',
            description: data.title || 'Timing and motion loop',
            authorName: data.author_name || 'Giphy Creator',
            authorUrl: data.author_url || targetUrl,
            authorAvatar: '',
            providerName: 'Giphy',
            thumbnailUrl: data.url || '',
            mediaUrl: data.url || '',
            mediaType: 'gif',
            tags: ['giphy', 'gif', 'loop', 'timing', 'reference'],
          });
        }
      }
    }

    // 9. Internet Archive (archive.org)
    if (host.endsWith('archive.org')) {
      const match = targetUrl.match(/details\/([a-zA-Z0-9._-]+)/);
      if (match) {
        const id = match[1];
        const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          next: { revalidate: 3600 },
        }).catch(() => null);

        if (res && res.ok) {
          const meta = await res.json().catch(() => null);
          if (meta?.metadata) {
            const title = meta.metadata.title || `Internet Archive #${id}`;
            const cleanDesc = (meta.metadata.description || '').replace(/<[^>]*>/g, '').trim();
            const subject = Array.isArray(meta.metadata.subject) ? meta.metadata.subject : (meta.metadata.subject || '').split(';').map((s: string) => s.trim());
            return NextResponse.json({
              url: targetUrl,
              title,
              description: cleanDesc.slice(0, 300) || title,
              authorName: meta.metadata.creator || 'Internet Archive',
              authorUrl: targetUrl,
              authorAvatar: '',
              providerName: 'Internet Archive',
              thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(id)}`,
              mediaUrl: '',
              mediaType: 'video',
              tags: [...new Set(['archive', 'public-domain', 'reference', ...subject])].filter(Boolean).slice(0, 15),
            });
          }
        }
      }
    }

    // 10. Facebook Video / Reel Fallback
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

    // 11. Generic Web / Scraper Fallback
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
