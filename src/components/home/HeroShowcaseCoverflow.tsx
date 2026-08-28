'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Eye, 
  Flame, 
  PenTool, 
  ArrowRight,
  Megaphone,
  Radio,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ShowcaseSlide {
  id: string;
  type: 'featured_reel' | 'announcement' | 'community_wip' | 'live_review';
  badgeLabel: string;
  badgeColor: string;
  title: string;
  creatorName: string;
  creatorRole: string;
  creatorAvatar: string;
  description: string;
  statsLabel: string; // e.g. "14.2k views" or "Maya • Blender"
  imageUrl: string;
  videoUrl?: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

export const SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    id: 'slide-1',
    type: 'featured_reel',
    badgeLabel: '🔥 FEATURED SHOWREEL OF THE WEEK',
    badgeColor: 'bg-rose-500/90 text-white',
    title: 'Kitsune: Stylized Quadruped Weight & Locomotion',
    creatorName: 'Elena Rostova',
    creatorRole: 'Lead Creature Animator • Riot / Fortiche',
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    description: 'Breakdown of quadruped weight shifts, dynamic tail overlap, and extreme posing.',
    statsLabel: '18.4k Animators Studied • 24 FPS',
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    primaryActionLabel: 'Watch Breakdown',
    primaryActionHref: '/feed',
    secondaryActionLabel: 'Draw-over in Anim.works',
    secondaryActionHref: 'https://anim.works',
  },
  {
    id: 'slide-2',
    type: 'community_wip',
    badgeLabel: '🎬 IN PRODUCTION & RECRUITING',
    badgeColor: 'bg-purple-600/90 text-white',
    title: 'Cyber Ronin: Subterranean Katana Duel',
    creatorName: 'Marcus Vance & Crew',
    creatorRole: 'Indie 3D Short Film • 5/12 Shots Approved',
    creatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    description: 'High-speed action choreography in Unreal 5. Looking for 3D Riggers and FX animators.',
    statsLabel: '8 Shots in Pipeline • Unreal 5 & Maya',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    primaryActionLabel: 'Open Project Shot Board',
    primaryActionHref: '/studio/projects/proj-cyber-ronin',
    secondaryActionLabel: 'Support ($1,150 / $2,500)',
    secondaryActionHref: '/studio/projects/proj-cyber-ronin',
  },
  {
    id: 'slide-3',
    type: 'live_review',
    badgeLabel: '🔴 LIVE SYNC ROOM TONIGHT',
    badgeColor: 'bg-red-600 text-white animate-pulse',
    title: 'Community Critique Night: Combat & Mechanics',
    creatorName: 'Animation Reference Club',
    creatorRole: 'Live Frame-by-Frame Draw-overs & Review',
    creatorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    description: 'Submit your shot for live industry feedback from feature and game animators.',
    statsLabel: 'Starts 7:00 PM EST • SyncSketch & Discord',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    primaryActionLabel: 'Join Sync Review Room',
    primaryActionHref: 'https://syncsketch.com',
    secondaryActionLabel: 'Submit Your Shot',
    secondaryActionHref: '/studio/projects',
  },
  {
    id: 'slide-4',
    type: 'announcement',
    badgeLabel: '✨ NEW REFERENCE PACK',
    badgeColor: 'bg-amber-500/90 text-black font-black',
    title: '2D/3D Smear Frames & Motion FX Master Pack',
    creatorName: 'Studio Reference Curators',
    creatorRole: 'Over 450+ Frame-by-Frame Reference Cuts',
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    description: 'Studying extreme motion smears, speedlines, and anime-style silhouette transitions.',
    statsLabel: '450+ HD Clips • 120 FPS High-Speed',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
    primaryActionLabel: 'Explore Smear References',
    primaryActionHref: '/categories',
  },
];

