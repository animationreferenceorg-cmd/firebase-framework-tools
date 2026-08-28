'use client';

import React from 'react';
import type { ToolType, BrushSettings, Selection } from '@/lib/paint/types';
import { FONT_FAMILIES } from '@/lib/paint/types';
import { cn } from '@/lib/utils';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Squircle, Circle, X, FlipHorizontal2 } from 'lucide-react';

interface ToolOptionsBarProps {
  tool: ToolType;
  brush: BrushSettings;
  onBrushChange: (brush: BrushSettings) => void;
  selection: Selection | null;
  onDeselect: () => void;
  onInvertSelection: () => void;
  onResetCloneSource: () => void;
}

/** Photoshop-style contextual options bar. Only renders the controls the
 * active tool actually reads, so it stays out of the way for the brush. */
export function ToolOptionsBar({
  tool,
  brush,
  onBrushChange,
  selection,
  onDeselect,
  onInvertSelection,
  onResetCloneSource,
}: ToolOptionsBarProps) {
  const set = <K extends keyof BrushSettings>(key: K, value: BrushSettings[K]) =>
    onBrushChange({ ...brush, [key]: value });

  const showsTolerance = tool === 'magicWand' || tool === 'fill';
  const showsSmudge = tool === 'smudge';
  const showsStrength = tool === 'blur' || tool === 'sharpen';
  const showsExposure = tool === 'dodge' || tool === 'burn';
  const showsGradient = tool === 'gradient';
  const showsText = tool === 'text';
  const showsClone = tool === 'cloneStamp';
  const showsSelection = !!selection;

  const hasAnything =
    showsTolerance || showsSmudge || showsStrength || showsExposure ||
    showsGradient || showsText || showsClone || showsSelection;

  if (!hasAnything) return null;

  return (
    <div
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute left-1/2 -translate-x-1/2 top-20 z-40 flex items-center gap-4 px-4 py-2 rounded-2xl bg-[#161620]/90 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] select-none max-w-[calc(100vw-14rem)] overflow-x-auto scrollbar-none"
    >
      {showsTolerance && (
        <Field label="Tolerance" value={String(brush.tolerance)}>
          <input
            type="range"
            min={0}
            max={128}
            step={1}
            value={brush.tolerance}
            onChange={(e) => set('tolerance', Number(e.target.value))}
            className="w-28 h-1 accent-purple-500 cursor-pointer"
          />
        </Field>
      )}

      {showsSmudge && (
        <Field label="Strength" value={`${Math.round(brush.smudgeStrength * 100)}%`}>
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={Math.round(brush.smudgeStrength * 100)}
            onChange={(e) => set('smudgeStrength', Number(e.target.value) / 100)}
            className="w-28 h-1 accent-purple-500 cursor-pointer"
          />
        </Field>
      )}

      {showsStrength && (
        <Field label="Strength" value={`${Math.round(brush.opacity * 100)}%`}>
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={Math.round(brush.opacity * 100)}
            onChange={(e) => set('opacity', Number(e.target.value) / 100)}
            className="w-28 h-1 accent-purple-500 cursor-pointer"
          />
        </Field>
      )}

      {showsExposure && (
        <Field label="Exposure" value={`${Math.round(brush.exposure * 100)}%`}>
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={Math.round(brush.exposure * 100)}
            onChange={(e) => set('exposure', Number(e.target.value) / 100)}
            className="w-28 h-1 accent-purple-500 cursor-pointer"
          />
        </Field>
      )}

      {showsGradient && (
        <>
          <Field label="To colour">
            <input
              type="color"
              value={brush.secondaryColor}
              onChange={(e) => set('secondaryColor', e.target.value)}
              title="Second gradient stop"
              className="h-7 w-9 rounded-md bg-transparent border border-white/20 cursor-pointer"
            />
          </Field>
          <Field label="Shape">
            <div className="flex gap-1">
              <IconToggle
                active={brush.gradientType === 'linear'}
                onClick={() => set('gradientType', 'linear')}
                title="Linear gradient"
              >
                <Squircle className="h-3.5 w-3.5" />
              </IconToggle>
              <IconToggle
                active={brush.gradientType === 'radial'}
                onClick={() => set('gradientType', 'radial')}
                title="Radial gradient"
              >
                <Circle className="h-3.5 w-3.5" />
              </IconToggle>
            </div>
          </Field>
        </>
      )}

      {showsText && (
        <>
          <Field label="Font">
            <select
              value={brush.fontFamily}
              onChange={(e) => set('fontFamily', e.target.value)}
              className="h-7 rounded-md bg-white/5 border border-white/15 text-xs text-zinc-200 px-2 cursor-pointer outline-none focus:border-purple-400"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value} className="bg-[#161620]">
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Style">
            <div className="flex gap-1">
              <IconToggle
                active={brush.fontWeight >= 700}
                onClick={() => set('fontWeight', brush.fontWeight >= 700 ? 400 : 700)}
                title="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </IconToggle>
              <IconToggle
                active={brush.fontItalic}
                onClick={() => set('fontItalic', !brush.fontItalic)}
                title="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </IconToggle>
            </div>
          </Field>
          <Field label="Align">
            <div className="flex gap-1">
              <IconToggle active={brush.textAlign === 'left'} onClick={() => set('textAlign', 'left')} title="Align left">
                <AlignLeft className="h-3.5 w-3.5" />
              </IconToggle>
              <IconToggle active={brush.textAlign === 'center'} onClick={() => set('textAlign', 'center')} title="Align centre">
                <AlignCenter className="h-3.5 w-3.5" />
              </IconToggle>
              <IconToggle active={brush.textAlign === 'right'} onClick={() => set('textAlign', 'right')} title="Align right">
                <AlignRight className="h-3.5 w-3.5" />
              </IconToggle>
            </div>
          </Field>
          <Field label="Leading" value={brush.lineHeight.toFixed(2)}>
            <input
              type="range"
              min={80}
              max={250}
              step={5}
              value={Math.round(brush.lineHeight * 100)}
              onChange={(e) => set('lineHeight', Number(e.target.value) / 100)}
              className="w-24 h-1 accent-purple-500 cursor-pointer"
            />
          </Field>
        </>
      )}

      {showsClone && (
        <span className="text-[11px] text-zinc-400 whitespace-nowrap">
          <kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-200 text-[10px]">Alt</kbd> + click to set the source point
          <button
            onClick={onResetCloneSource}
            className="ml-3 text-purple-300 hover:text-white underline underline-offset-2 cursor-pointer"
          >
            Reset source
          </button>
        </span>
      )}

      {showsSelection && (
        <div className="flex items-center gap-2 pl-1 border-l border-white/10">
          <span className="text-[11px] text-zinc-400 whitespace-nowrap">
            Selection {selection!.w}×{selection!.h}
          </span>
          <button
            onClick={onInvertSelection}
            title="Invert selection (Ctrl+Shift+I)"
            className="h-7 px-2 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] flex items-center gap-1 transition-all cursor-pointer"
          >
            <FlipHorizontal2 className="h-3 w-3" /> Invert
          </button>
          <button
            onClick={onDeselect}
            title="Deselect (Ctrl+D)"
            className="h-7 px-2 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] flex items-center gap-1 transition-all cursor-pointer"
          >
            <X className="h-3 w-3" /> Deselect
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap">{label}</span>
      {children}
      {value !== undefined && (
        <span className="text-[11px] font-mono font-bold text-purple-300 min-w-[38px] tabular-nums">{value}</span>
      )}
    </div>
  );
}

function IconToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer',
        active
          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/40'
          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/15'
      )}
    >
      {children}
    </button>
  );
}
