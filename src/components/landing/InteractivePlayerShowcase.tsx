'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Sliders, 
  Grid3X3, 
  Layers, 
  FlipHorizontal, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Sparkles, 
  Check, 
  ArrowRight,
  Split,
  Eye,
  Camera,
  Film
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShowcasePreset {
  id: string;
  name: string;
  category: string;
  title: string;
  animatorShow: string;
  description: string;
  fps: number;
  url: string;
  compareUrl?: string;
  compareTitle?: string;
}

const PRESETS: ShowcasePreset[] = [
  {
    id: 'combat',
    name: '⚔️ Sword Combat & Arcs',
    category: 'Combat & Choreography',
    title: 'Norimitsu Suzuki — Fullmetal Alchemist',
    animatorShow: 'Norimitsu Suzuki / Studio Bones',
    description: 'Inspect the blade arcs, foot pivots, anticipation, and lightning-fast recoil spacing.',
    fps: 24,
    url: 'https://www.sakugabooru.com/data/e0dd86863fd54cd5c06a6dead12c29e2.mp4',
    compareUrl: 'https://www.sakugabooru.com/data/dc6d4a63794315bcf793f1481578bdcd.mp4',
    compareTitle: 'Synchronized Maya 3D Viewport Playblast',
  },
  {
    id: 'acting',
    name: '👑 Character Acting & Turns',
    category: 'Character Acting',
    title: 'James Baxter — 360° Turn & Weight Shift',
    animatorShow: 'James Baxter / Steven Universe',
    description: 'Masterclass volume preservation, full body squash-and-stretch, and organic rotational arcs.',
    fps: 24,
    url: 'https://www.sakugabooru.com/data/1ddcfd6d99e6c6d8e9eb49ae8f2983c4.mp4',
  },
  {
    id: 'impact',
    name: '⚡ Sakuga FX & Impact Smears',
    category: 'VFX & Impact Frames',
    title: 'FLCL — Explosion Debris & Impact Frames',
    animatorShow: 'Studio Gainax / FLCL',
    description: 'Scrub single-frame negative flashes, stylized smears, and multi-directional debris physics.',
    fps: 24,
    url: 'https://www.sakugabooru.com/data/cebd3157b2f3e03cef71212910ce1eaa.mp4',
  },
  {
    id: 'locomotion',
    name: '🏃 Locomotion & Weight',
    category: 'Creature Animation',
    title: 'Demon Slayer — Creature Momentum & Follow-Through',
    animatorShow: 'Ufotable / Kimetsu no Yaiba',
    description: 'Check secondary cloth physics, heavy quadruple footfalls, and anticipation frames.',
    fps: 24,
    url: 'https://www.sakugabooru.com/data/c6c3451b29890089943589b1bb0e3ebd.mp4',
  },
  {
    id: 'compare-mode',
    name: '🔄 Playblast Compare Mode',
    category: 'Pro Studio Workflow',
    title: 'Side-by-Side Reference vs Playblast Sync',
    animatorShow: 'Real Reference (Left) vs 3D Maya Playblast (Right)',
    description: 'Pro feature: Synchronize your WIP Maya/Blender playblast directly alongside master reference.',
    fps: 24,
    url: 'https://www.sakugabooru.com/data/e0dd86863fd54cd5c06a6dead12c29e2.mp4',
    compareUrl: 'https://www.sakugabooru.com/data/dc6d4a63794315bcf793f1481578bdcd.mp4',
    compareTitle: 'Maya Viewport WIP Playblast (Syncd)',
  },
];

