'use client';

import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { VideoCard } from '@/components/VideoCard';
import { Button } from '@/components/ui/button';
import type { Video } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface VideoRowProps {
  title: string;
  videos: Video[];
  viewAllLink?: string;
  isPoster?: boolean; // For 2:3 aspect ratio (Shorts) vs 16:9
}

export function VideoRow({ title, videos, viewAllLink, isPoster = false }: VideoRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.8;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!videos || videos.length === 0) return null;

  return (
    <div className="space-y-4 py-8 group/row">
      <div className="px-4 md:px-12 flex items-end justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{title}</h2>
        {viewAllLink && (
          <Link href={viewAllLink} className="text-sm font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="group relative">
        {/* Left Arrow */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 z-40 w-12 md:w-16 bg-gradient-to-r from-black/80 to-transparent flex items-center justify-start pl-2 md:pl-4 transition-opacity duration-300 pointer-events-none",
          showLeftArrow ? "opacity-100" : "opacity-0"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/60 border border-white/10 text-white hover:bg-white hover:text-black hover:scale-110 shadow-xl backdrop-blur-sm pointer-events-auto transition-all"
          >
            <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
          </Button>
        </div>

        {/* Scroll Container */}
        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-12 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {videos.map((video) => (
            <div
              key={video.id}
              className={cn(
                "flex-none snap-start",
                isPoster
                  ? "w-[160px] md:w-[220px]" // Vertical Shorts dimensions
                  : "w-[280px] md:w-[380px]" // 16:9 Landscape dimensions
              )}
            >
              <VideoCard video={video} poster={isPoster} />
            </div>
          ))}
          {/* Spacer for right padding */}
          <div className="w-8 md:w-12 flex-none" />
        </div>

        {/* Right Arrow */}
        <div className={cn(
          "absolute right-0 top-0 bottom-0 z-40 w-12 md:w-16 bg-gradient-to-l from-black/80 to-transparent flex items-center justify-end pr-2 md:pr-4 transition-opacity duration-300 pointer-events-none",
          showRightArrow ? "opacity-100" : "opacity-0"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/60 border border-white/10 text-white hover:bg-white hover:text-black hover:scale-110 shadow-xl backdrop-blur-sm pointer-events-auto transition-all"
          >
            <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
