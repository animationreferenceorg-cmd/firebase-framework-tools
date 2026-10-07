'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface BackgroundClip {
  title: string;
  source: string;
  url: string;
}

const BACKGROUND_CLIPS: BackgroundClip[] = [
  {
    title: 'Kimetsu No Yaiba — Creature Locomotion & Debris FX',
    source: 'Sakugabooru CDN #83563',
    url: 'https://www.sakugabooru.com/data/c6c3451b29890089943589b1bb0e3ebd.mp4',
  },
  {
    title: 'Norimitsu Suzuki — Fullmetal Alchemist Combat Arcs',
    source: 'Sakugabooru CDN #69062',
    url: 'https://www.sakugabooru.com/data/e0dd86863fd54cd5c06a6dead12c29e2.mp4',
  },
  {
    title: 'FLCL — High Energy Impact & Character Acting',
    source: 'Sakugabooru CDN #83655',
    url: 'https://www.sakugabooru.com/data/71bdf7ef1c4cb85d6f85ad1934aa921e.mp4',
  },
  {
    title: 'James Baxter — Volume Preservation & Character Turn',
    source: 'Sakugabooru CDN #68923',
    url: 'https://www.sakugabooru.com/data/1ddcfd6d99e6c6d8e9eb49ae8f2983c4.mp4',
  },
];

export function HeroBackgroundVideo() {
  const [clipIndex, setClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeClip = BACKGROUND_CLIPS[clipIndex];

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          // Autoplay policy fallback: keep muted and re-try
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, clipIndex]);

  const handleNextClip = () => {
    setIsLoaded(false);
    setClipIndex((prev) => (prev + 1) % BACKGROUND_CLIPS.length);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Background Video Element */}
      <video
        ref={videoRef}
        key={activeClip.url}
        src={activeClip.url}
        autoPlay
        loop
        muted={isMuted}
        playsInline
        onLoadedData={() => setIsLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          isLoaded ? 'opacity-30' : 'opacity-0'
        }`}
      />

      {/* Atmospheric Gradients & Vignette for Perfect Typography Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_20%,rgba(147,51,234,0.25),rgba(0,0,0,0.85))]" />
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      {/* Subtle Grid Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Ambient Player Status Pill (Interactive controls for visitor) */}
      <div className="pointer-events-auto absolute bottom-4 right-4 sm:bottom-6 sm:right-6 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-md text-[11px] text-zinc-300 shadow-2xl">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono text-zinc-400">Live Background:</span>
          <span className="font-medium text-white truncate max-w-[200px]" title={activeClip.title}>
            {activeClip.title}
          </span>
        </div>

        <div className="h-3 w-px bg-white/10" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause background animation' : 'Play background animation'}
            className="p-1 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={handleNextClip}
            title="Next reference clip"
            aria-label="Next reference clip"
            className="p-1 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
          >
            <SkipForward className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="p-1 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
