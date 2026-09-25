'use client';

import React from 'react';
import type { Video } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { Scroller } from '@/components/home/ShelfRow';

/**
 * Ranked row with oversized outlined numerals — the streaming "Top 10"
 * device. The numeral sits behind the card and is partly covered by it, which
 * is what makes the rank read as a place on a podium rather than a label.
 */
export function Top10Row({ videos }: { videos: Video[] }) {
  const ranked = React.useMemo(
    () =>
      videos
        .filter((v) => !v.isShort && (v.thumbnailUrl || v.posterUrl) && v.status !== 'draft')
        .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0) || (b.viewCount ?? 0) - (a.viewCount ?? 0))
        .slice(0, 10),
    [videos]
  );

  if (ranked.length < 3) return null;

  return (
    <Scroller itemGap="gap-2">
      {ranked.map((video, i) => (
        <div key={video.id} className="relative flex shrink-0 snap-start items-end pl-2">
          <span
            aria-hidden
            className="pointer-events-none select-none font-display font-extrabold leading-[0.78] tracking-[-0.08em] text-transparent"
            style={{
              fontSize: 'clamp(7rem, 12vw, 11rem)',
              WebkitTextStroke: '2px rgba(196, 181, 253, 0.35)',
              // Enough overlap to tuck the numeral behind the card, not so much
              // that a narrow "1" disappears entirely.
              marginRight: '-0.55rem',
            }}
          >
            {i + 1}
          </span>
          <div className="relative w-[210px] md:w-[250px]">
            <span className="sr-only">Rank {i + 1}</span>
            <VideoCard video={video} />
          </div>
        </div>
      ))}
    </Scroller>
  );
}