export function HeroShowcaseCoverflow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length);
  };

  // Auto slide every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  return (
    <div className="relative w-full py-4 overflow-hidden select-none">
      {/* Edge Gradient Vignettes for Seamless 3D Cover Flow Fade */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#13111c] to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#13111c] to-transparent z-20 pointer-events-none" />
      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3.5 rounded-full bg-black/70 hover:bg-purple-600 border border-white/15 text-white backdrop-blur-xl transition-all hover:scale-110 shadow-2xl group cursor-pointer"
        aria-label="Previous Spotlight"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3.5 rounded-full bg-black/70 hover:bg-purple-600 border border-white/15 text-white backdrop-blur-xl transition-all hover:scale-110 shadow-2xl group cursor-pointer"
        aria-label="Next Spotlight"
      >
        <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* 3D Fan-out Stage (Cover Flow Deck) */}
      <div className="relative h-[400px] sm:h-[440px] md:h-[480px] w-full flex items-center justify-center [perspective:1400px]">
        {SHOWCASE_SLIDES.map((slide, idx) => {
          // Calculate offset relative to current active slide
          let offset = idx - currentIndex;
          if (offset < -1) offset += SHOWCASE_SLIDES.length;
          if (offset > 1) offset -= SHOWCASE_SLIDES.length;

          const isCenter = offset === 0;
          const isLeft = offset === -1 || (offset > 0 && offset !== 1);
          const isRight = offset === 1;

          // Determine 3D Transform and Positioning
          let transformStyle = 'translate3d(0, 0, 0) scale(1) rotateY(0deg)';
          let zIndex = 20;
          let opacity = 1;

          if (isCenter) {
            transformStyle = 'translate3d(0%, 0, 90px) scale(1) rotateY(0deg)';
            zIndex = 25;
            opacity = 1;
          } else if (isLeft) {
            transformStyle = 'translate3d(-42%, 0, -60px) scale(0.88) rotateY(12deg)';
            zIndex = 10;
            opacity = 0.5;
          } else if (isRight) {
            transformStyle = 'translate3d(42%, 0, -60px) scale(0.88) rotateY(-12deg)';
            zIndex = 10;
            opacity = 0.5;
          } else {
            transformStyle = 'translate3d(0, 0, -250px) scale(0.65) rotateY(0deg)';
            zIndex = 1;
            opacity = 0;
          }

          return (
            <div
              key={slide.id}
              onClick={() => setCurrentIndex(idx)}
              style={{
                transform: transformStyle,
                zIndex,
                opacity,
              }}
              className={cn(
                "absolute w-[90%] sm:w-[82%] md:w-[760px] lg:w-[820px] h-[360px] sm:h-[400px] md:h-[440px] rounded-[32px] overflow-hidden transition-all duration-700 ease-out cursor-pointer shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/10 bg-zinc-950 flex flex-col justify-end p-6 sm:p-8 text-left",
                isCenter ? "ring-1 ring-purple-500/40 shadow-purple-950/60" : "hover:opacity-85 pointer-events-auto"
              )}
            >
              {/* Background Backdrop Media */}
              <div className="absolute inset-0 bg-zinc-950">
                {isCenter && slide.videoUrl ? (
                  <video
                    src={slide.videoUrl}
                    poster={slide.imageUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover opacity-60 transition-opacity duration-700"
                  />
                ) : (
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                )}
                {/* Vignette Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-zinc-950/80 pointer-events-none" />
              </div>

              {/* Top Row Badges */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-auto">
                <div className="flex items-center gap-2">
                  <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md", slide.badgeColor)}>
                    {slide.badgeLabel}
                  </span>
                </div>

                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-xs font-mono font-bold text-purple-200">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>{slide.statsLabel}</span>
                </div>
              </div>

              {/* Content Box */}
              <div className="relative z-10 space-y-3 max-w-2xl">
                {/* Creator Attribution */}
                <div className="flex items-center gap-2.5">
                  <img
                    src={slide.creatorAvatar}
                    alt={slide.creatorName}
                    className="h-9 w-9 rounded-full object-cover border-2 border-purple-400/80 shadow-md"
                  />
                  <div>
                    <h5 className="text-sm font-extrabold text-white leading-tight">
                      {slide.creatorName}
                    </h5>
                    <p className="text-[11px] text-purple-300 font-medium leading-tight">
                      {slide.creatorRole}
                    </p>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-lg leading-tight line-clamp-2">
                  {slide.title}
                </h3>

                {/* Description */}
                <p className="hidden sm:block text-xs md:text-sm text-zinc-300 line-clamp-2 leading-relaxed font-medium">
                  {slide.description}
                </p>

                {/* Action Buttons (Only visible when active in center) */}
                {isCenter && (
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Link href={slide.primaryActionHref}>
                      <Button className="h-11 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold text-xs shadow-xl shadow-purple-950/60 flex items-center gap-2 hover:scale-105 transition-all">
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{slide.primaryActionLabel}</span>
                      </Button>
                    </Link>

                    {slide.secondaryActionLabel && slide.secondaryActionHref && (
                      <Link href={slide.secondaryActionHref} target={slide.secondaryActionHref.startsWith('http') ? '_blank' : '_self'}>
                        <Button variant="outline" className="h-11 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border-white/15 font-bold text-xs backdrop-blur-md flex items-center gap-1.5">
                          <PenTool className="w-3.5 h-3.5 text-purple-300" />
                          <span>{slide.secondaryActionLabel}</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide Dots Indicator */}
      <div className="flex items-center justify-center gap-2 mt-3">
        {SHOWCASE_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              currentIndex === idx ? "w-8 bg-purple-500 shadow-md shadow-purple-500/50" : "w-2 bg-white/20 hover:bg-white/40"
            )}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
