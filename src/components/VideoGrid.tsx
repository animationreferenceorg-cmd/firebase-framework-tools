'use client';

import type { Video } from '@/lib/types';
import { VideoCard } from './VideoCard';
import { cn } from '@/lib/utils';
import { memo, useLayoutEffect, useRef } from 'react';
import { isArtworkReference } from '@/lib/reference-feed';

interface VideoGridProps {
  title: string;
  videos: Video[];
  columns?: number;
  layout?: 'grid' | 'masonry';
}

export const VideoGrid = memo(function VideoGrid({ title, videos, columns = 4, layout = 'grid' }: VideoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (layout !== 'masonry' || !grid) return;
    const measure = (element: Element) => {
      const tile = element.parentElement;
      if (!tile) return;
      const gap = window.innerWidth < 640 ? 10 : 16;
      // Layout height ignores the entrance animation's temporary scale.
      tile.style.gridRowEnd = `span ${Math.ceil(((element as HTMLElement).offsetHeight + gap) / 4)}`;
    };
    // One observer for the grid, rather than a separate observer for every card.
    const observer = new ResizeObserver(entries => entries.forEach(entry => measure(entry.target)));
    grid.querySelectorAll('[data-masonry-content]').forEach(element => { measure(element); observer.observe(element); });
    return () => observer.disconnect();
  }, [videos, layout, columns]);

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
      <div ref={gridRef} data-layout={layout} className={cn(
        'grid gap-x-2.5 sm:gap-x-4',
        layout === 'masonry' ? 'auto-rows-[4px] items-start gap-y-0' : 'gap-y-2.5 sm:gap-y-4',
        getGridClass()
      )}>
        {videos.map((video, index) => (
          // Keep the first screen immediate when filters replace the grid.
          // Only cards beyond that screen get a short stagger on arrival.
          <div
            key={video.id}
            data-reference-id={video.id}
            className={index < 12 ? undefined : 'animate-card-in'}
            style={index < 12 ? undefined : { animationDelay: `${(index % 6) * 15}ms` }}
          >
            <div data-masonry-content={layout === 'masonry' ? '' : undefined}>
              <VideoCard video={video} priority={index < 4} layout={layout === 'masonry' && isArtworkReference(video) ? 'natural' : 'video'} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});
