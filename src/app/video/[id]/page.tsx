
import { Metadata, ResolvingMetadata } from 'next';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VideoDetailClient } from '@/components/VideoDetailClient';
import type { Video } from '@/lib/types';
import {
    getSnapshotVideoById,
    getRelatedSnapshotVideos,
    slugifyTag,
    toIsoDate,
    toIsoDuration,
} from '@/lib/videoSnapshot.server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://animationreference.org';

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getVideo(id: string): Promise<Video | null> {
    // Snapshot first: covers every published video at zero Firestore cost,
    // which matters because Googlebot hits thousands of these pages.
    try {
        const fromSnapshot = getSnapshotVideoById(id);
        if (fromSnapshot) return fromSnapshot;
    } catch (error) {
        console.error('Snapshot lookup failed:', error);
    }
    // Fallback for drafts / brand-new videos not yet snapshotted
    try {
        const docRef = doc(db, "videos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Video;
        }
    } catch (error) {
        console.error("Error fetching video for metadata:", error);
    }
    return null;
}

function buildDescription(video: Video): string {
    if (video.description) return video.description;
    const tags = (video.tags || []).slice(0, 5).join(', ');
    const secs = video.duration ? `${video.duration.toFixed(1)}s ` : '';
    return `${secs}animation reference clip${tags ? ` — ${tags}` : ''}. Study the timing, spacing and posing frame by frame on Animation Reference.`;
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const id = (await params).id;
    const video = await getVideo(id);

    if (!video) {
        return {
            title: 'Video Not Found - Animation Reference',
            robots: { index: false },
        };
    }

    const previousImages = (await parent).openGraph?.images || [];
    const pageUrl = `${BASE_URL}/video/${id}`;
    const primaryTag = video.tags?.[0];
    const title = primaryTag
        ? `${video.title} | ${primaryTag.replace(/\b\w/g, c => c.toUpperCase())} Animation Reference`
        : `${video.title} | Animation Reference`;
    const description = buildDescription(video);

    return {
        title: { absolute: title },
        description,
        keywords: video.tags,
        alternates: { canonical: pageUrl },
        openGraph: {
            title: video.title,
            description,
            url: pageUrl,
            siteName: 'Animation Reference',
            images: [
                {
                    url: video.thumbnailUrl || '/logo.png',
                    width: video.width || 1200,
                    height: video.height || 630,
                    alt: video.title,
                },
                ...previousImages,
            ],
            videos: video.videoUrl
                ? [
                    {
                        url: video.videoUrl,
                        width: video.width || 1280,
                        height: video.height || 720,
                        type: 'video/mp4',
                    },
                ]
                : undefined,
            type: 'video.other',
        },
        twitter: {
            card: 'summary_large_image',
            title: video.title,
            description,
            images: [video.thumbnailUrl || '/logo.png'],
        },
    };
}

export default async function VideoPage({ params }: Props) {
    const id = (await params).id;
    const video = await getVideo(id);

    if (!video) return <VideoDetailClient id={id} initialData={null} />;

    const pageUrl = `${BASE_URL}/video/${id}`;
    const videoSchema = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: video.title,
        description: buildDescription(video),
        thumbnailUrl: video.thumbnailUrl || video.posterUrl || `${BASE_URL}/site-icon.png`,
        contentUrl: video.videoUrl || undefined,
        embedUrl: pageUrl,
        uploadDate: toIsoDate((video as Video & { createdAt?: unknown }).createdAt),
        duration: toIsoDuration(video.duration),
        width: video.width || undefined,
        height: video.height || undefined,
        url: pageUrl,
        keywords: video.tags?.join(', '),
        genre: 'Animation Reference',
        isFamilyFriendly: true,
        publisher: {
            '@type': 'Organization',
            name: 'Animation Reference',
            url: BASE_URL,
            logo: { '@type': 'ImageObject', url: `${BASE_URL}/site-icon.png` },
        },
    };

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
            { '@type': 'ListItem', position: 2, name: 'Browse', item: `${BASE_URL}/categories` },
            { '@type': 'ListItem', position: 3, name: video.title, item: pageUrl },
        ],
    };

    // Server-rendered related clips: crawlable internal links between videos
    let related: Video[] = [];
    try {
        related = getRelatedSnapshotVideos(video, 12);
    } catch { /* snapshot unavailable — skip section */ }

    return (
        <>
            <VideoDetailClient id={id} initialData={video} />

            {related.length > 0 && (
                <section className="container mx-auto px-4 md:px-8 py-12">
                    <h2 className="text-2xl font-bold text-foreground mb-2">Related Animation References</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        More clips that share tags with “{video.title}”.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {related.map(r => (
                            <Link
                                key={r.id}
                                href={`/video/${r.id}`}
                                className="group rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-colors"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={r.thumbnailUrl || r.posterUrl}
                                    alt={r.title}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="aspect-video w-full object-cover group-hover:scale-[1.02] transition-transform"
                                />
                                <div className="p-3">
                                    <h3 className="text-sm font-semibold text-foreground line-clamp-2">{r.title}</h3>
                                    {r.tags && r.tags.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                            {r.tags.slice(0, 3).map(t => `#${t}`).join(' ')}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {video.tags && video.tags.length > 0 && (
                        <div className="mt-8 flex flex-wrap gap-2">
                            {video.tags.slice(0, 10).map(t => (
                                <Link
                                    key={t}
                                    href={`/tags/${slugifyTag(t)}`}
                                    className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                                >
                                    #{t}
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
        </>
    );
}
