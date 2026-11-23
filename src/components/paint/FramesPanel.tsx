'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Music,
  Upload,
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
  onSetFrameHold?: (frameIdx: number, holdFrames: number) => void;
  onApplyGlobalHold?: (holdFrames: number) => void;
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

const TRACK_HEADER_WIDTH = 148; // px — sticky left track label column

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
  onionSkinPrev,
  onToggleOnionSkinPrev,
  referenceVideoTitle,
  onCloseTimeline,
  loopStart: propLoopStart,
  loopEnd: propLoopEnd,
  onLoopStartChange,
  onLoopEndChange,
  onSetPoseType,
  onSetFrameHold,
  onApplyGlobalHold,
  audioBuffer,
  audioFileName,
  onUploadAudio,
  onRemoveAudio,
  onionSkinOpacity = 0.3,
  onOnionSkinOpacityChange,
}: FramesPanelProps) {
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Timeline UI States
  const [timelineZoom, setTimelineZoom] = useState<number>(1.0);
  const [localLoopStart, setLocalLoopStart] = useState<number>(0);
  const [localLoopEnd, setLocalLoopEnd] = useState<number>(Math.max(0, frames.length - 1));
  const [showOptionsSubbar, setShowOptionsSubbar] = useState<boolean>(false);

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

  useEffect(() => {
    setLoopEnd(Math.max(0, frames.length - 1));
  }, [frames.length]);

  // Clean single default track (users can add more via + Track in Options)
  const [tracks, setTracks] = useState<TimelineTrack[]>([
    { id: 'track-1', name: 'Animation', color: 'from-violet-500 to-indigo-500', visible: true, locked: false },
  ]);
  const [activeTrackId, setActiveTrackId] = useState<string>('track-1');

  const handleAddTrack = () => {
    const trackColors = [
      'from-cyan-500 to-blue-500',
      'from-pink-500 to-rose-500',
      'from-emerald-500 to-teal-500',
      'from-amber-500 to-orange-500',
    ];
    const newTrackIdx = tracks.length + 1;
    const newTrack: TimelineTrack = {
      id: `track-${Date.now()}`,
      name: `Layer ${newTrackIdx}`,
      color: trackColors[(newTrackIdx - 2) % trackColors.length],
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
    if (activeTrackId === trackId) setActiveTrackId(tracks[0].id);
  };

  const toggleTrackVisible = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t)));
  };

  const toggleTrackLocked = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)));
  };

  // Keyboard Frame Stepping & Exposure Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) return;

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
        if (e.shiftKey && onSetFrameHold) {
          const curHold = frames[activeFrameIndex]?.holdFrames ?? 1;
          onSetFrameHold(activeFrameIndex, Math.max(1, curHold - 1));
        } else if (onExtendFrame) {
          onExtendFrame();
        } else {
          onDuplicateFrame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFrameIndex, frames, loopStart, loopEnd, onSelectFrame, onAddFrame, onDuplicateFrame, onExtendFrame, onSetFrameHold]);

  // Crisp unit width (no gaps between ruler ticks — hairline borders make exposure bars read cleanly!)
  const cellWidth = Math.max(22, Math.round(34 * timelineZoom));

  // Cumulative Exposure Spans (Callipeg / Toon Boom X-Sheet math)
  const { celSpans, totalExposureFrames, tickToCelIndex } = useMemo(() => {
    const spans: Array<{ startTick: number; endTick: number; hold: number }> = [];
    const lookup: number[] = [];
    let cursor = 0;
    for (let i = 0; i < frames.length; i++) {
      const hold = Math.max(1, frames[i]?.holdFrames ?? 1);
      spans.push({ startTick: cursor, endTick: cursor + hold - 1, hold });
      for (let t = 0; t < hold; t++) lookup.push(i);
      cursor += hold;
    }
    return { celSpans: spans, totalExposureFrames: Math.max(1, cursor), tickToCelIndex: lookup };
  }, [frames]);

  const activeHold = Math.max(1, frames[activeFrameIndex]?.holdFrames ?? 1);
  const activeSpan = celSpans[activeFrameIndex] ?? { startTick: 0, endTick: 0, hold: 1 };
  const totalDurationSec = (totalExposureFrames / Math.max(1, fps)).toFixed(1);
  const maxTimelineTicks = Math.max(36, totalExposureFrames + 16);
  const trackContentWidth = maxTimelineTicks * cellWidth;

  // Refs for ZERO-REBIND 60fps scrubbing (pointermove never tears down listeners while dragging!)
  const activeFrameIdxRef = useRef(activeFrameIndex);
  activeFrameIdxRef.current = activeFrameIndex;
  const tickToCelRef = useRef(tickToCelIndex);
  tickToCelRef.current = tickToCelIndex;
  const cellWidthRef = useRef(cellWidth);
  cellWidthRef.current = cellWidth;
  const onSelectFrameRef = useRef(onSelectFrame);
  onSelectFrameRef.current = onSelectFrame;
  const scrubRafRef = useRef<number | null>(null);

  const scrubClientXImmediate = useCallback((clientX: number) => {
    if (scrubRafRef.current) cancelAnimationFrame(scrubRafRef.current);
    scrubRafRef.current = requestAnimationFrame(() => {
      const container = stageContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollX = (clientX - rect.left - TRACK_HEADER_WIDTH) + container.scrollLeft;
      const lookup = tickToCelRef.current;
      if (lookup.length === 0) return;
      const tickIdx = Math.max(0, Math.min(lookup.length - 1, Math.floor(scrollX / cellWidthRef.current)));
      const targetIdx = lookup[tickIdx] ?? 0;
      if (targetIdx !== activeFrameIdxRef.current) {
        activeFrameIdxRef.current = targetIdx;
        onSelectFrameRef.current(targetIdx);
      }
    });
  }, []);

  const beginScrub = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setIsScrubbing(true);
      scrubClientXImmediate(e.clientX);
    },
    [scrubClientXImmediate]
  );

  useEffect(() => {
    if (!isScrubbing) return;
    const onMove = (e: PointerEvent) => scrubClientXImmediate(e.clientX);
    const onUp = () => {
      setIsScrubbing(false);
      if (scrubRafRef.current) cancelAnimationFrame(scrubRafRef.current);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (scrubRafRef.current) cancelAnimationFrame(scrubRafRef.current);
    };
  }, [isScrubbing, scrubClientXImmediate]);

  // Auto-scroll playhead into view during playback / keyboard stepping (paused while actively dragging!)
  useEffect(() => {
    if (isScrubbing) return;
    const el = stageContainerRef.current;
    if (!el) return;
    const playheadX = activeSpan.startTick * cellWidth;
    const visibleWidth = el.clientWidth - TRACK_HEADER_WIDTH;
    const viewLeft = el.scrollLeft;
    const viewRight = el.scrollLeft + visibleWidth - cellWidth * 2;

    if (playheadX < viewLeft || playheadX > viewRight) {
      el.scrollLeft = Math.max(0, playheadX - visibleWidth * 0.45);
    }
  }, [activeSpan.startTick, cellWidth, isScrubbing]);

  // Render real PCM audio waveform onto the timeline Audio Track canvas
  useEffect(() => {
    const cvs = waveformCanvasRef.current;
    if (!cvs || !audioBuffer) return;
    const width = trackContentWidth;
    const height = 28;
    cvs.width = width;
    cvs.height = height;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    const channelData = audioBuffer.getChannelData(0);
    const totalTimelineSec = maxTimelineTicks / Math.max(1, fps);
    const audioPxWidth = Math.min(width, Math.round((audioBuffer.duration / Math.max(0.1, totalTimelineSec)) * width));
    const barStep = 3;
    const numBars = Math.max(1, Math.floor(audioPxWidth / barStep));
    const samplesPerBar = Math.max(1, Math.floor(channelData.length / numBars));

    ctx.fillStyle = 'rgba(56, 189, 248, 0.10)';
    ctx.fillRect(0, 0, audioPxWidth, height);

    for (let b = 0; b < numBars; b++) {
      let peak = 0;
      const start = b * samplesPerBar;
      const end = Math.min(channelData.length, start + samplesPerBar);
      for (let s = start; s < end; s += Math.max(1, Math.floor(samplesPerBar / 24))) {
        const v = Math.abs(channelData[s]);
        if (v > peak) peak = v;
      }
      const barH = Math.max(2, Math.round(peak * (height - 4)));
      ctx.fillStyle = peak > 0.72 ? '#38bdf8' : '#60a5fa';
      ctx.fillRect(b * barStep, Math.round((height - barH) / 2), 2, barH);
    }
  }, [audioBuffer, trackContentWidth, maxTimelineTicks, fps]);

  const playheadLeftPx = TRACK_HEADER_WIDTH + activeSpan.startTick * cellWidth + Math.round(cellWidth / 2);
  const loopStartTick = celSpans[loopStart]?.startTick ?? 0;
  const loopEndTick = celSpans[loopEnd]?.endTick ?? totalExposureFrames - 1;

  return (
    <div
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full bg-[#0e0e15]/98 backdrop-blur-3xl border-t border-white/10 select-none shadow-[0_-18px_50px_rgba(0,0,0,0.85)] z-40 flex flex-col shrink-0"
    >
      {/* ──────────────── SINGLE SLEEK TIMELINE TOOLBAR (COMPACT, CALM, HIGH-SIGNAL) ──────────────── */}
      <div className="h-11 px-3.5 border-b border-white/10 flex items-center justify-between gap-2 bg-[#13131d]">
        {/* 1. TRANSPORT & FPS */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onTogglePlay}
            className={cn(
              'h-7 px-3 rounded-lg font-extrabold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer',
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-600/40'
            )}
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <div className="flex items-center bg-black/35 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => onSelectFrame(Math.max(loopStart, activeFrameIndex - 1))}
              className="h-6 w-6 rounded hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
              title="Previous Cel (← or ,)"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold px-1.5 text-zinc-100 min-w-[52px] text-center">
              {String(activeFrameIndex + 1).padStart(2, '0')}/{String(frames.length).padStart(2, '0')}
            </span>
            <button
              onClick={() => onSelectFrame(Math.min(loopEnd, activeFrameIndex + 1))}
              className="h-6 w-6 rounded hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
              title="Next Cel (→ or .)"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="hidden sm:flex items-center bg-black/35 border border-white/10 rounded-lg p-0.5 text-[10px] font-mono font-bold">
            {[12, 24].map((preset) => (
              <button
                key={preset}
                onClick={() => onFpsChange(preset)}
                className={cn(
                  'h-6 px-1.5 rounded transition-colors cursor-pointer',
                  fps === preset ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                )}
              >
                {preset}
              </button>
            ))}
            <span className="px-1.5 text-zinc-400 border-l border-white/10">
              {totalExposureFrames}f · {totalDurationSec}s
            </span>
          </div>
        </div>

        {/* 2. KEYFRAME, EXPOSURE HOLD (1s/2s/3s), POSE & ONION SKIN */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={onAddFrame}
            className="h-7 px-2.5 rounded-lg bg-violet-600/25 hover:bg-violet-600 border border-violet-400/40 text-violet-100 hover:text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shrink-0"
            title="Insert New Keyframe Cel (F6)"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Key</span>
          </button>

          {onSetFrameHold && (
            <div className="flex items-center gap-0.5 bg-black/35 border border-white/10 rounded-lg px-1 py-0.5 text-[10px] font-mono font-bold shrink-0">
              <button
                onClick={() => onSetFrameHold(activeFrameIndex, Math.max(1, activeHold - 1))}
                disabled={activeHold <= 1}
                className="h-5 w-5 rounded hover:bg-white/10 disabled:opacity-25 text-zinc-200 flex items-center justify-center cursor-pointer"
                title="Shorten Hold -1f (Shift+F5)"
              >
                −
              </button>
              <span className="min-w-[22px] text-center text-violet-300 font-black">{activeHold}f</span>
              <button
                onClick={() => onSetFrameHold(activeFrameIndex, Math.min(24, activeHold + 1))}
                disabled={activeHold >= 24}
                className="h-5 w-5 rounded hover:bg-white/10 disabled:opacity-25 text-zinc-200 flex items-center justify-center cursor-pointer"
                title="Extend Hold +1f (F5)"
              >
                +
              </button>
              <div className="w-px h-3.5 bg-white/10 mx-0.5" />
              {[1, 2, 3].map((h) => (
                <button
                  key={h}
                  onClick={(e) => {
                    if (e.shiftKey && onApplyGlobalHold) onApplyGlobalHold(h);
                    else onSetFrameHold(activeFrameIndex, h);
                  }}
                  className={cn(
                    'h-5 px-1.5 rounded transition-colors cursor-pointer',
                    activeHold === h ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  )}
                  title={`Hold on ${h}s (Shift+Click = All Cels)`}
                >
                  {h}s
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onDuplicateFrame}
            className="h-7 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            title="Duplicate Cel"
          >
            <Copy className="h-3 w-3 text-indigo-300" />
            <span className="hidden lg:inline">Dup</span>
          </button>

          {onMergeFrames && (
            <button
              onClick={onMergeFrames}
              disabled={activeFrameIndex >= frames.length - 1}
              className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-25 flex items-center justify-center cursor-pointer shrink-0"
              title="Merge Cel with Next"
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
          )}

          {onSetPoseType && (
            <div className="hidden md:flex items-center gap-0.5 bg-black/35 border border-white/10 rounded-lg p-0.5 shrink-0">
              {([
                { type: 'key', label: 'K', cls: 'bg-rose-600 text-white', title: 'Key Pose' },
                { type: 'extreme', label: 'E', cls: 'bg-amber-400 text-black', title: 'Extreme Pose' },
                { type: 'breakdown', label: 'B', cls: 'bg-emerald-600 text-white', title: 'Breakdown Pose' },
                { type: 'inbetween', label: 'I', cls: 'bg-sky-600 text-white', title: 'In-Between' },
              ] as const).map((p) => (
                <button
                  key={p.type}
                  onClick={() => onSetPoseType(activeFrameIndex, p.type)}
                  className={cn('h-5 w-5 rounded text-[9px] font-black cursor-pointer opacity-85 hover:opacity-100', p.cls)}
                  title={p.title}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Onion Skin Toggle + Inline Opacity */}
          <div className="flex items-center gap-1 bg-black/35 border border-white/10 rounded-lg px-1 py-0.5 shrink-0">
            <button
              onClick={onToggleOnionSkinPrev}
              className={cn(
                'h-6 px-2 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                onionSkinPrev ? 'bg-violet-600/35 text-white border border-violet-400/50' : 'text-zinc-400 hover:text-white'
              )}
              title="Toggle 2-Frame Tinted Onion Skin (Rose = Prev, Cyan = Next)"
            >
              <span className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </span>
              <span>Onion</span>
            </button>
            {onionSkinPrev && onOnionSkinOpacityChange && (
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={onionSkinOpacity}
                onChange={(e) => onOnionSkinOpacityChange(parseFloat(e.target.value))}
                className="w-12 h-1 accent-violet-500 cursor-pointer"
                title={`Onion Opacity ${Math.round(onionSkinOpacity * 100)}%`}
              />
            )}
          </div>
        </div>

        {/* 3. INLINE ZOOM, AUDIO UPLOAD, OPTIONS & DELETE */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Compact Inline Zoom */}
          <div className="hidden xl:flex items-center gap-0.5 bg-black/35 border border-white/10 rounded-lg px-1 py-0.5 text-[10px] font-mono">
            <button
              onClick={() => setTimelineZoom((z) => Math.max(0.5, Math.round((z - 0.2) * 10) / 10))}
              className="h-5 w-5 rounded hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              title="Zoom Out Timeline"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <button
              onClick={() => setTimelineZoom(1.0)}
              className="px-1 text-zinc-300 hover:text-white font-bold cursor-pointer"
              title="Reset Timeline Zoom"
            >
              {Math.round(timelineZoom * 100)}%
            </button>
            <button
              onClick={() => setTimelineZoom((z) => Math.min(2.5, Math.round((z + 0.2) * 10) / 10))}
              className="h-5 w-5 rounded hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              title="Zoom In Timeline"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>

          {/* 1-Click Audio Upload */}
          {onUploadAudio && (
            <label
              className={cn(
                'h-7 px-2 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors',
                audioBuffer
                  ? 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white'
              )}
              title={audioFileName ? `Audio: ${audioFileName} (click to replace)` : 'Upload MP3/WAV Audio Track'}
            >
              <Music className="h-3 w-3" />
              <span className="hidden lg:inline">{audioBuffer ? 'Audio' : '+ Audio'}</span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadAudio(file);
                }}
              />
            </label>
          )}

          <button
            onClick={() => setShowOptionsSubbar((s) => !s)}
            className={cn(
              'h-7 w-7 rounded-lg border flex items-center justify-center cursor-pointer transition-colors',
              showOptionsSubbar
                ? 'bg-violet-600 text-white border-violet-400'
                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/10'
            )}
            title="Loop In/Out, FPS & Tracks"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onDeleteFrame}
            disabled={frames.length <= 1}
            className="h-7 w-7 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 text-zinc-400 hover:text-rose-400 disabled:opacity-20 flex items-center justify-center cursor-pointer"
            title="Delete Active Cel"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {onCloseTimeline && (
            <button
              onClick={onCloseTimeline}
              className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              title="Collapse Timeline"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ──────────────── OPTIONAL LOOP / FPS / TRACK OPTIONS DRAWER ──────────────── */}
      {showOptionsSubbar && (
        <div className="px-4 py-1.5 bg-[#0c0c13] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold">LOOP:</span>
            <button
              onClick={() => setLoopStart(activeFrameIndex)}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-violet-600 text-zinc-200 cursor-pointer"
            >
              [ In: {loopStart + 1}
            </button>
            <button
              onClick={() => setLoopEnd(activeFrameIndex)}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-violet-600 text-zinc-200 cursor-pointer"
            >
              Out: {loopEnd + 1} ]
            </button>
            <button
              onClick={() => {
                setLoopStart(0);
                setLoopEnd(frames.length - 1);
              }}
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
              title="Reset Loop Range"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold">FPS:</span>
            <select
              value={fps}
              onChange={(e) => onFpsChange(Number(e.target.value))}
              className="h-6 px-2 rounded bg-white/5 border border-white/10 text-zinc-100 cursor-pointer outline-none"
            >
              <option value={8} className="bg-zinc-900">8 FPS</option>
              <option value={12} className="bg-zinc-900">12 FPS (On 2s)</option>
              <option value={24} className="bg-zinc-900">24 FPS (Film)</option>
              <option value={30} className="bg-zinc-900">30 FPS</option>
              <option value={60} className="bg-zinc-900">60 FPS</option>
            </select>

            <button
              onClick={handleAddTrack}
              className="h-6 px-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-violet-200 font-sans font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <FolderPlus className="h-3 w-3" />
              <span>+ Track</span>
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── CLEAN, FAST-SCRUBBING EXPOSURE SHEET STAGE ──────────────── */}
      <div
        ref={stageContainerRef}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.15 : -0.15;
            setTimelineZoom((z) => Math.max(0.5, Math.min(2.5, Math.round((z + delta) * 100) / 100)));
          } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            // Smooth horizontal scroll with plain mouse wheel over timeline!
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="overflow-x-auto overflow-y-auto max-h-48 bg-[#0a0a10] relative select-none [scrollbar-width:thin] [scrollbar-color:rgba(139,92,246,0.45)_transparent]"
      >
        <div className="relative flex flex-col min-w-max pb-1.5" style={{ width: TRACK_HEADER_WIDTH + trackContentWidth }}>
          {/* CONTINUOUS VERTICAL RED PLAYHEAD LASER LINE ACROSS ALL TRACKS */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)] pointer-events-none z-30"
            style={{ left: `${playheadLeftPx}px` }}
          />

          {/* ── 1. CLEAN FRAME RULER (DRAG ANYWHERE TO SCRUB AT 60FPS) ── */}
          <div className="flex items-stretch h-7 border-b border-white/10 bg-[#0f0f17] sticky top-0 z-20">
            {/* Sticky Corner Cell */}
            <div
              style={{ width: `${TRACK_HEADER_WIDTH}px` }}
              className="sticky left-0 z-30 shrink-0 bg-[#0f0f17] border-r border-white/10 px-3 flex items-center justify-between text-[10px] font-mono text-zinc-500 font-bold"
            >
              <span>TRACKS</span>
              <span className="text-violet-400">F{String(activeSpan.startTick + 1).padStart(2, '0')}</span>
            </div>

            {/* Interactive Scrub Ruler Strip */}
            <div
              onPointerDown={beginScrub}
              className="relative flex items-end cursor-ew-resize touch-none"
              style={{
                width: `${trackContentWidth}px`,
                backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent ${cellWidth}px)`,
              }}
              title="Click or drag anywhere to scrub smoothly"
            >
              {/* Loop Range Subtle Tint */}
              <div
                className="absolute top-0 h-1 bg-violet-500/60 pointer-events-none"
                style={{
                  left: `${loopStartTick * cellWidth}px`,
                  width: `${Math.max(1, loopEndTick - loopStartTick + 1) * cellWidth}px`,
                }}
              />

              {/* Active Frame Playhead Pill Handle on Ruler */}
              <div
                className="absolute top-0.5 bottom-0.5 rounded bg-rose-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.8)] pointer-events-none z-20"
                style={{
                  left: `${activeSpan.startTick * cellWidth + 1}px`,
                  width: `${Math.max(cellWidth - 2, 24)}px`,
                }}
              >
                {activeSpan.startTick + 1}
              </div>

              {/* Clean Frame Numbers (every 1st on wide zoom, every 2nd/5th on tighter zoom for effortless scanning) */}
              {Array.from({ length: maxTimelineTicks }, (_, tick) => {
                const showNum = cellWidth >= 32 ? true : tick === 0 || (tick + 1) % 5 === 0;
                const isMajor = (tick + 1) % 5 === 0 || tick === 0;
                return (
                  <div
                    key={tick}
                    style={{ width: `${cellWidth}px` }}
                    className="h-full shrink-0 flex flex-col items-center justify-end pb-1 pointer-events-none"
                  >
                    {showNum && (
                      <span className={cn('text-[9px] font-mono leading-none', isMajor ? 'text-zinc-300 font-bold' : 'text-zinc-600')}>
                        {tick + 1}
                      </span>
                    )}
                    <div className={cn('w-px mt-0.5', isMajor ? 'h-1.5 bg-zinc-500' : 'h-1 bg-zinc-700/70')} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 2. REFERENCE VIDEO TRACK (ONLY SHOWN WHEN PINNED/LOADED) ── */}
          {referenceVideoTitle && (
            <div className="flex items-center h-8 border-b border-white/5">
              <div
                style={{ width: `${TRACK_HEADER_WIDTH}px` }}
                className="sticky left-0 z-20 h-full shrink-0 bg-[#12101d] border-r border-white/10 px-2.5 flex items-center justify-between text-[11px] font-bold text-purple-200"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Film className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="truncate" title={referenceVideoTitle}>Ref Video</span>
                </span>
                <span className="text-[8px] font-mono px-1 rounded bg-purple-500/25 text-purple-200">SYNC</span>
              </div>

              <div
                onPointerDown={beginScrub}
                className="relative h-full cursor-ew-resize touch-none flex items-center"
                style={{ width: `${trackContentWidth}px` }}
              >
                <div
                  className="h-6 rounded-md bg-purple-600/25 border border-purple-400/35 flex items-center px-2 text-[10px] font-mono text-purple-200 truncate"
                  style={{ width: `${totalExposureFrames * cellWidth}px` }}
                >
                  {referenceVideoTitle}
                </div>
              </div>
            </div>
          )}

          {/* ── 3. REAL AUDIO WAVEFORM TRACK (ONLY SHOWN WHEN AUDIO IS LOADED) ── */}
          {audioBuffer && (
            <div className="flex items-center h-8 border-b border-white/5">
              <div
                style={{ width: `${TRACK_HEADER_WIDTH}px` }}
                className="sticky left-0 z-20 h-full shrink-0 bg-[#0f1622] border-r border-white/10 px-2.5 flex items-center justify-between text-[11px] font-bold text-sky-200"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Music className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span className="truncate" title={audioFileName || 'Audio'}>{audioFileName || 'Audio'}</span>
                </span>
                {onRemoveAudio && (
                  <button
                    onClick={onRemoveAudio}
                    className="text-zinc-400 hover:text-rose-400 text-xs px-1 cursor-pointer"
                    title="Remove Audio"
                  >
                    ×
                  </button>
                )}
              </div>

              <div
                onPointerDown={beginScrub}
                className="relative h-full cursor-ew-resize touch-none flex items-center"
                style={{ width: `${trackContentWidth}px` }}
              >
                <canvas ref={waveformCanvasRef} className="h-7 block" />
              </div>
            </div>
          )}

          {/* ── 4. ANIMATION CEL EXPOSURE TRACKS (DRAG ANYWHERE ON TRACK TO SCRUB!) ── */}
          {tracks.map((tr) => {
            const isTrackActive = activeTrackId === tr.id;
            return (
              <div
                key={tr.id}
                className={cn('flex items-center h-11 border-b border-white/5', !tr.visible && 'opacity-40')}
              >
                {/* Sticky Track Header */}
                <div
                  onClick={() => setActiveTrackId(tr.id)}
                  style={{ width: `${TRACK_HEADER_WIDTH}px` }}
                  className={cn(
                    'sticky left-0 z-20 h-full shrink-0 border-r border-white/10 px-2.5 flex items-center justify-between text-[11px] font-bold cursor-pointer transition-colors',
                    isTrackActive ? 'bg-[#191629] text-white' : 'bg-[#101018] text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={cn('w-2 h-2 rounded-full bg-gradient-to-r shrink-0', tr.color)} />
                    <span className="truncate">{tr.name}</span>
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => toggleTrackVisible(tr.id, e)}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                      title={tr.visible ? 'Hide Track' : 'Show Track'}
                    >
                      {tr.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-rose-400" />}
                    </button>
                    <button
                      onClick={(e) => toggleTrackLocked(tr.id, e)}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                      title={tr.locked ? 'Unlock Track' : 'Lock Track'}
                    >
                      {tr.locked ? <Lock className="h-3 w-3 text-amber-400" /> : <Unlock className="h-3 w-3 opacity-35" />}
                    </button>
                    {tracks.length > 1 && (
                      <button
                        onClick={(e) => handleRemoveTrack(tr.id, e)}
                        className="p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-rose-400 cursor-pointer"
                        title="Remove Track"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Exposure Sheet Track Strip — Clean Grid + Proportional Cel Bars + Direct Scrubbing */}
                <div
                  onPointerDown={(e) => {
                    setActiveTrackId(tr.id);
                    beginScrub(e);
                  }}
                  className="relative h-full flex items-center cursor-ew-resize touch-none"
                  style={{
                    width: `${trackContentWidth}px`,
                    backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent ${cellWidth}px)`,
                  }}
                >
                  {frames.map((frame, i) => {
                    const isActive = i === activeFrameIndex;
                    const hold = Math.max(1, frame.holdFrames ?? 1);
                    const celWidth = cellWidth * hold;
                    const poseDotCls =
                      frame.poseType === 'key'
                        ? 'bg-rose-500 text-white'
                        : frame.poseType === 'extreme'
                        ? 'bg-amber-400 text-black'
                        : frame.poseType === 'breakdown'
                        ? 'bg-emerald-500 text-white'
                        : frame.poseType === 'inbetween'
                        ? 'bg-sky-500 text-white'
                        : isActive
                        ? 'bg-white text-violet-900'
                        : 'bg-violet-400/80 text-white';

                    return (
                      <div
                        key={`${tr.id}-${frame.id}`}
                        style={{ width: `${celWidth}px` }}
                        title={`Cel ${i + 1} · Hold: ${hold}f${frame.poseType ? ` · ${frame.poseType}` : ''}`}
                        className="h-8 px-[1px] shrink-0"
                      >
                        <div
                          className={cn(
                            'w-full h-full rounded-md border flex items-center px-1.5 transition-colors relative overflow-hidden',
                            hold > 1 ? 'justify-between gap-1' : 'justify-center',
                            isActive && isTrackActive
                              ? 'bg-violet-600/90 border-violet-300 text-white shadow-[0_0_12px_rgba(139,92,246,0.45)]'
                              : isActive
                              ? 'bg-violet-900/55 border-violet-400/50 text-violet-100'
                              : 'bg-[#1a1a28] border-white/10 hover:border-violet-400/40 text-zinc-300'
                          )}
                        >
                          {/* Keyframe Pose Dot */}
                          <span className={cn('w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-mono font-black', poseDotCls)}>
                            {frame.poseType === 'key'
                              ? 'K'
                              : frame.poseType === 'extreme'
                              ? 'E'
                              : frame.poseType === 'breakdown'
                              ? 'B'
                              : frame.poseType === 'inbetween'
                              ? 'I'
                              : '●'}
                          </span>

                          {/* Exposure Hold Extension Bar + Badge */}
                          {hold > 1 && (
                            <>
                              <div className="flex-1 h-[2px] rounded-full bg-white/25" />
                              <span className="text-[9px] font-mono font-black text-violet-100/90 bg-black/30 px-1 rounded leading-tight shrink-0">
                                {hold}f
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
