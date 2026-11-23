'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CameraMove, CameraKeyframe } from '@/lib/paint/types';
import { Video, Play, Pause, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DEFAULT_CAMERA_MOVE: CameraMove = {
  enabled: true,
  start: { x: 0.44, y: 0.5, zoom: 1.25 },
  end: { x: 0.58, y: 0.48, zoom: 1.55 },
  easing: 'ease-in-out',
};

export function interpolateCamera(move: CameraMove, tRaw: number): CameraKeyframe {
  const tClamped = Math.max(0, Math.min(1, tRaw));
  const t =
    move.easing === 'ease-in-out'
      ? tClamped < 0.5
        ? 2 * tClamped * tClamped
        : 1 - Math.pow(-2 * tClamped + 2, 2) / 2
      : tClamped;

  return {
    x: move.start.x + (move.end.x - move.start.x) * t,
    y: move.start.y + (move.end.y - move.start.y) * t,
    zoom: move.start.zoom + (move.end.zoom - move.start.zoom) * t,
  };
}

interface CameraOverlayProps {
  cameraMove: CameraMove;
  canvasWidth: number;
  canvasHeight: number;
  stageZoom: number;
  onChange: (next: CameraMove) => void;
  onClose: () => void;
}

type DragTarget =
  | null
  | { which: 'start' | 'end'; mode: 'move' | 'zoom'; startClientX: number; startClientY: number; orig: CameraKeyframe };

export function CameraOverlay({
  cameraMove,
  canvasWidth,
  canvasHeight,
  stageZoom,
  onChange,
  onClose,
}: CameraOverlayProps) {
  const [previewT, setPreviewT] = useState<number>(0);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const dragRef = useRef<DragTarget>(null);
  const rafRef = useRef<number | null>(null);

  // Smooth live animatic camera move preview loop
  useEffect(() => {
    if (!isPreviewing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const durationMs = 2000;
    const startTs = performance.now() - previewT * durationMs;
    const tick = (now: number) => {
      const nextT = ((now - startTs) % durationMs) / durationMs;
      setPreviewT(nextT);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPreviewing]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dxCanvas = (e.clientX - d.startClientX) / Math.max(0.05, stageZoom);
      const dyCanvas = (e.clientY - d.startClientY) / Math.max(0.05, stageZoom);

      if (d.mode === 'move') {
        const nextKf: CameraKeyframe = {
          ...d.orig,
          x: Math.max(0.05, Math.min(0.95, d.orig.x + dxCanvas / canvasWidth)),
          y: Math.max(0.05, Math.min(0.95, d.orig.y + dyCanvas / canvasHeight)),
        };
        onChange({ ...cameraMove, [d.which]: nextKf });
      } else {
        // Dragging bottom-right corner outward zooms out (smaller zoom factor), inward trucks in (larger zoom)
        const zoomDelta = -dxCanvas / (canvasWidth * 0.45);
        const nextZoom = Math.max(1.0, Math.min(4.0, Math.round((d.orig.zoom + zoomDelta) * 100) / 100));
        const nextKf: CameraKeyframe = { ...d.orig, zoom: nextZoom };
        onChange({ ...cameraMove, [d.which]: nextKf });
      }
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [cameraMove, canvasWidth, canvasHeight, stageZoom, onChange]);

  const toRect = useCallback(
    (kf: CameraKeyframe) => {
      const w = canvasWidth / Math.max(1, kf.zoom);
      const h = canvasHeight / Math.max(1, kf.zoom);
      const left = kf.x * canvasWidth - w / 2;
      const top = kf.y * canvasHeight - h / 2;
      return { left, top, w, h, cx: kf.x * canvasWidth, cy: kf.y * canvasHeight };
    },
    [canvasWidth, canvasHeight]
  );

  const startRect = toRect(cameraMove.start);
  const endRect = toRect(cameraMove.end);
  const liveKf = interpolateCamera(cameraMove, previewT);
  const liveRect = toRect(liveKf);
  const invScale = 1 / Math.max(0.25, stageZoom);

  return (
    <div
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-25 pointer-events-none select-none"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {/* Motion Vector Arrow from Start Camera Center -> End Camera Center */}
      <svg
        width={canvasWidth}
        height={canvasHeight}
        className="absolute inset-0 pointer-events-none"
      >
        <defs>
          <marker id="cam-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3.5" orient="auto">
            <polygon points="0 0, 8 3.5, 0 7" fill="#f43f5e" />
          </marker>
        </defs>
        <line
          x1={startRect.cx}
          y1={startRect.cy}
          x2={endRect.cx}
          y2={endRect.cy}
          stroke="#facc15"
          strokeWidth={Math.max(2, 3 * invScale)}
          strokeDasharray={`${8 * invScale} ${6 * invScale}`}
          markerEnd="url(#cam-arrow)"
        />
        <circle cx={startRect.cx} cy={startRect.cy} r={5 * invScale} fill="#22c55e" />
        <circle cx={endRect.cx} cy={endRect.cy} r={5 * invScale} fill="#f43f5e" />
      </svg>

      {/* GREEN START CAMERA FRAME (IN) */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          dragRef.current = { which: 'start', mode: 'move', startClientX: e.clientX, startClientY: e.clientY, orig: cameraMove.start };
        }}
        className="absolute border-2 border-emerald-400 bg-emerald-500/[0.04] pointer-events-auto cursor-move shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
        style={{ left: startRect.left, top: startRect.top, width: startRect.w, height: startRect.h }}
      >
        <span
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono font-black text-[10px] shadow"
          style={{ transform: `scale(${invScale})`, transformOrigin: 'top left' }}
        >
          CAM IN · {Math.round(cameraMove.start.zoom * 100)}%
        </span>
        {/* Zoom Corner Handle */}
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            dragRef.current = { which: 'start', mode: 'zoom', startClientX: e.clientX, startClientY: e.clientY, orig: cameraMove.start };
          }}
          title="Drag corner to adjust Start Camera Zoom"
          className="absolute bottom-0 right-0 bg-emerald-400 border-2 border-slate-950 rounded-tl cursor-nwse-resize"
          style={{ width: `${14 * invScale}px`, height: `${14 * invScale}px` }}
        />
      </div>

      {/* RED END CAMERA FRAME (OUT) */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          dragRef.current = { which: 'end', mode: 'move', startClientX: e.clientX, startClientY: e.clientY, orig: cameraMove.end };
        }}
        className="absolute border-2 border-rose-500 bg-rose-500/[0.04] pointer-events-auto cursor-move shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
        style={{ left: endRect.left, top: endRect.top, width: endRect.w, height: endRect.h }}
      >
        <span
          className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-rose-500 text-white font-mono font-black text-[10px] shadow"
          style={{ transform: `scale(${invScale})`, transformOrigin: 'top right' }}
        >
          CAM OUT · {Math.round(cameraMove.end.zoom * 100)}%
        </span>
        {/* Zoom Corner Handle */}
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            dragRef.current = { which: 'end', mode: 'zoom', startClientX: e.clientX, startClientY: e.clientY, orig: cameraMove.end };
          }}
          title="Drag corner to adjust End Camera Zoom"
          className="absolute bottom-0 right-0 bg-rose-500 border-2 border-slate-950 rounded-tl cursor-nwse-resize"
          style={{ width: `${14 * invScale}px`, height: `${14 * invScale}px` }}
        />
      </div>

      {/* LIVE INTERPOLATED CAMERA PREVIEW FRAME (WHITE DASHED) */}
      {(isPreviewing || previewT > 0) && (
        <div
          className="absolute border-2 border-dashed border-white/90 pointer-events-none shadow-[0_0_24px_rgba(255,255,255,0.45)]"
          style={{ left: liveRect.left, top: liveRect.top, width: liveRect.w, height: liveRect.h }}
        />
      )}

      {/* FLOATING STORYBOARD PRO CAMERA CONTROLS BAR */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-4 left-1/2 pointer-events-auto flex items-center gap-2 bg-[#11101c]/95 border border-emerald-400/45 rounded-2xl px-3 py-1.5 text-xs font-bold text-white shadow-[0_14px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        style={{
          transform: `translateX(-50%) scale(${invScale})`,
          transformOrigin: 'top center',
        }}
      >
        <Video className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">2D Camera</span>

        <div className="w-px h-4 bg-white/15" />

        <button
          type="button"
          onClick={() => setIsPreviewing((p) => !p)}
          className={cn(
            'h-7 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors',
            isPreviewing ? 'bg-amber-500 text-black' : 'bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-400/40'
          )}
        >
          {isPreviewing ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
          <span>{isPreviewing ? 'Stop' : 'Preview'}</span>
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={previewT}
          onChange={(e) => {
            setIsPreviewing(false);
            setPreviewT(parseFloat(e.target.value));
          }}
          className="w-20 h-1 accent-emerald-400 cursor-pointer"
          title="Scrub camera pan/zoom move"
        />

        <button
          type="button"
          onClick={() =>
            onChange({
              ...cameraMove,
              easing: cameraMove.easing === 'ease-in-out' ? 'linear' : 'ease-in-out',
            })
          }
          className="h-7 px-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-mono text-zinc-200 cursor-pointer"
          title="Toggle Camera Easing"
        >
          {cameraMove.easing === 'ease-in-out' ? 'Ease' : 'Linear'}
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_CAMERA_MOVE })}
          className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
          title="Reset Camera Move"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 border border-rose-400/40 flex items-center justify-center text-rose-200 hover:text-white cursor-pointer"
          title="Hide / Disable Camera Overlay"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
