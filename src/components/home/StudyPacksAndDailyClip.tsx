'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  Maximize2,
  Bookmark,
  SkipBack,
  SkipForward,
  Compass,
  Zap,
  Swords,
  Smile,
  PawPrint,
  Layers,
  Box,
} from 'lucide-react';
import type { Video } from '@/lib/types';
import type { TabOption } from '@/components/FilterBar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VideoFullscreenViewer } from '@/components/VideoFullscreenViewer';
import { SaveToBoardModal } from '@/components/SaveToBoardModal';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export interface StudyPackPreset {
  id: string;
  title: string;
  subtitle: string;
  query: string;
  tab?: TabOption;
  badge: string;
  accent: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const STUDY_PACKS: StudyPackPreset[] = [
  {
    id: 'body-mechanics',
    title: 'Body Mechanics & Weight',
    subtitle: 'Walks, runs, parkour leaps & heavy lifts',
    query: 'walk run jump parkour',
    tab: 'featured',
    badge: 'Foundations',
    accent: 'from-violet-600/80 via-fuchsia-600/40 to-transparent',
    keywords: ['walk', 'run', 'jump', 'parkour', 'weight', 'body', 'mechanics', 'climb', 'fall', 'lift'],
    icon: Zap,
  },
  {
    id: 'combat-impact',
    title: 'Combat & Heavy Impact',
    subtitle: 'Sword swings, martial arts, hit-stops & recoil',
    query: 'fight sword combat punch',
    tab: 'featured',
    badge: 'Action',
    accent: 'from-rose-600/80 via-orange-500/40 to-transparent',
    keywords: ['fight', 'combat', 'sword', 'punch', 'kick', 'action', 'martial', 'impact', 'slash', 'battle'],
    icon: Swords,
  },
  {
    id: 'acting-emotion',
    title: 'Acting & Facial Beats',
    subtitle: 'Eye darts, lip-sync, subtext & subtle gestures',
    query: 'acting facial expression dialogue',
    tab: 'featured',
    badge: 'Performance',
    accent: 'from-amber-500/80 via-pink-500/40 to-transparent',
    keywords: ['acting', 'facial', 'face', 'dialogue', 'emotion', 'laugh', 'cry', 'talk', 'expression', 'head'],
    icon: Smile,
  },
  {
    id: 'creatures-quadrupeds',
    title: 'Creatures & Quadrupeds',
    subtitle: 'Gallops, prowls, wings & animal locomotion',
    query: 'animal dog horse cat creature',
    tab: 'featured',
    badge: 'Locomotion',
    accent: 'from-emerald-500/80 via-teal-500/40 to-transparent',
    keywords: ['animal', 'dog', 'cat', 'horse', 'creature', 'quadruped', 'bird', 'lion', 'wolf', 'dragon'],
    icon: PawPrint,
  },
  {
    id: 'sakuga-fx',
    title: '2D Sakuga & FX Smears',
    subtitle: 'Hand-drawn arcs, fire, cloth & impact frames',
    query: 'sakuga 2d fx anime',
    tab: 'animations',
    badge: '2D Craft',
    accent: 'from-purple-600/80 via-indigo-500/40 to-transparent',
    keywords: ['sakuga', '2d', 'anime', 'fx', 'fire', 'smoke', 'water', 'smear', 'explosion', 'hand-drawn'],
    icon: Layers,
  },
  {
    id: 'char-design-3d',
    title: 'Turnarounds & 3D Rigs',
    subtitle: 'Model sheets, silhouettes & interactive 3D',
    query: 'character turnaround',
    tab: 'character-design',
    badge: 'Design',
    accent: 'from-cyan-500/80 via-sky-500/40 to-transparent',
    keywords: ['character', 'turnaround', 'model', 'design', 'sheet', 'visdev', '3d', 'rig', 'sculpture'],
    icon: Box,
  },
];

function getCleanMp4Url(url?: string): string | undefined {
  if (!url) return undefined;
  let target = url.trim();
  if (target.includes('playlist.m3u8')) {
    target = target.replace('playlist.m3u8', 'play_480p.mp4');
  } else if (target.includes('b-cdn.net')) {
    target = target.replace('play_1080p.mp4', 'play_480p.mp4').replace('play_720p.mp4', 'play_480p.mp4');
  }
  if (target.toLowerCase().includes('.mp4') || target.toLowerCase().includes('.webm')) {
    return target;
  }
  return undefined;
}

function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

interface StudyPacksAndDailyClipProps {
  videos: Video[];
  onSelectPack: (query: string, tab?: TabOption) => void;
}

export function StudyPacksAndDailyClip({ videos, onSelectPack }: StudyPacksAndDailyClipProps) {
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  // Deterministic Clip of the Day: prefer curated, titled landscape clips over vertical/generic downloads
  const dailyClip = useMemo(() => {
    const playable = videos.filter((v) => {
      const mp4 = getCleanMp4Url(v.videoUrl);
      return Boolean(mp4) && !v.isShort;
    });
    if (playable.length === 0) return null;

    const isGoodTitle = (t?: string) => {
      const clean = (t || '').trim().toLowerCase();
      return clean.length >= 4 && !clean.includes('downloaded video') && clean !== 'reference' && clean !== 'untitled';
    };
    const isLandscape = (v: Video) => {
      if (v.width && v.height) return v.width >= v.height;
      const orig = (v.originalUrl || '').toLowerCase();
      return !orig.includes('instagram.com') && !orig.includes('tiktok.com') && !orig.includes('/shorts/');
    };
    const isReliableHost = (v: Video) => {
      const u = (v.videoUrl || '').toLowerCase();
      return u.includes('storage.googleapis.com') || u.includes('firebasestorage.googleapis.com') || u.includes('b-cdn.net');
    };

    const tier1 = playable.filter((v) => isReliableHost(v) && isGoodTitle(v.title) && isLandscape(v));
    const tier2 = playable.filter((v) => isGoodTitle(v.title) && isLandscape(v));
    const tier3 = playable.filter((v) => isReliableHost(v));
    const pool = tier1.length > 0 ? tier1 : tier2.length > 0 ? tier2 : tier3.length > 0 ? tier3 : playable;

    const idx = getDaySeed() % pool.length;
    return pool[idx];
  }, [videos]);

  // Match cover thumbnails for each Study Pack from live catalog
  const packCovers = useMemo(() => {
    const map: Record<string, { thumb?: string; count: number }> = {};
    for (const pack of STUDY_PACKS) {
      let count = 0;
      let thumb: string | undefined;
      for (const v of videos) {
        const hay = `${v.title || ''} ${(v.tags || []).join(' ')} ${v.description || ''}`.toLowerCase();
        if (pack.keywords.some((kw) => hay.includes(kw))) {
          count++;
          if (!thumb && (v.thumbnailUrl || v.posterUrl)) {
            thumb = v.thumbnailUrl || v.posterUrl;
          }
        }
      }
      map[pack.id] = {
        thumb: thumb || videos[STUDY_PACKS.indexOf(pack) % Math.max(1, videos.length)]?.thumbnailUrl,
        count,
      };
    }
    return map;
  }, [videos]);

  // Daily Clip inline mini-studio player state
  const dailyVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [openFullscreen, setOpenFullscreen] = useState(false);
  const [openSaveModal, setOpenSaveModal] = useState(false);

  const dailyMp4 = getCleanMp4Url(dailyClip?.videoUrl);
  const FPS = 24;

  useEffect(() => {
    const el = dailyVideoRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
  }, [playbackRate, dailyMp4]);

  const togglePlay = () => {
    const el = dailyVideoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const stepFrame = (delta: number) => {
    const el = dailyVideoRef.current;
    if (!el) return;
    el.pause();
    setIsPlaying(false);
    const next = Math.max(0, Math.min(el.duration || 0, el.currentTime + delta / FPS));
    el.currentTime = next;
    setCurrentFrame(Math.round(next * FPS));
  };

  // Carousel track & accessibility state (per modern-web-guidance carousel pattern)
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  const rafRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const prevSettledRef = useRef(0);

  const computeNearestSlide = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const children = Array.from(track.children) as HTMLElement[];
    if (!children.length) return 0;
    const trackRect = track.getBoundingClientRect();
    let bestIdx = 0;
    let bestDist = Infinity;
    children.forEach((child, idx) => {
      const dist = Math.abs(child.getBoundingClientRect().left - trackRect.left);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, []);

  const handleSettled = useCallback(() => {
    const idx = computeNearestSlide();
    setActiveSlide(idx);
    if (idx !== prevSettledRef.current) {
      prevSettledRef.current = idx;
      setStatusAnnouncement(`Study pack ${idx + 1} of ${STUDY_PACKS.length}: ${STUDY_PACKS[idx]?.title || ''}`);
    }
  }, [computeNearestSlide]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const hasScrollEnd = 'onscrollend' in window;

    const onScroll = () => {
      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          setActiveSlide(computeNearestSlide());
        });
      }
      if (!hasScrollEnd) {
        if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = window.setTimeout(handleSettled, 140);
      }
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    if (hasScrollEnd) {
      track.addEventListener('scrollend', handleSettled);
    }
    return () => {
      track.removeEventListener('scroll', onScroll);
      if (hasScrollEnd) {
        track.removeEventListener('scrollend', handleSettled);
      }
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    };
  }, [computeNearestSlide, handleSettled]);

  const scrollToSlide = (targetIdx: number) => {
    const track = trackRef.current;
    if (!track) return;
    const wrapped = (targetIdx + STUDY_PACKS.length) % STUDY_PACKS.length;
    const child = track.children[wrapped] as HTMLElement | undefined;
    if (!child) return;
    setActiveSlide(wrapped);
    const delta = child.getBoundingClientRect().left - track.getBoundingClientRect().left;
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
  };

  if (videos.length === 0) return null;

  return (
    <div className="space-y-10">
      {/* 1. Curated Motion Study Packs Carousel */}
      <section
        aria-roledescription="carousel"
        aria-label="Curated Motion Study Packs"
        className="space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-violet-300/90">
              <Compass className="h-3.5 w-3.5 text-violet-400" />
              <span>Curated Study Packs</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Jump straight into a motion discipline
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollToSlide(activeSlide - 1)}
              aria-label="Previous study pack"
              className="inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-zinc-200 transition-[background-color,transform,border-color] duration-150 hover:border-violet-400/50 hover:bg-violet-500/20 hover:text-white active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollToSlide(activeSlide + 1)}
              aria-label="Next study pack"
              className="inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-zinc-200 transition-[background-color,transform,border-color] duration-150 hover:border-violet-400/50 hover:bg-violet-500/20 hover:text-white active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Native scroll-snap track with overscroll-behavior-x: contain (never shorthand) */}
        <div
          ref={trackRef}
          role="group"
          aria-label="Study pack slides"
          tabIndex={0}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [overscroll-behavior-x:contain] touch-manipulation motion-safe:scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400 rounded-2xl"
        >
          {STUDY_PACKS.map((pack, idx) => {
            const Icon = pack.icon;
            const meta = packCovers[pack.id];
            return (
              <div
                key={pack.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} of ${STUDY_PACKS.length}`}
                className="snap-start shrink-0 w-[82%] sm:w-[46%] lg:w-[31%]"
              >
                <button
                  type="button"
                  onClick={() => onSelectPack(pack.query, pack.tab)}
                  className="group relative flex h-44 w-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#110e1d] p-4 text-left shadow-lg transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-violet-950/50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 cursor-pointer"
                >
                  {meta?.thumb && (
                    <img
                      src={meta.thumb}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-60"
                    />
                  )}
                  <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-tr', pack.accent)} />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090713] via-[#090713]/55 to-transparent" />

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur-md">
                      <Icon className="h-3 w-3 text-violet-300" />
                      {pack.badge}
                    </span>
                    {meta?.count > 0 && (
                      <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-zinc-200 backdrop-blur-md">
                        {meta.count}+ clips
                      </span>
                    )}
                  </div>

                  <div className="relative z-10 space-y-1">
                    <h3 className="text-base font-black tracking-tight text-white group-hover:text-violet-200 transition-colors">
                      {pack.title}
                    </h3>
                    <p className="text-xs text-zinc-300/90 line-clamp-1">{pack.subtitle}</p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Accessible slide markers (shape + color change for WCAG 1.4.1) */}
        <nav aria-label="Choose a study pack" className="flex items-center justify-center gap-1.5 pt-1">
          {STUDY_PACKS.map((pack, idx) => {
            const isCurrent = idx === activeSlide;
            return (
              <button
                key={pack.id}
                type="button"
                aria-label={`Go to ${pack.title}`}
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => scrollToSlide(idx)}
                className={cn(
                  'h-6 px-1 flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 rounded-full'
                )}
              >
                <span
                  className={cn(
                    'block rounded-full transition-all duration-200',
                    isCurrent ? 'h-2 w-7 bg-violet-400' : 'h-2 w-2 bg-white/25 hover:bg-white/45'
                  )}
                />
              </button>
            );
          })}
        </nav>

        <p className="sr-only" role="status" aria-live="polite">
          {statusAnnouncement}
        </p>
      </section>

      {/* 2. Clip of the Day — Interactive Mini-Studio Spotlight */}
      {dailyClip && dailyMp4 && (
        <section className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-[#130f24] via-[#0d0b17] to-[#08070f] p-4 sm:p-6 shadow-2xl shadow-violet-950/30">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Interactive Video Stage */}
            <div className="lg:col-span-7 relative overflow-hidden rounded-2xl border border-white/15 bg-black aspect-video shadow-xl">
              <video
                ref={dailyVideoRef}
                src={dailyMp4}
                poster={dailyClip.thumbnailUrl || dailyClip.posterUrl}
                autoPlay
                loop
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration || 0;
                  setTotalFrames(Math.max(1, Math.round(dur * FPS)));
                  e.currentTarget.playbackRate = playbackRate;
                }}
                onTimeUpdate={(e) => {
                  setCurrentFrame(Math.round((e.currentTarget.currentTime || 0) * FPS));
                }}
                className="h-full w-full object-contain bg-black"
              />

              {/* Top-left live frame counter pill */}
              <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 font-mono text-[11px] font-bold text-violet-200 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  F {String(currentFrame).padStart(3, '0')}
                  {totalFrames > 0 ? ` / ${String(totalFrames).padStart(3, '0')}` : ''} · 24 FPS
                </span>
              </div>

              {/* Compact Bottom Studio Controls */}
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-8">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause clip of the day' : 'Play clip of the day'}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500 active:scale-[0.95] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => stepFrame(-1)}
                    aria-label="Previous frame"
                    title="Step back 1 frame"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-zinc-200 hover:bg-white/15 hover:text-white active:scale-[0.95] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                  >
                    <SkipBack className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepFrame(1)}
                    aria-label="Next frame"
                    title="Step forward 1 frame"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-zinc-200 hover:bg-white/15 hover:text-white active:scale-[0.95] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Speed Pills */}
                <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/65 p-0.5 backdrop-blur-md">
                  {[0.25, 0.5, 1].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setPlaybackRate(rate)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-extrabold transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-300',
                        playbackRate === rate
                          ? 'bg-violet-600 text-white shadow'
                          : 'text-zinc-300 hover:text-white'
                      )}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Motion Study Notes & Actions */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200">
                <Flame className="h-3.5 w-3.5 text-amber-300" />
                <span>Clip of the Day · Frame Study</span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white line-clamp-2">
                  {dailyClip.title || 'Featured Motion Study'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Step through this shot at <strong className="text-white">0.25x</strong> or frame-by-frame right here to study silhouette clarity, spacing, and weight shifts — or open it in the full studio player to compare against your playblast.
                </p>
              </div>

              {dailyClip.tags && dailyClip.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {dailyClip.tags.slice(0, 5).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onSelectPack(tag)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-violet-200 hover:border-violet-400/50 hover:bg-violet-500/15 transition cursor-pointer"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Button
                  type="button"
                  onClick={() => setOpenFullscreen(true)}
                  className="h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold px-4 gap-2 shadow-lg shadow-violet-900/40 cursor-pointer"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Study Fullscreen</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!authUser) {
                      toast({
                        title: 'Sign in to save',
                        description: 'Create a free account to save clips to your Maya & Blender Moodboards.',
                      });
                      return;
                    }
                    setOpenSaveModal(true);
                  }}
                  className="h-10 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-zinc-100 text-xs font-bold px-4 gap-1.5 cursor-pointer"
                >
                  <Bookmark className="h-3.5 w-3.5 text-violet-300" />
                  <span>Save to Board</span>
                </Button>
              </div>
            </div>
          </div>

          <Dialog open={openFullscreen} onOpenChange={setOpenFullscreen}>
            <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-[#080611] p-0 [&>button]:hidden">
              <DialogTitle className="sr-only">{dailyClip.title || 'Clip of the Day'}</DialogTitle>
              <VideoFullscreenViewer
                video={dailyClip}
                title={dailyClip.title || 'Clip of the Day'}
                description={dailyClip.description}
                onClose={() => setOpenFullscreen(false)}
              />
            </DialogContent>
          </Dialog>

          {openSaveModal && (
            <SaveToBoardModal video={dailyClip} open={openSaveModal} onOpenChange={setOpenSaveModal} />
          )}
        </section>
      )}
    </div>
  );
}
