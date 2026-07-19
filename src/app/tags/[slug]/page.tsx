import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTagBySlug, getRelatedTags, slugifyTag } from '@/lib/videoSnapshot.server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://animationreference.org';
const PER_PAGE = 48;

type Props = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
};

function titleCase(tag: string): string {
    return tag.replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const entry = getTagBySlug(slug);
    if (!entry) return { title: 'Tag Not Found | Animation Reference', robots: { index: false } };

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const name = titleCase(entry.tag);
    const pageSuffix = page > 1 ? ` — Page ${page}` : '';
    const canonical = page > 1 ? `${BASE_URL}/tags/${slug}?page=${page}` : `${BASE_URL}/tags/${slug}`;

    return {
        title: `${name} Animation Reference — ${entry.videos.length} Clips${pageSuffix}`,
        description: `Browse ${entry.videos.length} curated ${entry.tag} animation reference clips. Study ${entry.tag} timing, posing and motion frame by frame — free for animators and game developers.`,
        keywords: [`${entry.tag} animation reference`, `${entry.tag} animation`, `${entry.tag} reference clips`, 'animation reference', 'game animation'],
        alternates: { canonical },
        openGraph: {
            title: `${name} Animation Reference (${entry.videos.length} clips)`,
            description: `Curated ${entry.tag} animation reference library for animators.`,
            url: canonical,
            siteName: 'Animation Reference',
            images: entry.videos[0]?.thumbnailUrl ? [{ url: entry.videos[0].thumbnailUrl }] : undefined,
            type: 'website',
        },
    };
}

export default async function TagPage({ params, searchParams }: Props) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const entry = getTagBySlug(slug);
    if (!entry) notFound();

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const totalPages = Math.ceil(entry.videos.length / PER_PAGE);
    if (page > totalPages) notFound();

    // Newest first (snapshot is oldest-first)
    const ordered = [...entry.videos].reverse();
    const videos = ordered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const name = titleCase(entry.tag);
    const relatedTags = getRelatedTags(entry.tag, 14);
    const pageUrl = page > 1 ? `${BASE_URL}/tags/${slug}?page=${page}` : `${BASE_URL}/tags/${slug}`;

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
            { '@type': 'ListItem', position: 2, name: 'Tags', item: `${BASE_URL}/tags` },
            { '@type': 'ListItem', position: 3, name: name, item: `${BASE_URL}/tags/${slug}` },
        ],
    };

    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${name} Animation Reference Clips`,
        url: pageUrl,
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: entry.videos.length,
            itemListElement: videos.map((v, i) => ({
                '@type': 'ListItem',
                position: (page - 1) * PER_PAGE + i + 1,
                url: `${BASE_URL}/video/${v.id}`,
                name: v.title,
            })),
        },
    };

    return (
        <div className="container mx-auto px-4 md:px-8 py-10">
            {/* Breadcrumb */}
            <nav className="text-xs text-muted-foreground mb-6 flex items-center gap-1.5" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-foreground">Home</Link>
                <span>/</span>
                <Link href="/tags" className="hover:text-foreground">Tags</Link>
                <span>/</span>
                <span className="text-foreground font-medium">{name}</span>
            </nav>

            <header className="mb-10 max-w-3xl">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4">
                    {name} Animation Reference
                </h1>
                <p className="text-muted-foreground leading-relaxed">
                    {entry.videos.length} curated {entry.tag} animation reference clips for animators, game developers
                    and motion designers. Open any clip for frame-by-frame playback to study the timing, spacing and
                    posing of real {entry.tag} motion{relatedTags.length > 0 && (
                        <> — often studied together with {relatedTags.slice(0, 3).map(t => t.tag).join(', ')}</>
                    )}.
                </p>
            </header>

            {/* Video grid — server-rendered links so search engines can crawl every clip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.map(v => (
                    <Link
                        key={v.id}
                        href={`/video/${v.id}`}
                        className="group rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-colors"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={v.thumbnailUrl || v.posterUrl}
                            alt={`${v.title} — ${entry.tag} animation reference`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="aspect-video w-full object-cover group-hover:scale-[1.02] transition-transform"
                        />
                        <div className="p-3">
                            <h2 className="text-sm font-semibold text-foreground line-clamp-2">{v.title}</h2>
                            <p className="text-xs text-muted-foreground mt-1">
                                {v.duration ? `${v.duration.toFixed(1)}s` : 'Clip'}
                                {v.tags && v.tags.length > 0 && ` · ${v.tags.slice(0, 2).join(', ')}`}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <nav className="flex items-center justify-center gap-2 mt-12" aria-label="Pagination">
                    {page > 1 && (
                        <Link
                            href={page === 2 ? `/tags/${slug}` : `/tags/${slug}?page=${page - 1}`}
                            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:border-primary/40"
                        >
                            ← Previous
                        </Link>
                    )}
                    <span className="px-4 py-2 text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                        <Link
                            href={`/tags/${slug}?page=${page + 1}`}
                            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:border-primary/40"
                        >
                            Next →
                        </Link>
                    )}
                </nav>
            )}

            {/* Related tags — interlinking between tag landing pages */}
            {relatedTags.length > 0 && (
                <section className="mt-14 border-t border-border pt-8">
                    <h2 className="text-lg font-bold text-foreground mb-4">Related Animation Reference Tags</h2>
                    <div className="flex flex-wrap gap-2">
                        {relatedTags.map(t => (
                            <Link
                                key={t.slug}
                                href={`/tags/${t.slug}`}
                                className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                            >
                                #{t.tag}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
        </div>
    );
}
