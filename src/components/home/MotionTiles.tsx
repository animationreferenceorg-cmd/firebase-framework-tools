'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Video } from '@/lib/types';
import { MOTION_CATEGORIES, type MotionCategory, isDirectVideo, matchesMotion, previewSrc, shuffle } from '@/lib/motion-filters';
import { cn } from '@/lib/utils';

interface TileData {
  id: MotionCategory;
  label: string;
  blurb: string;
  count: number;
  poster?: string;
  clip?: string;
}

/**
 * "Browse by motion": one tile per kind of movement, each fronted by a real
 * clip from that category. The footage only mounts while the tile is hovered
 * or focused, so six idle tiles cost six images, not six videos.
 */
export function MotionTiles({
  videos,
  faces,
  onPick,
}: {
  /** Full library — used for the counts, so they stay honest during an outage. */
  videos: Video[];
  /** Clips whose media is currently loading — used for the tile artwork. */
  faces?: Video[];
  onPick: (category: MotionCategory) => void;
}) {
  const tiles = React.useMemo<TileData[]>(() => {
    const pool = videos.filter((v) => !v.isShort);
    const facePool = (faces ?? videos).filter((v) => !v.isShort);
    return MOTION_CATEGORIES.map((cat) => {
      const matches = pool.filter((v) => matchesMotion(v, cat.id));
      const faceCandidates = facePool.filter((v) => matchesMotion(v, cat.id) && (v.thumbnailUrl || v.posterUrl));
      // Prefer a clip that can also play on hover; fall back to any image.
      const face = shuffle(faceCandidates.filter((v) => isDirectVideo(v.videoUrl)))[0] ?? shuffle(faceCandidates)[0];
      return {
        ...cat,
        count: matches.length,
        poster: face?.thumbnailUrl || face?.posterUrl,
        clip: isDirectVideo(face?.videoUrl) ? previewSrc(face?.videoUrl) : undefined,
      };
    });
  }, [videos, faces]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile, i) => (
        <Tile key={tile.id} tile={tile} index={i} onPick={onPick} />
      ))}
    </div>
  );
}

function Tile({ tile, index, onPick }: { tile: TileData; index: number; onPick: (c: MotionCategory) => void }) {
  const [active, setActive] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <button
      type="button"
      onClick={() => onPick(tile.id)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      aria-label={`Browse ${tile.label} references (${tile.count.toLocaleString()})`}
      className={cn(
        'squash group/tile relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#14121d] text-left shadow-lift ring-1 ring-white/[0.06]',
        'animate-card-in transition-[transform,box-shadow] duration-500 ease-out-expo hover:-translate-y-1.5 hover:shadow-onion focus-visible:-translate-y-1.5 focus-visible:shadow-onion'
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {tile.poster && !imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tile.poster}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition-[opacity,transform] duration-700 ease-out-expo group-hover/tile:scale-110 group-hover/tile:opacity-30"
        />
      )}
      {active && tile.clip && (
        <video
          src={tile.clip}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover animate-fade-in"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />

      <span className="timecode absolute right-2.5 top-2.5 rounded-md border border-white/10 bg-black/45 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur-md">
        {tile.count.toLocaleString()}
      </span>

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <div className="flex items-end justify-between gap-2">
          <h3 className="font-display text-lg font-bold leading-none tracking-tight text-white md:text-xl">{tile.label}</h3>
          <ArrowUpRight className="h-4 w-4 shrink-0 -translate-x-1 translate-y-1 text-white opacity-0 transition-all duration-300 ease-overshoot group-hover/tile:translate-x-0 group-hover/tile:translate-y-0 group-hover/tile:opacity-100" />
        </div>
        {/* The blurb unfolds on hover rather than cluttering six idle tiles. */}
        <p className="grid grid-rows-[0fr] text-xs text-zinc-300 transition-[grid-template-rows] duration-500 ease-out-expo group-hover/tile:grid-rows-[1fr] group-focus-visible/tile:grid-rows-[1fr]">
          <span className="overflow-hidden pt-0 group-hover/tile:pt-1.5">{tile.blurb}</span>
        </p>
      </div>
    </button>
  );
}
