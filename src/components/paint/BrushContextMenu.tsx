'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { BrushSettings, CustomBrushTexture } from '@/lib/paint/types';
import { BRUSH_PRESETS } from '@/lib/paint/types';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Upload, X, Palette, Sliders, Sparkles } from 'lucide-react';
import { ColorPicker } from './ColorPicker';

interface BrushContextMenuProps {
  x: number;
  y: number;
  brush: BrushSettings;
  onBrushChange: (brush: BrushSettings) => void;
  customTextures: CustomBrushTexture[];
  onUploadTexture: (file: File) => void;
  onClose: () => void;
  recentColors: string[];
  onAddRecentColor: (hex: string) => void;
}

export function BrushContextMenu({ 
  x, 
  y, 
  brush, 
  onBrushChange, 
  customTextures, 
  onUploadTexture, 
  onClose, 
  recentColors, 
  onAddRecentColor 
}: BrushContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ x, y });
  const builtinTextures = (customTextures || []).filter((t) => t.builtin);
  const uploadedTextures = (customTextures || []).filter((t) => !t.builtin);

  // Clamp popover inside viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clampedX = Math.min(x, window.innerWidth - rect.width - 16);
    const clampedY = Math.min(y, window.innerHeight - rect.height - 16);
    setPos({ x: Math.max(16, clampedX), y: Math.max(16, clampedY) });
  }, [x, y]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      data-ui-panel="true"
      style={{ left: pos.x, top: pos.y, maxHeight: 'calc(100vh - 32px)' }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[500] w-80 bg-[#14141e]/98 backdrop-blur-3xl border border-white/15 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.9)] p-4 flex flex-col gap-4 text-xs text-zinc-300 overflow-y-auto scrollbar-none animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-400/30">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-xs tracking-wide">Color & Brush Studio</h3>
            <p className="text-[10px] text-zinc-400">Procreate Palette & Brush Dynamics</p>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="h-7 w-7 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ──────────────── 1. TOP SECTION: LARGE COLOR WHEEL ──────────────── */}
      <div className="bg-black/30 border border-white/10 rounded-2xl p-3.5 flex flex-col items-center gap-3">
        <div className="w-full flex items-center justify-between">
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-purple-400" />
            Color Wheel
          </span>
          <span className="font-mono text-[11px] font-bold text-purple-300 uppercase bg-purple-600/20 px-2 py-0.5 rounded-md border border-purple-500/30">
            {brush.color}
          </span>
        </div>

        {/* Large Procreate Color Wheel */}
        <ColorPicker
          color={brush.color}
          onChange={(hex) => onBrushChange({ ...brush, color: hex })}
          recentColors={recentColors}
          onAddRecent={onAddRecentColor}
          size={230}
        />
      </div>

      {/* ──────────────── 2. BOTTOM SECTION: BRUSH SETTINGS ──────────────── */}
      <div className="bg-black/30 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-3">
        
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-purple-400" />
            Brush Settings
          </span>
          <span className="text-[10px] font-mono text-zinc-400">{brush.size}px</span>
        </div>

        {/* Sliders */}
        <div className="space-y-2.5 pt-1">
          <SliderRow label="Size" value={brush.size} min={1} max={200} onChange={(v) => onBrushChange({ ...brush, size: v })} suffix="px" />
          <SliderRow label="Opacity" value={Math.round(brush.opacity * 100)} min={1} max={100} onChange={(v) => onBrushChange({ ...brush, opacity: v / 100 })} suffix="%" />
          <SliderRow label="Hardness" value={Math.round(brush.hardness * 100)} min={0} max={100} onChange={(v) => onBrushChange({ ...brush, hardness: v / 100 })} suffix="%" />
          <SliderRow label="Streamline" value={Math.round(brush.smoothing * 100)} min={0} max={90} onChange={(v) => onBrushChange({ ...brush, smoothing: v / 100 })} suffix="%" />
        </div>

        {/* Pressure Dynamics Toggles */}
        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <span className="text-zinc-400 text-[11px] font-bold">Stylus Pressure:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onBrushChange({ ...brush, pressureSize: !brush.pressureSize })}
              className={cn(
                'px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer',
                brush.pressureSize ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              )}
            >
              Size
            </button>
            <button
              onClick={() => onBrushChange({ ...brush, pressureOpacity: !brush.pressureOpacity })}
              className={cn(
                'px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer',
                brush.pressureOpacity ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              )}
            >
              Opacity
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

function SliderRow({ label, value, min, max, onChange, suffix = '' }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-zinc-400 font-bold shrink-0">{label}</span>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={1} className="flex-1" />
      <span className="w-10 text-right font-mono text-white font-bold shrink-0">{value}{suffix}</span>
    </div>
  );
}
