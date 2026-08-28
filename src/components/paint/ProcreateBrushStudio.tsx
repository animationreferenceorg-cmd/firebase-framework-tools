'use client';

import React, { useState } from 'react';
import { BRUSH_PRESETS, type BrushSettings, type CustomBrushTexture, type BrushCategory } from '@/lib/paint/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Plus, Check, Clock, Feather, Pencil, Paintbrush, Flame, Hash } from 'lucide-react';

interface ProcreateBrushStudioProps {
  brush: BrushSettings;
  onBrushChange: (brush: BrushSettings) => void;
  onClose: () => void;
  customTextures: CustomBrushTexture[];
}

const CATEGORIES: { id: BrushCategory; label: string; icon: React.ElementType }[] = [
  { id: 'Sketch', label: 'Sketch', icon: Pencil },
  { id: 'Inking', label: 'Inking', icon: Feather },
  { id: 'Painting', label: 'Painting', icon: Paintbrush },
  { id: 'Texture', label: 'Texture', icon: Hash },
  { id: 'FX', label: 'FX', icon: Sparkles },
];

export function ProcreateBrushStudio({ brush, onBrushChange, onClose, customTextures }: ProcreateBrushStudioProps) {
  const [activeCategory, setActiveCategory] = useState<BrushCategory>('Sketch');
  const [activePresetName, setActivePresetName] = useState('Pencil');

  const currentPresets = BRUSH_PRESETS.filter((p) => p.category === activeCategory);

  const handleSelectPreset = (presetId: string, name: string) => {
    setActivePresetName(name);
    const found = BRUSH_PRESETS.find((p) => p.id === presetId);
    if (found) {
      onBrushChange({ ...brush, ...found.settings });
    }
  };

  return (
    <div 
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute top-16 right-16 z-50 w-[520px] bg-[#161620]/90 backdrop-blur-3xl border border-white/10 rounded-3xl p-5 shadow-[0_30px_90px_rgba(0,0,0,0.9)] select-none animate-in fade-in zoom-in-95 duration-200 touch-none"
    >
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black text-white tracking-wide">Animation Brushes</h3>
        </div>
        <button 
          onClick={() => {}}
          className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Two Column Brush Selector */}
      <div className="grid grid-cols-12 gap-4 h-[380px]">
        
        {/* Left Column: Categories */}
        <div className="col-span-4 flex flex-col gap-1 overflow-y-auto pr-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer',
                  isActive 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                )}
              >
                <cat.icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Presets with Stroke Visualizer */}
        <div className="col-span-8 flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-none">
          {currentPresets.map((preset) => {
            const isSelected = activePresetName === preset.name;
            const texture = customTextures.find(t => t.id === preset.settings.textureId);
            return (
              <button
                key={preset.name}
                onClick={() => handleSelectPreset(preset.id, preset.name)}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-2xl transition-all cursor-pointer border text-left',
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white shadow-xl shadow-purple-600/30'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-zinc-300'
                )}
              >
                {/* Accurate Brush Tip Thumbnail Preview */}
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  {texture ? (
                    <img 
                      src={texture.thumbnail} 
                      alt={preset.name} 
                      className={cn("w-full h-full object-contain mix-blend-plus-lighter invert opacity-80", isSelected ? "opacity-100 invert-0 brightness-200" : "")} 
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/40" />
                  )}
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold">{preset.name}</span>
                  <span className="text-[10px] text-white/50 uppercase tracking-widest">{preset.category}</span>
                </div>
              </button>
            );
          })}
        </div>

      </div>

    </div>
  );
}
