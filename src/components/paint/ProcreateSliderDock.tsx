'use client';

import React from 'react';
import type { ToolType, BrushSettings } from '@/lib/paint/types';
import { cn } from '@/lib/utils';
import {
  Paintbrush,
  Eraser,
  Fingerprint,
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
  Lasso,
  Wand2,
  Blend,
  Stamp,
  Film,
} from 'lucide-react';

interface ProcreateSliderDockProps {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
  brush: BrushSettings;
  onBrushChange: (brush: BrushSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenReferenceModal?: () => void;
}

const DOCK_TOOLS: { type: ToolType; icon: React.ElementType; label: string }[] = [
  { type: 'brush', icon: Paintbrush, label: 'Paintbrush (B)' },
  { type: 'eraser', icon: Eraser, label: 'Eraser (E)' },
  { type: 'smudge', icon: Fingerprint, label: 'Smudge (S)' },
  { type: 'fill', icon: PaintBucket, label: 'Color Fill (G)' },
  { type: 'eyedropper', icon: Pipette, label: 'Eyedropper (I)' },
  { type: 'select', icon: MousePointer2, label: 'Rectangle Select (M)' },
  { type: 'lasso', icon: Lasso, label: 'Lasso Select (L)' },
  { type: 'magicWand', icon: Wand2, label: 'Magic Wand (W)' },
  { type: 'move', icon: Move, label: 'Move & Transform (V)' },
  { type: 'gradient', icon: Blend, label: 'Gradient Fill' },
  { type: 'cloneStamp', icon: Stamp, label: 'Clone Stamp (S)' },
  { type: 'line', icon: Minus, label: 'Straight Line (U)' },
  { type: 'rectangle', icon: Square, label: 'Rectangle Shape (U)' },
  { type: 'ellipse', icon: Circle, label: 'Ellipse Shape (U)' },
  { type: 'text', icon: Type, label: 'Text Tool (T)' },
];

export function ProcreateSliderDock({
  tool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenReferenceModal,
}: ProcreateSliderDockProps) {
  return (
    <div 
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute left-6 top-20 bottom-20 z-40 flex flex-col items-center gap-3 select-none"
    >
      {/* ──────────────── MAIN EXPANDED VERTICAL TOOL DOCK (MAXIMUM TOOL VISIBILITY) ──────────────── */}
      <div className="flex-1 flex flex-col justify-between items-center w-16 py-3 px-2 bg-[#161620]/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden touch-none space-y-2">
        
        {/* Scrollable Tool Palette with Larger Icons */}
        <div className="flex flex-col items-center gap-2 w-full flex-1 overflow-y-auto scrollbar-none py-1">
          {DOCK_TOOLS.map(({ type, icon: Icon, label }) => {
            const isActive = tool === type;
            return (
              <button
                key={type}
                onClick={() => onToolChange(type)}
                title={label}
                className={cn(
                  'w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm',
                  isActive
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40 scale-105 border border-purple-400/50'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>

        <div className="w-10 h-px bg-white/10 shrink-0" />

        {/* Undo / Redo Actions */}
        <div className="flex flex-col gap-1.5 w-full shrink-0">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (↶)"
            className="w-full h-9 rounded-2xl bg-white/5 hover:bg-white/15 disabled:opacity-20 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <Undo2 className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (↷)"
            className="w-full h-9 rounded-2xl bg-white/5 hover:bg-white/15 disabled:opacity-20 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <Redo2 className="h-4.5 w-4.5" />
          </button>
        </div>

      </div>

      {/* ──────────────── STANDALONE REFERENCE VIDEO ACTION BUTTON ──────────────── */}
      {onOpenReferenceModal && (
        <button
          onClick={onOpenReferenceModal}
          title="Import Animation Reference Video"
          className="w-13 h-13 p-3 rounded-2xl bg-[#161620]/90 hover:bg-purple-600/90 backdrop-blur-3xl border border-white/10 hover:border-purple-400 text-white flex items-center justify-center shadow-[0_15px_40px_rgba(0,0,0,0.8)] hover:scale-110 transition-all cursor-pointer group shrink-0"
        >
          <Film className="h-5.5 w-5.5 text-purple-400 group-hover:text-white transition-colors" />
        </button>
      )}

    </div>
  );
}
