'use client';

import React from 'react';
import Link from 'next/link';
import {
  Paintbrush,
  Layers as LayersIcon,
  Film,
  ArrowLeft,
  FilePlus,
  Download,
  Send,
  SkipBack,
  SkipForward,
  MonitorPlay,
  Radio,
  Clapperboard,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolType, BrushSettings } from '@/lib/paint/types';

export type PaintWorkspaceMode = 'drawing' | 'storyboard' | 'animation' | 'breakdown';

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
  onOpenProjectFile?: (file: File) => void;
  onOpenExport?: () => void;
  onPublishToPortfolio?: () => void;
  isViewportStreaming?: boolean;
  onToggleViewportStream?: () => void;
  workspaceMode?: PaintWorkspaceMode;
  onSelectWorkspaceMode?: (mode: PaintWorkspaceMode) => void;
  onPrevBoard?: () => void;
  onNextBoard?: () => void;
  currentBoardLabel?: string;
}

const WORKSPACES: {
  id: PaintWorkspaceMode;
  label: string;
  icon: React.ElementType;
  activeClass: string;
  hint: string;
}[] = [
  {
    id: 'drawing',
    label: 'Drawing',
    icon: Paintbrush,
    activeClass: 'bg-violet-600 text-white shadow-md shadow-violet-600/40',
    hint: 'Clean Photoshop / Procreate illustration canvas',
  },
  {
    id: 'storyboard',
    label: 'Storyboard',
    icon: Clapperboard,
    activeClass: 'bg-amber-500 text-[#141414] shadow-md shadow-amber-500/35',
    hint: 'Toon Boom Storyboard Pro panels & script dock',
  },
  {
    id: 'animation',
    label: 'Animation',
    icon: Film,
    activeClass: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40',
    hint: '2D cel timeline with onion-skinning & key poses',
  },
  {
    id: 'breakdown',
    label: 'Breakdown',
    icon: Crosshair,
    activeClass: 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md shadow-cyan-500/35',
    hint: 'Drawover analysis, Maya/Blender live stream & arcs',
  },
];

