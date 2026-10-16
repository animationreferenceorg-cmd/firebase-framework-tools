import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 1800; // 30 min cache

export interface ArtStationAsset {
  id: string | number;
  title: string;
  imageUrl: string;
  sourceUrl: string;
  authorName?: string;
  authorAvatar?: string;
  is3D?: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authorName = searchParams.get('author') || '';
  const title = searchParams.get('title') || '';
  const initialImage = searchParams.get('image') || '';
  const hashId = searchParams.get('hash') || '';

  const assets: ArtStationAsset[] = [];
  const seenIds = new Set<string | number>();

  // If initial image exists, add it as the primary asset
  if (initialImage) {
    assets.push({
      id: hashId || 'initial',
      title: title || 'Primary Project Asset',
      imageUrl: initialImage,
      sourceUrl: hashId ? `https://www.artstation.com/artwork/${hashId}` : 'https://www.artstation.com',
      authorName: authorName || 'ArtStation Artist',
    });
    if (hashId) seenIds.add(hashId);
  }

  // Fetch projects matching author name or title from ArtStation search API
  const queriesToRun: string[] = [];
  if (authorName && authorName !== 'ArtStation Artist') {
    queriesToRun.push(authorName);
  }
  if (title && title !== 'ArtStation Artwork') {
    // Clean title for broader search matching
    const cleanTitle = title.replace(/[^\w\s]/gi, ' ').split(' ').slice(0, 4).join(' ');
    if (cleanTitle) queriesToRun.push(cleanTitle);
  }

  if (queriesToRun.length === 0) {
    queriesToRun.push('character turnaround', 'visual development');
  }

  for (const q of queriesToRun.slice(0, 2)) {
    try {
      const res = await fetch(
        `https://www.artstation.com/api/v2/search/projects.json?query=${encodeURIComponent(q)}&page=1&per_page=12`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
          next: { revalidate: 1800 },
        }
      );

      if (res.ok) {
        const data = await res.json();
        for (const item of data.data || []) {
          if (!item.id || seenIds.has(item.id)) continue;
          const img = item.smaller_square_cover_url;
          if (!img) continue;

          seenIds.add(item.id);
          assets.push({
            id: item.id,
            title: item.title || 'Project Asset',
            imageUrl: img,
            sourceUrl: item.url || (item.hash_id ? `https://www.artstation.com/artwork/${item.hash_id}` : ''),
            authorName: item.user?.full_name || item.user?.username || authorName,
            authorAvatar: item.user?.medium_avatar_url || '',
            is3D: Boolean(item.icons?.model3d || item.icons?.marmoset),
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch ArtStation project assets:', err);
    }
  }

  return NextResponse.json({
    success: true,
    authorName,
    title,
    totalAssets: assets.length,
    assets,
  });
}
