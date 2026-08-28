'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Paintbrush, 
  Layers as LayersIcon, 
  Film,
  ArrowLeft,
  FilePlus,
  Sliders,
  Play,
  Maximize2,
  Download,
  Send,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { ToolType, BrushSettings } from '@/lib/paint/types';

interface ProcreateHeaderProps {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
  brush: BrushSettings;
  onBrushChange: (brush: BrushSettings) => void;
  onOpenColorPicker: (clientX: number, clientY: number) => void;
  onToggleBrushStudio: () => void;
  isBrushStudioOpen: boolean;
  onToggleLayersPanel: () => void;
  isLayersPanelOpen: boolean;
  onToggleTimeline: () => void;
  isTimelineOpen: boolean;
  onOpenAdjustments: () => void;
  onNewProject: () => void;
  onOpenExport?: () => void;
  workspaceMode?: 'animation' | 'storyboard';
  onToggleWorkspaceMode?: () => void;
  onPrevBoard?: () => void;
  onNextBoard?: () => void;
  currentBoardLabel?: string;
}

export function ProcreateHeader({
  tool,
  onToolChange,
  brush,
  onBrushChange,
  onOpenColorPicker,
  onToggleBrushStudio,
  isBrushStudioOpen,
  onToggleLayersPanel,
  isLayersPanelOpen,
  onToggleTimeline,
  isTimelineOpen,
  onOpenAdjustments,
  onNewProject,
  onOpenExport,
  workspaceMode = 'animation',
  onToggleWorkspaceMode,
  onPrevBoard,
  onNextBoard,
  currentBoardLabel = 'Panel 1.1',
}: ProcreateHeaderProps) {
  const { toast } = useToast();

  const handleSubmitReview = () => {
    toast({
      title: "Asset Sent to Review",
      description: "This drawing has been submitted to the Studio Review inbox.",
    });
  };

  return (
    <div 
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="h-14 flex items-center justify-between px-6 bg-[#121218]/90 backdrop-blur-3xl border-b border-white/10 shrink-0 z-40 select-none shadow-2xl"
    >
      
      {/* ──────────────── LEFT GROUP: GALLERY & WORKSPACE MODE TOGGLE ──────────────── */}
      <div className="flex items-center gap-3">
        {/* Gallery Back Link */}
        <Link href="/home">
          <button className="h-9 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/10">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Gallery</span>
          </button>
        </Link>

        {/* WORKSPACE MODE TOGGLE: ANIMATION vs STORYBOARD PRO */}
        {onToggleWorkspaceMode && (
          <button
            onClick={onToggleWorkspaceMode}
            className={cn(
              "h-9 px-4 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg border border-white/15",
              workspaceMode === 'storyboard' 
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white ring-2 ring-orange-400/50 shadow-orange-500/30"
                : "bg-white/10 hover:bg-white/20 text-zinc-200"
            )}
          >
            <Film className="h-4 w-4" />
            <span>{workspaceMode === 'storyboard' ? '🎬 Storyboard Pro Mode' : '🎨 Animation Mode'}</span>
          </button>
        )}

        {/* New File / New Project Button */}
        <button
          onClick={onNewProject}
          className="h-9 px-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-600/30 border border-purple-400/40"
          title="Create New Animation Project (New File)"
        >
          <FilePlus className="h-4 w-4" />
          <span>New File</span>
        </button>

        {/* Action Options Pill Group */}
        <div className="flex items-center gap-1 text-xs font-semibold text-zinc-400 border-l border-white/10 pl-3">
          <button 
            onClick={onToggleBrushStudio}
            className={cn(
              "px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold text-white flex items-center gap-1.5",
              isBrushStudioOpen ? "bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-600/40" : "bg-white/10 hover:bg-white/20"
            )}
          >
            <Paintbrush className="h-3.5 w-3.5" />
            <span>Drawing</span>
          </button>

          {/* Storyboard Frame-by-Frame Stepping */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 text-xs text-zinc-300 font-bold ml-2">
            <button
              onClick={() => {
                if (onPrevBoard) onPrevBoard();
                toast({
                  title: "Previous Storyboard Panel 🎬",
                  description: "Switched to previous storyboard panel.",
                });
              }}
              className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1 cursor-pointer"
              title="Previous Storyboard Panel (Left Arrow)"
            >
              <SkipBack className="h-3.5 w-3.5 text-purple-400" />
              <span className="hidden lg:inline text-[10px]">Prev Board</span>
            </button>
            <span className="text-[10px] font-mono text-purple-300 px-1.5 border-x border-white/10 font-black">{currentBoardLabel}</span>
            <button
              onClick={() => {
                if (onNextBoard) onNextBoard();
                toast({
                  title: "Next Storyboard Panel 🎬",
                  description: "Switched to next storyboard panel.",
                });
              }}
              className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1 cursor-pointer"
              title="Next Storyboard Panel (Right Arrow)"
            >
              <span className="hidden lg:inline text-[10px]">Next Board</span>
              <SkipForward className="h-3.5 w-3.5 text-purple-400" />
            </button>
          </div>
        </div>

      </div>

      {/* ──────────────── CENTER GROUP: BRUSH SIZE & OPACITY IN HEADER ──────────────── */}
      <div className="hidden md:flex items-center gap-3 bg-white/[0.04] border border-white/10 px-3.5 py-1 rounded-2xl shadow-inner select-none">
        {/* Size Control */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-extrabold text-zinc-400 uppercase tracking-wider">Size</span>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-1.5 py-0.5">
            <button 
              onClick={() => onBrushChange({ ...brush, size: Math.max(1, brush.size - 2) })}
              className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Decrease Size (-)"
            >
              -
            </button>
            <span className="text-xs font-mono font-bold text-purple-300 min-w-[36px] text-center">{brush.size}px</span>
            <button 
              onClick={() => onBrushChange({ ...brush, size: Math.min(200, brush.size + 2) })}
              className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Increase Size (+)"
            >
              +
            </button>
          </div>
        </div>

        <div className="w-px h-4 bg-white/15" />

        {/* Opacity Control */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-extrabold text-zinc-400 uppercase tracking-wider">Opacity</span>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-1.5 py-0.5">
            <button 
              onClick={() => onBrushChange({ ...brush, opacity: Math.max(0.05, Math.round((brush.opacity - 0.05) * 100) / 100) })}
              className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Decrease Opacity (-)"
            >
              -
            </button>
            <span className="text-xs font-mono font-bold text-white min-w-[36px] text-center">{Math.round(brush.opacity * 100)}%</span>
            <button 
              onClick={() => onBrushChange({ ...brush, opacity: Math.min(1, Math.round((brush.opacity + 0.05) * 100) / 100) })}
              className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Increase Opacity (+)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────── RIGHT GROUP: STUDIO PANELS & TOOL TABS ──────────────── */}
      <div className="flex items-center gap-2">
        
        {/* Timeline Toggle Button */}
        <button
          onClick={onToggleTimeline}
          className={cn(
            "h-9 px-3.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border",
            isTimelineOpen 
              ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/40" 
              : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10"
          )}
          title="Toggle Timeline (Toon Boom / Dreams style)"
        >
          <Film className="h-4 w-4" />
          <span>Timeline</span>
        </button>

        {/* Layers Panel Toggle */}
        <button
          onClick={onToggleLayersPanel}
          className={cn(
            "h-9 px-3.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border",
            isLayersPanelOpen 
              ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/40" 
              : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10"
          )}
          title="Toggle Layers Panel"
        >
          <LayersIcon className="h-4 w-4" />
          <span>Layers</span>
        </button>

        {/* Submit to Review Trigger */}
        <button
          onClick={handleSubmitReview}
          className="h-9 px-3.5 rounded-2xl font-bold text-xs flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white border border-orange-400/50 shadow-lg shadow-orange-500/30 transition-all cursor-pointer"
          title="Submit for Daily Review in Studio"
        >
          <Send className="h-4 w-4" />
          <span>Submit to Review</span>
        </button>

        {/* Export Modal Trigger */}
        {onOpenExport && (
          <button
            onClick={onOpenExport}
            className="h-9 px-3.5 rounded-2xl font-bold text-xs flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/50 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            title="Export Spritesheet / Video / PNG"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        )}

        {/* Color Swatch / Active Color Trigger */}
        <div 
          onClick={(e) => onOpenColorPicker(e.clientX, e.clientY)}
          className="w-8 h-8 rounded-full border-2 border-white/40 shadow-lg cursor-pointer transition-transform hover:scale-110 ml-2"
          style={{ backgroundColor: brush.color }}
          title="Active Color Swatch"
        />

      </div>

    </div>
  );
}
