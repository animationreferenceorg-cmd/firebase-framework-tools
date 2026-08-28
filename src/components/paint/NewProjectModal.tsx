'use client';

import React, { useState } from 'react';
import { 
  X, 
  FilePlus, 
  Sparkles, 
  Layers, 
  Check, 
  Film, 
  Monitor, 
  Maximize2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasSize } from '@/lib/paint/types';

interface NewProjectModalProps {
  onCreateProject: (settings: {
    name: string;
    canvasSize: CanvasSize;
    fps: number;
  }) => void;
  onClose: () => void;
}

const PRESET_CANVAS_SIZES: { label: string; width: number; height: number; desc: string }[] = [
  { label: 'Full HD 1080p', width: 1920, height: 1080, desc: '1920 × 1080 (16:9 Standard)' },
  { label: '4K Ultra HD', width: 3840, height: 2160, desc: '3840 × 2160 (Cinema)' },
  { label: 'Instagram Square', width: 1080, height: 1080, desc: '1080 × 1080 (1:1 Square)' },
  { label: 'Mobile Story (9:16)', width: 1080, height: 1920, desc: '1080 × 1920 (Vertical)' },
];

export function NewProjectModal({ onCreateProject, onClose }: NewProjectModalProps) {
  const [name, setName] = useState('Untitled Animation');
  const [selectedPreset, setSelectedPreset] = useState(PRESET_CANVAS_SIZES[0]);
  const [fps, setFps] = useState(24);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateProject({
      name,
      canvasSize: { width: selectedPreset.width, height: selectedPreset.height },
      fps,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-in fade-in duration-150 select-none">
      
      <div className="w-full max-w-lg bg-[#14141d]/95 border border-white/10 rounded-3xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-lg shadow-purple-600/40">
              <FilePlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">Create New Animation Project</h2>
              <p className="text-xs text-zinc-400">Start fresh with 100% transparent animation cels</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* Project Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-300">Project Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Character Walk Cycle"
              className="w-full h-11 px-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-all"
              required
            />
          </div>

          {/* Canvas Size Presets */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-zinc-300">Canvas Preset</label>
            <div className="grid grid-cols-2 gap-2.5">
              {PRESET_CANVAS_SIZES.map((preset) => {
                const isSelected = preset.label === selectedPreset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelectedPreset(preset)}
                    className={cn(
                      "p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                      isSelected 
                        ? "bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/30 text-white" 
                        : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span className="text-xs font-bold text-white flex items-center justify-between">
                      {preset.label}
                      {isSelected && <Check className="h-3.5 w-3.5 text-purple-400" />}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FPS Speed Preset */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-zinc-300">Animation Frame Rate (FPS)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 24, label: '24 FPS', desc: 'On Ones (Standard)' },
                { value: 12, label: '12 FPS', desc: 'On Twos (Classic 2D)' },
                { value: 8, label: '8 FPS', desc: 'On Threes (Anime)' },
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFps(value)}
                  className={cn(
                    "p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer",
                    fps === value 
                      ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30" 
                      : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className="text-xs font-bold">{label}</span>
                  <span className="text-[9px] font-mono text-purple-200/80 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-purple-600/40 border border-purple-400/40 transition-all cursor-pointer mt-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Create Clean Transparent Animation</span>
          </button>

        </form>

      </div>

    </div>
  );
}
