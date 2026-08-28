'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Repeat, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Maximize2, 
  Minimize2,
  GripHorizontal,
  Upload,
  Film,
  RotateCcw,
  Clock,
  Layers,
  Grid,
  Pin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReferenceVideoItem } from './ReferenceVideoModal';

interface ReferenceOverlayProps {
  video: ReferenceVideoItem;
  activeFrameIndex?: number;
  fps?: number;
  onClose: () => void;
  onOpenLibraryModal?: () => void;
  onPinToCanvas?: () => void;
  isPinned?: boolean;
}

export function ReferenceOverlay({ 
  video, 
  activeFrameIndex = 0, 
  fps = 12, 
  onClose,
  onOpenLibraryModal,
  onPinToCanvas,
  isPinned = false,
}: ReferenceOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(true);
  const [opacity, setOpacity] = useState(0.85);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [position, setPosition] = useState({ x: 90, y: 90 });
  const [isLargeSize, setIsLargeSize] = useState(false);
  const [isTimelineSynced, setIsTimelineSynced] = useState(false);
  
  // Video scrubber timeline state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const dragStartRef = useRef({ x: 0, y: 0 });

  // Sync to timeline activeFrameIndex when enabled
  useEffect(() => {
    if (isTimelineSynced && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      const targetTime = activeFrameIndex / Math.max(1, fps);
      videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, targetTime);
    }
  }, [activeFrameIndex, fps, isTimelineSynced]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStepFrame = (deltaFrames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + deltaFrames * (1 / Math.max(1, fps))));
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const onPointerMove = (ev: PointerEvent) => {
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 300, ev.clientX - dragStartRef.current.x)),
        y: Math.max(10, Math.min(window.innerHeight - 200, ev.clientY - dragStartRef.current.y)),
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        "fixed z-40 bg-[#14141d]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150 flex flex-col transition-all",
        isLargeSize ? "w-[520px]" : "w-[380px]"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        opacity: opacity,
      }}
    >
      {/* ──────────────── DRAGGABLE PIP HEADER BAR ──────────────── */}
      <div 
        onPointerDown={handleHeaderPointerDown}
        className="h-10 px-3 flex items-center justify-between bg-white/5 border-b border-white/10 cursor-grab active:cursor-grabbing text-xs text-zinc-300 shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="h-4 w-4 text-zinc-500 shrink-0" />
          <span className="font-bold text-white truncate text-[11px]">{video.title}</span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Pin to Canvas Background Button */}
          {onPinToCanvas && (
            <button
              onClick={onPinToCanvas}
              className={cn(
                "h-7 px-2.5 rounded-xl flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer border border-white/10",
                isPinned ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30" : "bg-white/5 text-purple-300 hover:text-white hover:bg-white/10"
              )}
              title="Pin reference video to canvas background for tracing & rotoscoping"
            >
              <Pin className="h-3 w-3" />
              <span>{isPinned ? "Pinned" : "Pin Canvas"}</span>
            </button>
          )}

          {/* Timeline Sync Toggle */}
          <button
            onClick={() => setIsTimelineSynced(!isTimelineSynced)}
            className={cn(
              "h-7 px-2.5 rounded-xl flex items-center gap-1 font-bold text-[10px] transition-all cursor-pointer border border-white/10",
              isTimelineSynced ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 border-purple-400/50" : "bg-white/5 text-zinc-400 hover:text-white"
            )}
            title="Sync reference video playback to animation timeline frames"
          >
            <Clock className="h-3 w-3" />
            <span>Sync Timeline</span>
          </button>

          {/* Library Button */}
          {onOpenLibraryModal && (
            <button
              onClick={onOpenLibraryModal}
              className="h-7 px-2.5 rounded-xl flex items-center gap-1 font-bold text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
              title="Open Full Reference Library"
            >
              <Grid className="h-3 w-3" />
              <span>Library</span>
            </button>
          )}

          {/* Opacity Slider */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-xl border border-white/10" title="Rotoscoping / Reference Opacity">
            <Eye className="h-3 w-3 text-purple-400" />
            <input
              type="range"
              min={0.15}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-10 h-1 accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Toggle Window Size */}
          <button
            onClick={() => setIsLargeSize(!isLargeSize)}
            className="h-7 w-7 rounded-xl hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={isLargeSize ? "Standard View" : "Large View"}
          >
            {isLargeSize ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* Close Window */}
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-xl hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Close Reference Window"
          >
            <X className="h-3.5 w-3.5" />
          </button>

        </div>
      </div>

      {/* ──────────────── VIDEO DISPLAY CONTAINER ──────────────── */}
      <div className="relative aspect-video bg-black overflow-hidden group shrink-0">
        <video
          ref={videoRef}
          src={video.videoUrl}
          autoPlay
          loop={isLooping}
          muted
          playsInline
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          className="w-full h-full object-contain"
        />

        {/* Video Overlay Play Indicator */}
        {!isPlaying && (
          <div 
            onClick={togglePlay}
            className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xl backdrop-blur-md border border-white/20">
              <Play className="h-5 w-5 fill-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* ──────────────── INTERACTIVE VIDEO SCRUBBER TIMELINE ──────────────── */}
      <div className="px-3 py-1.5 bg-[#0f0f15] border-t border-white/10 flex items-center gap-2 text-[10px] font-mono text-zinc-400">
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 bg-white/10 accent-purple-500 rounded-full cursor-pointer"
        />
        <span>{formatTime(duration)}</span>
      </div>

      {/* ──────────────── CONTROLS BAR ──────────────── */}
      <div className="p-2.5 bg-[#12121b] border-t border-white/10 flex items-center justify-between text-xs shrink-0">
        
        {/* Play/Pause & Step Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={togglePlay}
            className="h-7 w-7 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md shadow-purple-600/30"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white ml-0.5" />}
          </button>

          {/* Step Back 1 Frame */}
          <button
            onClick={() => handleStepFrame(-1)}
            className="h-7 w-7 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
            title="Step Back 1 Frame (◀)"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Step Forward 1 Frame */}
          <button
            onClick={() => handleStepFrame(1)}
            className="h-7 w-7 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
            title="Step Forward 1 Frame (▶)"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Loop Toggle */}
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={cn(
              "h-7 w-7 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-white/10 ml-1",
              isLooping ? "bg-purple-600/30 text-purple-300 border-purple-500/40" : "bg-white/5 text-zinc-500 hover:text-white"
            )}
            title="Toggle Loop Playback"
          >
            <Repeat className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/10">
          {[0.25, 0.5, 1.0].map((rate) => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer",
                playbackRate === rate ? "bg-purple-600 text-white shadow" : "text-zinc-400 hover:text-white"
              )}
            >
              {rate}x
            </button>
          ))}
        </div>

      </div>

    </div>
  );
}
