
'use client';

import { useEffect, useState, useMemo } from 'react';
import { HeroSection } from '@/components/HeroSection';
import { VideoRow } from '@/components/VideoRow';
import type { Video } from '@/lib/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoGrid } from '@/components/VideoGrid';

function HomePageSkeleton() {
    const VideoRowSkeleton = () => (
         <div>
            <Skeleton className="h-8 w-1/4 mb-4" />
            <div className="flex space-x-4">
                {Array.from({ length: 5 }).map((_, i) => (
                     <div key={i} className="w-1/5 flex-shrink-0">
                        <Skeleton className="w-full aspect-video rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <main className="flex-1">
            <Skeleton className="w-full h-[56.25vw] max-h-[850px] min-h-[400px]" />
            <div className="container mx-auto px-4 md:px-6 space-y-12 pb-16 mt-8">
               <VideoRowSkeleton />
               <VideoRowSkeleton />
               <VideoRowSkeleton />
            </div>
        </main>
    );
}

// Function to shuffle an array
const shuffleArray = (array: any[]) => {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}


export default function HomePage() {
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
        setLoading(true);
        try {
            const videosCollection = collection(db, 'videos');
            const q = query(videosCollection, where("isShort", "!=", true));
            const videoSnapshot = await getDocs(q);
            const videosList = videoSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Video));
            setAllVideos(videosList);
        } catch (error) {
            console.error("Error fetching videos:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchVideos();
  }, []);
  
  const randomizedVideos = useMemo(() => shuffleArray([...allVideos]), [allVideos]);

  if (loading) {
    return <HomePageSkeleton />;
  }

  if (allVideos.length === 0) {
    return (
        <main className="flex-1 flex items-center justify-center text-center">
          <div>
            <h2 className="text-2xl font-bold">No Videos Yet</h2>
            <p className="text-muted-foreground">Add some videos in the admin panel to see them here.</p>
          </div>
        </main>
    );
  }

  const popularVideos: Video[] = allVideos.slice(0, 5);
  const nowPlayingVideos: Video[] = allVideos.slice(2, 7);
  const topRatedVideos: Video[] = [...allVideos].reverse().slice(0, 5);

  const featuredVideo = popularVideos[0];

  return (
    <main className="flex-1">
      {featuredVideo && <HeroSection video={featuredVideo} />}
      <div className="container mx-auto px-4 md:px-6 space-y-8 pb-16">
        <VideoRow title="Popular Now" videos={popularVideos.slice(1)} />
        <VideoRow title="Now Playing" videos={nowPlayingVideos} />
        <VideoRow title="Top Rated" videos={topRatedVideos} />
        <VideoGrid title="All Videos" videos={randomizedVideos} />
      </div>
    </main>
  );
}
