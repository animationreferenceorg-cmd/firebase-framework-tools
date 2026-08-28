'use client';

import React, { useState } from 'react';
import type { Layer, BlendMode } from '@/lib/paint/types';
import { BLEND_MODES } from '@/lib/paint/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Copy, Lock, Unlock, SquareDashedBottom } from 'lucide-react';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onBlendModeChange: (id: string, mode: BlendMode) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onToggleAlphaLock: (id: string) => void;
  onAddMask: (id: string) => void;
  onDeleteMask: (id: string) => void;
  onToggleMaskEnabled: (id: string) => void;
  maskTargetLayerId: string | null;
  onSelectMaskTarget: (id: string | null) => void;
}

export function LayersPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onToggleVisibility,
  onRenameLayer,
  onOpacityChange,
  onBlendModeChange,
  onReorder,
  onToggleAlphaLock,
  onAddMask,
  onDeleteMask,
  onToggleMaskEnabled,
  maskTargetLayerId,
  onSelectMaskTarget,
}: LayersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const displayOrder = [...layers].reverse();

  return (
    <div 
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute top-16 right-6 z-40 w-80 bg-[#161620]/90 backdrop-blur-3xl border border-white/10 rounded-3xl p-5 shadow-[0_30px_90px_rgba(0,0,0,0.9)] select-none flex flex-col max-h-[calc(100vh-140px)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 touch-none"
    >
      
      {/* Procreate Studio Style Header */}
      <div className="flex items-center justify-between pb-4 mb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black text-white tracking-wide">Layers</h3>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
            {layers.length}
          </span>
        </div>
        <button
          onClick={onAddLayer}
          className="h-8 px-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          title="Add Layer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Layer</span>
        </button>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none">
        {displayOrder.map((layer) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={cn(
                'p-3 rounded-2xl border transition-all cursor-pointer space-y-2.5',
                isActive
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-700 border-purple-400 text-white shadow-xl shadow-purple-900/40'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-zinc-300'
              )}
            >
              <div className="flex items-center gap-2.5">
                {/* Visibility Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-white/80 hover:text-white' : 'text-zinc-400 hover:text-white'
                  )}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 opacity-40" />}
                </button>

                {/* Layer Canvas Thumbnail Preview */}
                <div className="h-10 w-10 rounded-xl border border-white/20 bg-[conic-gradient(#3a3a3a_0deg_90deg,#2a2a2a_90deg_180deg,#3a3a3a_180deg_270deg,#2a2a2a_270deg_360deg)] bg-[length:8px_8px] shrink-0 overflow-hidden shadow-inner">
                  <LayerThumb canvas={layer.canvas} />
                </div>

                {/* Optional Mask Thumbnail */}
                {layer.mask && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectLayer(layer.id); onSelectMaskTarget(maskTargetLayerId === layer.id ? null : layer.id); }}
                    className={cn(
                      'h-10 w-10 rounded-xl border shrink-0 overflow-hidden transition-all',
                      maskTargetLayerId === layer.id ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-white/20',
                      layer.maskEnabled === false && 'opacity-40'
                    )}
                    title={maskTargetLayerId === layer.id ? 'Editing mask' : 'Edit mask'}
                  >
                    <LayerThumb canvas={layer.mask} grayscale />
                  </button>
                )}

                {/* Layer Name / Editable Input */}
                {editingId === layer.id ? (
                  <input
                    autoFocus
                    defaultValue={layer.name}
                    onBlur={(e) => { onRenameLayer(layer.id, e.target.value || layer.name); setEditingId(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 bg-black/40 border border-white/20 rounded-xl px-2 py-1 text-xs text-white outline-none font-bold"
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingId(layer.id); }}
                    className={cn(
                      'flex-1 min-w-0 truncate text-xs font-bold',
                      isActive ? 'text-white' : 'text-zinc-200'
                    )}
                    title="Double-click to rename"
                  >
                    {layer.name}
                  </span>
                )}

                {/* Layer Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onReorder(layer.id, 'up'); }}
                    className={cn(
                      'h-6 w-6 rounded-lg flex items-center justify-center transition-colors',
                      isActive ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    )}
                    title="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onReorder(layer.id, 'down'); }}
                    className={cn(
                      'h-6 w-6 rounded-lg flex items-center justify-center transition-colors',
                      isActive ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    )}
                    title="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicateLayer(layer.id); }}
                    className={cn(
                      'h-6 w-6 rounded-lg flex items-center justify-center transition-colors',
                      isActive ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    )}
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                    disabled={layers.length <= 1}
                    className={cn(
                      'h-6 w-6 rounded-lg flex items-center justify-center transition-colors disabled:opacity-20',
                      isActive ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-zinc-400 hover:text-red-400 hover:bg-white/10'
                    )}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Active Layer Controls (Blend mode & Opacity Slider) */}
              {isActive && (
                <div className="space-y-2 pt-1 border-t border-white/20">
                  <div className="flex items-center gap-2">
                    <Select value={layer.blendMode} onValueChange={(v) => onBlendModeChange(layer.id, v as BlendMode)}>
                      <SelectTrigger className="h-7 text-[11px] font-bold bg-black/30 border-white/20 text-white w-28 rounded-xl" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BLEND_MODES.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs font-medium">{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Slider
                      value={[Math.round(layer.opacity * 100)]}
                      onValueChange={([v]) => onOpacityChange(layer.id, v / 100)}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="w-8 text-right text-[11px] font-mono font-bold text-white">{Math.round(layer.opacity * 100)}%</span>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleAlphaLock(layer.id); }}
                      className={cn(
                        'flex items-center gap-1 px-2.5 h-6 rounded-xl text-[10px] font-bold transition-all cursor-pointer',
                        layer.alphaLocked ? 'bg-white text-purple-900 shadow-md font-extrabold' : 'bg-black/30 text-white/80 hover:text-white border border-white/20'
                      )}
                      title="Alpha Lock"
                    >
                      {layer.alphaLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      Alpha Lock
                    </button>

                    {layer.mask ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleMaskEnabled(layer.id); }}
                          className="px-2.5 h-6 rounded-xl bg-black/30 text-white/80 hover:text-white border border-white/20 text-[10px] font-bold"
                        >
                          {layer.maskEnabled === false ? 'Mask Off' : 'Mask On'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteMask(layer.id); }}
                          className="px-2.5 h-6 rounded-xl bg-black/30 text-red-200 hover:text-red-100 border border-white/20 text-[10px] font-bold"
                        >
                          Delete Mask
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddMask(layer.id); }}
                        className="flex items-center gap-1 px-2.5 h-6 rounded-xl bg-black/30 text-white/80 hover:text-white border border-white/20 text-[10px] font-bold"
                      >
                        <SquareDashedBottom className="h-3 w-3" />
                        Add Mask
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

function LayerThumb({ canvas, grayscale }: { canvas: HTMLCanvasElement; grayscale?: boolean }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const thumb = ref.current;
    if (!thumb) return;
    const ctx = thumb.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, thumb.width, thumb.height);
    if (grayscale) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, thumb.width, thumb.height);
    }
    ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  });
  return <canvas ref={ref} width={36} height={36} className="w-full h-full object-cover" />;
}
