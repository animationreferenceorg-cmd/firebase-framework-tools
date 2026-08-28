'use client';

import React, { useState, useEffect } from 'react';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Play, Sparkles, PenTool, Plus, Volume2, VolumeX, CheckCircle2, ArrowRight, Eye, Heart } from 'lucide-react';
import ReactPlayer from 'react-player/lazy';
import Link from 'next/link';

interface ShowreelSpotlightHeroProps {
  video: Video;
}

export function ShowreelSpotlightHero({ video }: ShowreelSpotlightHeroProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowVideo(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const artistName = video.uploader || 'Marcus Vance';
  const artistRole = 'Lead Character & Combat Animator';
  const artistAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80';

  const handleOpenInAnimWorks = () => {
    const videoUrlToUse = video.videoUrl || video.originalUrl;
    if (!videoUrlToUse) return;
    const baseUrl = 'https://anim.works/review/new';
    const params = new URLSearchParams({
      video_url: videoUrlToUse,
      title: video.title || 'Featured Showreel',
      source: 'animationreference.org',
      ref_id: video.id,
      fps: '24',
    });
    window.open(`${baseUrl}?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative h-[75vh] min-h-[500px] max-h-[700px] w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl mb-8 group/hero bg-black">
      {/* Background Video / Image Layer */}
      <div className="absolute inset-0 bg-black">
        {/* Fallback Poster */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{
            backgroundImage: `url(${video.thumbnailUrl || video.posterUrl})`,
            opacity: showVideo ? 0 : 1,
          }}
        />

        {/* Dynamic Video Player */}
        {video.videoUrl && (
          <div className={`absolute inset-0 transition-opacity duration-1000 ${showVideo ? 'opacity-100' : 'opacity-0'}`}>
            <ReactPlayer
              url={video.videoUrl}
              playing={isPlaying}
              loop={true}
              muted={isMuted}
              playsinline={true}
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
              onError={() => setShowVideo(false)}
              config={{
                file: {
                  attributes: {
                    style: { objectFit: 'cover', width: '100%', height: '100%' },
                  },
                },
              }}
            />
          </div>
        )}
      </div>

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />

      {/* Content Container */}
      <div className="absolute inset-0 z-20 px-6 sm:px-10 md:px-14 flex flex-col justify-end pb-12 sm:pb-16 max-w-3xl text-left space-y-4">
        {/* Spotlight Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg flex items-center gap-1.5 border border-purple-400/40">
            <Sparkles className="w-3.5 h-3.5 fill-white" />
            SHOWREEL SPOTLIGHT OF THE WEEK
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10 text-[10px] font-mono font-bold backdrop-blur-md">
            FEATURED SUBMISSION
          </span>
        </div>

        {/* Shot Title */}
        <h1 className="text-3xl sm:text-5xl font-black text-white drop-shadow-2xl tracking-tight leading-tight">
          {video.status === 'draft' ? 'Action & Combat Mechanics Reel' : video.title}
        </h1>

        {/* Creator Info Badge */}
        <div className="flex items-center gap-3 py-1">
          <Avatar className="h-11 w-11 border-2 border-purple-500/80 shadow-lg shrink-0">
            <AvatarImage src={artistAvatar} alt={artistName} />
            <AvatarFallback className="bg-purple-950 text-white font-bold">{artistName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-white hover:text-purple-300 transition-colors cursor-pointer">
                {artistName}
              </span>
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              {artistRole} • 24 FPS Study Pass
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href={`/profile`}>
            <Button className="h-12 px-6 rounded-2xl bg-white text-black hover:bg-white/90 font-bold text-sm shadow-xl flex items-center gap-2 transition-all hover:scale-105">
              <Play className="w-4 h-4 fill-black" />
              <span>View Full Reel</span>
            </Button>
          </Link>

          <Button
            onClick={handleOpenInAnimWorks}
            variant="outline"
            className="h-12 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white border-white/15 backdrop-blur-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:border-purple-400/50"
          >
            <PenTool className="w-4 h-4 text-purple-400" />
            <span>Draw-over in Anim.works</span>
          </Button>

          <Link href="/profile?tab=studio&upload=true">
            <Button
              variant="ghost"
              className="h-12 px-4 rounded-2xl text-zinc-300 hover:text-white hover:bg-white/10 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Your Reel</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Volume Controller */}
      <div className="absolute right-6 bottom-8 z-30 opacity-80 hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-black/60 text-white border border-white/15 backdrop-blur-md hover:bg-black/80"
          onClick={() => setIsMuted(!isMuted)}
          title={isMuted ? "Unmute Reel" : "Mute Reel"}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
