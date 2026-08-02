import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTagBySlug, getRelatedTags, slugifyTag } from '@/lib/videoSnapshot.server';
import { TagViewTracker } from '@/components/TagViewTracker';
import { VideoCard } from '@/components/VideoCard';

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

    const keywords = [
        `${entry.tag} animation reference`,
        `${entry.tag} animation`,
        `${entry.tag} animation tutorial`,
        `${entry.tag} reference clips`,
        `how to animate ${entry.tag}`,
        `${entry.tag} motion capture`,
        `${entry.tag} animation breakdown`,
        'animation reference',
        'game animation',
        'animation study',
    ];

    return {
        title: `${name} Animation Reference — ${entry.videos.length} Clips${pageSuffix}`,
        description: `Browse ${entry.videos.length} curated ${entry.tag} animation reference clips. Study ${entry.tag} timing, spacing, posing and motion. Free frame-by-frame animation reference for animators, game developers & motion designers.`,
        keywords,
        alternates: {
            canonical,
            languages: {
                'en-US': canonical,
                es: `${BASE_URL}/es/tags/${slug}`,
            }
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-image-preview': 'large',
                'max-snippet': -1,
                'max-video-preview': -1,
            },
        },
        openGraph: {
            title: `${name} Animation Reference (${entry.videos.length} clips)`,
            description: `Curated ${entry.tag} animation reference clips. Study professional animation timing and technique.`,
            url: canonical,
            siteName: 'Animation Reference',
            type: 'website',
            locale: 'en_US',
            images: entry.videos[0]?.thumbnailUrl ? [{
                url: entry.videos[0].thumbnailUrl,
                width: 1200,
                height: 630,
                alt: `${name} animation reference clip`,
                type: 'image/jpeg',
            }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: `${name} Animation Reference`,
            description: `${entry.videos.length} curated clips for studying ${entry.tag} animation.`,
            images: entry.videos[0]?.thumbnailUrl ? [entry.videos[0].thumbnailUrl] : undefined,
            creator: '@animationref',
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

    // VideoObject schema for each video (improves Google Video search visibility)
    const videoObjectSchemas = videos.map((v) => ({
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: v.title,
        description: `${name} animation reference: ${v.title}. Study professional ${entry.tag} animation timing, spacing, and technique.`,
        url: `${BASE_URL}/video/${v.id}`,
        thumbnailUrl: [v.thumbnailUrl || v.posterUrl],
        uploadDate: v.createdAt instanceof Date ? v.createdAt.toISOString() : new Date().toISOString(),
        duration: `PT${Math.floor((v.duration || 10) / 60)}M${(v.duration || 10) % 60}S`,
        genre: ['Animation', 'Tutorial', 'Reference'],
        keywords: [entry.tag, 'animation', 'reference', 'tutorial', 'breakdown'],
        potentialAction: {
            '@type': 'SeekToAction',
            target: `${BASE_URL}/video/${v.id}?t={seek_to_second_number}`,
        },
    }));

    return (
        <div className="container mx-auto px-4 md:px-8 py-10">
            <TagViewTracker tag={entry.tag} />
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

            {/* Video grid — with interactive VideoCard theater player modal */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {videos.map(v => (
                    <VideoCard key={v.id} video={v as any} />
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
            {videoObjectSchemas.map((schema, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
            ))}
        </div>
    );
}
