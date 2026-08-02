import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTagBySlug, getRelatedTags } from '@/lib/videoSnapshot.server';
import { TagViewTracker } from '@/components/TagViewTracker';
import { VideoCard } from '@/components/VideoCard';
import { translations } from '@/lib/translations';

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
    if (!entry) return { title: 'Etiqueta no encontrada | Animation Reference', robots: { index: false } };

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const name = titleCase(entry.tag);
    const pageSuffix = page > 1 ? ` — Página ${page}` : '';
    const canonical = page > 1 ? `${BASE_URL}/es/tags/${slug}?page=${page}` : `${BASE_URL}/es/tags/${slug}`;

    const keywords = [
        `${entry.tag} referencia animación`,
        `${entry.tag} animación`,
        `${entry.tag} tutorial animación`,
        `clips de referencia ${entry.tag}`,
        `cómo animar ${entry.tag}`,
        `${entry.tag} motion capture`,
        'referencia de animación',
        'animación de juegos',
        'estudio de animación',
    ];

    const t = translations.es;

    return {
        title: t.tags.title(name, entry.videos.length) + pageSuffix,
        description: t.tags.description(entry.tag, entry.videos.length),
        keywords,
        alternates: {
            canonical,
            languages: {
                en: `${BASE_URL}/tags/${slug}`,
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
            title: `${name} - Referencia de Animación (${entry.videos.length} clips)`,
            description: t.tags.description(entry.tag, entry.videos.length),
            url: canonical,
            siteName: 'Animation Reference',
            type: 'website',
            locale: 'es_ES',
            images: entry.videos[0]?.thumbnailUrl ? [{
                url: entry.videos[0].thumbnailUrl,
                width: 1200,
                height: 630,
                alt: `${name} referencia de animación`,
                type: 'image/jpeg',
            }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: `${name} - Referencia de Animación`,
            description: `${entry.videos.length} clips curados para estudiar animación de ${entry.tag}.`,
            images: entry.videos[0]?.thumbnailUrl ? [entry.videos[0].thumbnailUrl] : undefined,
        },
    };
}

export default async function SpanishTagPage({ params, searchParams }: Props) {
    const { slug } = await params;
    const { page: pageParam } = await searchParams;
    const entry = getTagBySlug(slug);
    if (!entry) notFound();

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const totalPages = Math.ceil(entry.videos.length / PER_PAGE);
    if (page > totalPages) notFound();

    const ordered = [...entry.videos].reverse();
    const videos = ordered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const name = titleCase(entry.tag);
    const relatedTags = getRelatedTags(entry.tag, 14);
    const pageUrl = page > 1 ? `${BASE_URL}/es/tags/${slug}?page=${page}` : `${BASE_URL}/es/tags/${slug}`;

    const t = translations.es;

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: t.tags.breadcrumbHome, item: `${BASE_URL}/es` },
            { '@type': 'ListItem', position: 2, name: t.tags.breadcrumbTags, item: `${BASE_URL}/es/tags` },
            { '@type': 'ListItem', position: 3, name: name, item: `${BASE_URL}/es/tags/${slug}` },
        ],
    };

    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        inLanguage: 'es',
        name: `${name} - ${t.tags.description_long(entry.tag, entry.videos.length).split('.')[0]}`,
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

    const videoObjectSchemas = videos.map((v) => ({
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        inLanguage: 'es',
        name: v.title,
        description: `Referencia de animación de ${name}: ${v.title}. Estudia timing, espaciado y técnica profesional de animación de ${entry.tag}.`,
        url: `${BASE_URL}/video/${v.id}`,
        thumbnailUrl: [v.thumbnailUrl || v.posterUrl],
        uploadDate: v.createdAt instanceof Date ? v.createdAt.toISOString() : new Date().toISOString(),
        duration: `PT${Math.floor((v.duration || 10) / 60)}M${(v.duration || 10) % 60}S`,
        genre: ['Animación', 'Tutorial', 'Referencia'],
        keywords: [entry.tag, 'animación', 'referencia', 'tutorial', 'desglose'],
    }));

    return (
        <div className="container mx-auto px-4 md:px-8 py-10">
            <TagViewTracker tag={entry.tag} />
            {/* Breadcrumb */}
            <nav className="text-xs text-muted-foreground mb-6 flex items-center gap-1.5" aria-label="Breadcrumb">
                <Link href="/es" className="hover:text-foreground">{t.tags.breadcrumbHome}</Link>
                <span>/</span>
                <Link href="/es/tags" className="hover:text-foreground">{t.tags.breadcrumbTags}</Link>
                <span>/</span>
                <span className="text-foreground font-medium">{name}</span>
            </nav>

            <header className="mb-10 max-w-3xl">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4">
                    {t.tags.h1(name)}
                </h1>
                <p className="text-muted-foreground leading-relaxed">
                    {t.tags.description_long(entry.tag, entry.videos.length)}{relatedTags.length > 0 && (
                        <> — {t.tags.studyTogether} {relatedTags.slice(0, 3).map(t => t.tag).join(', ')}</>
                    )}.
                </p>
            </header>

            {/* Video grid */}
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
                            href={page === 2 ? `/es/tags/${slug}` : `/es/tags/${slug}?page=${page - 1}`}
                            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:border-primary/40"
                        >
                            ← {t.tags.previousPage}
                        </Link>
                    )}
                    <span className="px-4 py-2 text-sm text-muted-foreground">
                        {t.tags.pageOf(page, totalPages)}
                    </span>
                    {page < totalPages && (
                        <Link
                            href={`/es/tags/${slug}?page=${page + 1}`}
                            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:border-primary/40"
                        >
                            {t.tags.nextPage} →
                        </Link>
                    )}
                </nav>
            )}

            {/* Related tags */}
            {relatedTags.length > 0 && (
                <section className="mt-14 border-t border-border pt-8">
                    <h2 className="text-lg font-bold text-foreground mb-4">{t.tags.relatedTags}</h2>
                    <div className="flex flex-wrap gap-2">
                        {relatedTags.map(t => (
                            <Link
                                key={t.slug}
                                href={`/es/tags/${t.slug}`}
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
