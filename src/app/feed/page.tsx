
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { Video } from '@/lib/types';
import { collection, getDocs, query, where, limit, startAfter, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShortsPlayer } from '@/components/ShortsPlayer';
import { Rss, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useInView } from 'react-intersection-observer';
import { useUser } from '@/hooks/use-user';

function FeedPlayerSkeleton() {
  return (
    <section className="relative h-screen snap-start flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] aspect-[9/16] rounded-xl bg-muted animate-pulse" />
    </section>
  )
}

const VIDEOS_PER_PAGE = 5;

export default function FeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const { userProfile } = useUser();

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1, // Trigger earlier
  });

  const fetchVideos = useCallback(async (isInitial = false) => {
    if (!isInitial) return; // For discovery, we fetch one large randomized batch
    setLoading(true);

    try {
      const videosRef = collection(db, "videos");
      // Fetch a larger sample to randomize from, using the proven isShort filter
      const q = query(videosRef, where("isShort", "!=", true), limit(300));
      const snapshot = await getDocs(q);

      const nonShorts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Video));

      // Randomize the order
      const randomized = [...nonShorts].sort(() => Math.random() - 0.5);

      setVideos(randomized);
      setHasMore(false); // We show the full randomized pool
    } catch (error) {
      console.error("Error fetching feed videos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Fetch
  useEffect(() => {
    fetchVideos(true);
  }, []);

  // Infinite Scroll Trigger
  useEffect(() => {
    if (inView && !loading && !loadingMore && hasMore) {
      fetchVideos(false);
    }
  }, [inView, loading, loadingMore, hasMore, fetchVideos]);


  return (
    <div className="relative h-[calc(100dvh-140px)] w-full snap-y snap-mandatory overflow-y-auto overflow-x-hidden bg-background scrollbar-hide">


      {loading && videos.length === 0 ? (
        <FeedPlayerSkeleton />
      ) : videos.length > 0 ? (
        <>
          {videos.map((video) => (
            <section key={video.id} className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
              <ShortsPlayer video={video} />
            </section>
          ))}

          {/* Loader for infinite scroll */}
          {hasMore && (
            <section ref={inViewRef} className="relative h-full w-full snap-start snap-always flex items-center justify-center bg-black">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <p className="text-zinc-500 text-sm animate-pulse">Loading more inspiration...</p>
              </div>
            </section>
          )}

        </>
      ) : (
        <div className="h-full snap-start flex items-center justify-center text-center text-white">
          <p>No videos found to populate the feed.</p>
        </div>
      )}
    </div>
  );
}
