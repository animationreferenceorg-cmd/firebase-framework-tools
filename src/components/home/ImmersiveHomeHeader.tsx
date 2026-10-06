'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, LayoutGrid, Paintbrush, Play, Search, Sparkles, Upload, UserPlus } from 'lucide-react';
import type { Video } from '@/lib/types';

type ImmersiveHomeHeaderProps = {
  videos: Video[];
  totalVideos: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onOpenPricing: () => void;
};

const announcements = [
  { label: 'Paint workspace is in beta', href: '/paint', icon: Paintbrush },
  { label: 'Free portfolio submissions are open', href: '/profile?tab=portfolio', icon: UserPlus },
  { label: 'Visual boards have been upgraded', href: '/moodboard', icon: LayoutGrid },
];

function playbackUrl(video?: Video) {
  let url = video?.videoUrl || '';
  if (url.includes('playlist.m3u8')) url = url.replace('playlist.m3u8', 'play_480p.mp4');
  if (url.includes('.mp4') && !url.includes('#t=')) url = `${url}#t=0.1`;
  return url;
}

function VideoPane({ video, className = '', priority = false }: { video?: Video; className?: string; priority?: boolean }) {
  const [failed, setFailed] = React.useState(false);
  const reduceMotion = useReducedMotion();
  const src = playbackUrl(video);
  const poster = video?.thumbnailUrl || video?.posterUrl;

  return (
    <div className={`relative overflow-hidden bg-[#0a0810] ${className}`}>
      {poster && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}
      {src && !failed && !reduceMotion && (
        <video
          src={src}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          preload={priority ? 'auto' : 'metadata'}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export function ImmersiveHomeHeader({
  videos,
  totalVideos,
  searchQuery,
  onSearchChange,
  searchInputRef,
  onOpenPricing,
}: ImmersiveHomeHeaderProps) {
  const reduceMotion = useReducedMotion();
  const [activeVideoIndex, setActiveVideoIndex] = React.useState(0);
  const featured = videos[activeVideoIndex] || videos[0];

  React.useEffect(() => {
    if (reduceMotion || videos.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveVideoIndex((current) => (current + 1) % videos.length);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [reduceMotion, videos.length]);

  React.useEffect(() => {
    if (activeVideoIndex >= videos.length) setActiveVideoIndex(0);
  }, [activeVideoIndex, videos.length]);

  const scrollToLibrary = () => {
    document.getElementById('reference-library')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <section className="relative -mx-4 -mt-2 min-h-[100svh] overflow-hidden bg-[#08060d] md:-mx-8">
      <div className="absolute inset-0">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={featured?.id || activeVideoIndex}
            className="absolute inset-0"
            initial={reduceMotion ? false : { opacity: 0, scale: 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            <VideoPane video={featured} priority className="h-full w-full" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(7,5,12,0.96)_0%,rgba(7,5,12,0.78)_35%,rgba(7,5,12,0.2)_70%,rgba(7,5,12,0.45)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,5,12,0.62)_0%,transparent_30%,rgba(7,5,12,0.12)_55%,rgba(7,5,12,0.96)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_46%,rgba(124,58,237,0.2),transparent_42%)]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1600px] flex-col justify-center px-6 pb-32 pt-36 sm:px-10 md:px-14 lg:px-20">
        <motion.div
          className="max-w-3xl"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-violet-200/80">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live reference library
            </span>
            {totalVideos > 0 && <span className="text-white/45">{totalVideos.toLocaleString()} clips</span>}
          </div>

          <h1 className="max-w-3xl font-display text-5xl font-black leading-[0.9] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl lg:text-[5.6rem]">
            Find the motion.
            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
              Build the shot.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-white/70 sm:text-lg">
            8,000 animation references playing in one living library—ready to search, scrub, save, and use.
          </p>

          <div className="mt-8 max-w-2xl">
            <div className="relative overflow-hidden rounded-2xl bg-black/45 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.9)] backdrop-blur-2xl focus-within:bg-black/60">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-200" />
              <input
                ref={(node) => {
                  searchInputRef.current = node;
                }}
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') scrollToLibrary();
                }}
                placeholder="Search movement, acting, combat, creatures…"
                className="h-16 w-full bg-transparent pl-14 pr-24 text-base font-medium text-white outline-none placeholder:text-white/40"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/15 hover:text-white"
                >
                  Clear
                </button>
              ) : (
                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-white/35">Press /</span>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={scrollToLibrary}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#0b0911] transition-transform hover:scale-[1.03]"
            >
              <Play className="h-4 w-4 fill-current" />
              Browse references
            </button>
            <Link
              href="/profile?tab=studio&upload=true"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-xl transition-colors hover:bg-white/15"
            >
              <Upload className="h-4 w-4" />
              Share your work
            </Link>
            <button
              type="button"
              onClick={onOpenPricing}
              className="inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-bold text-amber-200 transition-colors hover:bg-white/10 hover:text-amber-100"
            >
              <Sparkles className="h-4 w-4" />
              Explore Pro
            </button>
          </div>

          {featured?.id && (
            <Link href={`/video/${featured.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/55 hover:text-white">
              Open the featured reference
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </motion.div>
      </div>

      {videos.length > 1 && (
        <div className="absolute bottom-24 right-6 z-20 flex items-center gap-2 sm:right-10 md:right-14 lg:right-20">
          <span className="mr-2 hidden text-[10px] font-black uppercase tracking-[0.2em] text-white/45 sm:inline">
            Playing {String(activeVideoIndex + 1).padStart(2, '0')}
          </span>
          {videos.map((video, index) => (
            <button
              key={video.id || index}
              type="button"
              aria-label={`Play hero reference ${index + 1}`}
              aria-current={index === activeVideoIndex ? 'true' : undefined}
              onClick={() => setActiveVideoIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === activeVideoIndex ? 'w-10 bg-white' : 'w-4 bg-white/35 hover:bg-white/65'
              }`}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#08060d] via-[#08060d]/95 to-transparent px-6 pb-6 pt-14 sm:px-10 md:px-14 lg:px-20">
        <div className="mx-auto flex max-w-[1460px] items-center gap-5 overflow-x-auto scrollbar-none">
          <span className="flex shrink-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200">
            <Sparkles className="h-3.5 w-3.5" />
            What&apos;s new
          </span>
          <span className="h-4 w-px shrink-0 bg-white/15" />
          {announcements.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group flex shrink-0 items-center gap-2 text-sm font-semibold text-white/65 transition-colors hover:text-white"
            >
              <Icon className="h-4 w-4 text-violet-300" />
              {label}
              <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
