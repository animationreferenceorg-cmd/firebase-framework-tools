import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_VIDEO_HOSTS = [
  'sakugabooru.com',
  'www.sakugabooru.com',
  'cdninstagram.com',
  'fbcdn.net',
  'instagram.com',
  'pinimg.com',
  'v.pinimg.com',
  'artstation.com',
  'cdna.artstation.com',
  'cdnb.artstation.com',
  'vimeo.com',
  'vimeocdn.com',
  'b-cdn.net',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  'cloudfront.net',
  'amazonaws.com',
  'giphy.com',
  'tenor.com',
  'imgur.com',
  'i.imgur.com',
  'tumblr.com',
  'wikimedia.org',
  'upload.wikimedia.org',
  'sketchfab.com',
];

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local')) {
    return true;
  }
  if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) {
    return true;
  }
  return false;
}

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

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return new NextResponse('Invalid protocol', { status: 400 });
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateOrLoopbackHost(hostname)) {
    return new NextResponse('Host not permitted', { status: 403 });
  }

  const isAllowed = ALLOWED_VIDEO_HOSTS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );
  if (!isAllowed) {
    return new NextResponse('Host not permitted', { status: 403 });
  }

  try {
    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Referer: `${parsed.protocol}//${parsed.hostname}/`,
      Accept: '*/*',
    };

    const range = request.headers.get('range');
    if (range) {
      upstreamHeaders['Range'] = range;
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse('Upstream video failed', {
        status: upstreamRes.status || 502,
      });
    }

    const headers = new Headers();
    const contentType = upstreamRes.headers.get('content-type') || 'video/mp4';
    headers.set('Content-Type', contentType);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    headers.set('Cache-Control', 'public, max-age=14400, stale-while-revalidate=86400');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);

    const acceptRanges = upstreamRes.headers.get('accept-ranges') || 'bytes';
    headers.set('Accept-Ranges', acceptRanges);

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers,
    });
  } catch (error) {
    console.error('Video proxy error:', error);
    return new NextResponse('Failed to proxy video', { status: 502 });
  }
}
