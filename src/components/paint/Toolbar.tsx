'use client';

import React from 'react';
import type { ToolType, BrushSettings, SymmetryMode } from '@/lib/paint/types';
import { BRUSH_PRESETS } from '@/lib/paint/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Paintbrush,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Circle,
  Type,
  MousePointer2,
  Move,
  Undo2,
  Redo2,
  Download,
  Gauge,
  Waves,
  Lasso,
  Wand2,
  Fingerprint,
  Blend,
  Stamp,
  SlidersHorizontal,
  FlipHorizontal2,
  Save,
  FolderOpen,
} from 'lucide-react';

interface ToolbarProps {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
  brush: BrushSettings;
  onBrushChange: (brush: BrushSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onOpenColorPicker: (clientX: number, clientY: number) => void;
  symmetry: SymmetryMode;
  onSymmetryChange: (mode: SymmetryMode) => void;
  onOpenAdjustments: () => void;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
}

const TOOLS: { type: ToolType; icon: React.ElementType; label: string }[] = [
  { type: 'brush', icon: Paintbrush, label: 'Brush (B)' },
  { type: 'eraser', icon: Eraser, label: 'Eraser (E)' },
  { type: 'smudge', icon: Fingerprint, label: 'Smudge' },
  { type: 'cloneStamp', icon: Stamp, label: 'Clone Stamp (Alt+click to set source)' },
  { type: 'fill', icon: PaintBucket, label: 'Fill (G)' },
  { type: 'gradient', icon: Blend, label: 'Gradient' },
  { type: 'eyedropper', icon: Pipette, label: 'Eyedropper (I)' },
  { type: 'line', icon: Minus, label: 'Line (L)' },
  { type: 'rectangle', icon: Square, label: 'Rectangle (R)' },
  { type: 'ellipse', icon: Circle, label: 'Ellipse (O)' },
  { type: 'text', icon: Type, label: 'Text (T)' },
  { type: 'select', icon: MousePointer2, label: 'Rectangle Select (S)' },
  { type: 'lasso', icon: Lasso, label: 'Lasso Select' },
  { type: 'magicWand', icon: Wand2, label: 'Magic Wand (Shift adds, Alt subtracts)' },
  { type: 'move', icon: Move, label: 'Move (V)' },
];

const SYMMETRY_CYCLE: SymmetryMode[] = ['none', 'vertical', 'horizontal', 'both'];

export function Toolbar({ tool, onToolChange, brush, onBrushChange, onUndo, onRedo, canUndo, canRedo, onExport, onOpenColorPicker, symmetry, onSymmetryChange, onOpenAdjustments, onSaveProject, onLoadProject }: ToolbarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col w-16 bg-[#171529]/95 border-r border-purple-500/20 backdrop-blur-2xl py-3 gap-1 items-center overflow-y-auto z-20 shadow-2xl">
      <button
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onOpenColorPicker(rect.right + 8, rect.top);
        }}
        title="Active Color (Click to Pick)"
        className="h-9 w-9 rounded-xl border-2 border-purple-400/80 shadow-lg shadow-purple-950/50 hover:scale-105 transition-all mb-1 shrink-0 cursor-pointer"
        style={{ backgroundColor: brush.color }}
      />
      <Separator className="mb-1 bg-white/10 w-8" />

