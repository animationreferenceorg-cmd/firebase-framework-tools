'use client';

import * as React from 'react';
import { Download, Loader2, Repeat, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ONION_FUTURE_COLOR, ONION_PAST_COLOR, type OnionSettings, type OnionStatus } from './OnionSkinOverlay';

export type ViewMode = 'normal' | 'contrast' | 'silhouette' | 'inverted';

export const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'contrast', label: 'Contrast' },
  { id: 'silhouette', label: 'Silhouette' },
  { id: 'inverted', label: 'Inverted' },
];

/** CSS filters for each view mode. Silhouette pushes contrast until the image is near black/white. */
export const VIEW_MODE_FILTER: Record<ViewMode, string | undefined> = {
  normal: undefined,
  contrast: 'grayscale(1) contrast(1.75)',
  silhouette: 'grayscale(1) brightness(1.15) contrast(14)',
  inverted: 'grayscale(1) brightness(1.15) contrast(14) invert(1)',
};

export function nextViewMode(mode: ViewMode): ViewMode {
  const index = VIEW_MODES.findIndex((m) => m.id === mode);
  return VIEW_MODES[(index + 1) % VIEW_MODES.length].id;
}

interface StudyToolsPanelProps {
  fps: number;
  loopIn: number | null;
  loopOut: number | null;
  loopActive: boolean;
  onSetIn: () => void;
  onSetOut: () => void;
  onClearLoop: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onionEnabled: boolean;
  onionSupported: boolean;
  onionStatus: OnionStatus;
  onionExportable: boolean;
  onionSettings: OnionSettings;
  onOnionToggle: () => void;
  onOnionSettingsChange: (settings: OnionSettings) => void;
  onExportOnion: () => void;
  exporting: boolean;
  isPro: boolean;
  /** Max panel height in px so it never overflows a small player. */
  maxHeight: number;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="ml-1 rounded border border-white/15 bg-white/5 px-1 font-mono text-[9px] text-zinc-400">{children}</kbd>;
}

function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg border border-white/10 bg-black/40 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
            value === o.id ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StudyToolsPanel(props: StudyToolsPanelProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const { fps, loopIn, loopOut, loopActive, viewMode, onionEnabled, onionSettings } = props;

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    // Window capture runs before Radix's document-level Escape handler, so closing
    // this panel doesn't also close the dialog (e.g. the fullscreen viewer) around it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const frameOf = (t: number | null) => (t === null ? null : Math.round(t * fps));
  const inFrame = frameOf(loopIn);
  const outFrame = frameOf(loopOut);
  const anyActive = loopActive || viewMode !== 'normal' || onionEnabled;

  let onionNote = 'Shows while paused. Step with , and . to read spacing.';
  if (!props.onionSupported) onionNote = 'Available for uploaded video files, not embeds.';
  else if (onionEnabled && props.onionStatus === 'loading') onionNote = 'Loading frames…';
  else if (onionEnabled && props.onionStatus === 'unavailable') onionNote = 'This video’s host doesn’t allow frame access.';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Study tools"
        title="Study tools: loop, silhouette, onion skin"
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20',
          open || anyActive ? 'border border-purple-400/50 bg-purple-500/30 text-purple-200' : 'bg-white/10 sm:bg-transparent'
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 z-[200] mb-2 w-[min(290px,calc(100vw-2rem))] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0a18]/95 p-4 text-white shadow-2xl backdrop-blur-xl"
          style={{ maxHeight: props.maxHeight }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-purple-300">Study tools</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded p-0.5 text-zinc-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <section className="space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-300"><Repeat className="h-3.5 w-3.5" /> A–B loop</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button type="button" onClick={props.onSetIn} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold hover:bg-white/10">
                Set in<Kbd>I</Kbd>
              </button>
              <button type="button" onClick={props.onSetOut} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold hover:bg-white/10">
                Set out<Kbd>O</Kbd>
              </button>
              <button
                type="button"
                onClick={props.onClearLoop}
                disabled={loopIn === null && loopOut === null}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold hover:bg-white/10 disabled:opacity-40"
              >
                Clear<Kbd>L</Kbd>
              </button>
            </div>
            <p className="font-mono text-[11px] text-zinc-400">
              {loopActive
                ? `Looping f${inFrame ?? 0} → f${outFrame ?? 'end'}`
                : 'Mark in and out points to loop a few frames.'}
            </p>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] font-bold text-zinc-300">View<Kbd>C</Kbd></p>
            <Segmented value={viewMode} options={VIEW_MODES} onChange={props.onViewModeChange} />
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-zinc-300">Onion skin<Kbd>G</Kbd></p>
              <button
                type="button"
                role="switch"
                aria-checked={onionEnabled}
                disabled={!props.onionSupported}
                onClick={props.onOnionToggle}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors disabled:opacity-40',
                  onionEnabled ? 'bg-purple-600' : 'bg-white/15'
                )}
              >
                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', onionEnabled ? 'left-[18px]' : 'left-0.5')} />
              </button>
            </div>
            {onionEnabled && (
              <div className="space-y-2">
                <Segmented
                  value={onionSettings.frames}
                  options={[1, 2, 3].map((n) => ({ id: n, label: `±${n}` }))}
                  onChange={(frames) => props.onOnionSettingsChange({ ...onionSettings, frames })}
                />
                <Segmented
                  value={onionSettings.step}
                  options={[{ id: 1, label: 'On ones' }, { id: 2, label: 'On twos' }]}
                  onChange={(step) => props.onOnionSettingsChange({ ...onionSettings, step })}
                />
                <p className="flex items-center gap-3 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: ONION_PAST_COLOR }} />Previous</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: ONION_FUTURE_COLOR }} />Next</span>
                </p>
              </div>
            )}
            <p className="text-[11px] leading-snug text-zinc-500">{onionNote}</p>
            {onionEnabled && props.onionStatus === 'ready' && (
              <button
                type="button"
                onClick={props.onExportOnion}
                disabled={props.exporting || (props.isPro && !props.onionExportable)}
                title={props.isPro && !props.onionExportable ? 'This video’s host does not allow frame export.' : undefined}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2 py-1.5 text-[11px] font-bold text-purple-100 hover:bg-purple-500/25 disabled:opacity-40"
              >
                {props.exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export spacing sheet (PNG)
                {!props.isPro && <span className="rounded bg-purple-600 px-1 text-[9px] font-black">PRO</span>}
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
