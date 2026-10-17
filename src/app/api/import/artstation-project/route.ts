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
  authorUsername?: string;
  is3D?: boolean;
}

export interface ArtStationProjectResponse {
  success: boolean;
  title: string;
  description: string;
  authorName: string;
  authorUsername?: string;
  authorAvatar?: string;
  sourceUrl: string;
  hashId?: string;
  assets: ArtStationAsset[];
  moreFromArtist: ArtStationAsset[];
  totalAssets: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawAuthor = searchParams.get('author') || '';
  const rawUsername = searchParams.get('username') || searchParams.get('authorUsername') || '';
  const initialTitle = searchParams.get('title') || 'ArtStation Artwork';
  const initialImage = searchParams.get('image') || '';
  let hashId = searchParams.get('hash') || '';
  const sourceUrlParam = searchParams.get('sourceUrl') || searchParams.get('url') || '';

  // Attempt to extract hash from sourceUrl if not directly provided
  if (!hashId && sourceUrlParam) {
    const match = sourceUrlParam.match(/artstation\.com\/artwork\/([A-Za-z0-9]+)/i);
    if (match) hashId = match[1];
  }

  // Normalize username: remove leading @, sanitize
  let username = rawUsername.replace(/^@/, '').trim();

  // If username wasn't given, see if author looks like a single-word handle
  if (!username && rawAuthor && !rawAuthor.includes(' ') && rawAuthor.length >= 2) {
    username = rawAuthor;
  }

  let resolvedTitle = initialTitle;
  let resolvedDescription = '';
  let resolvedAuthor = rawAuthor || 'ArtStation Artist';
  let resolvedAvatar = searchParams.get('authorAvatar') || '';
  const projectAssets: ArtStationAsset[] = [];
  const moreFromArtist: ArtStationAsset[] = [];
  let foundInRss = false;

  // 1. Try fetching artist RSS feed to obtain the complete post with all original /large/ assets
  if (username) {
    try {
      const rssRes = await fetch(`https://www.artstation.com/${username}.rss`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        next: { revalidate: 1800 },
      });

      if (rssRes.ok) {
        const text = await rssRes.text();
        const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const itemXml of items) {
          const isTarget = hashId ? itemXml.includes(hashId) : false;

          const titleMatch =
            itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
            itemXml.match(/<title>(.*?)<\/title>/);
          const linkMatch =
            itemXml.match(/<link>(.*?)<\/link>/) ||
            itemXml.match(/<guid[^>]*>(.*?)<\/guid>/);
          const descMatch =
            itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
            itemXml.match(/<description>([\s\S]*?)<\/description>/);
          const encodedMatch =
            itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/) ||
            itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);

          const rawItemTitle = titleMatch ? titleMatch[1].trim() : 'Project Asset';
          const itemLink = linkMatch ? linkMatch[1].trim() : `https://www.artstation.com/artwork/${hashId}`;

