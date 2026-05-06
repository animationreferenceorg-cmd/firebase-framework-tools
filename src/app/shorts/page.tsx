
'use client';

import { HeroSection } from '@/components/HeroSection';
import { VideoRow } from '@/components/VideoRow';
import type { Video } from '@/lib/types';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';

function VideoRowSkeleton() {
  return (
    <div className="py-8">
      <Skeleton className="h-8 w-48 mb-6 ml-4 md:ml-12" />
      <div className="flex gap-4 px-4 md:px-12 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-[280px] md:w-[380px] flex-none">
            <Skeleton className="w-full aspect-video rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
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

      // Sort by creation date if available, otherwise natural order
      setAllVideos(videos);

      if (videos.length > 0) {
        // Feature the most recent or a specific one
        setFeaturedVideo(videos.find(v => v.title.includes("Sea of Lightning")) || videos[0]);
      }
      setLoading(false);
    }
    fetchShorts();
  }, []);

  if (loading) {
    return (
      <main className="flex-1 bg-[#030014]">
        <Skeleton className="w-full h-[56.25vw] max-h-[850px] min-h-[400px]" />
        <div className="w-full px-4 md:px-6 space-y-8 pb-16">
          <div className="space-y-12 mt-8">
            <VideoRowSkeleton />
            <VideoRowSkeleton />
          </div>
        </div>
      </main>
    );
  }

  // Categories based on tags/uploader
  const sciFiShorts = allVideos.filter(v => v.tags?.some(t => ['sci-fi', 'space', 'steampunk', 'future'].includes(t.toLowerCase())));
  const studioSpotlight = allVideos.filter(v => v.uploader?.includes('GOBELINS'));
  const dramaShorts = allVideos.filter(v => v.tags?.some(t => ['drama', 'storytelling', 'fantasy', 'cultural', 'artistic'].includes(t.toLowerCase())));
  const awardWinning = allVideos.filter(v => v.tags?.some(t => ['award-winning', 'curated'].includes(t.toLowerCase())));
  const actionShorts = allVideos.filter(v => v.tags?.some(t => ['action', 'combat', 'chase'].includes(t.toLowerCase())));
  const surrealShorts = allVideos.filter(v => v.tags?.some(t => ['surreal', 'experimental', 'abstract'].includes(t.toLowerCase())));
  const creatureShorts = allVideos.filter(v => v.tags?.some(t => ['creature', 'nature', 'animal'].includes(t.toLowerCase())));
  const humorShorts = allVideos.filter(v => v.tags?.some(t => ['humor', 'funny', 'comedy', 'dark humor'].includes(t.toLowerCase())));

  return (
    <main className="flex-1 bg-[#030014] min-h-screen">
      {/* 1. Hero Spotlight */}
      {featuredVideo && <HeroSection video={featuredVideo} isShort />}
      
      <div className="relative z-10 -mt-32 pb-24 space-y-4">
        {/* 2. Trending / New Releases */}
        <VideoRow 
          title="Trending Now" 
          videos={allVideos.slice(0, 8)} 
          isPoster={false} 
        />

        {/* 3. Action & Combat */}
        {actionShorts.length > 0 && (
          <VideoRow 
            title="Action & Combat" 
            videos={actionShorts} 
            isPoster={false} 
          />
        )}

        {/* 4. Humor & Character */}
        {humorShorts.length > 0 && (
          <VideoRow 
            title="Humor & Character" 
            videos={humorShorts} 
            isPoster={false} 
          />
        )}

        {/* 5. Studio Spotlight */}
        {studioSpotlight.length > 0 && (
          <VideoRow 
            title="Studio Spotlight: GOBELINS" 
            videos={studioSpotlight} 
            isPoster={false} 
          />
        )}

        {/* 6. Creature Animation */}
        {creatureShorts.length > 0 && (
          <VideoRow 
            title="Creature Animation" 
            videos={creatureShorts} 
            isPoster={false} 
          />
        )}

        {/* 7. Surreal & Experimental */}
        {surrealShorts.length > 0 && (
          <VideoRow 
            title="Surreal & Experimental" 
            videos={surrealShorts} 
            isPoster={false} 
          />
        )}

        {/* 8. Sci-Fi & Other Worlds */}
        {sciFiShorts.length > 0 && (
          <VideoRow 
            title="Sci-Fi & Other Worlds" 
            videos={sciFiShorts} 
            isPoster={false} 
          />
        )}

        {/* 9. Award Winning */}
        {awardWinning.length > 0 && (
          <VideoRow 
            title="Award Winning Shorts" 
            videos={awardWinning} 
            isPoster={false} 
          />
        )}

        {/* 10. Drama & Fantasy */}
        {dramaShorts.length > 0 && (
          <VideoRow 
            title="Drama & Fantasy" 
            videos={dramaShorts} 
            isPoster={false} 
          />
        )}

        {/* 7. All Library */}
        <VideoRow 
          title="Full Library" 
          videos={allVideos} 
          isPoster={false} 
        />
      </div>
    </main>
  );
}
