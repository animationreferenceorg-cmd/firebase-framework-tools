"use client";

import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { VideoPlayer } from '@/components/VideoPlayer';
import type { Video } from '@/lib/types';

interface UniversalVideoPlayerProps {
  url: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  onEnded?: () => void;
  onToggleTimeline?: () => void;
  isTimelineVisible?: boolean;
}

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  url,
  poster,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  className = "",
  onEnded,
  onToggleTimeline,
  isTimelineVisible = false,
}) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center text-zinc-500">
        <div className="animate-pulse text-xs">Loading player...</div>
      </div>
    );
  }

  // Check if media is direct image or gif (handling query params, data URLs & storage links)
  const isImage = (() => {
    if (!url) return false;
    if (url.startsWith('data:image/')) return true;
    if (url.includes('unsplash.com') || url.includes('images.unsplash.com')) return true;
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    return /\.(png|jpg|jpeg|webp|gif|svg|avif|heic|bmp)$/i.test(cleanUrl);
  })();

  if (isImage) {
    return (
      <div className={`relative aspect-video w-full bg-black/90 flex items-center justify-center overflow-hidden p-2 group ${className}`}>
        {/* Subtle Backdrop Blur Effect for Transparent GIFs / Images */}
        <div 
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none" 
          style={{ backgroundImage: `url(${url})` }}
        />
        <img 
          src={url} 
          alt="Portfolio Media" 
          className="relative max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]" 
        />
      </div>
    );
  }

  const vimeoMatch = url ? url.trim().match(/(?:vimeo\.com\/(?:video\/|channels\/\w+\/|groups\/\w+\/videos\/)?|player\.vimeo\.com\/video\/)(\d+)/i) : null;
  const vimeoId = vimeoMatch?.[1];

  const ytMatch = url ? url.trim().match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/i) : null;
  const ytId = ytMatch?.[1];

  if (vimeoId) {
    return (
      <div className={`relative aspect-video w-full h-full min-h-[360px] bg-black overflow-hidden ${className}`}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&autopause=0&dnt=1`}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Vimeo Video Player"
        />
      </div>
    );
  }

  if (ytId) {
    return (
      <div className={`relative aspect-video w-full h-full min-h-[360px] bg-black overflow-hidden ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="YouTube Video Player"
        />
      </div>
    );
  }

  const isYouTubeOrVimeo = Boolean(
    url && (
      url.includes('youtube.com') ||
      url.includes('youtu.be') ||
      url.includes('vimeo.com')
    )
  );

  if (isYouTubeOrVimeo) {
    return (
      <div className={`relative aspect-video w-full bg-black overflow-hidden ${className}`}>
        <ReactPlayer
          url={url}
          width="100%"
          height="100%"
          controls={true}
          playing={autoPlay}
          muted={muted}
          loop={loop}
          onEnded={onEnded}
          config={{
            youtube: {
              playerVars: { showinfo: 1, rel: 0, modestbranding: 1 }
            },
            vimeo: {
              playerOptions: { responsive: true, autoplay: autoPlay }
            }
          }}
        />
      </div>
    );
  }

  // Construct Video object for custom VideoPlayer component
  const videoObject: Video = {
    id: url,
    title: 'Portfolio Work',
    description: '',
    videoUrl: url,
    thumbnailUrl: poster || '',
    posterUrl: poster || '',
    fps: 24,
    tags: [],
    categoryIds: [],
  };

  return (
    <div className={`relative w-full h-full min-h-[360px] bg-black overflow-hidden group/player ${className}`}>
      <VideoPlayer
        key={url}
        video={videoObject}
        autoPlay={autoPlay}
        startsPaused={!autoPlay}
        muted={muted}
        loop={loop}
        onEnded={onEnded}
        onToggleTimeline={onToggleTimeline}
        isTimelineVisible={isTimelineVisible}
      />
    </div>
  );
};