export function InteractivePlayerShowcase() {
  const [activePreset, setActivePreset] = useState<ShowcasePreset>(PRESETS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [fps, setFps] = useState<number>(24);
  const [isLooping, setIsLooping] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showGhosting, setShowGhosting] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [isSideBySide, setIsSideBySide] = useState(false);

  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const compareVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize preset changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setFps(activePreset.fps);
    if (activePreset.id === 'compare-mode') {
      setIsSideBySide(true);
    }
  }, [activePreset]);

  // Handle Play/Pause synchronization
  const handlePlayPause = useCallback(() => {
    const v1 = primaryVideoRef.current;
    const v2 = compareVideoRef.current;
    if (!v1) return;

    if (v1.paused) {
      v1.play().catch(() => {});
      if (v2) v2.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v1.pause();
      if (v2) v2.pause();
      setIsPlaying(false);
    }
  }, []);

  // Frame Stepping
  const stepFrames = useCallback((frameCount: number) => {
    const v1 = primaryVideoRef.current;
    const v2 = compareVideoRef.current;
    if (!v1) return;

    v1.pause();
    if (v2) v2.pause();
    setIsPlaying(false);

    const frameDuration = 1 / fps;
    const newTime = Math.max(0, Math.min(duration || 10, v1.currentTime + frameCount * frameDuration));
    v1.currentTime = newTime;
    if (v2) v2.currentTime = newTime;
    setCurrentTime(newTime);
  }, [fps, duration]);

  // Scrubbing
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    const v1 = primaryVideoRef.current;
    const v2 = compareVideoRef.current;
    if (v1) v1.currentTime = newTime;
    if (v2) v2.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (primaryVideoRef.current) primaryVideoRef.current.playbackRate = speed;
    if (compareVideoRef.current) compareVideoRef.current.playbackRate = speed;
  };

  // Time update listener
  const onTimeUpdate = () => {
    if (primaryVideoRef.current) {
      setCurrentTime(primaryVideoRef.current.currentTime);
      if (compareVideoRef.current && Math.abs(compareVideoRef.current.currentTime - primaryVideoRef.current.currentTime) > 0.08) {
        compareVideoRef.current.currentTime = primaryVideoRef.current.currentTime;
      }
    }
  };

  const onLoadedMetadata = () => {
    if (primaryVideoRef.current) {
      setDuration(primaryVideoRef.current.duration || 0);
    }
  };

  // Keyboard controls when hovering/interacting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'Period' || e.key === '.') {
        e.preventDefault();
        stepFrames(e.shiftKey ? 5 : 1);
      } else if (e.code === 'Comma' || e.key === ',') {
        e.preventDefault();
        stepFrames(e.shiftKey ? -5 : -1);
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFlipped((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, stepFrames]);

  const currentFrame = Math.floor(currentTime * fps) + 1;
  const totalFrames = Math.max(1, Math.floor((duration || 0) * fps));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto" id="player-demo">
      {/* Section Header */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/40 text-purple-300 text-xs font-semibold uppercase tracking-wider">
          <Film className="w-3.5 h-3.5 text-purple-400" />
          Interactive Player Test Drive
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Experience Studio-Grade Frame Scrubbing
        </h2>
        <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Test drive the actual frame-by-frame player right in your browser. Hit spacebar to play, use <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-xs border border-zinc-700">,</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-xs border border-zinc-700">.</kbd> to step single frames, and switch speed or camera overlays.
        </p>
      </div>

      {/* Preset Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none justify-start sm:justify-center">
        {PRESETS.map((preset) => {
          const isActive = activePreset.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => {
                setActivePreset(preset);
                if (preset.id === 'compare-mode') {
                  setIsSideBySide(true);
                } else {
                  setIsSideBySide(false);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/40 scale-[1.02]'
                  : 'bg-zinc-900/80 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              <span>{preset.name}</span>
              {preset.id === 'compare-mode' && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold border border-amber-500/30">
                  Pro
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Player Display Box */}
      <div 
        ref={containerRef}
        className="relative rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl overflow-hidden ring-1 ring-white/10"
      >
        {/* Top Player Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-900/90 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                {activePreset.title}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {activePreset.category}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400">
                {activePreset.description}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* FPS Selector */}
            <div className="flex items-center rounded-lg bg-black/60 p-0.5 border border-white/10 text-[11px]">
              {[12, 24, 30].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setFps(rate)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    fps === rate ? 'bg-purple-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                  title={`${rate} Frames Per Second`}
                >
                  {rate} FPS
                </button>
              ))}
            </div>

            {/* Split Mode Toggle Button */}
            {activePreset.compareUrl && (
              <button
                type="button"
                onClick={() => setIsSideBySide((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  isSideBySide
                    ? 'bg-purple-950/70 border-purple-500 text-purple-300'
                    : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                }`}
                title="Toggle Side-by-Side Playblast Comparison"
              >
                <Split className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Side-by-Side</span>
              </button>
            )}
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] sm:min-h-[460px] overflow-hidden select-none">
          {/* Side by side or Single Mode */}
          <div className={`w-full h-full ${isSideBySide ? 'grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10' : 'relative'}`}>
            
            {/* Primary Video */}
            <div className="relative aspect-video w-full flex items-center justify-center bg-zinc-950 overflow-hidden">
              <video
                ref={primaryVideoRef}
                key={activePreset.url}
                src={activePreset.url}
                loop={isLooping}
                muted={isMuted}
                playsInline
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onClick={handlePlayPause}
                className={`max-h-full max-w-full object-contain cursor-pointer transition-transform ${
                  isFlipped ? '-scale-x-100' : ''
                }`}
              />

              {/* Ghosting Onion Skin Simulation Overlay */}
              {showGhosting && (
                <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-40 filter hue-rotate-180 brightness-125 translate-x-1">
                  <div className="absolute top-10 right-3 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-[10px] font-mono text-purple-300">
                    ONION SKIN GHOSTING: ACTIVE
                  </div>
                </div>
              )}

              {/* Grid / Rule of Thirds Overlay */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-purple-500/30">
                  <div className="border-r border-b border-purple-500/25" />
                  <div className="border-r border-b border-purple-500/25" />
                  <div className="border-b border-purple-500/25" />
                  <div className="border-r border-b border-purple-500/25" />
                  <div className="border-r border-b border-purple-500/25 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full border border-purple-400/50" />
                  </div>
                  <div className="border-b border-purple-500/25" />
                  <div className="border-r border-purple-500/25" />
                  <div className="border-r border-purple-500/25" />
                  <div />
                </div>
              )}

              {/* Safe Action Guide Overlay */}
              {showSafeZone && (
                <div className="absolute inset-6 sm:inset-10 pointer-events-none border border-amber-400/40 rounded-lg flex items-start justify-start p-2">
                  <span className="text-[10px] font-mono text-amber-400/70 uppercase">90% Action Safe</span>
                </div>
              )}

              {/* Left Label */}
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/75 border border-white/10 text-[10px] font-mono text-purple-300 backdrop-blur-sm pointer-events-none">
                {isSideBySide ? 'REFERENCE (24 FPS)' : 'REFERENCE PLAYER'}
              </div>

              {/* Center Play Overlay Button when Paused */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm hover:scale-105 transition-all"
                  aria-label="Play reference"
                >
                  <Play className="w-7 h-7 ml-1 fill-white" />
                </button>
              )}
            </div>

            {/* Synchronized Comparison Video (Maya / Blender Playblast) */}
            {isSideBySide && (
              <div className="relative aspect-video w-full flex items-center justify-center bg-zinc-950 overflow-hidden">
                <video
                  ref={compareVideoRef}
                  key={activePreset.compareUrl || activePreset.url}
                  src={activePreset.compareUrl || activePreset.url}
                  loop={isLooping}
                  muted
                  playsInline
                  className="max-h-full max-w-full object-contain filter contrast-105"
                />

                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/75 border border-amber-500/30 text-[10px] font-mono text-amber-300 backdrop-blur-sm pointer-events-none flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {activePreset.compareTitle || 'MAYA WIP PLAYBLAST'}
                </div>

                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/75 border border-white/10 text-[10px] font-mono text-zinc-400 backdrop-blur-sm">
                  SYNCHRONIZED (LOCKSTEP)
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Scrubber Timeline Bar */}
        <div className="px-4 py-2 bg-zinc-950 border-t border-white/10">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-purple-400 font-semibold w-24 shrink-0">
              FR {currentFrame.toString().padStart(3, '0')} / {totalFrames.toString().padStart(3, '0')}
            </span>

            <div className="relative flex-1 group py-1">
              <input
                type="range"
                min="0"
                max={duration || 1}
                step={1 / fps}
                value={currentTime}
                onChange={handleScrub}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
              />
            </div>

            <span className="font-mono text-xs text-zinc-400 w-24 text-right shrink-0">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>

        {/* Studio Bottom Controls Bar */}
        <div className="px-4 py-3 bg-zinc-900/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          
          {/* Playback Controls & Frame Stepping */}
          <div className="flex items-center gap-1.5">
            {/* Step -5 Frames */}
            <button
              type="button"
              onClick={() => stepFrames(-5)}
              title="Step -5 Frames (Shift + ,)"
              className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Step -1 Frame */}
            <button
              type="button"
              onClick={() => stepFrames(-1)}
              title="Step -1 Frame (,)"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">1 Fr</span>
            </button>

            {/* Play / Pause */}
            <button
              type="button"
              onClick={handlePlayPause}
              title="Play / Pause (Space)"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/40 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5 fill-white" />}
            </button>

            {/* Step +1 Frame */}
            <button
              type="button"
              onClick={() => stepFrames(1)}
              title="Step +1 Frame (.)"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition-colors"
            >
              <span className="hidden sm:inline">1 Fr</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Step +5 Frames */}
            <button
              type="button"
              onClick={() => stepFrames(5)}
              title="Step +5 Frames (Shift + .)"
              className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>

            {/* Speed Control */}
            <div className="ml-2 hidden sm:flex items-center rounded-lg bg-black/60 p-0.5 border border-white/10 text-[11px]">
              {[0.25, 0.5, 1.0, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    playbackRate === rate ? 'bg-purple-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                  title={`${rate}x speed`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Animator Tool Overlays */}
          <div className="flex items-center gap-2">
            {/* Mirror / Flip Horizontal */}
            <button
              type="button"
              onClick={() => setIsFlipped((prev) => !prev)}
              title="Flip Horizontal / Mirror (F)"
              className={`p-2 rounded-lg border text-xs transition-colors ${
                isFlipped ? 'bg-purple-950/70 border-purple-500 text-purple-300' : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>

            {/* Rule of Thirds Grid */}
            <button
              type="button"
              onClick={() => setShowGrid((prev) => !prev)}
              title="Toggle Rule of Thirds Grid"
              className={`p-2 rounded-lg border text-xs transition-colors ${
                showGrid ? 'bg-purple-950/70 border-purple-500 text-purple-300' : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>

            {/* Onion Skin / Ghosting */}
            <button
              type="button"
              onClick={() => setShowGhosting((prev) => !prev)}
              title="Toggle Onion Skinning / Ghost Arc"
              className={`p-2 rounded-lg border text-xs transition-colors ${
                showGhosting ? 'bg-purple-950/70 border-purple-500 text-purple-300' : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Safe Zone */}
            <button
              type="button"
              onClick={() => setShowSafeZone((prev) => !prev)}
              title="Toggle Action Safe Boundary"
              className={`p-2 rounded-lg border text-xs transition-colors ${
                showSafeZone ? 'bg-purple-950/70 border-purple-500 text-purple-300' : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => {
                if (primaryVideoRef.current) {
                  primaryVideoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              title={isMuted ? 'Unmute' : 'Mute'}
              className="p-2 rounded-lg bg-black/40 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-zinc-950/70 border border-white/10 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">Hotkeys:</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-[11px] border border-zinc-700">Space</kbd> Play/Pause
          </span>
          <span className="text-zinc-600">·</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-[11px] border border-zinc-700">,</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-[11px] border border-zinc-700">.</kbd> Step 1 Frame
          </span>
          <span className="text-zinc-600">·</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-[11px] border border-zinc-700">Shift</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-[11px] border border-zinc-700">,</kbd>/<kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-[11px] border border-zinc-700">.</kbd> Step 5
          </span>
          <span className="text-zinc-600">·</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-mono text-[11px] border border-zinc-700">F</kbd> Mirror
          </span>
        </div>

        <div className="text-emerald-400 font-medium flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> 8,100+ Reference Library Included
        </div>
      </div>

      {/* Pro Callout Below Player */}
      <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-950 to-indigo-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Try with your own Maya, Blender, or 2D shots
          </div>
          <h3 className="text-lg font-bold text-white">
            Upload WIP shots &amp; sync side-by-side with any reference clip
          </h3>
          <p className="text-xs text-zinc-400 max-w-xl">
            Pro gives you unlimited reference viewing, side-by-side playblast comparison, private boards for studio work, and direct MP4 downloads.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button asChild className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-900/30">
            <Link href="/pricing">
              Get Pro for $1 (First Month)
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 font-semibold">
            <Link href="/home">
              Browse 8,000+ Free
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
