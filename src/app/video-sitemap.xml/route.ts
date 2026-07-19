import { getAllSnapshotVideos, toIsoDate } from '@/lib/videoSnapshot.server';

// Google video sitemap for the whole published library. Built from the static
// snapshot (zero Firestore reads) and regenerated on every deploy.
export const dynamic = 'force-static';

const BASE_URL = 'https://animationreference.org';

function esc(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export async function GET() {
    const videos = getAllSnapshotVideos();

    const entries = videos
        .filter(v => v.thumbnailUrl && v.videoUrl && v.title)
        .map(v => {
            const description = v.description
                || `${v.duration ? `${v.duration.toFixed(1)}s ` : ''}animation reference clip${v.tags?.length ? ` — ${v.tags.slice(0, 5).join(', ')}` : ''}. Frame-by-frame study for animators.`;
            const tags = (v.tags || []).slice(0, 32)
                .map(t => `      <video:tag>${esc(t)}</video:tag>`)
                .join('\n');
            const pubDate = toIsoDate((v as { createdAt?: unknown }).createdAt);
            return `  <url>
    <loc>${BASE_URL}/video/${esc(v.id)}</loc>
    <video:video>
      <video:thumbnail_loc>${esc(v.thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${esc(v.title)}</video:title>
      <video:description>${esc(description.slice(0, 2000))}</video:description>
      <video:content_loc>${esc(v.videoUrl)}</video:content_loc>
${v.duration ? `      <video:duration>${Math.max(1, Math.round(v.duration))}</video:duration>\n` : ''}${pubDate ? `      <video:publication_date>${pubDate}</video:publication_date>\n` : ''}      <video:family_friendly>yes</video:family_friendly>
${tags}
    </video:video>
  </url>`;
        });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${entries.join('\n')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