export function ProcreateHeader({
  brush,
  onBrushChange,
  onOpenColorPicker,
  onToggleBrushStudio,
  isBrushStudioOpen,
  onToggleLayersPanel,
  isLayersPanelOpen,
  onToggleTimeline,
  isTimelineOpen,
  onNewProject,
  onOpenExport,
  onPublishToPortfolio,
  isViewportStreaming = false,
  onToggleViewportStream,
  workspaceMode = 'drawing',
  onSelectWorkspaceMode,
  onPrevBoard,
  onNextBoard,
  currentBoardLabel = 'Panel 1 / 1',
}: ProcreateHeaderProps) {
  return (
    <div
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="h-14 flex items-center justify-between gap-2 px-3 sm:px-5 bg-[#100e1a]/95 backdrop-blur-3xl border-b border-white/10 shrink-0 z-40 select-none shadow-2xl"
    >
      {/* ──────────────── LEFT: BACK + 4-WORKSPACE SWITCHER + NEW ──────────────── */}
      <div className="flex items-center gap-2 min-w-0">
        <Link href="/home">
          <button
            className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
            title="Back to AnimationReference.org"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </Link>

        {/* Clean 4-Tab Workspace Switcher */}
        {onSelectWorkspaceMode && (
          <div
            role="tablist"
            aria-label="Paint Studio Workspaces"
            className="flex items-center gap-0.5 rounded-2xl border border-white/10 bg-black/45 p-1"
          >
            {WORKSPACES.map((ws) => {
              const Icon = ws.icon;
              const isActive = workspaceMode === ws.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  title={ws.hint}
                  onClick={() => onSelectWorkspaceMode(ws.id)}
                  className={cn(
                    'h-7 px-2.5 sm:px-3 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap',
                    isActive ? ws.activeClass : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden md:inline">{ws.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={onNewProject}
          className="h-9 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
          title="New Canvas / Project"
        >
          <FilePlus className="h-3.5 w-3.5 text-violet-300" />
          <span className="hidden xl:inline">New</span>
        </button>

        {/* Storyboard Prev/Next Quick Controls (only shown in Storyboard workspace) */}
        {workspaceMode === 'storyboard' && (
          <div className="hidden xl:flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 text-xs text-zinc-300 font-bold">
            <button
              onClick={onPrevBoard}
              className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Previous Panel"
            >
              <SkipBack className="h-3.5 w-3.5 text-amber-300" />
            </button>
            <span className="text-[10px] font-mono text-amber-200 px-1.5 font-black">{currentBoardLabel}</span>
            <button
              onClick={onNextBoard}
              className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Next Panel"
            >
              <SkipForward className="h-3.5 w-3.5 text-amber-300" />
            </button>
          </div>
        )}
      </div>

      {/* ──────────────── CENTER: BRUSHES + COMPACT SIZE & OPACITY ──────────────── */}
      <div className="hidden lg:flex items-center gap-2 bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded-2xl">
        <button
          onClick={onToggleBrushStudio}
          className={cn(
            'h-7 px-3 rounded-xl transition-all cursor-pointer text-xs font-extrabold flex items-center gap-1.5',
            isBrushStudioOpen
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow'
              : 'bg-white/10 hover:bg-white/15 text-zinc-100'
          )}
          title="Open Vector, Photoshop & Procreate Brush Library"
        >
          <Paintbrush className="h-3.5 w-3.5" />
          <span>Brushes</span>
        </button>

        <div className="w-px h-4 bg-white/10" />

        <div className="flex items-center gap-1 text-[11px] font-mono">
          <button
            onClick={() => onBrushChange({ ...brush, size: Math.max(1, brush.size - 2) })}
            className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
            title="Decrease Size"
          >
            -
          </button>
          <span className="font-bold text-violet-300 min-w-[34px] text-center">{brush.size}px</span>
          <button
            onClick={() => onBrushChange({ ...brush, size: Math.min(200, brush.size + 2) })}
            className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
            title="Increase Size"
          >
            +
          </button>
        </div>

        <div className="w-px h-4 bg-white/10" />

        <div className="flex items-center gap-1 text-[11px] font-mono">
          <button
            onClick={() => onBrushChange({ ...brush, opacity: Math.max(0.05, Math.round((brush.opacity - 0.05) * 100) / 100) })}
            className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
            title="Decrease Opacity"
          >
            -
          </button>
          <span className="font-bold text-white min-w-[34px] text-center">{Math.round(brush.opacity * 100)}%</span>
          <button
            onClick={() => onBrushChange({ ...brush, opacity: Math.min(1, Math.round((brush.opacity + 0.05) * 100) / 100) })}
            className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
            title="Increase Opacity"
          >
            +
          </button>
        </div>
      </div>

      {/* ──────────────── RIGHT: STREAM 3D + PANELS + EXPORT/PUBLISH + COLOR ──────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {onToggleViewportStream && (
          <button
            onClick={onToggleViewportStream}
            className={cn(
              'h-9 px-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border',
              isViewportStreaming
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60 shadow-lg shadow-emerald-600/25'
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 border-cyan-400/35'
            )}
            title="Stream your live Maya or Blender 3D viewport underneath this canvas"
          >
            {isViewportStreaming ? (
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <MonitorPlay className="h-3.5 w-3.5 text-cyan-300" />
            )}
            <span className="hidden xl:inline">{isViewportStreaming ? '3D Live' : 'Stream 3D'}</span>
          </button>
        )}

        <button
          onClick={onToggleTimeline}
          className={cn(
            'h-9 px-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border',
            isTimelineOpen
              ? 'bg-violet-600/80 text-white border-violet-400/60'
              : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
          )}
          title="Toggle Timeline"
        >
          <Film className="h-3.5 w-3.5" />
          <span className="hidden 2xl:inline">Timeline</span>
        </button>

        <button
          onClick={onToggleLayersPanel}
          className={cn(
            'h-9 px-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border',
            isLayersPanelOpen
              ? 'bg-violet-600/80 text-white border-violet-400/60'
              : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
          )}
          title="Toggle Layers Panel"
        >
          <LayersIcon className="h-3.5 w-3.5" />
          <span className="hidden 2xl:inline">Layers</span>
        </button>

        {onOpenExport && (
          <button
            onClick={onOpenExport}
            className="h-9 px-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-zinc-100 border border-white/15 transition-all cursor-pointer"
            title="Export Video / Spritesheet / PNG"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Export</span>
          </button>
        )}

        {onPublishToPortfolio && (
          <button
            onClick={onPublishToPortfolio}
            className="h-9 px-3 rounded-xl font-extrabold text-xs flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border border-violet-400/50 shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
            title="Publish straight to AnimationReference.org Portfolio"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Publish</span>
          </button>
        )}

        {/* Active Color Swatch */}
        <button
          type="button"
          onClick={(e) => onOpenColorPicker(e.clientX, e.clientY)}
          className="w-8 h-8 rounded-full ring-2 ring-white/90 ring-offset-2 ring-offset-[#100e1a] shadow-lg cursor-pointer transition-transform hover:scale-110 ml-1 shrink-0"
          style={{ backgroundColor: brush.color }}
          title="Pick Brush Color"
          aria-label="Pick brush color"
        />
      </div>
    </div>
  );
}
