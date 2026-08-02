"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Film, Plus, Play, Pause, Sparkles, Layers, Check, Scissors, Wand2 } from 'lucide-react';
import type { PortfolioItem } from '@/lib/types';
import { ReelTimelineTrack, type TimelineClip } from './ReelTimelineTrack';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';

interface ReelStudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableItems: PortfolioItem[];
  onReelPublished: (publishedClips: PortfolioItem[]) => void;
}

export const ReelStudioModal: React.FC<ReelStudioModalProps> = ({
  open,
  onOpenChange,
  availableItems,
  onReelPublished,
}) => {
  const { toast } = useToast();

  // Timeline Clips
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reelTitle, setReelTitle] = useState('My Stitched Animation Reel 2026');

  // Initialize timeline with available items on open
  useEffect(() => {
    if (open && availableItems.length > 0 && timelineClips.length === 0) {
      const initial = availableItems.slice(0, 4).map((item) => ({
        id: item.id,
        portfolioItem: item,
        startTime: 0,
        endTime: 10,
        duration: 10,
      }));
      setTimelineClips(initial);
    }
  }, [open, availableItems]);

  const activeClip = timelineClips[activeClipIndex] || timelineClips[0];
  const totalDuration = timelineClips.reduce((acc, c) => acc + c.duration, 0);

  const handleAddClip = (item: PortfolioItem) => {
    const newClip: TimelineClip = {
      id: `${item.id}-${Date.now()}`,
      portfolioItem: item,
      startTime: 0,
      endTime: 10,
      duration: 10,
    };
    setTimelineClips([...timelineClips, newClip]);
    toast({ title: 'Clip Added', description: `Added "${item.title}" to reel timeline.` });
  };

  const handleMoveClip = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= timelineClips.length) return;

    const newClips = [...timelineClips];
    const temp = newClips[index];
    newClips[index] = newClips[targetIdx];
    newClips[targetIdx] = temp;
    setTimelineClips(newClips);
    setActiveClipIndex(targetIdx);
  };

  const handleReorderClips = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= timelineClips.length ||
      toIndex >= timelineClips.length
    ) return;

    const newClips = [...timelineClips];
    const [movedClip] = newClips.splice(fromIndex, 1);
    newClips.splice(toIndex, 0, movedClip);
    setTimelineClips(newClips);
    setActiveClipIndex(toIndex);
    toast({
      title: 'Timeline Updated',
      description: `Reordered "${movedClip.portfolioItem.title}" to position #${toIndex + 1}.`,
    });
  };

  const handleRemoveClip = (index: number) => {
    const newClips = timelineClips.filter((_, i) => i !== index);
    setTimelineClips(newClips);
    if (activeClipIndex >= newClips.length) {
      setActiveClipIndex(Math.max(0, newClips.length - 1));
    }
  };

  const handleClipEnded = () => {
    if (timelineClips.length === 0) return;
    const nextIdx = (activeClipIndex + 1) % timelineClips.length;
    setActiveClipIndex(nextIdx);
    setIsPlaying(true);
  };

  const handlePublishReel = () => {
    if (timelineClips.length === 0) {
      toast({ title: 'No clips on timeline', description: 'Add clips to your timeline before publishing.', variant: 'destructive' });
      return;
    }

    const orderedItems = timelineClips.map((c) => c.portfolioItem);
    onReelPublished(orderedItems);
    toast({ title: 'Reel Stitched & Published!', description: `Published "${reelTitle}" with ${timelineClips.length} continuous animation clips.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-zinc-950 border-white/10 text-white p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" />
            Animation Reel Studio & Timeline Editor
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Arrange and stitch your animation clips into one unified demo reel video, similar to a video editor timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Reel Title Input */}
          <div className="space-y-2">
            <Label htmlFor="reel-title" className="text-zinc-300 font-medium">Demo Reel Title</Label>
            <Input
              id="reel-title"
              value={reelTitle}
              onChange={(e) => setReelTitle(e.target.value)}
              placeholder="e.g. 2026 Character Animation Demo Reel"
              className="bg-zinc-900 border-white/10 text-white"
            />
          </div>

          {/* Top Video Preview Viewport */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl">
            {activeClip ? (
              <UniversalVideoPlayer
                key={activeClip.id}
                url={activeClip.portfolioItem.mediaUrl}
                poster={activeClip.portfolioItem.thumbnailUrl}
                autoPlay={isPlaying}
                muted={true}
                controls={true}
                onEnded={handleClipEnded}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-zinc-500 text-sm">
                No active clip selected. Add clips to timeline below.
              </div>
            )}

            {/* Active Clip Overlay Indicator */}
            {activeClip && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <Badge variant="default" className="bg-primary text-white font-semibold text-xs shadow-lg">
                  Previewing Clip #{activeClipIndex + 1}: {activeClip.portfolioItem.title}
                </Badge>
              </div>
            )}
          </div>

          {/* Video Editor Timeline Track */}
          <ReelTimelineTrack
            clips={timelineClips}
            activeClipIndex={activeClipIndex}
            onSelectClip={(idx) => {
              setActiveClipIndex(idx);
              setIsPlaying(true);
            }}
            onMoveClip={handleMoveClip}
            onReorderClips={handleReorderClips}
            onRemoveClip={handleRemoveClip}
            totalDuration={totalDuration}
          />

          {/* Available Clips Library (Click to Add to Timeline) */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" /> Add Animation Clips to Timeline
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1">
              {availableItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddClip(item)}
                  className="group flex flex-col justify-between p-2 rounded-xl bg-zinc-900 border border-white/10 hover:border-primary hover:bg-zinc-800 text-left transition-all cursor-pointer"
                >
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black mb-2">
                    <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Plus className="h-5 w-5 text-white bg-primary/80 rounded-full p-1 shadow-lg" />
                    </div>
                  </div>
                  <h5 className="text-xs font-semibold text-white truncate">{item.title}</h5>
                  <span className="text-[10px] text-zinc-400 capitalize">{item.wipStage || item.type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-white/10">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-zinc-300 hover:bg-zinc-900">
            Cancel
          </Button>
          <Button onClick={handlePublishReel} className="bg-primary hover:bg-primary/90 text-white font-bold gap-2">
            <Wand2 className="h-4 w-4" /> Stitch & Publish Reel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
