'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ArtistStory {
  id: string;
  name: string;
  avatar: string;
  timeAgo: string;
  role: string;
  isLive?: boolean;
}

const MOCK_STORIES: ArtistStory[] = [
  { id: '1', name: 'Elena R.', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', timeAgo: '12m ago', role: 'Creature WIP', isLive: true },
  { id: '2', name: 'Marcus V.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80', timeAgo: '45m ago', role: 'Combat Pass' },
  { id: '3', name: 'Kai Tanaka', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80', timeAgo: '2h ago', role: '2D FX Polish' },
  { id: '4', name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80', timeAgo: '3h ago', role: 'Facial Sync' },
  { id: '5', name: 'Liam O’Connor', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80', timeAgo: '5h ago', role: 'Locomotion' },
  { id: '6', name: 'Yuki Mori', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80', timeAgo: '7h ago', role: 'Smear Tests' },
  { id: '7', name: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80', timeAgo: '1d ago', role: 'Mech Walk' },
];

export function ArtistStoriesRail() {
  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs sm:text-sm font-extrabold text-zinc-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>From Creators You Follow • Recent WIP Passes</span>
        </h4>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
        {/* + Add Yours Button */}
        <Link href="/profile?tab=studio&upload=true" className="shrink-0 flex flex-col items-center gap-1.5 group">
          <div className="h-16 w-16 rounded-full bg-purple-950/60 border-2 border-dashed border-purple-500/50 group-hover:border-pink-500 group-hover:bg-purple-900/80 transition-all flex items-center justify-center shadow-lg group-hover:scale-105">
            <Plus className="w-6 h-6 text-purple-300 group-hover:text-white transition-colors" />
          </div>
          <span className="text-[11px] font-bold text-purple-300 group-hover:text-white transition-colors">
            + Post WIP
          </span>
        </Link>

        {/* Artist Avatars */}
        {MOCK_STORIES.map((story) => (
          <Link
            key={story.id}
            href="/feed"
            className="shrink-0 flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="relative">
              <div className={cn(
                "h-16 w-16 rounded-full p-0.5 transition-transform duration-300 group-hover:scale-105 shadow-md",
                story.isLive
                  ? "bg-gradient-to-tr from-rose-500 via-purple-500 to-amber-400 animate-pulse"
                  : "bg-gradient-to-tr from-purple-600 to-pink-500"
              )}>
                <Avatar className="h-full w-full rounded-full border-2 border-zinc-950">
                  <AvatarImage src={story.avatar} alt={story.name} />
                  <AvatarFallback className="bg-zinc-800 text-xs font-bold">{story.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>

              {story.isLive && (
                <span className="absolute bottom-0 right-0 px-1 py-0.2 rounded-full bg-red-600 text-white font-mono font-black text-[8px] uppercase tracking-wider border border-zinc-950">
                  LIVE
                </span>
              )}
            </div>

            <div className="text-center max-w-[70px]">
              <p className="text-[11px] font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                {story.name}
              </p>
              <p className="text-[9px] text-zinc-400 truncate">
                {story.timeAgo}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
