
'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Category, Video } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { HeroSection } from '@/components/HeroSection';
import { VideoRow } from '@/components/VideoRow';
import { useParams } from 'next/navigation';

export default function CategoryDetailPage() {
  const params = useParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const id = params.id as string;

  useEffect(() => {
    const fetchCategoryData = async () => {
      if (!id) return;
      setLoading(true);
      
      try {
        const categoryRef = doc(db, 'categories', id);
        const categorySnap = await getDoc(categoryRef);

        if (categorySnap.exists()) {
          const categoryData = { id: categorySnap.id, ...categorySnap.data() } as Category;
          setCategory(categoryData);

          // Fetch all videos for this category
          const videosQuery = query(collection(db, 'videos'), where('categoryIds', 'array-contains', id));
          const videosSnapshot = await getDocs(videosQuery);
          const videosList = videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
          
          setRelatedVideos(videosList);
          
          if (videosList.length > 0) {
            // Select a random video to be featured - this needs to be client-side to avoid hydration mismatch
            const randomIndex = Math.floor(Math.random() * videosList.length);
            setFeaturedVideo(videosList[randomIndex]);
          } else {
            // Fallback to the category's own media if it exists and there are no videos
            const heroVideoFromCategory = {
              id: categoryData.id,
              title: categoryData.title,
              description: categoryData.description,
              thumbnailUrl: categoryData.imageUrl,
              posterUrl: categoryData.imageUrl,
              videoUrl: categoryData.videoUrl || '',
              dataAiHint: '',
              tags: categoryData.tags,
              categoryIds: [categoryData.id],
            };
            setFeaturedVideo(heroVideoFromCategory);
          }
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error("Error fetching category data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [id]);

  if (loading) {
    return (
        <main className="flex-1">
            <Skeleton className="w-full h-[56.25vw] max-h-[850px] min-h-[400px]" />
            <div className="container mx-auto px-4 md:px-6 space-y-8 pb-16">
                <div className="mt-8">
                    <Skeleton className="h-8 w-1/4 mb-4" />
                    <div className="flex space-x-4">
                        <Skeleton className="h-28 w-1/5 rounded-lg" />
                        <Skeleton className="h-28 w-1/5 rounded-lg" />
                        <Skeleton className="h-28 w-1/5 rounded-lg" />
                        <Skeleton className="h-28 w-1/5 rounded-lg" />
                        <Skeleton className="h-28 w-1/5 rounded-lg" />
                    </div>
                </div>
            </div>
        </main>
    );
  }

  if (!category || !featuredVideo) {
    return <div className="text-center py-16">Category not found.</div>;
  }
  
  const otherVideos = relatedVideos.filter(v => v.id !== featuredVideo.id);

  return (
    <main className="flex-1">
      <HeroSection video={featuredVideo} />
       <div className="container mx-auto px-4 md:px-6 space-y-8 pb-16">
        <VideoRow title="Related Videos" videos={otherVideos} />
      </div>
    </main>
  );
}
