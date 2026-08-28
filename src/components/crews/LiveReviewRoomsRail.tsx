'use client';

import React from 'react';
import { 
  Radio, 
  Users, 
  Headphones, 
  PenTool, 
  ExternalLink, 
  Sparkles,
  Layers,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface LiveReviewRoom {
  id: string;
  title: string;
  hostName: string;
  hostRole: string;
  hostAvatar: string;
  animatorCount: number;
  topic: string;
  thumbnailUrl: string;
  syncsketchUrl: string;
  animworksUrl: string;
  isLive: boolean;
}

export const MOCK_REVIEW_ROOMS: LiveReviewRoom[] = [
  {
    id: 'room-1',
    title: 'Combat Smear Frames & Heavy Impact Review',
    hostName: 'David Brent',
    hostRole: 'Lead Action Animator',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    animatorCount: 14,
    topic: '3-Frame Smears & Cape Secondary Motion',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
    syncsketchUrl: 'https://syncsketch.com',
    animworksUrl: 'https://anim.works',
    isLive: true,
  },
  {
    id: 'room-2',
    title: 'Creature Quadruped Weight & Prowl Critique',
    hostName: 'Elena Rostova',
    hostRole: 'Senior Creature Specialist',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    animatorCount: 8,
    topic: 'Quadruped Foot Plant & Scapula Overlap',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    syncsketchUrl: 'https://syncsketch.com',
    animworksUrl: 'https://anim.works',
    isLive: true,
  },
  {
    id: 'room-3',
    title: '11-Second Club Dialogue & Acting Polish',
    hostName: 'Sarah Chen',
    hostRole: 'Feature Character Animator',
    hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    animatorCount: 19,
    topic: 'Eye Darts, Lip-sync & Emotional Subtext',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    syncsketchUrl: 'https://syncsketch.com',
    animworksUrl: 'https://anim.works',
    isLive: true,
  },
];

export function LiveReviewRoomsRail() {
  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-red-500/20 text-red-400 animate-pulse">
            <Radio className="w-4 h-4" />
          </span>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Live Draw-Over & Sync Review Rooms
          </h3>
        </div>
        <span className="text-xs text-zinc-400 font-mono font-semibold">
          {MOCK_REVIEW_ROOMS.length} Active Sessions
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {MOCK_REVIEW_ROOMS.map((room) => (
          <div
            key={room.id}
            className="group relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.04] via-zinc-950 to-black p-4 shadow-xl hover:border-purple-500/50 hover:shadow-purple-950/40 transition-all duration-300 flex flex-col justify-between"
          >
            {/* Thumbnail with Live Badge */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-3.5 bg-black/60 border border-white/5">
              <img
                src={room.thumbnailUrl}
                alt={room.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

              {/* Live Status Pill */}
              <div className="absolute top-2.5 left-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-red-600/90 text-white font-mono font-black text-[9px] uppercase tracking-wider shadow-md backdrop-blur-md flex items-center gap-1.5 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  LIVE REVIEW
                </span>
              </div>

              {/* Viewers / Animators Count */}
              <div className="absolute top-2.5 right-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-black/70 border border-white/15 text-purple-200 font-mono font-bold text-[10px] backdrop-blur-md flex items-center gap-1">
                  <Users className="w-3 h-3 text-purple-400" />
                  {room.animatorCount} in Sync
                </span>
              </div>
            </div>

            {/* Room Info */}
            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 border border-purple-400/60">
                  <AvatarImage src={room.hostAvatar} alt={room.hostName} />
                  <AvatarFallback className="text-[10px] bg-zinc-800">{room.hostName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{room.hostName}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{room.hostRole}</p>
                </div>
              </div>

              <h4 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                {room.title}
              </h4>
              <p className="text-[11px] text-zinc-400 line-clamp-1">
                Focus: <span className="text-zinc-200">{room.topic}</span>
              </p>
            </div>

            {/* Launchers */}
            <div className="mt-auto pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
              <Button
                onClick={() => window.open(room.animworksUrl, '_blank')}
                size="sm"
                className="h-9 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Draw-over</span>
              </Button>

              <Button
                onClick={() => window.open(room.syncsketchUrl, '_blank')}
                size="sm"
                variant="outline"
                className="h-9 rounded-xl bg-white/5 hover:bg-white/15 text-blue-300 border-blue-500/30 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>SyncSketch</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
