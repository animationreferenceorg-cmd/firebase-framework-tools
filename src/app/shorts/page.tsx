
'use client';

import { HeroSection } from '@/components/HeroSection';
import { VideoRow } from '@/components/VideoRow';
import type { Video } from '@/lib/types';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

function VideoRowSkeleton({ poster }: { poster?: boolean }) {
    const items = poster ? 6 : 5;
    const aspect = poster ? 'aspect-video' : 'aspect-[16/9]';
    return (
        <div>
            <Skeleton className="h-8 w-1/4 mb-4" />
            <div className="flex space-x-4">
                {Array.from({ length: items }).map((_, i) => (
                     <div key={i} className="w-1/5 flex-shrink-0">
                        <Skeleton className={`w-full ${aspect} rounded-lg`} />
                    </div>
                ))}
            </div>
        </div>
    )
}


export default function ShortFilmsPage() {
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShorts = async () => {
        setLoading(true);
        const videosRef = collection(db, "videos");
        const q = query(videosRef, where("isShort", "==", true));
        
        const querySnapshot = await getDocs(q);
        const videos = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Video));

        setAllVideos(videos);

        if (videos.length > 0) {
            setFeaturedVideo(videos[videos.length - 1]); // Feature the last added short
        }
        setLoading(false);
    }
    fetchShorts();
  }, []);

  if (loading) {
     return (
        <main className="flex-1">
            <Skeleton className="w-full h-[56.25vw] max-h-[850px] min-h-[400px]" />
            <div className="container mx-auto px-4 md:px-6 space-y-8 pb-16">
               <div className="space-y-12 mt-8">
                  <VideoRowSkeleton poster />
                  <VideoRowSkeleton poster />
               </div>
            </div>
        </main>
    );
  }
  
  const trendingShorts = allVideos.slice(0, 7);

  return (
    <main className="flex-1">
      {featuredVideo && <HeroSection video={featuredVideo} isShort />}
      <div className="container mx-auto px-4 md:px-6 space-y-8 pb-16 pt-12">
        <VideoRow title="Trending Shorts" videos={trendingShorts} poster />
        <VideoRow title="All Short Films" videos={allVideos} poster />
      </div>
    </main>
  );
}
