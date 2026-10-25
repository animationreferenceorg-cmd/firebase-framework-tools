import { NextRequest, NextResponse } from 'next/server';
import { parseSearchIntent, scoreVideoRelevance, classifyText, generateRichTags } from '@/lib/search-intent';

export const runtime = 'nodejs';
export const revalidate = 1800; // 30 min cache

export interface UnifiedSearchResult {
  id: string;
  title: string;
  source: 'artstation' | 'pinterest' | 'sakugabooru' | 'sketchfab' | 'wikimedia' | 'archive' | 'openverse';
  sourceUrl: string;
  thumbnailUrl: string;
  mediaUrl: string;
  mediaType: 'video' | 'image' | 'gif' | 'model3d';
  authorName?: string;
  authorAvatar?: string;
  authorUsername?: string;
  tags: string[];
  description?: string;
  embedUrl?: string;
  hasMultipleAssets?: boolean;
  hashId?: string;
}

// Curated Pinterest animation & vis dev reference feeds
const PINTEREST_REFERENCE_FEEDS = [
  'characterdesign',
  'artreferences',
  'animationart',
  'posemuse',
  'characterdesignreferences',
];

// Helper: Fisher-Yates array shuffle for natural randomization
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q')?.trim() || '';
  const source = searchParams.get('source') || 'all';
  const isExplore = !rawQuery || searchParams.get('mode') === 'explore';

  const intent = parseSearchIntent(rawQuery);
  const query = rawQuery || 'animation reference';
  const results: UnifiedSearchResult[] = [];

  try {
    const promises: Promise<void>[] = [];

    // 1. Sketchfab (Interactive 3D Animated Models, Rigs & Characters)
    // Skipped for concepts that don't exist as 3D models (storyboards, lip sync…).
    const sketchfabQuery = isExplore ? 'character animation' : intent.externalQueries.sketchfab;
    if ((source === 'all' || source === 'sketchfab') && sketchfabQuery) {
      promises.push(
        (async () => {
          try {
            const animatedParam = isExplore || intent.externalQueries.sketchfabAnimated === true ? '&animated=true' : '';
            const categoryParam = !isExplore && intent.externalQueries.sketchfabCategory ? `&categories=${encodeURIComponent(intent.externalQueries.sketchfabCategory)}` : '';
            const res = await fetch(
              `https://api.sketchfab.com/v3/models?q=${encodeURIComponent(sketchfabQuery)}${animatedParam}${categoryParam}&sort_by=-likeCount&per_page=24`,
              {
                headers: {
                  'User-Agent': 'AnimationReference/1.0 (+https://animationreference.org)',
                  Accept: 'application/json',
                },
                next: { revalidate: 1800 },
              }
            );
            if (res.ok) {
              const data = await res.json();
              for (const model of data.results || []) {
                if (!model.uid) continue;
                // Grab high-res thumbnail (prefer 1920 or 1024 width)
                const thumbs = model.thumbnails?.images || [];
                const highResThumb =
                  thumbs.find((t: any) => t.width >= 1000)?.url ||
                  thumbs.find((t: any) => t.width >= 700)?.url ||
                  thumbs[0]?.url ||
                  '';

                const tags = (model.tags || []).map((t: any) => t.name || t).filter(Boolean);
                results.push({
                  id: `sf_${model.uid}`,
                  title: model.name || '3D Animated Model',
                  source: 'sketchfab',
                  sourceUrl: model.viewerUrl || `https://sketchfab.com/3d-models/${model.uid}`,
                  thumbnailUrl: highResThumb,
                  mediaUrl: highResThumb,
                  mediaType: 'model3d',
                  embedUrl: `https://sketchfab.com/models/${model.uid}/embed?autostart=1&preload=1&ui_controls=0`,
                  authorName: model.user?.displayName || model.user?.username || 'Sketchfab Creator',
                  tags: ['3d-model', 'sketchfab', ...tags.slice(0, 8)],
                  description: model.description?.slice(0, 160) || `Interactive 3D model by ${model.user?.displayName || 'Creator'}`,
                });
              }
            }
          } catch {
            // Silently continue
          }
        })()
      );
    }

    // 2. ArtStation (Visual Development, 3D Turnarounds, Keyframes & Sculptures)
    if (source === 'all' || source === 'artstation') {
      const artQueries = isExplore
        ? ['visual development', 'character turnaround', '3d character model']
        : intent.externalQueries.artstation;

      for (const q of artQueries) {
        promises.push(
          (async () => {
            try {
              const res = await fetch(
                `https://www.artstation.com/api/v2/search/projects.json?query=${encodeURIComponent(q)}&page=1&per_page=16`,
                {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Accept: 'application/json',
                  },
                  next: { revalidate: 1800 },
                }
              );
              if (res.ok) {
                const data = await res.json();
                for (const item of data.data || []) {
                  if (!item.url) continue;
                  const cover = item.smaller_square_cover_url || '';
                  const highResCover = cover.replace('/smaller_square/', '/small_square/');
                  const is3D = Boolean(item.icons?.model3d || item.icons?.marmoset);
                  results.push({
                    id: `as_${item.id}`,
                    title: item.title || 'ArtStation Artwork',
                    source: 'artstation',
                    sourceUrl: item.url,
                    thumbnailUrl: highResCover || cover,
                    mediaUrl: highResCover || cover,
                    mediaType: is3D ? 'model3d' : 'image',
                    authorName: item.user?.full_name || item.user?.username || 'ArtStation Artist',
                    authorAvatar: item.user?.medium_avatar_url || '',
                    authorUsername: item.user?.username || '',
                    hasMultipleAssets: Boolean(item.icons?.multiple_images),
                    hashId: item.hash_id,
                    // ArtStation's API only exposes a title, so carry over the
                    // concept of the query that surfaced this project.
                    tags: ['artstation', 'visdev', ...classifyText(q)],
                    description: `By ${item.user?.full_name || item.user?.username || 'Artist'} on ArtStation`,
                  });
                }
              }
            } catch {
              // Silently continue
            }
          })()
        );
      }
    }

    // 3. Pinterest (Character Design, Model Sheets, Poses & Anatomy reference)
    if (source === 'all' || source === 'pinterest') {
      const targetFeeds = isExplore
        ? PINTEREST_REFERENCE_FEEDS
        : [PINTEREST_REFERENCE_FEEDS[0], PINTEREST_REFERENCE_FEEDS[1]];

      for (const feedName of targetFeeds) {
        promises.push(
          (async () => {
            try {
              const res = await fetch(`https://www.pinterest.com/${feedName}/feed.rss`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  Accept: 'application/rss+xml, application/xml, text/xml',
                },
                next: { revalidate: 1800 },
              });

              if (!res.ok) return;
              const xml = await res.text();
              const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

              for (const match of itemMatches) {
                const itemXml = match[1]
                  .replace(/&quot;/g, '"')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>');

                const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/);
                const linkMatch = itemXml.match(/<link>(.*?)<\/link>/) || itemXml.match(/<guid[^>]*>(.*?)<\/guid>/);
                const imgMatch = itemXml.match(/<img[^>]+src="([^">]+)"/i) || itemXml.match(/src="([^">]+)"/i);

                if (!linkMatch || !imgMatch) continue;

                const pinUrl = linkMatch[1].trim();
                const rawImg = imgMatch[1].trim();
                const highResImg = rawImg.replace('/236x/', '/736x/');
                const cleanTitle = (titleMatch ? titleMatch[1] : 'Pinterest Reference')
                  .replace(/<[^>]*>/g, '')
                  .trim() || 'Character Design Reference';

                if (!isExplore && rawQuery) {
                  // Pinterest RSS can't be searched, so only keep pins whose own
                  // title passes the same strict gate as every other result.
                  const pinProbe: any = { id: 'pin_probe', title: cleanTitle, tags: [], description: '' };
                  if (scoreVideoRelevance(pinProbe, intent) <= 0) continue;
                }

                const pinId = pinUrl.split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2);
                results.push({
                  id: `pin_${pinId}`,
                  title: cleanTitle.slice(0, 90) || 'Character & Vis Dev Reference',
                  source: 'pinterest',
                  sourceUrl: pinUrl,
                  thumbnailUrl: rawImg,
                  mediaUrl: highResImg,
                  mediaType: highResImg.endsWith('.gif') ? 'gif' : 'image',
                  authorName: `@${feedName} on Pinterest`,
                  tags: ['pinterest', ...(feedName.startsWith('characterdesign') ? ['character-design'] : feedName === 'posemuse' ? ['pose'] : [])],
                  description: cleanTitle,
                });

                if (results.filter(r => r.source === 'pinterest').length >= 35) break;
              }
            } catch {
              // Silently continue
            }
          })()
        );
      }
    }

    // 4. Sakugabooru (2D Animation Cuts, Smear Frames & Action Choreography)
    if (source === 'all' || source === 'sakugabooru') {
      const sakugaQueries = isExplore
        ? ['order:score', 'smears', 'effects']
        : intent.externalQueries.sakugabooru;

      for (const tags of sakugaQueries) {
        promises.push(
          (async () => {
            try {
              const res = await fetch(`https://www.sakugabooru.com/post.json?tags=${encodeURIComponent(tags)}&limit=16`, {
                headers: { 'User-Agent': 'AnimationReference/1.0 (+https://animationreference.org)' },
                next: { revalidate: 1800 },
              });
              if (res.ok) {
                const posts = await res.json();
                if (Array.isArray(posts)) {
                  for (const post of posts) {
                    if (!post.file_url) continue;
                    const postTags = (post.tags || '').split(' ').filter(Boolean);
                    results.push({
                      id: `saku_${post.id}`,
                      title: post.source ? `${post.source} — #${post.id}` : `Animation Cut #${post.id}`,
                      source: 'sakugabooru',
                      sourceUrl: `https://www.sakugabooru.com/post/show/${post.id}`,
                      thumbnailUrl: post.preview_url || post.file_url,
                      mediaUrl: post.file_url,
                      mediaType: post.file_url.endsWith('.gif') ? 'gif' : 'video',
                      authorName: post.author || 'Sakugabooru Animator',
                      tags: ['sakugabooru', '2d', ...postTags.slice(0, 30)],
                      description: `Source: ${post.source || 'Anime'}. Tags: ${postTags.slice(0, 5).join(', ')}`,
                    });
                  }
                }
              }
            } catch {
              // Silently continue
            }
          })()
        );
      }
    }

    // 5. Wikimedia Commons (Locomotion, Anatomy Studies, Muybridge Plates)
    if ((source === 'all' || source === 'wikimedia') && (isExplore || intent.externalQueries.wikimedia)) {
      promises.push(
        (async () => {
          try {
            const wikiSearch = isExplore ? 'Muybridge locomotion animal human' : query;
            const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
              wikiSearch + ' filetype:bitmap|video'
            )}&gsrnamespace=6&prop=imageinfo&iiprop=url|mime|extmetadata&format=json&origin=*`;
            const res = await fetch(wikiUrl, {
              headers: { 'User-Agent': 'AnimationReference/1.0 (+https://animationreference.org)' },
              next: { revalidate: 1800 },
            });
            if (res.ok) {
              const data = await res.json();
              const pages = data.query?.pages ? Object.values(data.query.pages) : [];
              for (const page of pages as any[]) {
                const info = page.imageinfo?.[0];
                if (!info?.url) continue;
                const mime = info.mime || '';
                const isVideo = mime.startsWith('video/') || info.url.endsWith('.webm') || info.url.endsWith('.mp4');
                const isImage = mime.startsWith('image/');
                if (!isVideo && !isImage) continue;

                const rawTitle = (page.title || '').replace(/^File:/i, '').replace(/\.[^/.]+$/, '');
                results.push({
                  id: `wiki_${page.pageid}`,
                  title: rawTitle.slice(0, 80) || 'Locomotion Plate',
                  source: 'wikimedia',
                  sourceUrl: info.descriptionurl || info.url,
                  thumbnailUrl: info.thumburl || info.url,
                  mediaUrl: info.url,
                  mediaType: isVideo ? 'video' : mime.includes('gif') ? 'gif' : 'image',
                  authorName: info.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, '') || 'Public Domain / Wikimedia',
                  tags: ['wikimedia', 'study'],
                  description: info.extmetadata?.ImageDescription?.value?.replace(/<[^>]*>/g, '').slice(0, 150) || rawTitle,
                });
              }
            }
          } catch {
            // Silently continue
          }
        })()
      );
    }

    // 6. Internet Archive (Historic Stunts & Slapstick Animation Mechanics)
    if ((source === 'all' || source === 'archive') && (isExplore || intent.externalQueries.archive)) {
      promises.push(
        (async () => {
          try {
            const archiveQuery = isExplore ? 'slapstick stunts comedy acrobatics AND mediatype:(movies)' : `${query} AND mediatype:(movies)`;
            const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
              archiveQuery
            )}&fl[]=identifier,title,description,creator,year&rows=12&output=json`;
            const res = await fetch(archiveUrl, {
              headers: { 'User-Agent': 'AnimationReference/1.0 (+https://animationreference.org)' },
              next: { revalidate: 1800 },
            });
            if (res.ok) {
              const data = await res.json();
              const docs = data.response?.docs || [];
              for (const doc of docs) {
                if (!doc.identifier) continue;
                results.push({
                  id: `archive_${doc.identifier}`,
                  title: doc.title || `Archive Video #${doc.identifier}`,
                  source: 'archive',
                  sourceUrl: `https://archive.org/details/${doc.identifier}`,
                  thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
                  mediaUrl: `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp4`,
                  mediaType: 'video',
                  authorName: doc.creator || 'Internet Archive',
                  tags: ['archive', 'vintage'],
                  description: (doc.description || '').slice(0, 150),
                });
              }
            }
          } catch {
            // Silently continue
          }
        })()
      );
    }

    await Promise.allSettled(promises);

    // De-duplicate items by id, and dynamically tag each one across our rich taxonomy
    // (studios, IPs, mechanics, principles, styles) based on its own metadata.
    const seen = new Set<string>();
    const uniqueResults: UnifiedSearchResult[] = [];
    for (const item of results) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        const rich = generateRichTags({
          title: item.title,
          tags: item.tags,
          description: item.description,
          authorName: item.authorName,
          source: item.source,
        });
        item.tags = rich;
        uniqueResults.push(item);
      }
    }

    // When exploring, randomize naturally. When searching, keep ONLY items that
    // pass the strict concept gate and rank them by relevance.
    let finalResults: UnifiedSearchResult[];
    if (isExplore) {
      finalResults = shuffleArray(uniqueResults);
    } else {
      finalResults = uniqueResults
        .map((item) => {
          const fakeVideo: any = {
            id: item.id,
            title: item.title,
            description: item.description,
            tags: item.tags,
            source: item.source,
            mediaType: item.mediaType,
          };
          return { item, score: scoreVideoRelevance(fakeVideo, intent) };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item);
    }

    return NextResponse.json({
      query: rawQuery,
      mode: isExplore ? 'explore' : 'search',
      count: finalResults.length,
      results: finalResults,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Search failed', results: [] }, { status: 500 });
  }
}
