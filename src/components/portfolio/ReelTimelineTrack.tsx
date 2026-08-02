"use client";

import React, { useState } from 'react';
import type { PortfolioItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Trash2, ArrowLeft, ArrowRight, Clock, Film, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineClip {
  id: string;
  portfolioItem: PortfolioItem;
  startTime: number; // in seconds
  endTime: number; // in seconds
  duration: number; // in seconds
}

interface ReelTimelineTrackProps {
  clips: TimelineClip[];
  activeClipIndex: number;
  onSelectClip: (index: number) => void;
  onMoveClip: (index: number, direction: 'left' | 'right') => void;
  onReorderClips?: (fromIndex: number, toIndex: number) => void;
  onRemoveClip: (index: number) => void;
  totalDuration: number;
}

export const ReelTimelineTrack: React.FC<ReelTimelineTrackProps> = ({
  clips,
  activeClipIndex,
  onSelectClip,
  onMoveClip,
  onReorderClips,
  onRemoveClip,
  totalDuration,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex && onReorderClips) {
      onReorderClips(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-3 shadow-2xl">
      {/* Timeline Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2 font-semibold text-white">
          <Film className="h-4 w-4 text-purple-400" />
          <span>VIDEO EDITOR TIMELINE TRACK ({clips.length} Clips)</span>
          <span className="text-[10px] text-purple-300 font-mono bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-800/40 hidden sm:inline-block">
            🖐 Drag & Drop clips to reorder
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1 rounded-full border border-white/10 text-zinc-300">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span>Total Reel Duration: <strong className="text-white font-mono">{formatTimecode(totalDuration)}</strong></span>
        </div>
      </div>

      {/* Timecode Ruler */}
      <div className="relative h-5 w-full bg-zinc-900/60 rounded border border-white/5 flex items-center px-2 text-[10px] font-mono text-zinc-500 justify-between">
        <span>00:00</span>
        <span>{formatTimecode(totalDuration * 0.25)}</span>
        <span>{formatTimecode(totalDuration * 0.5)}</span>
        <span>{formatTimecode(totalDuration * 0.75)}</span>
        <span>{formatTimecode(totalDuration)}</span>
      </div>

      {/* Interactive Video Editor Timeline Track Strip */}
      {clips.length === 0 ? (
        <div className="h-24 w-full border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-zinc-500 text-xs">
          No clips on timeline. Click "+ Add Animation Clip" below to build your reel!
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {clips.map((clip, index) => {
            const isActive = index === activeClipIndex;
            const isDragging = index === draggedIndex;
            const isTarget = index === dragOverIndex && draggedIndex !== index;
            // Calculate width percentage relative to total duration
            const flexWidth = Math.max(170, Math.floor((clip.duration / Math.max(1, totalDuration)) * 600));

            return (
              <div
                key={`${clip.id}-${index}`}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={() => handleDragLeave(index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectClip(index)}
                style={{ minWidth: `${flexWidth}px` }}
                className={cn(
                  "group relative flex flex-col justify-between p-2.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing shrink-0 select-none",
                  isDragging && "opacity-40 border-dashed border-purple-400 scale-95 shadow-inner",
                  isTarget && "ring-4 ring-purple-500/80 bg-purple-950/80 border-purple-400 scale-105 shadow-[0_0_30px_rgba(168,85,247,0.5)] z-30",
                  !isDragging && !isTarget && (
                    isActive
                      ? "bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/40 text-white shadow-xl"
                      : "bg-zinc-900/90 border-white/10 text-zinc-300 hover:bg-zinc-800 hover:border-white/20"
                  )
                )}
              >
                {/* Clip Top Bar */}
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <span className="font-extrabold text-purple-400 flex items-center gap-1">
                    <GripVertical className="h-3.5 w-3.5 text-zinc-400 group-hover:text-purple-300" />
                    Clip #{index + 1}
                  </span>
                  <Badge variant="outline" className="bg-black/60 text-zinc-300 border-white/10 px-1.5 py-0 text-[9px] font-mono">
                    {formatTimecode(clip.duration)}
                  </Badge>
                </div>

                {/* Clip Title & Thumbnail */}
                <div className="my-2 flex items-center gap-2">
                  <div className="h-10 w-14 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                    <img
                      src={clip.portfolioItem.thumbnailUrl || clip.portfolioItem.mediaUrl}
                      alt={clip.portfolioItem.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {clip.portfolioItem.title}
                    </p>
                    <p className="text-[9px] text-purple-300/80 font-medium">Drag to move</p>
                  </div>
                </div>

                {/* Clip Controls (Move Left / Right & Delete) */}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-xs">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveClip(index, 'left');
                      }}
                      title="Move Left"
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === clips.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveClip(index, 'right');
                      }}
                      title="Move Right"
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveClip(index);
                    }}
                    title="Remove Clip"
                    className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
