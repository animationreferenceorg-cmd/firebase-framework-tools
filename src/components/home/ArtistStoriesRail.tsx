'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPublicPortfolioItems } from '@/lib/portfolio-service';
import type { PortfolioItem } from '@/lib/types';

interface ArtistStory {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  timeAgo: string;
  role: string;
}

/** Firestore timestamps arrive as {seconds}, ISO strings, or Date depending on
 * how the record was written. Normalise before formatting. */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as { seconds?: number }).seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** One bubble per artist, showing their most recent work-in-progress post. */
function toStories(items: PortfolioItem[]): ArtistStory[] {
  const newestByArtist = new Map<string, { item: PortfolioItem; at: Date | null }>();

  for (const item of items) {
    if (!item.userId || !item.authorName) continue;
    const at = toDate(item.createdAt);
    const existing = newestByArtist.get(item.userId);
    if (!existing || (at && existing.at && at > existing.at) || (at && !existing.at)) {
      newestByArtist.set(item.userId, { item, at });
    }
  }

  return [...newestByArtist.values()]
    .sort((a, b) => (b.at?.getTime() || 0) - (a.at?.getTime() || 0))
    .slice(0, 12)
    .map(({ item, at }) => ({
      id: item.id,
      userId: item.userId,
      name: item.authorName,
      avatar: item.authorAvatar,
      timeAgo: at ? `${formatDistanceToNowStrict(at)} ago` : '',
      role: item.wipStage || item.category || item.title,
    }));
}

export function ArtistStoriesRail() {
  const [stories, setStories] = useState<ArtistStory[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await getPublicPortfolioItems({ type: 'wip', limitCount: 60 });
        if (!cancelled) setStories(toStories(items));
      } catch {
        if (!cancelled) setStories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Until this returns real posts there is nothing honest to show, so the rail
  // stays out of the page rather than filling itself with invented artists.
  if (!stories || stories.length === 0) return null;

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between px-1">
        <h4 className="flex items-center gap-2 text-xs font-extrabold text-zinc-300 sm:text-sm">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span>Recent WIP Passes</span>
        </h4>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
        {/* + Add Yours Button */}
        <Link href="/profile?tab=studio&upload=true" className="group flex shrink-0 flex-col items-center gap-1.5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-purple-500/50 bg-purple-950/60 shadow-lg transition-all group-hover:scale-105 group-hover:border-pink-500 group-hover:bg-purple-900/80">
            <Plus className="h-6 w-6 text-purple-300 transition-colors group-hover:text-white" />
          </div>
          <span className="text-[11px] font-bold text-purple-300 transition-colors group-hover:text-white">
            + Post WIP
          </span>
        </Link>

        {stories.map((story) => (
          <Link
            key={story.id}
            href={`/u/${story.userId}`}
            className="group flex shrink-0 cursor-pointer flex-col items-center gap-1.5"
          >
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-md transition-transform duration-300 group-hover:scale-105">
                <Avatar className="h-full w-full rounded-full border-2 border-zinc-950">
                  {story.avatar ? <AvatarImage src={story.avatar} alt={story.name} /> : null}
                  <AvatarFallback className="bg-zinc-800 text-xs font-bold">
                    {story.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="max-w-[70px] text-center">
              <p className="truncate text-[11px] font-bold text-white transition-colors group-hover:text-purple-300">
                {story.name}
              </p>
              <p className="truncate text-[9px] text-zinc-400">{story.timeAgo}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
