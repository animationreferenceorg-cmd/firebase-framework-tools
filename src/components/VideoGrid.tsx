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
      {title && <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight mb-4 text-white">{title}</h2>}
      <div className={cn(
        "grid gap-2.5 sm:gap-4",
        getGridClass()
      )}>
        {videos.map((video, index) => (
          // Staggered entrance. A CSS animation rather than a motion component:
          // this grid can hold hundreds of cards, and each one mounting its own
          // JS animation would cost far more than a keyframe the browser runs
          // on the compositor. Delay cycles every 12 cards so each batch loaded
          // by infinite scroll gets its own short cascade instead of waiting
          // behind the previous one.
          <div
            key={video.id}
            className="animate-card-in"
            style={{ animationDelay: `${(index % 12) * 35}ms` }}
          >
            <VideoCard video={video} priority={index < 4} />
          </div>
        ))}
      </div>
    </section>
  );
}
