'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Film, 
  SkipBack, 
  SkipForward, 
  Clock, 
  FileText, 
  MessageSquare, 
  Camera,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  Copy,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface ToonBoomPanel {
  id: string;
  shotNumber: string;
  panelNumber: string;
  duration: number; // seconds
  dialogue: string;
  action: string;
  camera: string;
  imageUrl: string;
}

const defaultToonBoomPanels: ToonBoomPanel[] = [
  {
    id: 'tb-1',
    shotNumber: 'SHOT 01',
    panelNumber: 'PANEL A1',
    duration: 2.5,
    dialogue: 'You were too late. The artifact belongs to the shadows now.',
    action: 'Kai draws katana in dark shadow as rain strikes bamboo roof.',
    camera: 'Slow Push In / Low Angle',
    imageUrl: ''
  },
  {
    id: 'tb-2',
    shotNumber: 'SHOT 01',
    panelNumber: 'PANEL A2',
    duration: 3.0,
    dialogue: '[Thunder Strikes in Rain]',
    action: 'Katana blade reflects torch fire in dark courtyard.',
    camera: 'Extreme Close Up / Eye Tracking',
    imageUrl: ''
  },
  {
    id: 'tb-3',
    shotNumber: 'SHOT 02',
    panelNumber: 'PANEL B1',
    duration: 2.0,
    dialogue: 'Surrender or meet the edge of blade!',
    action: 'Kai leaps across roof tiles into moonlight.',
    camera: 'Wide Action Pan Left to Right',
    imageUrl: ''
  }
];

interface ToonBoomStoryboardTimelineProps {
  panels: ToonBoomPanel[];
  activeIdx: number;
  onSelectPanel: (idx: number) => void;
  onAddPanel: () => void;
  onDeletePanel: (idx: number) => void;
  onDurationChange: (idx: number, duration: number) => void;
  onionSkinEnabled?: boolean;
  onToggleOnionSkin?: () => void;
  onionSkinOpacity?: number;
  onOnionSkinOpacityChange?: (val: number) => void;
}

