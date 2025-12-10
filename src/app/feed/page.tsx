
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { Video } from '@/lib/types';
import { collection, getDocs, query, where, limit, startAfter, orderBy, DocumentData } from 'firebase/firestore';
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
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { userProfile } = useUser();

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.5,
  });

  const fetchFeedVideos = useCallback(async (isInitialLoad = false) => {
    if (loadingMore || !hasMore) return;

    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let q;
      const videosRef = collection(db, "videos");
      
      const constraints = [
          where("isShort", "!=", true),
          orderBy('__name__'), // Order by document ID for consistent pagination
          limit(VIDEOS_PER_PAGE)
      ];

      if (lastVisible && !isInitialLoad) {
          q = query(videosRef, ...constraints, startAfter(lastVisible));
      } else {
          q = query(videosRef, ...constraints);
      }
      
      const querySnapshot = await getDocs(q);
      const newVideos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as Video));

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc || null);
      
      setHasMore(newVideos.length === VIDEOS_PER_PAGE);

      setVideos(prev => isInitialLoad ? newVideos : [...prev, ...newVideos]);

    } catch (error) {
      console.error("Error fetching feed videos:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastVisible, loadingMore, hasMore]);

  useEffect(() => {
    fetchFeedVideos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inView && !loading && hasMore) {
      fetchFeedVideos();
    }
  }, [inView, loading, hasMore, fetchFeedVideos]);


  return (
    <div className="relative h-screen w-full snap-y snap-mandatory overflow-y-auto overflow-x-hidden bg-background">
      <header className="absolute top-0 left-0 z-20 p-6 flex items-center gap-2 text-white">
        <Rss className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Video Feed</h1>
      </header>
      
      {loading && videos.length === 0 ? (
        <FeedPlayerSkeleton />
      ) : videos.length > 0 ? (
        <>
          {videos.map((video) => (
            <section key={video.id} className="relative h-screen snap-start flex items-center justify-center">
                <div className="relative w-full h-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-black group/videocontainer">
                  <VideoPlayer video={video} />
                  <VideoActionsBar video={video} userProfile={userProfile} />
                </div>
            </section>
          ))}
          
          {/* Loader for infinite scroll */}
          {hasMore && (
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
