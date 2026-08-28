'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Film, 
  Maximize2, 
  Split,
  Sliders,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReferenceVideoItem } from './ReferenceVideoModal';

interface ReferenceComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryVideo?: ReferenceVideoItem | null;
  availableVideos: ReferenceVideoItem[];
}

export function ReferenceComparisonModal({
  isOpen,
  onClose,
  primaryVideo,
  availableVideos,
}: ReferenceComparisonModalProps) {
  const [videoA, setVideoA] = useState<ReferenceVideoItem | null>(primaryVideo || availableVideos[0] || null);
  const [videoB, setVideoB] = useState<ReferenceVideoItem | null>(availableVideos[1] || availableVideos[0] || null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [fps, setFps] = useState<number>(24);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [syncLock, setSyncLock] = useState<boolean>(true);

  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);

  // Sync play/pause across both videos
  useEffect(() => {
    const vA = videoRefA.current;
    const vB = videoRefB.current;

    if (isPlaying) {
      vA?.play().catch(() => {});
      vB?.play().catch(() => {});
    } else {
      vA?.pause();
      vB?.pause();
    }
  }, [isPlaying]);

  // Frame stepping sync
  const stepFrame = (delta: number) => {
    setIsPlaying(false);
    const targetFrame = Math.max(0, currentFrame + delta);
    setCurrentFrame(targetFrame);

    const targetTime = targetFrame / fps;
    if (videoRefA.current) videoRefA.current.currentTime = targetTime;
    if (videoRefB.current) videoRefB.current.currentTime = targetTime;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-6xl bg-[#0e0e16] border border-purple-500/30 rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#141420] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Split className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Dual Split-Screen Reference Analysis</h2>
              <p className="text-xs text-zinc-400 font-mono">Side-by-side synchronized frame-by-frame comparison player</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSyncLock(!syncLock)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 border transition-all cursor-pointer",
                syncLock 
                  ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/40" 
                  : "bg-white/5 text-zinc-400 border-white/10"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>SYNC LOCK: {syncLock ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dual Split Screen Video Players Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
          
          {/* Left Player A */}
          <div className="flex flex-col gap-3 bg-[#13131f] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-purple-400" />
                <span>PRIMARY REFERENCE (A)</span>
              </span>
              <select
                value={videoA?.id || ''}
                onChange={(e) => {
                  const sel = availableVideos.find((v) => v.id === e.target.value);
                  if (sel) setVideoA(sel);
                }}
                className="bg-black/50 border border-white/15 rounded-lg text-xs font-mono font-bold text-white px-2 py-1 cursor-pointer max-w-[200px] truncate"
              >
                {availableVideos.map((v) => (
                  <option key={`a-${v.id}`} value={v.id} className="bg-[#12121a] text-white">
                    {v.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-white/10 min-h-[260px]">
              {videoA ? (
                <video
                  ref={videoRefA}
                  src={videoA.videoUrl}
                  className="w-full h-full object-contain"
                  loop
                  muted
                  playsInline
                />
              ) : (
                <span className="text-xs text-zinc-500 font-mono">Select Video A</span>
              )}
            </div>
            <div className="text-xs font-mono text-zinc-400 truncate">{videoA?.title || 'No Video Selected'}</div>
          </div>

          {/* Right Player B */}
          <div className="flex flex-col gap-3 bg-[#13131f] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-300 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-indigo-400" />
                <span>COMPARISON REFERENCE (B)</span>
              </span>
              <select
                value={videoB?.id || ''}
                onChange={(e) => {
                  const sel = availableVideos.find((v) => v.id === e.target.value);
                  if (sel) setVideoB(sel);
                }}
                className="bg-black/50 border border-white/15 rounded-lg text-xs font-mono font-bold text-white px-2 py-1 cursor-pointer max-w-[200px] truncate"
              >
                {availableVideos.map((v) => (
                  <option key={`b-${v.id}`} value={v.id} className="bg-[#12121a] text-white">
                    {v.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-white/10 min-h-[260px]">
              {videoB ? (
                <video
                  ref={videoRefB}
                  src={videoB.videoUrl}
                  className="w-full h-full object-contain"
                  loop
                  muted
                  playsInline
                />
              ) : (
                <span className="text-xs text-zinc-500 font-mono">Select Video B</span>
              )}
            </div>
            <div className="text-xs font-mono text-zinc-400 truncate">{videoB?.title || 'No Video Selected'}</div>
          </div>

        </div>

        {/* Synchronized Studio Transport Controls */}
        <div className="px-6 py-4 bg-[#141420] border-t border-white/10 flex items-center justify-between gap-4">
          
          {/* Play/Pause & Step Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => stepFrame(-1)}
              className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
              title="Step 1 Frame Back (←)"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>-1 Frame</span>
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-10 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/40 border border-purple-400/50 cursor-pointer transition-all"
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
              <span>{isPlaying ? 'PAUSE SYNC' : 'PLAY SYNC'}</span>
            </button>

            <button
              onClick={() => stepFrame(1)}
              className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
              title="Step 1 Frame Forward (→)"
            >
              <span>+1 Frame</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Current Frame Indicator */}
          <div className="text-xs font-mono font-bold text-purple-300 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            FRAME: <span className="text-white font-black">{currentFrame + 1}</span> ({(currentFrame / fps).toFixed(2)}s)
          </div>

        </div>

      </div>
    </div>
  );
}
