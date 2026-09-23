import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Makes user-selected reference thumbnails same-origin for the moodboard
// exporter. Browser canvas APIs otherwise reject otherwise-valid CDN images.
export async function GET(request: Request) {
  const urlValue = new URL(request.url).searchParams.get('url');
  if (!urlValue) return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });

  let source: URL;
  try {
    source = new URL(urlValue);
  } catch {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(source.protocol) || isPrivateHost(source.hostname)) {
    return NextResponse.json({ error: 'Unsupported image URL' }, { status: 400 });
  }

  try {
    const upstream = await fetch(source, {
      headers: { 'User-Agent': 'AnimationReference.org moodboard exporter' },
      signal: AbortSignal.timeout(12_000),
      redirect: 'follow',
      next: { revalidate: 86_400 },
    });
    const type = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !type.startsWith('image/')) {
      return NextResponse.json({ error: 'Image unavailable' }, { status: 422 });
    }

    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Image fetch failed' }, { status: 502 });
  }
}

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '::1' || host.endsWith('.local') ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}