      {TOOLS.map(({ type, icon: Icon, label }) => (
        <Button
          key={type}
          variant="ghost"
          size="icon"
          title={label}
          onClick={() => onToolChange(type)}
          className={cn(
            'h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer',
            tool === type && 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/60 hover:from-purple-500 hover:to-pink-500'
          )}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}

      <Separator className="my-1 bg-white/10 w-8" />

      <Button variant="ghost" size="icon" title="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} className="h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" title="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo} className="h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30">
        <Redo2 className="h-4 w-4" />
      </Button>

      <Separator className="my-1 bg-white/10 w-8" />

      <Button
        variant="ghost"
        size="icon"
        title={`Symmetry: ${symmetry === 'none' ? 'off' : symmetry} (click to cycle)`}
        onClick={() => onSymmetryChange(SYMMETRY_CYCLE[(SYMMETRY_CYCLE.indexOf(symmetry) + 1) % SYMMETRY_CYCLE.length])}
        className={cn(
          'h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10',
          symmetry !== 'none' && 'bg-pink-500/20 text-pink-300 border border-pink-500/40 hover:bg-pink-500/30'
        )}
      >
        <FlipHorizontal2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" title="Adjustments (Brightness/Contrast, Hue/Saturation)" onClick={onOpenAdjustments} className="h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>

      <Separator className="my-1 bg-white/10 w-8" />

      <Button variant="ghost" size="icon" title="Export PNG" onClick={onExport} className="h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10">
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" title="Save Project (.json)" onClick={onSaveProject} className="h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10">
        <Save className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" title="Open Project" onClick={() => fileInputRef.current?.click()} className="h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10">
        <FolderOpen className="h-4 w-4" />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onLoadProject(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

const SIZE_TOOLS: ToolType[] = ['brush', 'eraser', 'smudge', 'cloneStamp', 'line', 'rectangle', 'ellipse'];
const OPACITY_TOOLS: ToolType[] = ['brush', 'eraser', 'smudge', 'cloneStamp', 'line', 'rectangle', 'ellipse', 'gradient'];
const HARDNESS_TOOLS: ToolType[] = ['brush', 'line', 'rectangle', 'ellipse'];
const COLOR_TOOLS: ToolType[] = ['brush', 'line', 'rectangle', 'ellipse', 'gradient', 'text'];

export function BrushSettingsPanel({ brush, onBrushChange, tool }: { brush: BrushSettings; onBrushChange: (b: BrushSettings) => void; tool: ToolType }) {
  const showSize = SIZE_TOOLS.includes(tool);
  const showOpacity = OPACITY_TOOLS.includes(tool);
  const showHardness = HARDNESS_TOOLS.includes(tool);
  const showColor = COLOR_TOOLS.includes(tool);
  const showPressureControls = tool === 'brush' || tool === 'eraser';

  return (
    <div className="flex items-center gap-5 px-4 h-12 bg-[#13111c]/90 border-b border-purple-500/20 backdrop-blur-xl text-xs text-zinc-300 overflow-x-auto shadow-md">
      {tool === 'brush' && (
        <div className="shrink-0 w-40">
          <Select
            value=""
            onValueChange={(id) => {
              const preset = BRUSH_PRESETS.find((p) => p.id === id);
              if (preset) onBrushChange({ ...brush, ...preset.settings, textureId: undefined });
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
              <SelectValue placeholder="Brush Preset" />
            </SelectTrigger>
            <SelectContent>
              {BRUSH_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showSize && (
        <div className="flex items-center gap-2 w-40 shrink-0">
          <span className="w-14 text-zinc-500">Size</span>
          <Slider
            value={[brush.size]}
            onValueChange={([v]) => onBrushChange({ ...brush, size: v })}
            min={1}
            max={200}
            step={1}
          />
          <span className="w-8 text-right font-mono">{brush.size}</span>
        </div>
      )}

      {showOpacity && (
        <div className="flex items-center gap-2 w-40 shrink-0">
          <span className="w-14 text-zinc-500">Opacity</span>
          <Slider
            value={[Math.round(brush.opacity * 100)]}
            onValueChange={([v]) => onBrushChange({ ...brush, opacity: v / 100 })}
            min={1}
            max={100}
            step={1}
          />
          <span className="w-8 text-right font-mono">{Math.round(brush.opacity * 100)}</span>
        </div>
      )}

      {showHardness && (
        <div className="flex items-center gap-2 w-40 shrink-0">
          <span className="w-14 text-zinc-500">Hardness</span>
          <Slider
            value={[Math.round(brush.hardness * 100)]}
            onValueChange={([v]) => onBrushChange({ ...brush, hardness: v / 100 })}
            min={0}
            max={100}
            step={1}
          />
          <span className="w-8 text-right font-mono">{Math.round(brush.hardness * 100)}</span>
        </div>
      )}

      {showPressureControls && (
        <>
          <Separator orientation="vertical" className="h-6 bg-white/10 shrink-0" />

          <div className="flex items-center gap-1.5 shrink-0" title="Tablet/pen pressure affects...">
            <Gauge className="h-3.5 w-3.5 text-zinc-500" />
            <button
              onClick={() => onBrushChange({ ...brush, pressureSize: !brush.pressureSize })}
              className={cn(
                'px-2 h-7 rounded-md border text-[11px] font-medium transition-colors',
                brush.pressureSize ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              )}
              title="Pressure affects brush size"
            >
              Size
            </button>
            <button
              onClick={() => onBrushChange({ ...brush, pressureOpacity: !brush.pressureOpacity })}
              className={cn(
                'px-2 h-7 rounded-md border text-[11px] font-medium transition-colors',
                brush.pressureOpacity ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              )}
              title="Pressure affects brush opacity"
            >
              Opacity
            </button>
          </div>

          <div className="flex items-center gap-2 w-36 shrink-0" title="How much input jitter is smoothed out">
            <Waves className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <Slider
              value={[Math.round(brush.smoothing * 100)]}
              onValueChange={([v]) => onBrushChange({ ...brush, smoothing: v / 100 })}
              min={0}
              max={90}
              step={1}
            />
            <span className="w-7 text-right font-mono">{Math.round(brush.smoothing * 100)}</span>
          </div>
        </>
      )}

      {showColor && (
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span className="text-zinc-500">Color</span>
          <input
            type="color"
            value={brush.color}
            onChange={(e) => onBrushChange({ ...brush, color: e.target.value })}
            className="h-8 w-8 rounded-md border border-white/10 bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={brush.color}
            onChange={(e) => onBrushChange({ ...brush, color: e.target.value })}
            className="h-8 w-20 rounded-md bg-white/5 border border-white/10 px-2 font-mono text-white"
          />
        </div>
      )}
    </div>
  );
}
