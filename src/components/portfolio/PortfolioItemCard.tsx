"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ArrowDown, ArrowUp, Eye, Heart, Bookmark, GripVertical, Play, Trash2, Pencil, MessageCircle, Share2 } from 'lucide-react';
import type { PortfolioItem, WipStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { incrementPortfolioItemViews } from '@/lib/portfolio-service';
import { HOVER_GRACE_MS } from '@/lib/watch-tracker';

/**
 * Items already counted this session. Hovering the same card repeatedly, or
 * scrolling it in and out of view, should not keep inflating its view count.
 */
const viewedThisSession = new Set<string>();

interface PortfolioItemCardProps {
  item: PortfolioItem;
  onClick?: () => void;
  onComment?: () => void;
  onLike?: (e: React.MouseEvent) => void;
  onSave?: (e: React.MouseEvent) => void;
  onShare?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  isLiked?: boolean;
  isSaved?: boolean;
  currentUserId?: string;
  isReordering?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

const STAGE_CONFIG: Record<WipStage, { label: string; color: string; bg: string }> = {
  concept: { label: 'Concept', color: 'text-amber-400 border-amber-500/30', bg: 'bg-amber-500/10' },
  blocking: { label: 'Blocking', color: 'text-orange-400 border-orange-500/30', bg: 'bg-orange-500/10' },
  splining: { label: 'Splining', color: 'text-blue-400 border-blue-500/30', bg: 'bg-blue-500/10' },
  polish: { label: 'Polish', color: 'text-purple-400 border-purple-500/30', bg: 'bg-purple-500/10' },
  cleanup: { label: 'Cleanup', color: 'text-teal-400 border-teal-500/30', bg: 'bg-teal-500/10' },
  completed: { label: 'Completed', color: 'text-emerald-400 border-emerald-500/30', bg: 'bg-emerald-500/10' },
};

/**
 * In-memory client cache for extracted video frame thumbnails so they never re-render or re-fetch.
 */
const clientThumbCache = new Map<string, string>();

export const PortfolioItemCard: React.FC<PortfolioItemCardProps> = ({
  item,
  onClick,
  onComment,
  onLike,
  onSave,
  onShare,
  onEdit,
  onDelete,
  isLiked: isLikedProp = false,
  isSaved: isSavedProp = false,
  currentUserId,
  isReordering = false,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cardInView, setCardInView] = useState(false);
  const [viewsCount, setViewsCount] = useState(item.viewsCount || 0);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Lazy-load card media when nearing viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setCardInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCardInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setViewsCount(item.viewsCount || 0);
  }, [item.viewsCount]);

  // A sustained hover counts as a view, the same way opening it fullscreen
  // does. The grace period is shared with the watch tracker so a cursor
  // sweeping across a grid contributes nothing — without it, scrolling past
  // twenty cards would register twenty views.
  useEffect(() => {
    if (!isHovered || viewedThisSession.has(item.id)) return;

    viewTimerRef.current = setTimeout(() => {
      viewedThisSession.add(item.id);
      setViewsCount((n) => n + 1); // optimistic: the number moves immediately
      incrementPortfolioItemViews(item.id).catch(() => {
        // A failed count must never interrupt playback; roll the number back.
        viewedThisSession.delete(item.id);
        setViewsCount((n) => Math.max(0, n - 1));
      });
    }, 1200);

    return () => {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    };
  }, [isHovered, item.id]);

  const handleCardClick = () => {
    if (isReordering) return;
    if (!viewedThisSession.has(item.id)) {
      viewedThisSession.add(item.id);
      setViewsCount((n) => n + 1);
      incrementPortfolioItemViews(item.id).catch(() => {});
    }
    onClick?.();
  };

  const isLiked = isLikedProp || (currentUserId && item.likedBy ? item.likedBy.includes(currentUserId) : false);
  const isSaved = isSavedProp;

  const mediaUrl = item.mediaUrl ? item.mediaUrl.trim() : '';
  const ytMatch = mediaUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  const youtubeId = ytMatch?.[1] || null;
  const vimeoMatch = mediaUrl.match(/(?:vimeo\.com\/(?:video\/|channels\/\w+\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  const vimeoId = vimeoMatch?.[1] || null;

  const computedThumbnail = (() => {
    const directThumb = item.thumbnailUrl || (item as any).posterUrl;
    if (directThumb) return directThumb;
    if (!mediaUrl) return null;
    if (youtubeId) return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
    if (vimeoId) return `https://vumbnail.com/${vimeoId}.jpg`;
    if (/\.(png|jpg|jpeg|webp|gif|svg|avif)($|\?)/i.test(mediaUrl) || mediaUrl.startsWith('data:image/')) return mediaUrl;
    return null;
  })();

  const [dynamicThumb, setDynamicThumb] = useState<string | null>(
    () => (mediaUrl ? clientThumbCache.get(mediaUrl) || null : null)
  );

  const effectiveThumbnail = computedThumbnail || dynamicThumb;

  const isDirectVideoFile = Boolean(
    mediaUrl &&
    !youtubeId &&
    !vimeoId &&
    item.mediaType !== 'image' &&
    (item.mediaType === 'video_file' ||
      (item.mediaType as string) === 'video' ||
      /\.(mp4|webm|mov|m4v)($|\?)/i.test(mediaUrl) ||
      mediaUrl.includes('firebasestorage.googleapis.com') ||
      mediaUrl.includes('storage.googleapis.com') ||
      mediaUrl.includes('b-cdn.net'))
  );

  const handleVideoLoadedData = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    if (!vid || vid.videoWidth === 0 || effectiveThumbnail) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(vid.videoWidth, 640);
      canvas.height = Math.min(vid.videoHeight, 360);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (dataUrl && dataUrl.length > 200) {
          if (mediaUrl) clientThumbCache.set(mediaUrl, dataUrl);
          setDynamicThumb(dataUrl);
        }
      }
    } catch {
      // Ignored for CORS / tainted canvas
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isHovered) {
      v.muted = true;
      v.defaultMuted = true;

      const attemptPlay = () => {
        if (!v) return;
        v.muted = true;
        const playPromise = v.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsVideoPlaying(true))
            .catch(() => {});
        }
      };

      if (v.readyState >= 2) {
        attemptPlay();
      } else {
        v.addEventListener('canplay', attemptPlay, { once: true });
        v.addEventListener('loadeddata', attemptPlay, { once: true });
      }
    } else {
      v.pause();
      setIsVideoPlaying(false);
      try {
        v.currentTime = 0;
      } catch {}
    }
  }, [isHovered]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      className={cn(
        "group relative w-full aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black transition-all duration-300 shadow-xl",
        isReordering
          ? "border-amber-500/50 bg-amber-950/20 ring-2 ring-amber-500/30"
          : "hover:border-primary/80 hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
      )}
    >
      {/* Reorder Mode Control Overlay Bar */}
      {isReordering && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between bg-amber-500 text-black px-3 py-1.5 z-40 font-bold text-xs shadow-md">
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-4 w-4 text-black/70" />
            <span>Position #{((item.sortIndex ?? 0) + 1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!canMoveUp}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              className="h-6 w-6 p-0 text-black hover:bg-black/20 disabled:opacity-30"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!canMoveDown}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              className="h-6 w-6 p-0 text-black hover:bg-black/20 disabled:opacity-30"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Background Video Media / Thumbnail Image */}
      <div className="absolute inset-0 w-full h-full bg-black">
        {effectiveThumbnail ? (
          <img
            src={effectiveThumbnail}
            alt={item.title}
            className={cn(
              "h-full w-full object-cover transition-transform duration-500",
              isHovered ? "scale-105" : "scale-100",
              isVideoPlaying && isHovered && "opacity-0"
            )}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-950 via-zinc-950 to-black">
            <Play className="h-12 w-12 text-primary/70" />
          </div>
        )}

        {/* Native video hover preview */}
        {isDirectVideoFile && (
          <video
            ref={videoRef}
            src={cardInView || isHovered ? (mediaUrl || undefined) : undefined}
            poster={effectiveThumbnail || undefined}
            preload="metadata"
            muted
            loop
            playsInline
            onLoadedData={handleVideoLoadedData}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none z-[5]",
              isHovered ? "opacity-100 scale-105" : "opacity-0 scale-100"
            )}
          />
        )}

        {/* YouTube hover preview for YouTube community submissions */}
        {youtubeId && isHovered && (
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-[5] bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&playsinline=1`}
              className="w-full h-full scale-125 object-cover pointer-events-none"
              tabIndex={-1}
              loading="lazy"
              allow="autoplay"
            />
          </div>
        )}

        {/* Vimeo hover preview for Vimeo community submissions */}
        {vimeoId && isHovered && (
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-[5] bg-black">
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1&background=1&autopause=0`}
              className="w-full h-full scale-125 object-cover pointer-events-none"
              tabIndex={-1}
              loading="lazy"
              allow="autoplay"
            />
          </div>
        )}
      </div>

      {/* Dark Gradient Overlay for Text & Badges */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between bg-gradient-to-t from-black via-black/50 to-black/30 p-3 transition-colors group-hover:via-black/40 sm:p-4">
        
        {/* Top Area (Clean: only Edit/Delete buttons if available) */}
        <div className="flex items-center justify-end pointer-events-auto">
          {/* Action Buttons on Outside of Post Card */}
          {!isReordering && (onEdit || onDelete) && (
            <div className="flex items-center gap-1.5 z-30">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(e);
                  }}
                  title="Edit Post"
                  className="h-8 w-8 rounded-full bg-black/70 hover:bg-primary/90 text-zinc-300 hover:text-white backdrop-blur-md border border-white/20 hover:border-primary/50 flex items-center justify-center transition-all duration-200 shadow-xl group-hover:scale-105 hover:scale-110"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e);
                  }}
                  title="Delete Post"
                  className="h-8 w-8 rounded-full bg-black/70 hover:bg-rose-600/90 text-zinc-300 hover:text-white backdrop-blur-md border border-white/20 hover:border-rose-500/50 flex items-center justify-center transition-all duration-200 shadow-xl group-hover:scale-105 hover:scale-110"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Text Overlaid DIRECTLY Over Video */}
        <div className="space-y-1 pointer-events-auto z-20 pt-8">
          <h3 className={cn(
            "line-clamp-1 font-extrabold text-base md:text-lg text-white drop-shadow-md transition-all duration-300 ease-in-out",
            isHovered ? "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden mb-0" : "opacity-100 translate-y-0"
          )}>
            {item.title}
          </h3>
          {item.authorName && (
            <p className={cn(
              "text-xs text-zinc-400 font-medium truncate drop-shadow-sm transition-all duration-300",
              isHovered ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100"
            )}>
              by {item.authorName}
            </p>
          )}

          {/* Software Chips (No hashtags, clean subtle badges) */}
          {item.software && item.software.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
              {item.software.slice(0, 2).map((sw) => (
                <span key={sw} className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-300 backdrop-blur-sm border border-white/10 shadow">
                  {sw}
                </span>
              ))}
            </div>
          )}

          {/* Likes & Views Counter Bar */}
          <div className="flex items-center justify-between gap-1 border-t border-white/10 pt-1 text-xs text-zinc-400">
            <span className="flex items-center gap-1" title="Views"><Eye className="h-3 w-3 text-zinc-400" /> {viewsCount}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike?.(e);
              }}
              className={cn(
                "flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-colors sm:min-h-0 sm:min-w-0 sm:px-2",
                isLiked ? "text-rose-400 font-bold" : "text-zinc-400 hover:text-rose-400"
              )}
              title="Like"
            >
              <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-rose-500 text-rose-500")} />
              <span>{item.likesCount || 0}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave?.(e);
              }}
              className={cn(
                "flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-colors sm:min-h-0 sm:min-w-0 sm:px-2",
                isSaved ? "text-amber-400 font-bold" : "text-zinc-400 hover:text-amber-400"
              )}
              aria-label={isSaved ? "Unsave post" : "Save post"}
              title="Save"
            >
              <Bookmark className={cn("h-3.5 w-3.5", isSaved && "fill-amber-400 text-amber-400")} />
              <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); (onComment || onClick)?.(); }}
              className="flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-zinc-400 transition-colors hover:text-purple-300 sm:min-h-0 sm:min-w-0 sm:px-2"
              aria-label={`Open comments for ${item.title}`}
              title="Comments"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{item.commentsCount || 0}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare?.(e);
              }}
              className="flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-zinc-400 transition-colors hover:text-blue-400 sm:min-h-0 sm:min-w-0 sm:px-2"
              aria-label="Share post"
              title="Share"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{item.sharesCount || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
