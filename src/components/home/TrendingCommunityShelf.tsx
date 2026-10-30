'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookmarkPlus, ExternalLink, Film, Flame, Play, PlayCircle, Trophy, Upload, Timer, Box } from 'lucide-react';
import { getPublicReferenceClips } from '@/lib/reference-service';
import { daysLeft, getActiveChallenge } from '@/lib/challenges';
import { CONTRIBUTION_BONUS_PER_UPLOAD } from '@/lib/plans';
import { getYouTubeId, getVimeoId, secondsLabel } from '@/lib/reference-utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReferenceHomeVideoPlayer } from '@/components/reference/ReferenceHomeVideoPlayer';
import { SaveClipToBoardDialog } from '@/components/reference/SaveClipToBoardDialog';
import { cn } from '@/lib/utils';
import type { ReferenceClip } from '@/lib/types';

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** In-memory client cache for extracted video frame thumbnails */
const clientThumbCache = new Map<string, string>();

function createdMs(value: unknown): number {
  const v = value as { toMillis?: () => number; seconds?: number } | number | undefined;
  if (typeof v === 'number') return v;
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (v && typeof v.seconds === 'number') return v.seconds * 1000;
  return 0;
}

function resolveInitialThumb(clip: ReferenceClip): string | null {
  if (clip.thumbnailUrl) {
    if (clip.thumbnailUrl.includes('cdninstagram.com')) {
      return `/api/proxy/image?url=${encodeURIComponent(clip.thumbnailUrl)}`;
    }
    return clip.thumbnailUrl;
  }
  const ytId = clip.sourceVideoId || getYouTubeId(clip.sourceUrl);
  if (ytId) return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  const vmId = getVimeoId(clip.sourceUrl);
  if (vmId) return `https://vumbnail.com/${vmId}.jpg`;
  if (clip.uploadedMediaUrl && clientThumbCache.has(clip.uploadedMediaUrl)) {
    return clientThumbCache.get(clip.uploadedMediaUrl)!;
  }
  if (clip.mediaType === 'image' || clip.mediaType === 'gif') {
    return clip.uploadedMediaUrl || clip.sourceUrl || null;
  }
  return null;
}

function resolvePlayableVideo(clip: ReferenceClip): string | null {
  const url = clip.uploadedMediaUrl || (clip as any).videoUrl;
  if (url && (
    url.includes('.mp4') ||
    url.includes('.webm') ||
    url.includes('.mov') ||
    url.includes('.m3u8') ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('storage.googleapis.com') ||
    url.includes('b-cdn.net')
  )) {
    return url;
  }
  return null;
}

function rankCommunityClips(entries: ReferenceClip[]): ReferenceClip[] {
  return [...entries].sort((a, b) => {
    // 1. Prioritize animation references (video, gif, youtube) over static 3D models
    const aIsAnim = a.mediaType !== 'model3d';
    const bIsAnim = b.mediaType !== 'model3d';
    if (aIsAnim !== bIsAnim) return aIsAnim ? -1 : 1;
    // 2. Saves count
    const aSaves = a.saveCount || 0;
    const bSaves = b.saveCount || 0;
    if (bSaves !== aSaves) return bSaves - aSaves;
    // 3. Newest first
    return createdMs(b.createdAt) - createdMs(a.createdAt);
  });
}

interface CommunityTrendingCardProps {
  clip: ReferenceClip;
  onSelect: (clip: ReferenceClip) => void;
  onSave: (clip: ReferenceClip) => void;
}

