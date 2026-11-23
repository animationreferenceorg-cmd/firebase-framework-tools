'use client';

import React, { useState } from 'react';
import { BRUSH_PRESETS, type BrushSettings, type CustomBrushTexture, type BrushCategory } from '@/lib/paint/types';
import { cn } from '@/lib/utils';
import { Sparkles, X, Feather, Pencil, Paintbrush, Hash, PenTool, Sliders } from 'lucide-react';

interface ProcreateBrushStudioProps {
  brush: BrushSettings;
  onBrushChange: (brush: BrushSettings) => void;
  onClose: () => void;
  customTextures: CustomBrushTexture[];
}

const CATEGORIES: { id: BrushCategory; label: string; icon: React.ElementType }[] = [
  { id: 'Vector', label: 'Vector', icon: PenTool },
  { id: 'Sketch', label: 'Sketch', icon: Pencil },
  { id: 'Inking', label: 'Inking', icon: Feather },
  { id: 'Painting', label: 'Painting', icon: Paintbrush },
  { id: 'Texture', label: 'Texture', icon: Hash },
  { id: 'FX', label: 'FX', icon: Sparkles },
];

export function ProcreateBrushStudio({ brush, onBrushChange, onClose, customTextures }: ProcreateBrushStudioProps) {
  const [activeCategory, setActiveCategory] = useState<BrushCategory>('Vector');
  const [activePresetId, setActivePresetId] = useState<string>('vector-gpen');

  const currentPresets = BRUSH_PRESETS.filter((p) => p.category === activeCategory);

  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    const found = BRUSH_PRESETS.find((p) => p.id === presetId);
    if (found) {
      // Reset optional dynamics cleanly before applying the preset's exact profile
      onBrushChange({
        ...brush,
        textureId: undefined,
        spacing: 0.06,
        angleFollow: false,
        angleOffset: 0,
        angleJitter: 0,
        scatter: 0,
        sizeJitter: 0,
        roundness: 1,
        vectorSmooth: false,
        ...found.settings,
      });
    }
  };

  return (
    <div
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute top-16 right-16 z-50 w-[560px] max-w-[92vw] bg-[#13111e]/95 backdrop-blur-3xl border border-white/12 rounded-3xl p-5 shadow-[0_30px_90px_rgba(0,0,0,0.92)] select-none animate-in fade-in zoom-in-95 duration-200 touch-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-black text-white tracking-wide">AnimRef Brush Studio</h3>
          <span className="rounded-full border border-violet-400/35 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-200">
            Vector · Ink · Painter · FX
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close brush studio"
          className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Two Column Brush Selector */}
      <div className="grid grid-cols-12 gap-4 h-[340px]">
        {/* Left Column: Categories */}
        <div className="col-span-4 flex flex-col gap-1 overflow-y-auto pr-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = BRUSH_PRESETS.filter((p) => p.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer',
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/35'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                )}
              >
                <span className="flex items-center gap-2">
                  <cat.icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </span>
                <span className={cn('text-[10px] font-mono', isActive ? 'text-white/80' : 'text-zinc-500')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Presets with Stroke Visualizer */}
        <div className="col-span-8 flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-none">
          {currentPresets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            const texture = customTextures.find((t) => t.id === preset.settings.textureId);
            const isVector = Boolean(preset.settings.vectorSmooth);
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={cn(
                  'flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer border text-left',
                  isSelected
                    ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 border-violet-400 text-white shadow-xl shadow-violet-600/30'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.07] text-zinc-200'
                )}
              >
                {/* Brush Tip / Vector Ribbon Preview */}
                <div className="w-11 h-11 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {texture ? (
                    <img
                      src={texture.thumbnail}
                      alt={preset.name}
                      className={cn(
                        'w-full h-full object-contain opacity-90',
                        isSelected ? 'brightness-200' : 'opacity-80'
                      )}
                    />
                  ) : isVector ? (
                    <svg viewBox="0 0 44 44" className="w-8 h-8" aria-hidden>
                      <path
                        d="M 6 32 Q 20 8 38 14"
                        fill="none"
                        stroke={isSelected ? '#ffffff' : '#a78bfa'}
                        strokeWidth="4.5"
                        strokeLinecap="round"
                      />
                      <circle cx="6" cy="32" r="2.2" fill="#38bdf8" />
                      <circle cx="38" cy="14" r="2.2" fill="#38bdf8" />
                    </svg>
                  ) : (
                    <div
                      className="rounded-full bg-white/80"
                      style={{
                        width: 20,
                        height: Math.max(8, Math.round(20 * (preset.settings.roundness ?? 1))),
                        filter: preset.settings.hardness !== undefined && preset.settings.hardness < 0.5 ? 'blur(3px)' : 'none',
                      }}
                    />
                  )}
                </div>

                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold truncate">{preset.name}</span>
                    {preset.badge && (
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0',
                          isSelected
                            ? 'bg-white/20 text-white'
                            : isVector
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                              : 'bg-violet-500/20 text-violet-200 border border-violet-400/30'
                        )}
                      >
                        {preset.badge}
                      </span>
                    )}
                  </div>
                  <span className={cn('text-[10px] font-medium', isSelected ? 'text-white/80' : 'text-zinc-400')}>
                    {isVector
                      ? 'Crisp tapered vector ribbon · Zero stepping'
                      : preset.settings.angleFollow
                        ? 'Direction-following bristles · Pressure reactive'
                        : preset.settings.angleJitter
                          ? 'Organic grain & rotation jitter'
                          : 'Smooth studio pressure response'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Brush Dynamics Fine-Tuning Bar (Procreate Streamline / Spacing / Taper) */}
      <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-3 gap-3 text-[11px]">
        <label className="space-y-1">
          <div className="flex items-center justify-between text-zinc-400 font-semibold">
            <span className="inline-flex items-center gap-1">
              <Sliders className="h-3 w-3 text-violet-400" />
              Streamline
            </span>
            <span className="font-mono text-violet-200">{Math.round(brush.smoothing * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.85}
            step={0.05}
            value={brush.smoothing}
            onChange={(e) => onBrushChange({ ...brush, smoothing: parseFloat(e.target.value) })}
            className="w-full h-1 accent-violet-500 cursor-pointer"
          />
        </label>

        <label className="space-y-1">
          <div className="flex items-center justify-between text-zinc-400 font-semibold">
            <span>Spacing</span>
            <span className="font-mono text-violet-200">{Math.round((brush.spacing ?? 0.06) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.03}
            max={0.45}
            step={0.02}
            value={brush.spacing ?? 0.06}
            onChange={(e) => onBrushChange({ ...brush, spacing: parseFloat(e.target.value) })}
            className="w-full h-1 accent-violet-500 cursor-pointer"
          />
        </label>

        <label className="space-y-1">
          <div className="flex items-center justify-between text-zinc-400 font-semibold">
            <span>Min Taper</span>
            <span className="font-mono text-violet-200">{Math.round(brush.minPressureFactor * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={brush.minPressureFactor}
            onChange={(e) => onBrushChange({ ...brush, minPressureFactor: parseFloat(e.target.value) })}
            className="w-full h-1 accent-violet-500 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
