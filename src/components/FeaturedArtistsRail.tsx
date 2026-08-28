'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Star, ArrowRight, Play, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FeaturedArtist {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  role: string;
  tags: string[];
  featuredShotUrl: string;
  featuredShotThumbnail: string;
  likesCount: number;
  isPro?: boolean;
}

export const FEATURED_ARTISTS: FeaturedArtist[] = [
  {
    id: 'artist-1',
    name: 'Elena Rostova',
    username: 'elena_anim',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    role: 'Lead 3D Creature Animator',
    tags: ['Maya', 'Quadruped', 'Creature'],
    featuredShotUrl: '',
    featuredShotThumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    likesCount: 1420,
    isPro: true,
  },
  {
    id: 'artist-2',
    name: 'Marcus Vance',
    username: 'vance_fx',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    role: 'Combat & Action Choreographer',
    tags: ['Blender', 'Martial Arts', 'Keyframe'],
    featuredShotUrl: '',
    featuredShotThumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    likesCount: 980,
    isPro: true,
  },
  {
    id: 'artist-3',
    name: 'Yuki Tanaka',
    username: 'yuki_2d',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    role: '2D Feature & Acting Animator',
    tags: ['ToonBoom', 'Acting', 'Lip Sync'],
    featuredShotUrl: '',
    featuredShotThumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    likesCount: 2150,
    isPro: true,
  },
  {
    id: 'artist-4',
    name: 'David Miller',
    username: 'miller_rigs',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    role: 'Locomotion & Body Mechanics',
    tags: ['Unreal 5', 'Parkour', 'Physics'],
    featuredShotUrl: '',
    featuredShotThumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    likesCount: 840,
    isPro: false,
  },
];

export function FeaturedArtistsRail() {
  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Featured Showreel Spotlight & Artists
            </h3>
            <p className="text-xs text-zinc-400 font-medium">
              Discover top community animators, study their shot breakdowns, and follow their portfolios.
            </p>
          </div>
        </div>

        <Link
          href="/profile?tab=studio&upload=true"
          className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-purple-300 hover:text-purple-200 transition-colors"
        >
          <span>Submit for Spotlight</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Horizontal Scrollable Artist Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURED_ARTISTS.map((artist) => (
          <div
            key={artist.id}
            className="group relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.04] to-zinc-950 p-4 shadow-xl hover:border-purple-500/50 hover:shadow-purple-950/40 transition-all duration-300 flex flex-col justify-between"
          >
            {/* Top Shot Preview with Cover */}
            <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden mb-3.5 bg-black/40 border border-white/5">
              <Image
                src={artist.featuredShotThumbnail}
                alt={artist.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              
              {/* Badge */}
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-mono font-bold text-zinc-300">
                  ❤️ {artist.likesCount}
                </span>
              </div>

              {/* Hover Play Prompt */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                <div className="p-2.5 rounded-full bg-purple-600/90 text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Artist Info */}
            <div className="flex items-start gap-3 mb-3 text-left">
              <Avatar className="h-10 w-10 border border-white/15 shrink-0 shadow-md">
                <AvatarImage src={artist.avatarUrl} alt={artist.name} />
                <AvatarFallback className="bg-purple-950 text-purple-200 text-xs font-bold">
                  {artist.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-white truncate group-hover:text-purple-300 transition-colors">
                    {artist.name}
                  </h4>
                  {artist.isPro && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 font-medium truncate">
                  {artist.role}
                </p>
              </div>
            </div>

            {/* Software / Specialty Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {artist.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] text-zinc-400 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-auto pt-2 border-t border-white/5 flex items-center gap-2">
              <Link href={`/profile`} className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs font-bold bg-white/5 hover:bg-white/15 text-white border-white/10 hover:border-purple-500/40 rounded-xl"
                >
                  View Showreel
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
