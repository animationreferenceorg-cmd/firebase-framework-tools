
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { Video } from '@/lib/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Rss } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useInView } from 'react-intersection-observer';
import { VideoActionsBar } from '@/components/VideoActionsBar';
import { useUser } from '@/hooks/use-user';

function FeedPlayerSkeleton() {
  return (
    <section className="relative h-screen snap-start flex items-center justify-center p-4 md:p-8 lg:p-12">
      <div className="relative w-full h-full max-w-6xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
        <Skeleton className="w-full h-full" />
      </div>
    </section>
  )
}

const VIDEOS_PER_PAGE = 5;

export default function FeedPage() {
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [visibleVideos, setVisibleVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_PAGE);
  const { userProfile } = useUser();

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.5,
  });

  useEffect(() => {
    const fetchAndShuffle = async () => {
      setLoading(true);
      try {
        // Fetch ALL videos to ensure global randomization
        const q = query(collection(db, "videos"), where("isShort", "!=", true));
        const snapshot = await getDocs(q);
        const videos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Video));

        // Fisher-Yates Shuffle
        for (let i = videos.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [videos[i], videos[j]] = [videos[j], videos[i]];
        }

        setAllVideos(videos);
        setVisibleVideos(videos.slice(0, VIDEOS_PER_PAGE));
      } catch (error) {
        console.error("Error fetching feed videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAndShuffle();
  }, []);

  // Infinite Scroll: Load more from local shuffled array
  useEffect(() => {
    if (inView && !loading && visibleCount < allVideos.length) {
      // Small delay to prevent rapid-fire state updates
      const timeout = setTimeout(() => {
        const nextCount = visibleCount + VIDEOS_PER_PAGE;
        setVisibleCount(nextCount);
        setVisibleVideos(allVideos.slice(0, nextCount));
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [inView, loading, visibleCount, allVideos]);


  return (
    <div className="relative h-screen w-full snap-y snap-mandatory overflow-y-auto overflow-x-hidden bg-background scrollbar-hide">
      <header className="absolute top-0 left-0 z-20 p-6 flex items-center gap-2 text-white">
        <Rss className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Video Feed</h1>
      </header>

      {loading && allVideos.length === 0 ? (
        <FeedPlayerSkeleton />
      ) : visibleVideos.length > 0 ? (
        <>
          {visibleVideos.map((video) => (
            <section key={video.id} className="relative h-screen snap-start flex items-center justify-center p-4">
              <div className="relative aspect-video w-full max-w-6xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl bg-black group/videocontainer border border-white/10">
                <VideoPlayer video={video} />
                <VideoActionsBar video={video} userProfile={userProfile} />
              </div>
            </section>
          ))}

          {/* Loader for infinite scroll */}
          {visibleCount < allVideos.length && (
            <section ref={inViewRef} className="relative h-screen snap-start flex items-center justify-center p-4 md:p-8 lg:p-12">
              <div className="relative w-full h-full max-w-6xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
                <Skeleton className="w-full h-full" />
              </div>
            </section>
          )}

        </>
      ) : (
        <div className="h-screen snap-start flex items-center justify-center text-center text-white">
          <p>No videos found to populate the feed.</p>
        </div>
      )}
    </div>
  );
}
