
import { Metadata, ResolvingMetadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VideoDetailClient } from '@/components/VideoDetailClient';
import type { Video } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getVideo(id: string): Promise<Video | null> {
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

function toIsoDate(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
        const seconds = (value as { seconds?: number }).seconds;
        if (typeof seconds === 'number') return new Date(seconds * 1000).toISOString();
    }
    return undefined;
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
        };
    }

    const previousImages = (await parent).openGraph?.images || [];

    return {
        title: `${video.title} - Animation Reference`,
        description: video.description || 'Watch this animation reference on Animation Reference.',
        openGraph: {
            title: video.title,
            description: video.description,
            url: `https://animationreference.org/video/${id}`,
            siteName: 'Animation Reference',
            images: [
                {
                    url: video.thumbnailUrl || '/logo.png',
                    width: 1200,
                    height: 630,
                    alt: video.title,
                },
                ...previousImages,
            ],
            type: 'video.other',
        },
        twitter: {
            card: 'summary_large_image',
            title: video.title,
            description: video.description,
            images: [video.thumbnailUrl || '/logo.png'],
        },
    };
}

export default async function VideoPage({ params }: Props) {
    const id = (await params).id;
    const video = await getVideo(id);

    if (!video) return <VideoDetailClient id={id} initialData={null} />;

    const pageUrl = `https://animationreference.org/video/${id}`;
    const videoSchema = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: video.title,
        description: video.description || `Study this ${video.title} animation reference on Animation Reference.`,
        thumbnailUrl: video.thumbnailUrl || video.posterUrl || 'https://animationreference.org/site-icon.png',
        contentUrl: video.videoUrl || undefined,
        embedUrl: pageUrl,
        uploadDate: toIsoDate((video as Video & { createdAt?: unknown }).createdAt),
        url: pageUrl,
        keywords: video.tags?.join(', '),
    };

    return (
        <>
            <VideoDetailClient id={id} initialData={video} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
            />
        </>
    );
}
