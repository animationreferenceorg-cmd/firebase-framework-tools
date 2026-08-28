'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Frame, CanvasSize } from '@/lib/paint/types';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Film, 
  ChevronDown,
  Copy,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  ZoomIn,
  ZoomOut,
  Repeat,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Sliders,
  Layers,
  Music,
  Upload,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineTrack {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

interface FramesPanelProps {
  frames: Frame[];
  activeFrameIndex: number;
  onSelectFrame: (idx: number) => void;
  onAddFrame: () => void;
  onDeleteFrame: () => void;
  onDuplicateFrame: () => void;
  onExtendFrame?: () => void;
  onMergeFrames?: () => void;
  onSetPoseType?: (frameIdx: number, type: 'key' | 'extreme' | 'breakdown' | 'inbetween') => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  canvasSize: CanvasSize;
  onionSkinPrev: boolean;
  onToggleOnionSkinPrev: () => void;
  onionSkinNext: boolean;
  onToggleOnionSkinNext: () => void;
  referenceVideoTitle?: string;
  onCloseTimeline?: () => void;
  loopStart?: number;
  loopEnd?: number;
  onLoopStartChange?: (start: number) => void;
  onLoopEndChange?: (end: number) => void;
  audioBuffer?: AudioBuffer | null;
  audioFileName?: string | null;
  onUploadAudio?: (file: File) => void;
  onRemoveAudio?: () => void;
  onionSkinOpacity?: number;
  onOnionSkinOpacityChange?: (opacity: number) => void;
}

export function FramesPanel({
  frames,
  activeFrameIndex,
  onSelectFrame,
  onAddFrame,
  onDeleteFrame,
  onDuplicateFrame,
  onExtendFrame,
  onMergeFrames,
  isPlaying,
  onTogglePlay,
  fps,
  onFpsChange,
  canvasSize,
  onionSkinPrev,
  onToggleOnionSkinPrev,
  onionSkinNext,
  onToggleOnionSkinNext,
  referenceVideoTitle,
  onCloseTimeline,
  loopStart: propLoopStart,
  loopEnd: propLoopEnd,
  onLoopStartChange,
  onLoopEndChange,
  onSetPoseType,
  audioBuffer,
  audioFileName,
  onUploadAudio,
  onRemoveAudio,
  onionSkinOpacity = 0.3,
  onOnionSkinOpacityChange
}: FramesPanelProps) {
  const rulerTrackRef = useRef<HTMLDivElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Custom Horizontal Timeline Scroll Slider States
  const [scrollRatio, setScrollRatio] = useState<number>(0);
  const [thumbWidthRatio, setThumbWidthRatio] = useState<number>(0.3);

  // Timeline UI States
  const [timelineZoom, setTimelineZoom] = useState<number>(1.0); // 0.5 to 2.5
  const [localLoopStart, setLocalLoopStart] = useState<number>(0);
  const [localLoopEnd, setLocalLoopEnd] = useState<number>(Math.max(0, frames.length - 1));
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [showOptionsSubbar, setShowOptionsSubbar] = useState<boolean>(false);
  const [isExpandedTimeline, setIsExpandedTimeline] = useState(false);

  const loopStart = propLoopStart !== undefined ? propLoopStart : localLoopStart;
  const loopEnd = propLoopEnd !== undefined ? propLoopEnd : localLoopEnd;

  const setLoopStart = (val: number) => {
    setLocalLoopStart(val);
    onLoopStartChange?.(val);
  };

  const setLoopEnd = (val: number) => {
    setLocalLoopEnd(val);
    onLoopEndChange?.(val);
  };

  // Update loopEnd when frame count expands
  useEffect(() => {
    setLoopEnd(Math.max(0, frames.length - 1));
  }, [frames.length]);

  // Multi-Track Timeline Support
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    { id: 'track-1', name: 'Main Animation', color: 'from-purple-600 to-indigo-600', visible: true, locked: false },
    { id: 'track-2', name: 'Rough Sketch', color: 'from-cyan-600 to-blue-600', visible: true, locked: false },
  ]);
  const [activeTrackId, setActiveTrackId] = useState<string>('track-1');

  const handleAddTrack = () => {
    const trackColors = [
      'from-pink-600 to-rose-600',
      'from-emerald-600 to-teal-600',
      'from-amber-600 to-orange-600',
      'from-violet-600 to-purple-600',
    ];
    const newTrackIdx = tracks.length + 1;
    const newTrack: TimelineTrack = {
      id: `track-${Date.now()}`,
      name: `Animation Track ${newTrackIdx}`,
      color: trackColors[(newTrackIdx - 1) % trackColors.length],
      visible: true,
      locked: false,
    };
    setTracks((prev) => [...prev, newTrack]);
    setActiveTrackId(newTrack.id);
  };

  const handleRemoveTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tracks.length <= 1) return;
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    if (activeTrackId === trackId) {
      setActiveTrackId(tracks[0].id);
    }
  };

  const toggleTrackVisible = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t))
    );
  };

  const toggleTrackLocked = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t))
    );
  };

  // Keyboard Frame Stepping & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowLeft' || e.key === ',') {
        e.preventDefault();
        onSelectFrame(Math.max(loopStart, activeFrameIndex - 1));
      } else if (e.key === 'ArrowRight' || e.key === '.') {
        e.preventDefault();
        onSelectFrame(Math.min(loopEnd, activeFrameIndex + 1));
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setLoopStart(activeFrameIndex);
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setLoopEnd(activeFrameIndex);
      } else if (e.key === 'F6') {
        e.preventDefault();
        onAddFrame();
      } else if (e.key === 'F5') {
        e.preventDefault();
        onDuplicateFrame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFrameIndex, frames.length, loopStart, loopEnd, onSelectFrame, onAddFrame, onDuplicateFrame]);

  // Scaled Cel Cell Dimensions
  const cellWidth = Math.max(24, Math.round(36 * timelineZoom));

  // High-Performance RAF Scrubbing
  const scrubRafRef = useRef<number | null>(null);

  const scrubToPosition = useCallback((clientX: number) => {
    if (scrubRafRef.current) cancelAnimationFrame(scrubRafRef.current);
    scrubRafRef.current = requestAnimationFrame(() => {
      const container = stageContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // Account for track label header width (176px / pl-44) and stage container scroll position
      const trackOffsetLeft = 176;
      const scrollX = (clientX - rect.left - trackOffsetLeft) + container.scrollLeft;
      const targetIdx = Math.max(0, Math.min(frames.length - 1, Math.floor(scrollX / cellWidth)));
      if (targetIdx !== activeFrameIndex) {
        onSelectFrame(targetIdx);
      }
    });
  }, [activeFrameIndex, cellWidth, frames.length, onSelectFrame]);

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(true);
    scrubToPosition(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return;
    const handleMove = (e: PointerEvent) => {
      scrubToPosition(e.clientX);
    };
    const handleUp = () => {
      setIsScrubbing(false);
      if (scrubRafRef.current) cancelAnimationFrame(scrubRafRef.current);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (scrubRafRef.current) cancelAnimationFrame(scrubRafRef.current);
    };
  }, [isScrubbing, scrubToPosition]);

  const sliderRafRef = useRef<number | null>(null);

  // Handle Timeline Stage Scroll & Update Custom Slider Handle
  const handleStageScroll = useCallback(() => {
    const el = stageContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setScrollRatio(0);
      setThumbWidthRatio(1);
      return;
    }
    setScrollRatio(el.scrollLeft / maxScroll);
    setThumbWidthRatio(Math.max(0.15, el.clientWidth / el.scrollWidth));
  }, []);

  // Auto-scroll active playhead frame into view during playback / navigation
  useEffect(() => {
    const el = stageContainerRef.current;
    if (!el) return;
    const activeCelPos = activeFrameIndex * cellWidth;
    const viewLeft = el.scrollLeft;
    const viewRight = el.scrollLeft + el.clientWidth - 200; // Account for track label width

    if (activeCelPos < viewLeft || activeCelPos > viewRight) {
      el.scrollTo({
        left: Math.max(0, activeCelPos - el.clientWidth / 2),
        behavior: 'smooth',
      });
    }
  }, [activeFrameIndex, cellWidth]);

  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Buttery-Smooth 1:1 Instant Drag Custom Timeline Slider Handle
  const handleSliderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingSlider(true);
    const track = e.currentTarget;
    const rect = track.getBoundingClientRect();
    
    const updateScroll = (clientX: number) => {
      if (sliderRafRef.current) cancelAnimationFrame(sliderRafRef.current);
      sliderRafRef.current = requestAnimationFrame(() => {
        const el = stageContainerRef.current;
        if (!el) return;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0) return;
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        el.scrollLeft = pct * maxScroll;
      });
    };

    updateScroll(e.clientX);

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      updateScroll(ev.clientX);
    };
    const onUp = (ev: PointerEvent) => {
      ev.preventDefault();
      setIsDraggingSlider(false);
      if (sliderRafRef.current) cancelAnimationFrame(sliderRafRef.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: false });
  };

  const maxTimelineTicks = Math.max(24, frames.length + 12);
  const rulerTicks = Array.from({ length: maxTimelineTicks }, (_, idx) => idx);

  return (
    <div 
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full bg-[#101016]/95 backdrop-blur-3xl border-t border-white/10 select-none shadow-[0_-20px_50px_rgba(0,0,0,0.8)] z-40 flex flex-col shrink-0"
    >
      
      {/* ──────────────── CLEAN TOP TIMELINE TOOLBAR ──────────────── */}
      <div className="h-12 px-6 border-b border-white/10 flex items-center justify-between bg-[#14141d]/90">
        
        {/* 1. PLAYBACK & FRAME NAVIGATION */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className={cn(
              "h-8 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md border",
              isPlaying 
                ? "bg-amber-500 hover:bg-amber-400 text-black border-amber-300" 
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400/40"
            )}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5 fill-black" /> : <Play className="h-3.5 w-3.5 fill-white" />}
            <span>{isPlaying ? 'Pause' : 'Play (Space)'}</span>
          </button>

          {/* Stepper & Counter Pill */}
          <div className="flex items-center gap-2">
            {/* Timeline Cel Zoom Stepper */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded-xl shadow-inner text-xs font-mono">
              <button
                onClick={() => setTimelineZoom((z) => Math.max(0.5, Math.round((z - 0.2) * 10) / 10))}
                className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white font-bold cursor-pointer"
                title="Zoom Out Cel Tracks (-)"
              >
                -
              </button>
              <button
                onClick={() => setTimelineZoom(1.0)}
                className="text-purple-300 hover:text-white font-bold px-1 min-w-[36px] text-center cursor-pointer"
                title="Reset Zoom to 100%"
              >
                {Math.round(timelineZoom * 100)}%
              </button>
              <button
                onClick={() => setTimelineZoom((z) => Math.min(2.5, Math.round((z + 0.2) * 10) / 10))}
                className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white font-bold cursor-pointer"
                title="Zoom In Cel Tracks (+)"
              >
                +
              </button>
            </div>

            {/* Frame Counter & Arrow Steppers */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
              <button
                onClick={() => onSelectFrame(Math.max(loopStart, activeFrameIndex - 1))}
                className="h-7 w-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Frame (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-mono font-bold px-2 text-purple-300 min-w-[70px] text-center">
                {String(activeFrameIndex + 1).padStart(2, '0')} / {String(frames.length).padStart(2, '0')}
              </span>
              <button
                onClick={() => onSelectFrame(Math.min(loopEnd, activeFrameIndex + 1))}
                className="h-7 w-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Next Frame (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. CORE TOON BOOM KEYFRAME ACTIONS */}
        <div className="flex items-center gap-2">
          {/* Insert Keyframe Cel (F6) */}
          <button
            onClick={onAddFrame}
            className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md border border-purple-400/40"
            title="Insert Keyframe Drawing (F6)"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Keyframe (F6)</span>
          </button>

          {/* Extend Exposure / Hold Cel (F5) */}
          <button
            onClick={onExtendFrame || onDuplicateFrame}
            className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Extend Exposure / Hold Cel (F5)"
          >
            <Copy className="h-3.5 w-3.5 text-indigo-400" />
            <span>Extend / Hold (F5)</span>
          </button>

          {/* Merge Cels */}
          {onMergeFrames && (
            <button
              onClick={onMergeFrames}
              disabled={activeFrameIndex >= frames.length - 1}
              className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Merge Current Cel with Next Cel"
            >
              <Layers className="h-3.5 w-3.5 text-purple-400" />
              <span>Merge Cels</span>
            </button>
          )}

          {/* Pose Type Color Badges Selector */}
          {onSetPoseType && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              <span className="text-[10px] font-mono font-bold text-zinc-400 px-1">POSE:</span>
              <button
                onClick={() => onSetPoseType(activeFrameIndex, 'key')}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white shadow cursor-pointer"
                title="Tag Active Cel as KEY Pose (Red)"
              >
                Key
              </button>
              <button
                onClick={() => onSetPoseType(activeFrameIndex, 'extreme')}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 hover:bg-amber-300 text-black shadow cursor-pointer"
                title="Tag Active Cel as EXTREME Pose (Yellow)"
              >
                Extreme
              </button>
              <button
                onClick={() => onSetPoseType(activeFrameIndex, 'breakdown')}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow cursor-pointer"
                title="Tag Active Cel as BREAKDOWN Pose (Green)"
              >
                Break
              </button>
              <button
                onClick={() => onSetPoseType(activeFrameIndex, 'inbetween')}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white shadow cursor-pointer"
                title="Tag Active Cel as IN-BETWEEN Pose (Blue)"
              >
                InBet
              </button>
            </div>
          )}

          {/* Onion Skins Toggle & Opacity Slider */}
          <div className="flex items-center gap-2 bg-black/20 border border-white/5 rounded-xl px-1 py-1">
            <button
              onClick={onToggleOnionSkinPrev}
              className={cn(
                "h-7 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border",
                onionSkinPrev ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow" : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10"
              )}
              title="Toggle Ghosting / Onion Skins"
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Onion Skins</span>
            </button>

            {onionSkinPrev && onOnionSkinOpacityChange && (
              <div className="flex items-center gap-1.5 px-2">
                <input
                  type="range"
                  min="0.1" max="1.0" step="0.05"
                  value={onionSkinOpacity}
                  onChange={(e) => onOnionSkinOpacityChange(parseFloat(e.target.value))}
                  className="w-16 h-1 accent-amber-500 cursor-pointer"
                />
                <span className="text-[10px] font-mono font-bold text-amber-200/70 w-6 text-right">
                  {Math.round(onionSkinOpacity * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. PRO STUDIO OPTIONS & TRACK CONTROLS */}
        <div className="flex items-center gap-2">
          {/* Add Track */}
          <button
            onClick={handleAddTrack}
            className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/15 text-purple-200 border border-white/10 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Add Animation Track"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>+ Track</span>
          </button>

          {/* Options Toggle */}
          <button
            onClick={() => setShowOptionsSubbar(!showOptionsSubbar)}
            className={cn(
              "h-8 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border",
              showOptionsSubbar ? "bg-purple-600 text-white border-purple-400" : "bg-white/5 text-zinc-400 hover:text-white border-white/10"
            )}
            title="Toggle Timeline Options (FPS, Range)"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Options</span>
          </button>

          {/* Delete Cel */}
          <button
            onClick={onDeleteFrame}
            disabled={frames.length <= 1}
            className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-red-400 disabled:opacity-20 flex items-center justify-center transition-all cursor-pointer"
            title="Delete Keyframe"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {onCloseTimeline && (
            <button
              onClick={onCloseTimeline}
              className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer ml-1"
              title="Hide Timeline"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>

      </div>

      {/* ──────────────── DEDICATED PRO HORIZONTAL TIMELINE NAV & ZOOM BAR ──────────────── */}
      <div className="px-6 py-2 bg-[#0b0b10] border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-zinc-400">
            <Sliders className="h-3.5 w-3.5 text-purple-400" />
            <span>NAVIGATE & ZOOM:</span>
          </div>

          {/* Interactive Zoom Controls & Range Slider */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl shadow-inner text-xs font-mono">
            <button
              onClick={() => setTimelineZoom((z) => Math.max(0.4, Math.round((z - 0.2) * 10) / 10))}
              className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white font-bold cursor-pointer"
              title="Zoom Out Cel Tracks (-)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>

            <input
              type="range"
              min="0.4"
              max="3.0"
              step="0.1"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
              className="w-20 h-1.5 accent-purple-500 cursor-pointer"
              title="Slide to zoom timeline cel track resolution (Ctrl + Wheel on track to zoom)"
            />

            <button
              onClick={() => setTimelineZoom((z) => Math.min(3.0, Math.round((z + 0.2) * 10) / 10))}
              className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white font-bold cursor-pointer"
              title="Zoom In Cel Tracks (+)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setTimelineZoom(1.0)}
              className="text-[10px] text-purple-300 hover:text-white font-bold px-1 text-center cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {Math.round(timelineZoom * 100)}%
            </button>
          </div>
        </div>

        {/* Custom Studio Timeline Scroll Track */}
        <div 
          onPointerDown={handleSliderPointerDown}
          className="flex-1 h-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full cursor-pointer relative overflow-hidden touch-none"
          title="Drag slider or click anywhere to scroll timeline horizontally"
        >
          {/* Active Viewport Drag Handle */}
          <div 
            className={cn(
              "absolute top-0 bottom-0 bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full border border-purple-300/40 pointer-events-none will-change-[left,transform]",
              isDraggingSlider 
                ? "transition-none shadow-[0_0_16px_rgba(168,85,247,0.9)] scale-y-110" 
                : "transition-all duration-150 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
            )}
            style={{ 
              left: `${scrollRatio * (1 - thumbWidthRatio) * 100}%`,
              width: `${thumbWidthRatio * 100}%`
            }}
          />
        </div>

        <span className="text-[10px] font-mono font-bold text-purple-300 shrink-0">
          {frames.length} CELS
        </span>
      </div>

      {/* ──────────────── ADVANCED OPTIONS SUB-BAR ──────────────── */}
      {showOptionsSubbar && (
        <div className="px-6 py-2 bg-[#0d0d14] border-b border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono animate-in fade-in duration-150">
          {/* Loop Range */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-bold">Loop Range:</span>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 text-zinc-300">
              <button
                onClick={() => setLoopStart(activeFrameIndex)}
                className="px-2 py-0.5 rounded hover:bg-purple-600 hover:text-white transition-colors cursor-pointer"
                title="Set Loop Start In Point (Key 'I')"
              >
                [ In: {loopStart + 1}
              </button>
              <span>-</span>
              <button
                onClick={() => setLoopEnd(activeFrameIndex)}
                className="px-2 py-0.5 rounded hover:bg-purple-600 hover:text-white transition-colors cursor-pointer"
                title="Set Loop End Out Point (Key 'O')"
              >
                Out: {loopEnd + 1} ]
              </button>
              <button
                onClick={() => {
                  setLoopStart(0);
                  setLoopEnd(frames.length - 1);
                }}
                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Reset Loop Range"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* FPS Speed */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-bold">Speed:</span>
            <select
              value={fps}
              onChange={(e) => onFpsChange(Number(e.target.value))}
              className="h-7 px-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-white cursor-pointer focus:outline-none focus:border-purple-500"
            >
              <option value={24} className="bg-zinc-900">24 FPS (Film Standard)</option>
              <option value={12} className="bg-zinc-900">12 FPS (On Twos)</option>
              <option value={8} className="bg-zinc-900">8 FPS (On Threes)</option>
              <option value={60} className="bg-zinc-900">60 FPS (Game Smooth)</option>
            </select>
          </div>

          {/* Height Toggle */}
          <button
            onClick={() => setIsExpandedTimeline(!isExpandedTimeline)}
            className="h-7 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            {isExpandedTimeline ? "Compact" : "Expand"} Height
          </button>
        </div>
      )}

      {/* ──────────────── TOON BOOM MULTI-TRACK KEYFRAME TIMELINE STAGE ──────────────── */}
      <div 
        ref={stageContainerRef}
        onScroll={handleStageScroll}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.15 : -0.15;
            setTimelineZoom((z) => Math.max(0.4, Math.min(3.0, Math.round((z + delta) * 100) / 100)));
          }
        }}
        className={cn(
          "p-3 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#09090e] flex flex-col gap-2 relative select-none transition-all duration-200",
          isExpandedTimeline ? "h-80" : "max-h-64 min-h-[130px]"
        )}
      >
        
        {/* Frame Ruler Numbers Header Bar with In/Out Region Overlay */}
        <div 
          ref={rulerTrackRef}
          onPointerDown={handleRulerPointerDown}
          className="flex items-center gap-1 relative pl-44 shrink-0 cursor-ew-resize py-1"
          title="Drag along ruler to scrub playhead"
        >
          {rulerTicks.map((tick) => {
            const isKeyframe = tick < frames.length;
            const isActive = tick === activeFrameIndex;
            const isInLoopRange = tick >= loopStart && tick <= loopEnd;
            return (
              <div
                key={tick}
                onClick={() => isKeyframe && onSelectFrame(tick)}
                style={{ width: `${cellWidth}px` }}
                className={cn(
                  "h-5 shrink-0 text-center text-[9px] font-mono font-bold transition-all flex items-center justify-center rounded cursor-pointer border relative",
                  isActive 
                    ? "bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.9)] border-red-400 font-black scale-105" 
                    : isInLoopRange
                    ? "bg-purple-950/60 text-purple-200 border-purple-500/40"
                    : isKeyframe 
                    ? "text-zinc-400 hover:text-white bg-white/5 border-white/10" 
                    : "text-zinc-600 border-white/5 bg-transparent"
                )}
              >
                {/* Red Playhead Needle Top Arrow */}
                {isActive && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-red-500" />
                )}

                {/* Loop Start / End Markers */}
                {tick === loopStart && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-400 rounded-l" title="Loop In Point" />
                )}
                {tick === loopEnd && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-400 rounded-r" title="Loop Out Point" />
                )}

                {String(tick + 1).padStart(2, '0')}
              </div>
            );
          })}
        </div>

        {/* ──────────────── DEDICATED REFERENCE VIDEO TRACK ROW ──────────────── */}
        {referenceVideoTitle && (
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-44 h-8 shrink-0 bg-purple-950/80 border border-purple-500/30 rounded-xl px-2.5 flex items-center justify-between text-purple-300 font-mono font-bold text-xs shadow-inner">
              <div className="flex items-center gap-1.5 min-w-0">
                <Film className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span className="truncate text-[10px]" title={referenceVideoTitle}>Ref Video</span>
              </div>
              <span className="text-[8px] bg-purple-600/40 text-purple-200 px-1.5 rounded border border-purple-400/40">
                SYNC
              </span>
            </div>

            <div className="flex items-center gap-1">
              {rulerTicks.map((tick) => {
                const isActive = tick === activeFrameIndex;
                const isAvailable = tick < frames.length;
                return (
                  <div
                    key={`ref-tick-${tick}`}
                    onClick={() => isAvailable && onSelectFrame(tick)}
                    style={{ width: `${cellWidth}px` }}
                    className={cn(
                      "h-8 shrink-0 rounded-lg border transition-all flex items-center justify-center cursor-pointer",
                      isActive 
                        ? "bg-purple-600/90 border-red-500 ring-2 ring-red-500/50" 
                        : isAvailable 
                        ? "bg-purple-950/40 border-purple-500/30 text-purple-300" 
                        : "bg-white/[0.02] border-white/5"
                    )}
                  >
                    <Film className="h-3 w-3 opacity-60" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──────────────── DEDICATED AUDIO TRACK ROW WITH WAVEFORM ──────────────── */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-44 h-8 shrink-0 bg-blue-950/80 border border-blue-500/30 rounded-xl px-2.5 flex items-center justify-between text-blue-300 font-mono font-bold text-xs shadow-inner">
            <div className="flex items-center gap-1.5 min-w-0">
              <Music className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="truncate text-[10px]" title={audioFileName || 'No Audio Loaded'}>
                {audioFileName || 'Audio Track'}
              </span>
            </div>
            
            <label className="p-1 rounded hover:bg-white/10 text-blue-300 hover:text-white cursor-pointer" title="Upload Audio File (MP3/WAV)">
              <Upload className="h-3.5 w-3.5" />
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onUploadAudio) onUploadAudio(file);
                }}
              />
            </label>
          </div>

          <div className="flex items-center gap-1">
            {rulerTicks.map((tick) => {
              const isActive = tick === activeFrameIndex;
              const isAvailable = tick < frames.length;
              return (
                <div
                  key={`audio-tick-${tick}`}
                  onClick={() => isAvailable && onSelectFrame(tick)}
                  style={{ width: `${cellWidth}px` }}
                  className={cn(
                    "h-8 shrink-0 rounded-lg border transition-all flex items-center justify-center cursor-pointer relative overflow-hidden",
                    isActive 
                      ? "bg-blue-600/90 border-red-500 ring-2 ring-red-500/50" 
                      : isAvailable 
                      ? "bg-blue-950/40 border-blue-500/30 text-blue-300" 
                      : "bg-white/[0.02] border-white/5"
                  )}
                >
                  <Music className="h-3 w-3 opacity-60 text-blue-400" />
                </div>
              );
            })}
          </div>
        </div>
        {tracks.map((tr) => {
          const isTrackActive = activeTrackId === tr.id;
          return (
            <div key={tr.id} className={cn("flex items-center gap-1 shrink-0", !tr.visible && "opacity-40")}>
              
              {/* Left Track Header Box with Eye & Lock Toggles */}
              <div 
                onClick={() => setActiveTrackId(tr.id)}
                className={cn(
                  "w-44 h-9 shrink-0 rounded-xl px-2.5 flex items-center justify-between text-xs font-mono font-bold cursor-pointer transition-all border shadow-md",
                  isTrackActive
                    ? "bg-gradient-to-r from-purple-900/90 to-indigo-900/90 border-purple-400 text-white ring-1 ring-purple-400/50"
                    : "bg-[#14141e]/90 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn("w-2.5 h-2.5 rounded-full bg-gradient-to-r shrink-0", tr.color)} />
                  <span className="truncate text-[11px]">{tr.name}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => toggleTrackVisible(tr.id, e)}
                    className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                    title={tr.visible ? "Hide Layer" : "Show Layer"}
                  >
                    {tr.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-red-400" />}
                  </button>

                  <button
                    onClick={(e) => toggleTrackLocked(tr.id, e)}
                    className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                    title={tr.locked ? "Unlock Layer" : "Lock Layer"}
                  >
                    {tr.locked ? <Lock className="h-3 w-3 text-amber-400" /> : <Unlock className="h-3 w-3 opacity-40" />}
                  </button>

                  {tracks.length > 1 && (
                    <button
                      onClick={(e) => handleRemoveTrack(tr.id, e)}
                      className="h-4 w-4 rounded hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-red-400 ml-0.5"
                      title="Remove Track"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Right Keyframe Exposure Strip */}
              <div className="flex items-center gap-1">
                {frames.map((frame, i) => {
                  const isActive = i === activeFrameIndex;
                  const isInRange = i >= loopStart && i <= loopEnd;
                  return (
                    <div
                      key={`${tr.id}-frame-${frame.id}`}
                      onClick={() => {
                        setActiveTrackId(tr.id);
                        onSelectFrame(i);
                      }}
                      style={{ width: `${cellWidth}px` }}
                      className={cn(
                        'h-9 shrink-0 rounded-lg border transition-all cursor-pointer shadow flex flex-col items-center justify-center relative overflow-hidden',
                        isActive && isTrackActive
                          ? 'bg-gradient-to-b from-purple-600 to-indigo-600 border-red-500 ring-2 ring-red-500/50 scale-105 z-10 text-white'
                          : isActive
                          ? 'bg-purple-900/60 border-purple-400/60 text-purple-200'
                          : isInRange
                          ? 'bg-[#1a1a28] border-purple-500/20 text-zinc-300'
                          : 'bg-[#14141e] border-white/5 text-zinc-500'
                      )}
                    >
                      {/* Pose Type Color Badge Node (●) */}
                      <div className={cn(
                        "w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all shadow-inner text-[8px] font-mono font-black",
                        frame.poseType === 'key'
                          ? "bg-red-600 text-white ring-1 ring-red-400"
                          : frame.poseType === 'extreme'
                          ? "bg-amber-400 text-black ring-1 ring-amber-300"
                          : frame.poseType === 'breakdown'
                          ? "bg-emerald-600 text-white ring-1 ring-emerald-400"
                          : frame.poseType === 'inbetween'
                          ? "bg-blue-600 text-white ring-1 ring-blue-400"
                          : isActive && isTrackActive 
                          ? "bg-white text-purple-900" 
                          : "bg-purple-500/80 text-white"
                      )}>
                        {frame.poseType === 'key' ? 'K' : frame.poseType === 'extreme' ? 'E' : frame.poseType === 'breakdown' ? 'B' : frame.poseType === 'inbetween' ? 'I' : '●'}
                      </div>

                      {/* Bottom Keyframe Connector Line */}
                      <div className={cn("w-full h-1 mt-0.5 rounded-full", frame.poseType ? (frame.poseType === 'key' ? 'bg-red-500' : frame.poseType === 'extreme' ? 'bg-amber-400' : frame.poseType === 'breakdown' ? 'bg-emerald-500' : 'bg-blue-500') : isActive ? "bg-white/80" : "bg-purple-500/30")} />
                    </div>
                  );
                })}

                {/* Empty Timeline Keyframe Slots (◯) */}
                {Array.from({ length: Math.max(0, maxTimelineTicks - frames.length) }).map((_, slotIdx) => (
                  <div
                    key={`${tr.id}-empty-${slotIdx}`}
                    style={{ width: `${cellWidth}px` }}
                    className="h-9 shrink-0 rounded-lg border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center text-zinc-600"
                  >
                    <div className="w-1.5 h-1.5 rounded-full border border-zinc-600" />
                  </div>
                ))}
              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}
