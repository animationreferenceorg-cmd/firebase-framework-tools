'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Bookmark,
  Flame,
  Download,
  ArrowRight,
  Sparkles,
  Users,
  Compass,
  Layers,
  Upload,
  Zap,
  Swords,
  Smile,
  PawPrint,
  Box,
  Instagram,
} from 'lucide-react';
import type { Video } from '@/lib/types';
import type { TabOption } from '@/components/FilterBar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VideoFullscreenViewer } from '@/components/VideoFullscreenViewer';
import { SaveToBoardModal } from '@/components/SaveToBoardModal';
import { trackPluginDownload } from '@/lib/plugin-analytics';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/social-links';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface StudyPackQuick {
  id: string;
  label: string;
  query: string;
  tab?: TabOption;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
}

const QUICK_PACKS: StudyPackQuick[] = [
  { id: 'mechanics', label: 'Body Mechanics', query: 'walk run jump parkour', tab: 'featured', accent: 'text-violet-300 bg-violet-500/15 border-violet-400/30', icon: Zap },
  { id: 'combat', label: 'Combat & Impact', query: 'fight sword combat punch', tab: 'featured', accent: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/30', icon: Swords },
  { id: 'acting', label: 'Acting & Facial', query: 'acting facial dialogue', tab: 'featured', accent: 'text-indigo-300 bg-indigo-500/15 border-indigo-400/30', icon: Smile },
  { id: 'creatures', label: 'Quadrupeds', query: 'animal dog horse cat', tab: 'featured', accent: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30', icon: PawPrint },
  { id: 'sakuga', label: '2D Sakuga & FX', query: 'sakuga 2d fx anime', tab: 'animations', accent: 'text-purple-300 bg-purple-500/15 border-purple-400/30', icon: Layers },
  { id: 'design', label: '3D & Turnarounds', query: 'character turnaround', tab: 'character-design', accent: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/30', icon: Box },
];

function getCleanMp4Url(url?: string): string | undefined {
  if (!url) return undefined;
  let target = url.trim();
  if (target.includes('playlist.m3u8')) target = target.replace('playlist.m3u8', 'play_480p.mp4');
  else if (target.includes('b-cdn.net')) {
    target = target.replace('play_1080p.mp4', 'play_480p.mp4').replace('play_720p.mp4', 'play_480p.mp4');
  }
  if (target.toLowerCase().includes('.mp4') || target.toLowerCase().includes('.webm')) return target;
  return undefined;
}

function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

interface HomeStudioBentoProps {
  videos: Video[];
  onSelectPack: (query: string, tab?: TabOption) => void;
  onOpenPricing: () => void;
}

export function HomeStudioBento({ videos, onSelectPack, onOpenPricing }: HomeStudioBentoProps) {
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  // Deterministic landscape, titled Clip of the Day
  const dailyClip = useMemo(() => {
    const playable = videos.filter((v) => Boolean(getCleanMp4Url(v.videoUrl)) && !v.isShort);
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
    const isReliable = (v: Video) => {
      const u = (v.videoUrl || '').toLowerCase();
      return u.includes('storage.googleapis.com') || u.includes('firebasestorage.googleapis.com') || u.includes('b-cdn.net');
    };

    const tier1 = playable.filter((v) => isReliable(v) && isGoodTitle(v.title) && isLandscape(v));
    const tier2 = playable.filter((v) => isGoodTitle(v.title) && isLandscape(v));
    const tier3 = playable.filter((v) => isReliable(v));
    const pool = tier1.length > 0 ? tier1 : tier2.length > 0 ? tier2 : tier3.length > 0 ? tier3 : playable;
    return pool[getDaySeed() % pool.length];
  }, [videos]);

  // Latest 3 community / portfolio shots for the Community Pulse bento tile
  const communityThumbs = useMemo(() => {
    const community = videos.filter(
      (v) => (v.isPortfolio || v.uploader || v.author_name) && (v.thumbnailUrl || v.posterUrl)
    );
    const pool = community.length >= 3 ? community : videos.filter((v) => v.thumbnailUrl || v.posterUrl);
    return pool.slice(0, 3);
  }, [videos]);

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
    if (dailyVideoRef.current) {
      dailyVideoRef.current.playbackRate = playbackRate;
    }
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

  return (
    <section aria-label="AnimationReference Community Studio Bento" className="space-y-5">
      {/* Crisp Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-violet-300">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span>Animator Studio Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Study, Sync &amp; Share Your Craft
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-bold text-zinc-200 hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white transition"
          >
            <span>Browse 30 Categories</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* UNIFIED 12-COLUMN COMMUNITY & STUDIO BENTO BOX */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* TILE 1 (Top-Left, 7 cols): Clip of the Day — Live 24 FPS Motion Study Stage */}
        <div className="lg:col-span-7 relative flex flex-col justify-between overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-[#161129] via-[#100d1c] to-[#0a0812] p-4 sm:p-5 shadow-2xl shadow-violet-950/30">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-600/15 blur-3xl" />

          {/* Header Strip */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200">
                <Flame className="h-3 w-3 text-amber-300" />
                Clip of the Day
              </span>
              <span className="text-xs font-bold text-zinc-300 truncate max-w-[220px] sm:max-w-xs">
                {dailyClip?.title || 'Daily 24 FPS Motion Study'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {dailyClip && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!authUser) {
                        toast({ title: 'Sign in to save', description: 'Create a free account to save clips to your Moodboards.' });
                        return;
                      }
                      setOpenSaveModal(true);
                    }}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-white/12 bg-white/5 px-3 text-[11px] font-bold text-zinc-200 hover:border-violet-400/50 hover:bg-violet-500/20 hover:text-white transition cursor-pointer"
                  >
                    <Bookmark className="h-3 w-3 text-violet-300" />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenFullscreen(true)}
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-violet-600 px-3 text-[11px] font-extrabold text-white hover:bg-violet-500 transition cursor-pointer"
                  >
                    <Maximize2 className="h-3 w-3" />
                    <span>Study</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Interactive 16:9 Mini-Studio Player */}
          <div className="relative z-10 overflow-hidden rounded-2xl border border-white/12 bg-black aspect-video w-full shadow-inner">
            {dailyClip && dailyMp4 ? (
              <>
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

                {/* Live Frame Readout */}
                <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/75 px-2.5 py-1 font-mono text-[11px] font-bold text-violet-200 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    F {String(currentFrame).padStart(3, '0')}
                    {totalFrames > 0 ? ` / ${String(totalFrames).padStart(3, '0')}` : ''} · 24 FPS
                  </span>
                </div>

                {/* Inline Frame-Step & Speed Bar */}
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-8">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500 active:scale-[0.95] transition cursor-pointer"
                    >
                      {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => stepFrame(-1)}
                      aria-label="Previous frame"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/65 text-zinc-200 hover:bg-white/15 hover:text-white active:scale-[0.95] transition cursor-pointer"
                    >
                      <SkipBack className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepFrame(1)}
                      aria-label="Next frame"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/65 text-zinc-200 hover:bg-white/15 hover:text-white active:scale-[0.95] transition cursor-pointer"
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/70 p-0.5 backdrop-blur-md">
                    {[0.25, 0.5, 1].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setPlaybackRate(rate)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-extrabold transition cursor-pointer',
                          playbackRate === rate ? 'bg-violet-600 text-white shadow' : 'text-zinc-300 hover:text-white'
                        )}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#120e22] text-xs text-zinc-400">
                Loading daily motion study…
              </div>
            )}
          </div>

          {/* Clickable Tag Row */}
          {dailyClip?.tags && dailyClip.tags.length > 0 && (
            <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1.5">
              {dailyClip.tags.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectPack(tag)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-violet-200 hover:border-violet-400/50 hover:bg-violet-500/15 transition cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT STACK (5 cols): Maya & Blender Plugins + Live Community Pulse */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* TILE 2 (Top-Right): Maya & Blender Studio Plugins */}
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-[#101a34] via-[#13122b] to-[#0c0a18] p-5 shadow-2xl flex flex-col justify-between gap-4">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-200">
                  Free · Auto-Updating
                </span>
                <Link href="/tools" className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1">
                  Install Guide <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white">
                Maya &amp; Blender Studio Plugins
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Drop synced AnimRef Moodboard references straight to <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-cyan-200">(0,0,0)</code> with live viewport plane controls.
              </p>
            </div>

            {/* Real Plugin Preview Pair */}
            <div className="relative z-10 grid grid-cols-2 gap-2.5">
              <Link href="/tools" className="group relative overflow-hidden rounded-xl border border-white/12 bg-black/50 aspect-[16/9]">
                <img
                  src="/images/plugins/maya-studio-preview.jpg"
                  alt="AnimRef Studio for Maya"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute bottom-1.5 left-2 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-cyan-200 backdrop-blur-sm">
                  Maya
                </span>
              </Link>
              <Link href="/tools" className="group relative overflow-hidden rounded-xl border border-white/12 bg-black/50 aspect-[16/9]">
                <img
                  src="/images/plugins/blender-studio-preview.jpg"
                  alt="AnimRef Studio for Blender"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute bottom-1.5 left-2 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-orange-200 backdrop-blur-sm">
                  Blender
                </span>
              </Link>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-2">
              <a href="/downloads/animref_maya_plugin.zip" download onClick={() => trackPluginDownload('maya', 'home_bento')} className="flex-1 min-w-[130px]">
                <Button className="w-full h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-extrabold gap-1.5 cursor-pointer">
                  <Download className="h-3.5 w-3.5" />
                  <span>Maya (.zip)</span>
                </Button>
              </a>
              <a href="/downloads/animref_blender_addon.zip" download onClick={() => trackPluginDownload('blender', 'home_bento')} className="flex-1 min-w-[130px]">
                <Button variant="outline" className="w-full h-9 rounded-xl border-orange-400/35 bg-orange-500/10 hover:bg-orange-500/20 text-orange-100 text-xs font-extrabold gap-1.5 cursor-pointer">
                  <Download className="h-3.5 w-3.5 text-orange-300" />
                  <span>Blender (.zip)</span>
                </Button>
              </a>
            </div>
          </div>

          {/* TILE 3 (Bottom-Right): Live Community Shots & Portfolio Pulse */}
          <div className="relative overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-[#1d1233] via-[#140f24] to-[#0c0a18] p-5 shadow-xl flex flex-col justify-between gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-400/30 text-violet-300">
                  <Users className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white leading-tight">Community Portfolio Feed</h3>
                  <p className="text-[11px] text-zinc-400">Fresh animator shots &amp; breakdowns</p>
                </div>
              </div>
              <Link
                href="/feed"
                className="text-[11px] font-bold text-violet-300 hover:text-violet-200 inline-flex items-center gap-1"
              >
                Open Feed <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {communityThumbs.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {communityThumbs.map((shot) => (
                  <Link
                    key={shot.id}
                    href="/feed"
                    className="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black"
                  >
                    <img
                      src={shot.thumbnailUrl || shot.posterUrl}
                      alt={shot.title || 'Community shot'}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                    <span className="pointer-events-none absolute bottom-1 left-1.5 right-1.5 truncate text-[9px] font-bold text-white">
                      {shot.uploader || shot.author_name || shot.title}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Link href="/profile?tab=studio&upload=true" className="flex-1">
                <Button size="sm" variant="outline" className="w-full h-8 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold gap-1.5 cursor-pointer">
                  <Upload className="h-3.5 w-3.5 text-violet-300" />
                  <span>Share Your Shot</span>
                </Button>
              </Link>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-pink-400/30 bg-pink-500/10 px-3 text-xs font-bold text-pink-200 hover:bg-pink-500/20 hover:text-white transition"
                title={`Follow ${INSTAGRAM_HANDLE}`}
              >
                <Instagram className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Instagram</span>
              </a>
            </div>
          </div>
        </div>

        {/* ROW 2 — THREE BALANCED STUDIO BENTO TILES (4 + 4 + 4 cols) */}

        {/* TILE 4: Quick Motion Study Packs Launcher */}
        <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-[#120f20] p-5 flex flex-col justify-between gap-4 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-violet-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Quick Study Packs</h3>
            </div>
            <Link href="/categories" className="text-[11px] font-bold text-zinc-400 hover:text-violet-300 inline-flex items-center gap-1">
              All 30 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_PACKS.map((pack) => {
              const Icon = pack.icon;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => onSelectPack(pack.query, pack.tab)}
                  className="group flex flex-col items-start gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-violet-500/10 cursor-pointer"
                >
                  <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg border', pack.accent)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-extrabold text-zinc-100 group-hover:text-white leading-tight">
                    {pack.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TILE 5: Visual Moodboards & Pro Sync */}
        <div className="lg:col-span-4 relative overflow-hidden rounded-3xl border border-violet-500/35 bg-gradient-to-br from-[#21133c] via-[#15102b] to-[#0d0a18] p-5 flex flex-col justify-between gap-4 shadow-xl">
          <div className="pointer-events-none absolute -right-8 -bottom-8 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-3xl" />

          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-200">
              Pro · $1 First Month
            </span>
            <h3 className="text-lg font-black text-white leading-snug">
              Unlimited Moodboards &amp; 3D Sync
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Build private production boards, export Contact Sheets &amp; 24 FPS MP4s, and import unlimited shots in Maya &amp; Blender.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <Button
              type="button"
              onClick={onOpenPricing}
              className="flex-1 h-9 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-extrabold gap-1.5 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Unlock Pro · $1</span>
            </Button>
            <Link href="/moodboard">
              <Button variant="outline" className="h-9 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-zinc-100 text-xs font-bold cursor-pointer">
                Moodboards
              </Button>
            </Link>
          </div>
        </div>

        {/* TILE 6: Paint Drawover & Breakdown Studio */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#17122a] via-[#110e1e] to-[#0b0915] p-5 flex flex-col justify-between gap-4 shadow-xl">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-200">
              Animator Tools
            </span>
            <h3 className="text-lg font-black text-white leading-snug">
              Drawovers &amp; Frame Breakdowns
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Sketch arcs, lines of action, and spacing notes directly over any animation clip.
            </p>
          </div>

          <Link href="/paint" className="block">
            <Button variant="outline" className="w-full h-9 rounded-xl border-violet-400/35 bg-violet-500/10 hover:bg-violet-500/20 text-violet-100 text-xs font-extrabold gap-1.5 cursor-pointer">
              <span>Open Paint Studio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Modals for Clip of the Day */}
      {dailyClip && (
        <>
          <Dialog open={openFullscreen} onOpenChange={setOpenFullscreen}>
            <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-[#080611] p-0 [&>button]:hidden">
              <DialogTitle className="sr-only">{dailyClip.title || 'Clip of the Day'}</DialogTitle>
              <VideoFullscreenViewer
                video={dailyClip}
                playlist={videos.slice(0, 30)}
                title={dailyClip.title || 'Clip of the Day'}
                description={dailyClip.description}
                onClose={() => setOpenFullscreen(false)}
              />
            </DialogContent>
          </Dialog>

          {openSaveModal && (
            <SaveToBoardModal video={dailyClip} open={openSaveModal} onOpenChange={setOpenSaveModal} />
          )}
        </>
      )}
    </section>
  );
}
