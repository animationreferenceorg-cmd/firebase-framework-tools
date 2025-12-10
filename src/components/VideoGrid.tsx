
'use client';

import { useState, useEffect } from 'react';
import type { Video } from '@/lib/types';
import { VideoCard } from './VideoCard';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from './ui/skeleton';

interface VideoGridProps {
  title: string;
  videos: Video[];
}

const VIDEOS_PER_PAGE = 12;

export function VideoGrid({ title, videos }: VideoGridProps) {
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

  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
