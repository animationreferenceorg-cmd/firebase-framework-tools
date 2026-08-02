
import { Metadata, ResolvingMetadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShortFilmDetailClient } from '@/components/ShortFilmDetailClient';
import type { Video } from '@/lib/types';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://animationreference.org';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getShort(id: string): Promise<Video | null> {
  try {
    const docRef = doc(db, "videos", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Video;
    }
  } catch (error) {
    console.error("Error fetching short for metadata:", error);
  }
  return null;
}

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = (await params).id;
  const video = await getShort(id);

  if (!video) {
    return {
      title: 'Short Not Found - Animation Reference',
    };
  }

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${video.title} - Animation Reference`,
    description: video.description || 'Watch this animation short on Animation Reference.',
    alternates: { canonical: `${BASE_URL}/shorts/${id}` },
    openGraph: {
      title: video.title,
      description: video.description,
      url: `https://animationreference.org/shorts/${id}`,
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

export default async function ShortFilmDetailPage(props: PageProps) {
  const params = await props.params;
  const video = await getShort(params.id);

  if (!video) {
    return <ShortFilmDetailClient id={params.id} />;
  }

  const pageUrl = `${BASE_URL}/shorts/${params.id}`;
  const videoSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description || 'Watch this animation short on Animation Reference.',
    thumbnailUrl: video.thumbnailUrl || video.posterUrl || `${BASE_URL}/site-icon.png`,
    contentUrl: video.videoUrl || undefined,
    embedUrl: pageUrl,
    url: pageUrl,
    keywords: video.tags?.join(', '),
    genre: 'Animation Short Film',
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
      { '@type': 'ListItem', position: 2, name: 'Short Films', item: `${BASE_URL}/shorts` },
      { '@type': 'ListItem', position: 3, name: video.title, item: pageUrl },
    ],
  };

  return (
    <>
      <ShortFilmDetailClient id={params.id} />
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
