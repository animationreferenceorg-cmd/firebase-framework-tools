'use client';

import React, { useMemo } from 'react';
import type { Video } from '@/lib/types';
import { useViewingQuota } from '@/hooks/use-viewing-quota';
import { SectionHeading } from '@/components/motion/SectionHeading';
import { VideoCard } from '@/components/VideoCard';
import { History, Sparkles } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface RecentlyViewedShelfProps {
  videos: Video[];
}

export function RecentlyViewedShelf({ videos }: RecentlyViewedShelfProps) {
  const quota = useViewingQuota();
  const unlockedIds = quota.unlockedIds;

  const recentVideos = useMemo(() => {
    if (!unlockedIds || unlockedIds.length === 0 || !videos || videos.length === 0) {
      return [];
    }
    const map = new Map<string, Video>();
    for (const v of videos) {
      if (v?.id) map.set(v.id, v);
    }

    const matches: Video[] = [];
    for (const id of unlockedIds) {
      const found = map.get(id);
      if (found) matches.push(found);
    }
    return matches;
  }, [unlockedIds, videos]);

  if (!quota.ready || recentVideos.length === 0) {
    return null;
  }

  return (
    <section id="recently-viewed" className="scroll-mt-28 space-y-5 pt-2">
      <SectionHeading
        eyebrow="Your Library"
        title="Recently Viewed References"
        aside={
          <span className="timecode rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[11px] font-bold text-purple-200">
            <History className="mr-1.5 inline h-3 w-3 -translate-y-px text-purple-400" />
            {recentVideos.length} {recentVideos.length === 1 ? 'clip' : 'clips'} · Re-watch anytime
          </span>
        }
      />

      <div className="relative">
        <Carousel
          opts={{
            align: 'start',
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {recentVideos.map((video) => (
              <CarouselItem
                key={video.id}
                className="pl-4 basis-[82%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
              >
                <VideoCard video={video} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4 border-white/10 hover:bg-white/10 hover:text-white" />
          <CarouselNext className="hidden md:flex -right-4 border-white/10 hover:bg-white/10 hover:text-white" />
        </Carousel>
      </div>
    </section>
  );
}
