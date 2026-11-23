'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Waypoints,
  Droplet,
  Triangle,
  Sun,
  Flame,
  Video,
  ArrowLeftRight,
  Scan,
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
  /** Opens the color picker anchored at the click position. */
  onOpenColorPicker?: (clientX: number, clientY: number) => void;
  onStartTransform?: () => void;
  isTransforming?: boolean;
  showCameraOverlay?: boolean;
  onToggleCameraOverlay?: () => void;
}

interface SubToolItem {
  type: ToolType | 'transform';
  icon: React.ElementType;
  label: string;
  shortcut?: string;
}

interface ToolGroupSlot {
  id: string;
  defaultTool: ToolType;
  items: SubToolItem[];
}

const TOOL_GROUPS: ToolGroupSlot[] = [
  {
    id: 'move',
    defaultTool: 'move',
    items: [
      { type: 'move', icon: Move, label: 'Pan / Move Canvas', shortcut: 'V' },
      { type: 'transform', icon: Scan, label: 'Free Transform (Move / Scale / Rotate)', shortcut: 'Alt+T' },
    ],
  },
  {
    id: 'select',
    defaultTool: 'lasso',
    items: [
      { type: 'lasso', icon: Lasso, label: 'Freehand Lasso', shortcut: 'L' },
      { type: 'select', icon: MousePointer2, label: 'Rectangle Marquee', shortcut: 'M' },
      { type: 'polyLasso', icon: Waypoints, label: 'Polygonal Lasso', shortcut: 'Shift+L' },
      { type: 'magicWand', icon: Wand2, label: 'Magic Wand', shortcut: 'W' },
    ],
  },
  {
    id: 'brush',
    defaultTool: 'brush',
    items: [{ type: 'brush', icon: Paintbrush, label: 'Brush', shortcut: 'B' }],
  },
  {
    id: 'eraser',
    defaultTool: 'eraser',
    items: [{ type: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' }],
  },
  {
    id: 'fill',
    defaultTool: 'fill',
    items: [
      { type: 'fill', icon: PaintBucket, label: 'Paint Bucket Fill (Honors Ref Layer)', shortcut: 'G' },
      { type: 'gradient', icon: Blend, label: 'Gradient Fill', shortcut: 'Shift+G' },
    ],
  },
  {
    id: 'retouch',
    defaultTool: 'smudge',
    items: [
      { type: 'smudge', icon: Fingerprint, label: 'Smudge / Blend', shortcut: 'R' },
      { type: 'blur', icon: Droplet, label: 'Soften / Blur', shortcut: 'Shift+R' },
      { type: 'sharpen', icon: Triangle, label: 'Sharpen' },
      { type: 'dodge', icon: Sun, label: 'Dodge (Lighten)', shortcut: 'O' },
      { type: 'burn', icon: Flame, label: 'Burn (Darken)', shortcut: 'Shift+O' },
      { type: 'cloneStamp', icon: Stamp, label: 'Clone Stamp', shortcut: 'S' },
    ],
  },
  {
    id: 'shapes',
    defaultTool: 'line',
    items: [
      { type: 'line', icon: Minus, label: 'Straight Line', shortcut: 'U' },
      { type: 'rectangle', icon: Square, label: 'Rectangle Shape', shortcut: 'U' },
      { type: 'ellipse', icon: Circle, label: 'Ellipse Shape', shortcut: 'Shift+U' },
      { type: 'text', icon: Type, label: 'Text Tool', shortcut: 'T' },
    ],
  },
  {
    id: 'eyedropper',
    defaultTool: 'eyedropper',
    items: [{ type: 'eyedropper', icon: Pipette, label: 'Eyedropper', shortcut: 'I' }],
  },
];

export function ProcreateSliderDock({
  tool,
  onToolChange,
  brush,
  onBrushChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenColorPicker,
  onStartTransform,
  isTransforming = false,
  showCameraOverlay = false,
  onToggleCameraOverlay,
}: ProcreateSliderDockProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [lastUsedByGroup, setLastUsedByGroup] = useState<Record<string, ToolType>>({});
  const dockRef = useRef<HTMLDivElement>(null);

  // Close flyout on outside pointer down
  useEffect(() => {
    if (!openGroupId) return;
    const onDown = (e: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setOpenGroupId(null);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [openGroupId]);

  const handleSelectItem = (groupId: string, item: SubToolItem) => {
    setOpenGroupId(null);
    if (item.type === 'transform') {
      onStartTransform?.();
      return;
    }
    setLastUsedByGroup((prev) => ({ ...prev, [groupId]: item.type as ToolType }));
    onToolChange(item.type as ToolType);
  };

  const handleSwapColors = () => {
    onBrushChange({
      ...brush,
      color: brush.secondaryColor,
      secondaryColor: brush.color,
    });
  };

  return (
    <div
      ref={dockRef}
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute left-3.5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 select-none"
    >
      {/* ──────────────── PHOTOSHOP / TOON BOOM 9-SLOT PRIMARY TOOL RAIL (ZERO SCROLLING) ──────────────── */}
      <div className="flex flex-col items-center w-14 py-2.5 px-1.5 bg-[#12111c]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] gap-1">
        {TOOL_GROUPS.map((group) => {
          const hasFlyout = group.items.length > 1;
          const activeInGroup =
            (group.id === 'move' && isTransforming) ||
            group.items.some((it) => it.type === tool);

          // Show active tool icon if active in this group, otherwise last used or default
          const displayToolType =
            group.id === 'move' && isTransforming
              ? 'transform'
              : group.items.find((it) => it.type === tool)?.type ??
                lastUsedByGroup[group.id] ??
                group.defaultTool;
          const displayItem = group.items.find((it) => it.type === displayToolType) || group.items[0];
          const DisplayIcon = displayItem.icon;
          const isFlyoutOpen = openGroupId === group.id;

          return (
            <div key={group.id} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (hasFlyout && activeInGroup) {
                    setOpenGroupId(isFlyoutOpen ? null : group.id);
                  } else if (displayItem.type === 'transform') {
                    onStartTransform?.();
                  } else {
                    setOpenGroupId(null);
                    onToolChange(displayItem.type as ToolType);
                  }
                }}
                onContextMenu={(e) => {
                  if (!hasFlyout) return;
                  e.preventDefault();
                  setOpenGroupId(isFlyoutOpen ? null : group.id);
                }}
                title={`${displayItem.label}${displayItem.shortcut ? ` (${displayItem.shortcut})` : ''}${hasFlyout ? ' · Click again or right-click for more tools' : ''}`}
                className={cn(
                  'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer',
                  activeInGroup
                    ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/40 border border-violet-400/50'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                )}
              >
                <DisplayIcon className="h-[18px] w-[18px]" />
                {/* Photoshop-style corner flyout triangle */}
                {hasFlyout && (
                  <span
                    className={cn(
                      'absolute bottom-1 right-1 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px]',
                      activeInGroup ? 'border-b-white/90' : 'border-b-zinc-500'
                    )}
                  />
                )}
              </button>

              {/* Flyout Sub-Tools Popover */}
              {hasFlyout && isFlyoutOpen && (
                <div className="absolute left-full top-0 ml-2.5 z-50 min-w-[200px] p-1.5 rounded-2xl bg-[#161524]/98 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col gap-0.5 animate-in fade-in slide-in-from-left-1 duration-100">
                  {group.items.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive =
                      (sub.type === 'transform' && isTransforming) || sub.type === tool;
                    return (
                      <button
                        key={sub.type}
                        type="button"
                        onClick={() => handleSelectItem(group.id, sub)}
                        className={cn(
                          'flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left',
                          isSubActive
                            ? 'bg-violet-600/35 text-white border border-violet-400/40'
                            : 'text-zinc-300 hover:text-white hover:bg-white/10'
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <SubIcon className="h-4 w-4 text-violet-300 shrink-0" />
                          <span>{sub.label}</span>
                        </span>
                        {sub.shortcut && (
                          <kbd className="text-[10px] font-mono text-zinc-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                            {sub.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Slot 9: Storyboard Pro 2D Camera Tool */}
        {onToggleCameraOverlay && (
          <button
            type="button"
            onClick={() => {
              setOpenGroupId(null);
              onToggleCameraOverlay();
            }}
            title="2D Storyboard Camera (Pan / Truck / Zoom Keyframes)"
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer',
              showCameraOverlay
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 border border-emerald-400/50'
                : 'text-zinc-400 hover:text-emerald-300 hover:bg-white/10'
            )}
          >
            <Video className="h-[18px] w-[18px]" />
          </button>
        )}

        <div className="w-8 h-px bg-white/10 my-1" />

        {/* Photoshop-Style Overlapping Foreground / Background Color Swatches + Swap (X) */}
        <div className="relative w-10 h-10 my-0.5">
          {/* Secondary / Background Swatch */}
          <button
            type="button"
            onClick={handleSwapColors}
            title="Background Color — Click to Swap (X)"
            className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-lg border-2 border-zinc-400/80 shadow cursor-pointer transition-transform hover:scale-105"
            style={{ backgroundColor: brush.secondaryColor }}
          />
          {/* Primary / Foreground Swatch */}
          <button
            type="button"
            onClick={(e) => onOpenColorPicker?.(e.clientX, e.clientY)}
            title={`Foreground Color (${brush.color}) — Click for Color Wheel`}
            aria-label={`Brush color ${brush.color}. Click to change.`}
            className="absolute top-0.5 left-0.5 w-7 h-7 rounded-lg border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-105 z-10"
            style={{ backgroundColor: brush.color }}
          />
          {/* Tiny Swap Arrows */}
          <button
            type="button"
            onClick={handleSwapColors}
            title="Swap Foreground / Background Color (X)"
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#1e1d2b] border border-white/20 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer z-20"
          >
            <ArrowLeftRight className="h-2.5 w-2.5" />
          </button>
        </div>

        <div className="w-8 h-px bg-white/10 my-0.5" />

        {/* Compact Undo / Redo Pair */}
        <div className="flex items-center gap-1 w-full justify-center">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="w-5 h-7 rounded-lg hover:bg-white/10 disabled:opacity-20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="w-5 h-7 rounded-lg hover:bg-white/10 disabled:opacity-20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
