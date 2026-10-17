import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Allowed image host patterns to prevent open proxy abuse
const ALLOWED_HOSTS = [
  'artstation.com',
  'cdna.artstation.com',
  'cdnb.artstation.com',
  'pinimg.com',
  'i.pinimg.com',
  'sakugabooru.com',
  'www.sakugabooru.com',
  'wikimedia.org',
  'upload.wikimedia.org',
  'archive.org',
  'sketchfab.com',
  'cdninstagram.com',
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = ALLOWED_HOSTS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  if (!isAllowed) {
    return new NextResponse('Host not permitted', { status: 403 });
  }

  try {
    const urlsToTry = [targetUrl];
    if (hostname.includes('artstation.com') && (targetUrl.includes('/smaller_square/') || targetUrl.includes('/small_square/'))) {
      const largeVersion = targetUrl.replace(/\/smaller_square\/|\/small_square\//, '/large/');
      const smallSquareVersion = targetUrl.replace(/\/smaller_square\//, '/small_square/');
      urlsToTry.unshift(smallSquareVersion);
      urlsToTry.unshift(largeVersion);
    }

    let upstreamRes: Response | null = null;
    for (const tryUrl of urlsToTry) {
      try {
        const res = await fetch(tryUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Referer: `${parsed.protocol}//${parsed.hostname}/`,
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          next: { revalidate: 86400 },
        });
        if (res.ok) {
          upstreamRes = res;
          break;
        }
      } catch {
        // try next fallback
      }
    }

    if (!upstreamRes || !upstreamRes.ok) {
      return new NextResponse(`Upstream failed`, {
        status: upstreamRes?.status || 502,
      });
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstreamRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Failed to proxy image', { status: 502 });
  }
}
