"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, Eye, Heart, GripVertical, Layers, Play, Sparkles, Trash2, Pencil } from 'lucide-react';
import type { PortfolioItem, WipStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PortfolioItemCardProps {
  item: PortfolioItem;
  onClick?: () => void;
  onLike?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  isLiked?: boolean;
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

export const PortfolioItemCard: React.FC<PortfolioItemCardProps> = ({
  item,
  onClick,
  onLike,
  onEdit,
  onDelete,
  isLiked: isLikedProp = false,
  currentUserId,
  isReordering = false,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isLiked = isLikedProp || (currentUserId && item.likedBy ? item.likedBy.includes(currentUserId) : false);
  const stageInfo = item.wipStage ? STAGE_CONFIG[item.wipStage] : null;

  useEffect(() => {
    if (isHovered && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else if (!isHovered && videoRef.current) {
      videoRef.current.pause();
      try {
        videoRef.current.currentTime = 0;
      } catch {}
    }
  }, [isHovered]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isReordering ? undefined : onClick}
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
        {item.thumbnailUrl || item.mediaUrl ? (
          <img
            src={item.thumbnailUrl || item.mediaUrl}
            alt={item.title}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-500",
              isHovered && item.mediaUrl && item.mediaType !== 'image' && item.mediaType !== 'gif' ? "opacity-0" : "opacity-100"
            )}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
            <Play className="h-12 w-12 text-primary/70" />
          </div>
        )}

        {/* Hover-to-Play Native Silent Video Layer */}
        {item.mediaUrl && item.mediaType !== 'image' && item.mediaType !== 'gif' && (
          <video
            ref={videoRef}
            src={item.mediaUrl}
            preload="metadata"
            muted
            loop
            playsInline
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none z-0",
              isHovered ? "opacity-100 scale-105" : "opacity-0 scale-100"
            )}
          />
        )}
      </div>

      {/* Dark Gradient Overlay for Text & Badges */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30 group-hover:via-black/40 transition-colors z-10 p-4 flex flex-col justify-between pointer-events-none">
        
        {/* Top Badges (WIP / Stage) */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.type === 'wip' ? (
              <Badge variant="outline" className="bg-amber-500/30 text-amber-300 border-amber-500/50 backdrop-blur-md text-xs font-bold px-2 py-0.5 shadow">
                <Layers className="h-3 w-3 mr-1" />
                WIP
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-500/30 text-emerald-300 border-emerald-500/50 backdrop-blur-md text-xs font-bold px-2 py-0.5 shadow">
                <Sparkles className="h-3 w-3 mr-1" />
                Portfolio
              </Badge>
            )}

            {stageInfo && (
              <Badge variant="outline" className={cn("backdrop-blur-md text-xs font-semibold px-2 py-0.5 shadow", stageInfo.bg, stageInfo.color)}>
                {stageInfo.label}
              </Badge>
            )}
          </div>

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
        <div className="space-y-1.5 pointer-events-auto z-20 pt-8">
          <h3 className="line-clamp-1 font-extrabold text-base md:text-lg text-white drop-shadow-md group-hover:text-primary transition-colors">
            {item.title}
          </h3>

          {/* Software Chips & Animation Tags Overlaid */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {item.software?.slice(0, 2).map((sw) => (
              <span key={sw} className="rounded bg-purple-950/80 px-2 py-0.5 text-[10px] font-bold text-purple-200 border border-purple-800/40 shadow">
                {sw}
              </span>
            ))}
            {item.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-white border border-primary/30 shadow">
                #{tag}
              </span>
            ))}
          </div>

          {/* Likes & Views Counter Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-zinc-400" /> {item.viewsCount || 0}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike?.(e);
              }}
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
                isLiked ? "text-rose-400 font-bold" : "text-zinc-400 hover:text-rose-400"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-rose-500 text-rose-500")} />
              <span>{item.likesCount || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
