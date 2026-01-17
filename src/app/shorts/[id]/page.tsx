
import { Metadata, ResolvingMetadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShortFilmDetailClient } from '@/components/ShortFilmDetailClient';
import type { Video } from '@/lib/types';

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
  return <ShortFilmDetailClient id={params.id} />;
}
