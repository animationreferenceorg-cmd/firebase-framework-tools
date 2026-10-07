
import { Metadata, ResolvingMetadata } from 'next';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VideoDetailClient } from '@/components/VideoDetailClient';
import { ReferenceThumbnail } from '@/components/ReferenceThumbnail';
import { isVideoSourceAvailable } from '@/lib/video-availability';
import type { Video } from '@/lib/types';
import {
    getAllSnapshotVideos,
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

    if (!isVideoSourceAvailable(video.videoUrl)) {
        return {
            title: `${video.title} (unavailable) - Animation Reference`,
            robots: { index: false, follow: true },
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
    if (!isVideoSourceAvailable(video.videoUrl)) return <UnavailableReference video={video} />;

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
                                <ReferenceThumbnail
                                    src={r.thumbnailUrl || r.posterUrl}
                                    videoUrl={r.videoUrl}
                                    alt={r.title}
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
                            {video.tags.slice(0, 10).map(t => {
                                const slug = slugifyTag(t);
                                if (!slug) return null;
                                return (
                                    <Link
                                        key={t}
                                        href={`/tags/${slug}`}
                                        className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                                    >
                                        #{t}
                                    </Link>
                                );
                            })}
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

/**
 * Shown for references whose video host has gone offline: a clear message
 * instead of a player that can never load, plus working alternatives.
 */
function UnavailableReference({ video }: { video: Video }) {
    let related: Video[] = [];
    try {
        related = getRelatedSnapshotVideos(video, 8);
        // Nothing shares its tags (common for a whole offline collection): suggest the newest references.
        if (related.length === 0) related = getAllSnapshotVideos().slice(0, 8);
    } catch { /* snapshot unavailable */ }

    return (
        <main className="container mx-auto max-w-5xl px-4 py-16 md:px-8">
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reference unavailable</p>
                <h1 className="mt-2 text-2xl font-black text-foreground md:text-3xl">{video.title}</h1>
                <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                    This clip was hosted by a third-party library that has gone offline, so it can’t be played right now.
                    We’re working on restoring it. In the meantime, these references are ready to study.
                </p>
                <Link href="/categories" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                    Browse the library
                </Link>
            </div>

            {related.length > 0 && (
                <section className="mt-12">
                    <h2 className="mb-4 text-xl font-bold text-foreground">Similar references you can watch</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {related.map(r => (
                            <Link key={r.id} href={`/video/${r.id}`} className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40">
                                <ReferenceThumbnail
                                    src={r.thumbnailUrl || r.posterUrl}
                                    videoUrl={r.videoUrl}
                                    alt={r.title}
                                    className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.02]"
                                />
                                <div className="p-3">
                                    <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{r.title}</h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}
