'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Upload, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Video } from '@/lib/types';

interface HomeHeroBannerProps {
  video?: Video | null;
}

export function HomeHeroBanner({ video }: HomeHeroBannerProps) {
  const heroVideoRef = React.useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);
  const playbackUrl = video?.videoUrl?.includes('playlist.m3u8')
    ? video.videoUrl.replace('playlist.m3u8', 'play_480p.mp4')
    : video?.videoUrl;

  React.useEffect(() => {
    setIsVideoPlaying(false);
    const player = heroVideoRef.current;
    if (!player || !playbackUrl) return;

    player.muted = true;
    player.defaultMuted = true;
    const startPlayback = () => {
      void player.play().catch(() => {
        // The poster remains visible if a browser explicitly blocks autoplay.
      });
    };

    startPlayback();
    player.addEventListener('canplay', startPlayback);
    return () => player.removeEventListener('canplay', startPlayback);
  }, [playbackUrl]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-[#09090e] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.9)] mb-10 select-none">
      
      {/* Keep the loading state abstract so the hero never flashes a static poster. */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_10%,rgba(126,34,206,0.3),transparent_45%),linear-gradient(135deg,#09090e,#160b24_55%,#09090e)]" />
      {playbackUrl && (
        <div
          className={`absolute inset-0 z-[1] pointer-events-none transition-opacity duration-500 ${isVideoPlaying ? 'opacity-55' : 'opacity-0'}`}
          aria-hidden="true"
        >
          <video
            ref={heroVideoRef}
            data-hero-video
            src={playbackUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onPlaying={() => setIsVideoPlaying(true)}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/35 via-black/65 to-[#09090e] z-[2]" />

      {/* Hero Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-20 md:py-28 max-w-5xl mx-auto space-y-7">
        
        {/* Top Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-md shadow-inner text-xs font-bold text-zinc-300">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
          <span>The Creator Reference & Discovery Hub</span>
        </div>

        {/* Giant Bold Headline */}
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-none drop-shadow-2xl">
            Discover Animation
          </h1>
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-2xl py-1">
            Your Professional Portfolio
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-zinc-300 max-w-2xl font-medium leading-relaxed drop-shadow">
          Showcase your animation work, get discovered by studios, and collaborate with top animators worldwide.
        </p>

        {/* Call To Action Button */}
        <div className="pt-3">
          <Link href="/profile?tab=portfolio">
            <Button size="lg" className="h-14 px-9 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-base shadow-[0_0_40px_rgba(217,70,239,0.5)] border border-pink-400/40 transition-all hover:scale-105 flex items-center gap-2.5">
              <Upload className="w-5 h-5 text-white" />
              <span>Build Your Portfolio</span>
            </Button>
          </Link>
        </div>

        {/* Bottom Feature Ticker Ribbon */}
        <div className="w-full pt-8">
          <div className="inline-flex items-center justify-center gap-6 px-6 py-2.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-xs font-mono font-bold text-purple-200 backdrop-blur-xl overflow-hidden max-w-full">
            <div className="flex items-center gap-2 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Get discovered by industry studios</span>
            </div>
            <span className="text-purple-500/50">•</span>
            <div className="flex items-center gap-2 shrink-0">
              <Users className="w-3.5 h-3.5 text-pink-400" />
              <span>Collaborate with top animators</span>
            </div>
            <span className="text-purple-500/50">•</span>
            <div className="flex items-center gap-2 shrink-0">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Build your professional portfolio</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