          // If this is our targeted project post
          if (isTarget && !foundInRss) {
            foundInRss = true;
            // Clean " by [Author]" from RSS item titles
            resolvedTitle = rawItemTitle.replace(/\s+by\s+.*$/i, '') || initialTitle;

            // Clean description HTML to readable text / clean markdown paragraphs
            if (descMatch) {
              resolvedDescription = descMatch[1]
                .replace(/<!\[CDATA\[|\]\]>/g, '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<[^>]+>/g, '')
                .trim();
            }

            // Extract all original /large/ images from content:encoded
            const content = encodedMatch ? encodedMatch[1] : '';
            const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
            let m;
            let assetIndex = 1;

            while ((m = imgRegex.exec(content)) !== null) {
              const fullImgUrl = m[1];
              if (!fullImgUrl || !fullImgUrl.includes('artstation.com')) continue;

              projectAssets.push({
                id: `${hashId}_asset_${assetIndex}`,
                title: `${resolvedTitle} — Sheet ${assetIndex}`,
                imageUrl: fullImgUrl,
                sourceUrl: itemLink,
                authorName: resolvedAuthor,
                authorAvatar: resolvedAvatar,
                authorUsername: username,
              });
              assetIndex++;
            }
          } else {
            // Other projects from the artist for the "More From Artist" showcase
            const otherHashMatch = itemLink.match(/artwork\/([A-Za-z0-9]+)/);
            const otherHash = otherHashMatch ? otherHashMatch[1] : `other_${moreFromArtist.length}`;
            const content = encodedMatch ? encodedMatch[1] : '';
            const firstImgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
            const otherImg = firstImgMatch ? firstImgMatch[1] : '';

            if (otherImg && moreFromArtist.length < 12) {
              moreFromArtist.push({
                id: otherHash,
                title: rawItemTitle.replace(/\s+by\s+.*$/i, ''),
                imageUrl: otherImg,
                sourceUrl: itemLink,
                authorName: resolvedAuthor,
                authorAvatar: resolvedAvatar,
                authorUsername: username,
              });
            }
          }
        }
      }
    } catch (rssErr) {
      console.warn('Error fetching ArtStation RSS:', rssErr);
    }
  }

  // 2. Fallback: If not found in RSS, use initial image (upgraded to small_square if applicable)
  if (projectAssets.length === 0 && initialImage) {
    const highQualityCover = initialImage.replace('/smaller_square/', '/small_square/');
    projectAssets.push({
      id: hashId || 'initial_asset',
      title: resolvedTitle,
      imageUrl: highQualityCover,
      sourceUrl: hashId ? `https://www.artstation.com/artwork/${hashId}` : (sourceUrlParam || 'https://www.artstation.com'),
      authorName: resolvedAuthor,
      authorAvatar: resolvedAvatar,
      authorUsername: username,
    });
  }

  // 3. Fetch all other works/posts by the creator
  if (moreFromArtist.length === 0) {
    const searchQueries: string[] = [];
    if (resolvedAuthor && resolvedAuthor !== 'ArtStation Artist') {
      searchQueries.push(`"${resolvedAuthor}"`);
      searchQueries.push(resolvedAuthor);
    }
    if (username) {
      searchQueries.push(username);
    }
    if (searchQueries.length === 0) {
      searchQueries.push('character concept art');
    }

    const seenIds = new Set<string | number>(projectAssets.map((p) => p.id));
    if (hashId) seenIds.add(hashId);

    for (const q of searchQueries) {
      if (moreFromArtist.length >= 18) break;
      try {
        const searchRes = await fetch(
          `https://www.artstation.com/api/v2/search/projects.json?query=${encodeURIComponent(q)}&page=1&per_page=24`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Accept: 'application/json',
            },
            next: { revalidate: 1800 },
          }
        );

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          for (const item of searchData.data || []) {
            if (!item.id || seenIds.has(item.id) || (hashId && item.hash_id === hashId)) continue;
            const rawCover = item.smaller_square_cover_url || '';
            if (!rawCover) continue;

            seenIds.add(item.id);
            if (item.hash_id) seenIds.add(item.hash_id);

            const highResCover = rawCover.replace('/smaller_square/', '/small_square/');

            moreFromArtist.push({
              id: item.hash_id || item.id,
              title: item.title || 'Project Asset',
              imageUrl: highResCover,
              sourceUrl: item.url || (item.hash_id ? `https://www.artstation.com/artwork/${item.hash_id}` : ''),
              authorName: item.user?.full_name || item.user?.username || resolvedAuthor,
              authorAvatar: item.user?.medium_avatar_url || resolvedAvatar,
              authorUsername: item.user?.username || username,
              is3D: Boolean(item.icons?.model3d || item.icons?.marmoset),
            });

            if (moreFromArtist.length >= 20) break;
          }
        }
      } catch (searchErr) {
        console.warn('Error fetching ArtStation creator search:', searchErr);
      }
    }
  }

  // Combine current project assets with other creator posts for full browsing
  const allArtistPosts = [...projectAssets, ...moreFromArtist];

  const response = {
    success: true,
    title: resolvedTitle,
    description: resolvedDescription,
    authorName: resolvedAuthor,
    authorUsername: username,
    authorAvatar: resolvedAvatar,
    sourceUrl: hashId ? `https://www.artstation.com/artwork/${hashId}` : (sourceUrlParam || 'https://www.artstation.com'),
    hashId,
    assets: projectAssets,
    moreFromArtist,
    allArtistPosts,
    totalAssets: allArtistPosts.length,
  };

  return NextResponse.json(response);
}
