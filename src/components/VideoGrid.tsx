'use client';

import type { Video } from '@/lib/types';
import { VideoCard } from './VideoCard';
import { cn } from '@/lib/utils';

interface VideoGridProps {
  title: string;
  videos: Video[];
  columns?: number;
}

export function VideoGrid({ title, videos, columns = 4 }: VideoGridProps) {
  if (!videos || videos.length === 0) {
    return null;
  }

  const getGridClass = () => {
    switch (columns) {
      case 2: return 'grid-cols-2 sm:grid-cols-2';
      case 3: return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3';
      case 4: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      case 6: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
      default: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5';
    }
  };

  return (
    <section>
      {title && <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">{title}</h2>}
      <div className={cn(
        "grid gap-2.5 sm:gap-4",
        getGridClass()
      )}>
        {videos.map((video, index) => (
          <VideoCard key={video.id} video={video} priority={index < 4} />
        ))}
      </div>
    </section>
  );
}