export function ToonBoomStoryboardTimeline({ 
  panels,
  activeIdx,
  onSelectPanel,
  onAddPanel,
  onDeletePanel,
  onDurationChange,
  onionSkinEnabled = false,
  onToggleOnionSkin,
  onionSkinOpacity = 0.3,
  onOnionSkinOpacityChange
}: ToonBoomStoryboardTimelineProps) {
  const { toast } = useToast();
  const [isPlayingAnimatic, setIsPlayingAnimatic] = useState(false);

  const totalDuration = panels.reduce((sum, p) => sum + p.duration, 0);

  // Animatic Playback Timer
  useEffect(() => {
    let timer: any = null;
    if (isPlayingAnimatic) {
      const cur = panels[activeIdx];
      timer = setTimeout(() => {
        if (activeIdx < panels.length - 1) {
          const nextIdx = activeIdx + 1;
          onSelectPanel(nextIdx);
        } else {
          setIsPlayingAnimatic(false);
          onSelectPanel(0);
        }
      }, (cur?.duration || 2.5) * 1000);
    }
    return () => clearTimeout(timer);
  }, [isPlayingAnimatic, activeIdx, panels, onSelectPanel]);

  return (
    <div className="flex flex-col w-full bg-[#0c0d14] border-t border-white/10 select-none z-30 shadow-2xl">
      
      {/* ──────────────── 1. TOON BOOM STORYBOARD PRO TIMELINE TOP CONTROL BAR ──────────────── */}
      <div className="h-11 px-6 bg-[#12131e] border-b border-white/10 flex items-center justify-between text-xs font-mono font-bold text-zinc-300">
        
        {/* Left Transport Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-purple-400 font-black text-xs">
            <Film className="h-4 w-4 text-purple-400" />
            <span>Toon Boom Storyboard Pro Reel</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Animatic Play / Pause Button */}
          <button
            onClick={() => setIsPlayingAnimatic(!isPlayingAnimatic)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
          >
            {isPlayingAnimatic ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white ml-0.5" />}
            <span>{isPlayingAnimatic ? 'PAUSE ANIMATIC' : 'PLAY ANIMATIC'}</span>
          </button>

          {/* Prev / Next Panel Steppers */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => {
                if (activeIdx > 0) onSelectPanel(activeIdx - 1);
              }}
              disabled={activeIdx === 0}
              className="p-1 hover:text-white disabled:opacity-30 rounded cursor-pointer"
              title="Previous Panel"
            >
              <SkipBack className="h-3.5 w-3.5 text-purple-300" />
            </button>
            <span className="text-xs text-purple-300 font-bold px-2 font-mono">
              Panel {activeIdx + 1} / {panels.length}
            </span>
            <button
              onClick={() => {
                if (activeIdx < panels.length - 1) onSelectPanel(activeIdx + 1);
              }}
              disabled={activeIdx === panels.length - 1}
              className="p-1 hover:text-white disabled:opacity-30 rounded cursor-pointer"
              title="Next Panel"
            >
              <SkipForward className="h-3.5 w-3.5 text-purple-300" />
            </button>
          </div>
          
          <div className="h-4 w-px bg-white/10" />

          {/* Onion Skin Controls */}
          {onToggleOnionSkin && onOnionSkinOpacityChange && (
            <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 shadow-inner">
              <button
                onClick={onToggleOnionSkin}
                className={cn(
                  "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  onionSkinEnabled ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" : "text-zinc-500 hover:text-zinc-300"
                )}
                title="Toggle Onion Skinning"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Onion Skin</span>
              </button>
              
              {onionSkinEnabled && (
                <div className="flex items-center gap-2" title="Onion Skin Opacity">
                  <input
                    type="range"
                    min="0.1" max="1.0" step="0.05"
                    value={onionSkinOpacity}
                    onChange={(e) => onOnionSkinOpacityChange(parseFloat(e.target.value))}
                    className="w-16 h-1 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-amber-200/70 w-7">{Math.round(onionSkinOpacity * 100)}%</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Stats & Add Buttons */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-zinc-400">
            Total Reel Duration: <strong className="text-indigo-400 font-bold">{totalDuration.toFixed(1)}s</strong>
          </span>

          <button
            onClick={() => onDeletePanel(activeIdx)}
            disabled={panels.length <= 1}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Panel</span>
          </button>

          <button
            onClick={onAddPanel}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Panel</span>
          </button>
        </div>

      </div>

      {/* ──────────────── 2. MAIN HORIZONTAL STORYBOARD REEL ──────────────── */}
      <div className="h-36 bg-[#08090e] p-3 flex items-center gap-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {panels.map((p, idx) => {
          const isSelected = idx === activeIdx;

          return (
            <div
              key={p.id}
              onClick={() => onSelectPanel(idx)}
              className={cn(
                "h-full aspect-video rounded-2xl overflow-hidden relative cursor-pointer shrink-0 transition-all border group shadow-xl flex flex-col justify-between p-2",
                isSelected 
                  ? "border-purple-500 ring-2 ring-purple-500/80 scale-[1.03] bg-purple-950/50" 
                  : "border-white/10 bg-black/70 hover:border-white/30"
              )}
            >
              {/* Image Thumbnail or Pure White Paper Sheet */}
              {p.imageUrl ? (
                <img 
                  src={p.imageUrl} 
                  alt={p.panelNumber} 
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-white/5 flex items-center justify-center text-slate-500 font-mono text-[10px] font-bold">
                  <span>[ Empty ]</span>
                </div>
              )}

              {/* Top Badges */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono font-black text-white border border-white/10 shadow-xs">
                  {p.shotNumber} • {p.panelNumber}
                </span>
                <div 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-mono font-black shadow-xs flex items-center overflow-hidden transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="number"
                    min="0.1" step="0.1"
                    value={p.duration}
                    onChange={(e) => onDurationChange(idx, parseFloat(e.target.value) || 0.1)}
                    className="w-8 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="pr-1.5">s</span>
                </div>
              </div>



            </div>
          );
        })}

        {/* Add Panel Slot Button */}
        <button
          onClick={onAddPanel}
          className="h-full aspect-video rounded-2xl border-2 border-dashed border-white/20 hover:border-purple-400 bg-white/5 hover:bg-purple-500/10 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-white transition-all shrink-0 cursor-pointer"
        >
          <Plus className="h-6 w-6 text-purple-400" />
          <span className="text-xs font-mono font-bold">+ New Panel</span>
        </button>
      </div>

    </div>
  );
}
