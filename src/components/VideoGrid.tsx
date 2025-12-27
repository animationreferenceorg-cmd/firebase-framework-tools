
'use client';

import { useState, useEffect } from 'react';
import type { Video } from '@/lib/types';
import { VideoCard } from './VideoCard';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

interface VideoGridProps {
  title: string;
  videos: Video[];
  columns?: number; // Optional, defaults to 5 or responsive default
}

const VIDEOS_PER_PAGE = 12;

export function VideoGrid({ title, videos, columns = 5 }: VideoGridProps) {
  const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_PAGE);
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  useEffect(() => {
    if (inView && visibleCount < videos.length) {
      // Load more videos
      setVisibleCount(prevCount => prevCount + VIDEOS_PER_PAGE);
    }
  }, [inView, videos.length, visibleCount]);

  if (!videos || videos.length === 0) {
    return null;
  }

  const visibleVideos = videos.slice(0, visibleCount);

  // Dynamic Grid Class
  // We use style for explicit col count or fallback to tailwind for responsiveness
  // Tailwind Arbitrary values for grid-template-columns might be cleaner: `grid-cols-[repeat(N,minmax(0,1fr))]`
  // But standard classes are safer for JIT.

  const getGridClass = () => {
    // Base: Mobile 1 col, SM 2 col.
    // MD+ we use the selected column count.
    switch (columns) {
      case 2: return 'sm:grid-cols-2'; // Force 2 cols even on small screens if desired, or 'md:grid-cols-2'
      case 3: return 'md:grid-cols-3';
      case 4: return 'md:grid-cols-4';
      case 6: return 'md:grid-cols-6';
      default: return 'md:grid-cols-5'; // Default 5
    }
  };

  return (
    <section>
      {title && <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">{title}</h2>}
      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 gap-4",
        getGridClass()
      )}>
        {visibleVideos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* Loader */}
      {visibleCount < videos.length && (
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: Math.min(VIDEOS_PER_PAGE, videos.length - visibleCount) }).map((_, index) => (
            <Skeleton key={`loader-${index}`} className="w-full aspect-video rounded-lg" />
          ))}
        </div>
      )}
    </section>
  );
}