function CommunityTrendingCard({ clip, onSelect, onSave }: CommunityTrendingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [thumbUrl, setThumbUrl] = useState<string | null>(() => resolveInitialThumb(clip));
  const [proxyTried, setProxyTried] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [dynamicThumb, setDynamicThumb] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playableUrl = useMemo(() => resolvePlayableVideo(clip), [clip]);
  const ytId = useMemo(() => clip.sourceVideoId || getYouTubeId(clip.sourceUrl), [clip]);
  const effectiveThumb = dynamicThumb || thumbUrl;

  const handleVideoLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    if (!vid || vid.videoWidth === 0 || effectiveThumb) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(vid.videoWidth, 640);
      canvas.height = Math.min(vid.videoHeight, 360);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (dataUrl && dataUrl.length > 200 && playableUrl) {
          clientThumbCache.set(playableUrl, dataUrl);
          setDynamicThumb(dataUrl);
        }
      }
    } catch {
      // Ignore canvas CORS taint
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playableUrl) return;

    if (isHovered) {
      video.muted = true;
      video.defaultMuted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {}
    }
  }, [isHovered, playableUrl]);

  const handleImgError = () => {
    if (!proxyTried && clip.thumbnailUrl && !clip.thumbnailUrl.startsWith('/api/proxy')) {
      setProxyTried(true);
      setThumbUrl(`/api/proxy/image?url=${encodeURIComponent(clip.thumbnailUrl)}`);
    } else {
      setImgFailed(true);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    e.preventDefault();
    onSelect(clip);
  };

  const durationSec = Math.max(0, (clip.endTime || 0) - (clip.startTime || 0));

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
        {/* Effective Thumbnail Image */}
        {effectiveThumb && !imgFailed ? (
          <img
            src={effectiveThumb}
            alt={clip.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImgError}
            className={cn(
              "h-full w-full object-cover transition-transform duration-500",
              isHovered ? "scale-[1.05]" : "scale-100"
            )}
          />
        ) : playableUrl ? (
          /* Video loaded frame fallback when no thumbnail exists */
          <video
            src={`${playableUrl}#t=0.5`}
            muted
            playsInline
            preload="metadata"
            onLoadedData={handleVideoLoaded}
            className="h-full w-full object-cover"
          />
        ) : (
          /* High-aesthetic styled category fallback banner (never a broken image icon) */
          <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-purple-950/80 via-zinc-950 to-black p-4 text-center select-none">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18),transparent_70%)]" />
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-purple-500/30 bg-purple-500/15 text-purple-300">
              {clip.mediaType === 'model3d' ? <Box className="h-5 w-5" /> : <Film className="h-5 w-5" />}
            </span>
            <span className="mt-2 line-clamp-1 text-xs font-bold text-zinc-300">{clip.title}</span>
            <span className="mt-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-purple-300">
              {clip.category || 'Reference'}
            </span>
          </div>
        )}

        {/* Hover Video Preview for Playable Direct Files */}
        {playableUrl && (
          <video
            ref={videoRef}
            src={playableUrl}
            preload="auto"
            muted
            loop
            playsInline
            onLoadedData={handleVideoLoaded}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 pointer-events-none z-[5]",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Hover Preview for YouTube community references */}
        {ytId && isHovered && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-[5] bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&modestbranding=1&playsinline=1`}
              className="w-full h-full scale-125 object-cover pointer-events-none"
              tabIndex={-1}
              loading="lazy"
              allow="autoplay"
            />
          </div>
        )}

        {/* Subtle Dark Gradient Overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 z-10 pointer-events-none",
          isHovered ? "opacity-100" : "opacity-60"
        )} />

        {/* Top-Right: Save Count Badge */}
        <span className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
          <BookmarkPlus className="h-3 w-3 text-purple-300" />
          {clip.saveCount || 0}
        </span>

        {/* Top-Left: Media Type / Category Badge */}
        <span className="absolute left-2 top-2 z-20 rounded-full bg-purple-950/80 backdrop-blur-md border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200 shadow-md">
          {clip.category || (clip.mediaType === 'model3d' ? '3D Model' : 'Reference')}
        </span>

        {/* Center Hover Play Icon */}
        <div className={cn(
          "absolute inset-0 z-20 grid place-items-center transition-opacity duration-300 pointer-events-none",
          isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-purple-600/90 text-white shadow-lg backdrop-blur-xs ring-1 ring-white/30">
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </span>
        </div>

        {/* Bottom-Right: Duration Tag */}
        {durationSec > 0 && clip.mediaType !== 'image' && clip.mediaType !== 'gif' && clip.mediaType !== 'model3d' && (
          <span className="absolute bottom-2 right-2 z-20 inline-flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-md px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
            <Timer className="h-2.5 w-2.5 text-zinc-400" />
            {secondsLabel(durationSec)}
          </span>
        )}
      </div>

      {/* Card Info & Actions */}
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
            {clip.title}
          </p>
          <p className="truncate text-xs text-zinc-400">
            @{clip.creatorUsername || clip.creatorName || 'animator'}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onSave(clip);
            }}
            className="h-7 w-7 rounded-lg text-zinc-400 hover:bg-purple-500/20 hover:text-purple-300"
            title="Save to board"
          >
            <BookmarkPlus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            asChild
            className="h-7 w-7 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
            title="Open clip page"
          >
            <Link href={`/clip/${clip.id}`} onClick={(e) => e.stopPropagation()}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Home-page community block: this month's challenge plus trending community animation references. */
export function TrendingCommunityShelf() {
  const [clips, setClips] = useState<ReferenceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<ReferenceClip | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [saveClip, setSaveClip] = useState<ReferenceClip | null>(null);
  const [isSaveOpen, setIsSaveOpen] = useState(false);

  const challenge = getActiveChallenge();

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);

    getPublicReferenceClips(150)
      .then((all) => {
        if (!isCurrent) return;
        const cutoff = Date.now() - WINDOW_MS;

        // Valid candidate: has media content and wasn't removed
        const validClips = all.filter((c) => {
          const hasMedia = Boolean(
            c.thumbnailUrl ||
            c.uploadedMediaUrl ||
            c.sourceUrl ||
            (c.sourcePlatform === 'youtube' && c.sourceVideoId)
          );
          return hasMedia && !c.removedFromCreatorAt;
        });

        // Deduplicate by sourceUrl or title + creator
        const seen = new Set<string>();
        const deduped: ReferenceClip[] = [];
        for (const c of validClips) {
          const key = c.sourceUrl || `${c.title}_${c.creatorId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(c);
        }

        const recent = deduped.filter((c) => createdMs(c.createdAt) >= cutoff);
        const older = deduped.filter((c) => createdMs(c.createdAt) < cutoff);

        const rankedRecent = rankCommunityClips(recent);
        const rankedOlder = rankCommunityClips(older);

        // Prioritize recent, but backfill from top all-time community references
        // if fewer than 8 recent clips exist
        const combined = [...rankedRecent];
        if (combined.length < 8) {
          for (const c of rankedOlder) {
            if (combined.length >= 8) break;
            if (!combined.some((item) => item.id === c.id)) {
              combined.push(c);
            }
          }
        }

        setClips(combined.slice(0, 8));
      })
      .catch((err) => {
        console.error('Failed to load community clips for shelf:', err);
        if (isCurrent) setClips([]);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleSelectClip = (clip: ReferenceClip) => {
    setSelectedClip(clip);
    setIsPlayerOpen(true);
  };

  const handleSaveClip = (clip: ReferenceClip) => {
    setSaveClip(clip);
    setIsSaveOpen(true);
  };

  return (
    <section className="mb-12 mt-6 space-y-6">
      {/* Monthly Challenge Banner */}
      {challenge && (
        <Link
          href={`/challenges/${challenge.slug}`}
          className="group flex flex-col gap-4 overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/70 via-zinc-950 to-zinc-950 p-5 transition-colors hover:border-purple-400 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
              <Trophy className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-purple-300">
                Monthly challenge · {daysLeft(challenge)} days left
              </p>
              <h2 className="text-xl font-black text-white">
                {challenge.title}: {challenge.tagline}
              </h2>
              <p className="text-xs text-zinc-400">
                Film it, upload it, win 3 months of Pro and a home-page feature.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white group-hover:bg-purple-500">
            Enter <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      {/* Shelf Header */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/15 text-orange-300">
              <Flame className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-white md:text-2xl">Trending from the community</h2>
              <p className="text-xs text-zinc-400">The references animators saved most this month.</p>
            </div>
          </div>
          <Link
            href="/references"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20"
          >
            <Upload className="h-4 w-4" />
            Share a reference · +{CONTRIBUTION_BONUS_PER_UPLOAD} views today
          </Link>
        </div>

        {/* Content Cards */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 px-1 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-video animate-pulse rounded-2xl bg-white/5 border border-white/5" />
            ))}
          </div>
        ) : clips.length === 0 ? (
          <Link
            href="/references"
            className="block rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400 hover:border-purple-500/40"
          >
            Be one of the first to share: upload a reference you filmed and it shows up here for everyone.
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-4 px-1 md:grid-cols-4">
            {clips.map((clip) => (
              <CommunityTrendingCard
                key={clip.id}
                clip={clip}
                onSelect={handleSelectClip}
                onSave={handleSaveClip}
              />
            ))}
          </div>
        )}
      </div>

      {/* Interactive Video Player Dialog */}
      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-0 text-white shadow-2xl">
          <DialogTitle className="sr-only">
            {selectedClip?.title || 'Community Video Player'}
          </DialogTitle>
          <div className="aspect-video bg-black">
            {selectedClip && <ReferenceHomeVideoPlayer clip={selectedClip} />}
          </div>
          {selectedClip && (
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between border-t border-white/10 bg-zinc-950/90">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-purple-600">{selectedClip.category}</Badge>
                  {selectedClip.tags?.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h2 className="text-xl font-bold truncate">{selectedClip.title}</h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Shared by @{selectedClip.creatorUsername || selectedClip.creatorName || 'animator'}
                  {selectedClip.sourceAuthorName ? ` · Original by ${selectedClip.sourceAuthorName}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => handleSaveClip(selectedClip)}
                  className="bg-purple-600 hover:bg-purple-500 font-bold"
                >
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  Save to board
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/clip/${selectedClip.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Full page
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save to Board Dialog */}
      {saveClip && (
        <SaveClipToBoardDialog
          clip={saveClip}
          open={isSaveOpen}
          onOpenChange={setIsSaveOpen}
        />
      )}
    </section>
  );
}
