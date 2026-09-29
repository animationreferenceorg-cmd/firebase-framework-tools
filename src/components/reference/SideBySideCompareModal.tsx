'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Play,
  Pause,
  UploadCloud,
  Split,
  Columns,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Maximize,
  Minimize,
  Film,
} from 'lucide-react';
import type { Video } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SideBySideCompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceVideo: Video;
}

export function SideBySideCompareModal({
  open,
  onOpenChange,
  referenceVideo,
}: SideBySideCompareModalProps) {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [fps, setFps] = useState(24);
  const [frameOffset, setFrameOffset] = useState(0); // Offset in frames for user video
  const [viewMode, setViewMode] = useState<'split' | 'wipe'>('split');
  const [wipePercent, setWipePercent] = useState(50);
  const [userVideoUrl, setUserVideoUrl] = useState<string | null>(null);
  const [userFileName, setUserFileName] = useState<string | null>(null);

  const refVideoRef = useRef<HTMLVideoElement | null>(null);
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Extract clean reference url
  const getCleanRefUrl = () => {
    let u = referenceVideo.videoUrl?.trim() || '';
    if (u.includes('playlist.m3u8')) {
      u = u.replace('playlist.m3u8', 'play_720p.mp4');
    }
    return u;
  };

  const refUrl = getCleanRefUrl();

  // Handle local file drop or selection
  const handleFileSelect = (file: File) => {
    if (!file.type.includes('video') && !file.name.endsWith('.mp4') && !file.name.endsWith('.mov') && !file.name.endsWith('.webm')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please upload an MP4, MOV, or WebM video playblast.',
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setUserVideoUrl(url);
    setUserFileName(file.name);
    toast({
      title: 'Shot Loaded! 🎬',
      description: `Loaded "${file.name}" for synchronized side-by-side comparison.`,
    });
  };

  // Synchronized Play / Pause
  const togglePlayPause = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (refVideoRef.current) {
      if (nextPlaying) refVideoRef.current.play().catch(() => {});
      else refVideoRef.current.pause();
    }
    if (userVideoRef.current) {
      if (nextPlaying) userVideoRef.current.play().catch(() => {});
      else userVideoRef.current.pause();
    }
  };

  // Sync seek
  const handleSeek = (val: number[]) => {
    const time = val[0];
    setCurrentTime(time);
    if (refVideoRef.current) {
      refVideoRef.current.currentTime = time;
    }
    if (userVideoRef.current) {
      const userTargetTime = Math.max(0, time + frameOffset / fps);
      userVideoRef.current.currentTime = userTargetTime;
    }
  };

  // Step Frame
  const stepFrame = (direction: 'forward' | 'backward') => {
    const delta = 1 / fps;
    const newTime = direction === 'forward' 
      ? Math.min(duration, currentTime + delta)
      : Math.max(0, currentTime - delta);
    
    setCurrentTime(newTime);
    if (refVideoRef.current) {
      refVideoRef.current.pause();
      refVideoRef.current.currentTime = newTime;
    }
    if (userVideoRef.current) {
      userVideoRef.current.pause();
      userVideoRef.current.currentTime = Math.max(0, newTime + frameOffset / fps);
    }
    setIsPlaying(false);
  };

  // Update offset
  const handleOffsetChange = (val: number[]) => {
    const newOffset = val[0];
    setFrameOffset(newOffset);
    if (userVideoRef.current && refVideoRef.current) {
      userVideoRef.current.currentTime = Math.max(0, refVideoRef.current.currentTime + newOffset / fps);
    }
  };

  // Keep time updated
  const handleRefTimeUpdate = () => {
    if (refVideoRef.current) {
      setCurrentTime(refVideoRef.current.currentTime);
      if (refVideoRef.current.duration && !isNaN(refVideoRef.current.duration)) {
        setDuration(refVideoRef.current.duration);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === '.' || e.key === 'ArrowRight') {
        e.preventDefault();
        stepFrame('forward');
      } else if (e.key === ',' || e.key === 'ArrowLeft') {
        e.preventDefault();
        stepFrame('backward');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isPlaying, currentTime, duration, fps, frameOffset]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (userVideoUrl) URL.revokeObjectURL(userVideoUrl);
    };
  }, [userVideoUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] bg-[#0c0919] border border-purple-500/30 text-white p-4 sm:p-6 max-h-[96vh] flex flex-col justify-between overflow-hidden">
        <DialogHeader className="pb-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-purple-600/30 border border-purple-400/30 text-purple-300">
                <Split className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                  Sync Comparison Player
                  <Badge variant="outline" className="bg-purple-950/80 border-purple-500/40 text-purple-300 text-[10px] font-bold">
                    PRO
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Scrub and compare your 3D playblast against live reference in locked frame-by-frame sync.
                </DialogDescription>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('split')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  viewMode === 'split' ? "bg-purple-600 text-white shadow" : "text-zinc-400 hover:text-white"
                )}
              >
                <Columns className="w-3.5 h-3.5" /> Side by Side
              </button>
              <button
                onClick={() => setViewMode('wipe')}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  viewMode === 'wipe' ? "bg-purple-600 text-white shadow" : "text-zinc-400 hover:text-white"
                )}
              >
                <Split className="w-3.5 h-3.5" /> Wipe Slider
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Video Display Viewports */}
        <div 
          ref={containerRef}
          className="relative flex-1 w-full my-3 min-h-[360px] max-h-[58vh] bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center"
        >
          {viewMode === 'split' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 w-full h-full divide-y md:divide-y-0 md:divide-x divide-white/10">
              {/* Left Pane: Reference Video */}
              <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                <video
                  ref={refVideoRef}
                  src={refUrl}
                  onTimeUpdate={handleRefTimeUpdate}
                  muted
                  playsInline
                  loop
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 border border-white/10 backdrop-blur-md text-[11px] font-bold text-purple-300">
                  Reference: {referenceVideo.title}
                </div>
                <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/70 font-mono text-[10px] text-zinc-300">
                  F: {Math.floor(currentTime * fps) + 1}
                </div>
              </div>

              {/* Right Pane: User's Playblast */}
              <div className="relative w-full h-full bg-[#0a0714] flex items-center justify-center overflow-hidden">
                {userVideoUrl ? (
                  <>
                    <video
                      ref={userVideoRef}
                      src={userVideoUrl}
                      muted
                      playsInline
                      loop
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <div className="px-2.5 py-1 rounded-lg bg-black/70 border border-white/10 backdrop-blur-md text-[11px] font-bold text-emerald-300">
                        Your Shot: {userFileName}
                      </div>
                      <button
                        onClick={() => { setUserVideoUrl(null); setUserFileName(null); }}
                        className="p-1 rounded-lg bg-black/60 hover:bg-rose-600/80 text-zinc-400 hover:text-white transition-colors"
                        title="Remove shot"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/70 font-mono text-[10px] text-zinc-300">
                      F: {Math.max(1, Math.floor((currentTime + frameOffset / fps) * fps) + 1)} {frameOffset !== 0 && `(${frameOffset > 0 ? `+${frameOffset}` : frameOffset})`}
                    </div>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-purple-500/30 hover:border-purple-400/60 rounded-3xl cursor-pointer transition-all hover:bg-purple-950/20 text-center m-6 w-full max-w-md">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Drop your .mp4 playblast here</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Loads 100% locally in your browser. No files uploaded.</p>
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          ) : (
            /* Wipe / Split Overlay Mode */
            <div className="relative w-full h-full bg-black overflow-hidden select-none">
              {/* Reference layer underneath */}
              <video
                ref={refVideoRef}
                src={refUrl}
                onTimeUpdate={handleRefTimeUpdate}
                muted
                playsInline
                loop
                className="absolute inset-0 w-full h-full object-contain"
              />

              {/* User layer clipped above */}
              {userVideoUrl && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${wipePercent}%` }}
                >
                  <video
                    ref={userVideoRef}
                    src={userVideoUrl}
                    muted
                    playsInline
                    loop
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{
                      width: containerRef.current?.clientWidth || '100%',
                      maxWidth: 'none',
                    }}
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 backdrop-blur-md text-[11px] font-bold text-emerald-300">
                    Your Shot (Left)
                  </div>
                </div>
              )}

              {/* Draggable Divider Line */}
              {userVideoUrl && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                  style={{ left: `${wipePercent}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-black shadow-lg">
                    ◄►
                  </div>
                </div>
              )}

              {/* Wipe Slider Controls overlay if no video */}
              {!userVideoUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                  <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-purple-500/40 rounded-3xl cursor-pointer hover:bg-purple-950/30 text-center">
                    <UploadCloud className="w-8 h-8 text-purple-400" />
                    <p className="text-sm font-bold text-white">Load a playblast to use the Wipe Slider</p>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Master Timeline & Controls Bar */}
        <div className="space-y-3 pt-2">
          {/* Timeline Scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400 w-12 text-right">
              {currentTime.toFixed(2)}s
            </span>
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 1}
              step={1 / fps}
              onValueChange={handleSeek}
              className="flex-1"
              trackClassName="bg-white/10 h-2 rounded-full cursor-pointer"
              rangeClassName="bg-gradient-to-r from-purple-500 to-indigo-500"
              thumbClassName="h-4 w-4 bg-white shadow-md hover:scale-125 transition-transform cursor-pointer"
            />
            <span className="text-xs font-mono text-zinc-400 w-12">
              {duration.toFixed(2)}s
            </span>
          </div>

          {/* Lower Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlayPause}
                className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white border-0 shadow-lg cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </Button>

              <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1 border border-white/10">
                <button
                  onClick={() => stepFrame('backward')}
                  className="px-2 py-0.5 text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                  title="Step Backward (,)"
                >
                  ◄ Frame
                </button>
                <button
                  onClick={() => stepFrame('forward')}
                  className="px-2 py-0.5 text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                  title="Step Forward (.)"
                >
                  Frame ►
                </button>
              </div>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">FPS:</span>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="bg-black/60 text-zinc-300 text-xs font-mono rounded px-2 py-1 border border-white/10 cursor-pointer"
                >
                  <option value={24}>24 fps</option>
                  <option value={25}>25 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </div>
            </div>

            {/* Frame Offset Tuning Slider */}
            {userVideoUrl && (
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" /> Shot Offset:
                </span>
                <div className="w-28">
                  <Slider
                    value={[frameOffset]}
                    min={-48}
                    max={48}
                    step={1}
                    onValueChange={handleOffsetChange}
                    className="w-full"
                    trackClassName="bg-white/20 h-1.5"
                    rangeClassName="bg-purple-500"
                    thumbClassName="h-3.5 w-3.5 bg-white"
                  />
                </div>
                <span className="text-xs font-mono text-purple-300 font-bold min-w-10">
                  {frameOffset > 0 ? `+${frameOffset}` : frameOffset} f
                </span>
                {frameOffset !== 0 && (
                  <button
                    onClick={() => handleOffsetChange([0])}
                    className="text-zinc-500 hover:text-white text-[10px] underline"
                    title="Reset offset"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            {/* Wipe Position if in Wipe Mode */}
            {viewMode === 'wipe' && userVideoUrl && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Wipe %:</span>
                <div className="w-24">
                  <Slider
                    value={[wipePercent]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(val) => setWipePercent(val[0])}
                    className="w-full"
                    trackClassName="bg-white/20 h-1"
                    rangeClassName="bg-white"
                    thumbClassName="h-3 w-3 bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
