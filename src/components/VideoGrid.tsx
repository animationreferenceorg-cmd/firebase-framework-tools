'use client';

import type { Video } from '@/lib/types';
import { VideoCard } from './VideoCard';
import { cn } from '@/lib/utils';

interface VideoGridProps {
  title: string;
  videos: Video[];
  columns?: number;
}

export function VideoGrid({ title, videos, columns = 5 }: VideoGridProps) {
  if (!videos || videos.length === 0) {
    return null;
  }

  const getGridClass = () => {
    switch (columns) {
      case 2: return 'sm:grid-cols-2';
      case 3: return 'md:grid-cols-3';
      case 4: return 'md:grid-cols-4';
      case 6: return 'md:grid-cols-6';
      default: return 'md:grid-cols-5';
    }
  };

  return (
    <section>
      {title && <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">{title}</h2>}
      <div className={cn(
        "grid grid-cols-2 gap-4",
        getGridClass()
      )}>
        {videos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}
