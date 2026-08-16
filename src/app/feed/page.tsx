
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { Video } from '@/lib/types';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import { ShortsPlayer } from '@/components/ShortsPlayer';
import { Rss, Loader2, Sparkles, Heart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useInView } from 'react-intersection-observer';
import { useUser } from '@/hooks/use-user';
import { DonateDialog } from '@/components/DonateDialog';
import { PortfolioFounderDealModal } from '@/components/portfolio/PortfolioFounderDealModal';

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
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isFounderDealOpen, setIsFounderDealOpen] = useState(false);
  const { userProfile } = useUser();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1, // Trigger earlier
  });

  const fetchVideos = useCallback(async (isInitial = false) => {
    if (!isInitial) return; // For discovery, we fetch one large randomized batch
    setLoading(true);

    try {
      // All published non-shorts come from the free static snapshot
      const nonShorts = await getSnapshotVideos();

      // Randomize the order, cap the pool so the scroll DOM stays light
      const randomized = [...nonShorts].sort(() => Math.random() - 0.5).slice(0, 300);

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
    <div ref={scrollContainerRef} className="relative h-[calc(100dvh-140px)] w-full snap-y snap-mandatory overflow-y-auto overflow-x-hidden bg-background scrollbar-hide">


      {/* Bento Box Style Promotion Banner */}
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6 snap-start">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Bento Card: Animator Portfolios & $2 Deal */}
          <div
            onClick={() => setIsFounderDealOpen(true)}
            className="md:col-span-2 relative overflow-hidden rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-950 via-zinc-950 to-black p-6 shadow-2xl cursor-pointer hover:border-purple-400 hover:scale-[1.01] transition-all group flex flex-col justify-between min-h-[220px]"
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-md">
                <Sparkles className="h-3.5 w-3.5 fill-white" />
                🎉 NEW ANIMATOR PORTFOLIOS
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700/50 text-[10px] font-mono font-bold">
                🎁 7-DAY FREE TRIAL • $2/MO
              </span>
            </div>

            <div className="space-y-2 text-left my-3">
              <h3 className="text-2xl md:text-3xl font-black text-white group-hover:text-purple-300 transition-colors">
                Build & Share Your Portfolio with Recruiters
              </h3>
              <p className="text-xs text-zinc-300 line-clamp-2">
                Get your custom URL (<span className="text-purple-300 font-mono font-semibold">/yourname</span>), upload blocking passes, and scrub cover keyframes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all">
                <Sparkles className="h-3.5 w-3.5" /> Claim $2 Lifetime Deal
              </button>
            </div>
          </div>

          {/* Side Bento Card: $5 Community Supporter & Follow Artists */}
          <div
            onClick={() => setIsDonateOpen(true)}
            className="relative overflow-hidden rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/80 via-zinc-950 to-black p-5 shadow-2xl cursor-pointer hover:border-rose-400 hover:scale-[1.01] transition-all group flex flex-col justify-between min-h-[220px]"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-900/60 border border-rose-700/50 text-rose-300 font-mono text-[10px] font-bold">
                COMMUNITY SUPPORTER
              </span>
              <Heart className="h-5 w-5 text-rose-400 fill-rose-500/20 group-hover:scale-110 transition-transform" />
            </div>

            <div className="text-left space-y-1.5">
              <h4 className="text-lg font-black text-white group-hover:text-rose-300 transition-colors">
                $5 / Month Support Tier
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Help keep AnimationReference.org 100% free and follow your favorite artists in My Lists!
              </p>
            </div>

            <button className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition-all">
              <Heart className="h-3.5 w-3.5 fill-white" /> Donate $5 & Support
            </button>
          </div>
        </div>
      </div>

      {loading && videos.length === 0 ? (
        <FeedPlayerSkeleton />
      ) : videos.length > 0 ? (
        <>
          {videos.map((video) => (
            <section key={video.id} className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
              <ShortsPlayer video={video} scrollRootRef={scrollContainerRef} />
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

      <DonateDialog open={isDonateOpen} onOpenChange={setIsDonateOpen} />
      <PortfolioFounderDealModal open={isFounderDealOpen} onOpenChange={setIsFounderDealOpen} />
    </div>
  );
}
