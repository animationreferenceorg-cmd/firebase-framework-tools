'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, FlipHorizontal2, FlipVertical2, RotateCcw } from 'lucide-react';

export interface FreeTransformSession {
  layerId: string;
  /** Tightly cropped floating pixels being transformed. */
  sourceCanvas: HTMLCanvasElement;
  /** Original un-modified layer canvas so Cancel restores 100% cleanly. */
  backupLayerCanvas: HTMLCanvasElement;
  /** Initial bounding box in canvas coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FreeTransformResult {
  cx: number;
  cy: number;
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
}

interface FreeTransformOverlayProps {
  session: FreeTransformSession;
  canvasWidth: number;
  canvasHeight: number;
  stageZoom: number;
  stageRotationDeg: number;
  stageFlipped: boolean;
  onApply: (result: FreeTransformResult) => void;
  onCancel: () => void;
}

type DragMode =
  | null
  | { type: 'move'; startX: number; startY: number; origCx: number; origCy: number }
  | { type: 'scale'; corner: 'nw' | 'ne' | 'sw' | 'se'; startDistX: number; startDistY: number; origScaleX: number; origScaleY: number }
  | { type: 'rotate'; startAngle: number; origRot: number };

export function FreeTransformOverlay({
  session,
  canvasWidth,
  canvasHeight,
  stageZoom,
  stageRotationDeg,
  stageFlipped,
  onApply,
  onCancel,
}: FreeTransformOverlayProps) {
  const [cx, setCx] = useState(session.x + session.w / 2);
  const [cy, setCy] = useState(session.y + session.h / 2);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [rotationDeg, setRotationDeg] = useState(0);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragMode>(null);

  // Convert screen pointer coordinates into un-transformed canvas coordinates
  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (clientX - centerX) / Math.max(0.01, stageZoom);
      const dy = (clientY - centerY) / Math.max(0.01, stageZoom);
      const rad = (-stageRotationDeg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      let lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (stageFlipped) lx = -lx;
      return {
        x: canvasWidth / 2 + lx,
        y: canvasHeight / 2 + ly,
      };
    },
    [canvasWidth, canvasHeight, stageZoom, stageRotationDeg, stageFlipped]
  );

  // Render live transformed pixels onto the preview canvas
  useEffect(() => {
    const cvs = previewCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(session.sourceCanvas, -session.w / 2, -session.h / 2);
    ctx.restore();
  }, [cx, cy, scaleX, scaleY, rotationDeg, session, canvasWidth, canvasHeight]);

  // Enter = Apply, Escape = Cancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onApply({ cx, cy, scaleX, scaleY, rotationDeg });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cx, cy, scaleX, scaleY, rotationDeg, onApply, onCancel]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const pt = clientToCanvas(e.clientX, e.clientY);

      if (drag.type === 'move') {
        setCx(drag.origCx + (pt.x - drag.startX));
        setCy(drag.origCy + (pt.y - drag.startY));
      } else if (drag.type === 'rotate') {
        const angle = (Math.atan2(pt.y - cy, pt.x - cx) * 180) / Math.PI;
        let next = drag.origRot + (angle - drag.startAngle);
        if (e.shiftKey) next = Math.round(next / 15) * 15;
        setRotationDeg(next);
      } else if (drag.type === 'scale') {
        // Transform pointer vector into the box's local un-rotated space
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        const rad = (-rotationDeg * Math.PI) / 180;
        const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

        let nextSx = drag.origScaleX * (Math.abs(localX) / Math.max(8, drag.startDistX));
        let nextSy = drag.origScaleY * (Math.abs(localY) / Math.max(8, drag.startDistY));
        nextSx = Math.sign(drag.origScaleX || 1) * Math.max(0.05, Math.min(10, Math.abs(nextSx)));
        nextSy = Math.sign(drag.origScaleY || 1) * Math.max(0.05, Math.min(10, Math.abs(nextSy)));

        if (e.shiftKey) {
          const ratio = Math.max(Math.abs(nextSx / (drag.origScaleX || 1)), Math.abs(nextSy / (drag.origScaleY || 1)));
          nextSx = Math.sign(drag.origScaleX || 1) * Math.max(0.05, Math.abs(drag.origScaleX) * ratio);
          nextSy = Math.sign(drag.origScaleY || 1) * Math.max(0.05, Math.abs(drag.origScaleY) * ratio);
        }
        setScaleX(nextSx);
        setScaleY(nextSy);
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
  }, [clientToCanvas, cx, cy, rotationDeg]);

  const boxW = Math.max(20, session.w * Math.abs(scaleX));
  const boxH = Math.max(20, session.h * Math.abs(scaleY));
  const invScale = 1 / Math.max(0.25, stageZoom);

  const startScale = (corner: 'nw' | 'ne' | 'sw' | 'se', e: React.PointerEvent) => {
    e.stopPropagation();
    const pt = clientToCanvas(e.clientX, e.clientY);
    const dx = pt.x - cx;
    const dy = pt.y - cy;
    const rad = (-rotationDeg * Math.PI) / 180;
    const localX = Math.abs(dx * Math.cos(rad) - dy * Math.sin(rad));
    const localY = Math.abs(dx * Math.sin(rad) + dy * Math.cos(rad));
    dragRef.current = {
      type: 'scale',
      corner,
      startDistX: Math.max(8, localX),
      startDistY: Math.max(8, localY),
      origScaleX: scaleX,
      origScaleY: scaleY,
    };
  };

  return (
    <div
      ref={containerRef}
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-30 select-none touch-none"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {/* Live Transformed Pixels Preview */}
      <canvas
        ref={previewCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Interactive Bounding Box + Corner Scale & Rotate Handles */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          const pt = clientToCanvas(e.clientX, e.clientY);
          dragRef.current = { type: 'move', startX: pt.x, startY: pt.y, origCx: cx, origCy: cy };
        }}
        className="absolute border-2 border-cyan-400 shadow-[0_0_0_1px_rgba(0,0,0,0.65)] cursor-move"
        style={{
          width: boxW,
          height: boxH,
          left: cx - boxW / 2,
          top: cy - boxH / 2,
          transform: `rotate(${rotationDeg}deg)`,
          transformOrigin: 'center center',
        }}
      >
        {/* Top Rotation Handle Stem */}
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            const pt = clientToCanvas(e.clientX, e.clientY);
            const startAngle = (Math.atan2(pt.y - cy, pt.x - cx) * 180) / Math.PI;
            dragRef.current = { type: 'rotate', startAngle, origRot: rotationDeg };
          }}
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing"
          style={{ top: `${-34 * invScale}px` }}
          title="Drag to rotate (Hold Shift for 15° snaps)"
        >
          <div
            className="rounded-full bg-cyan-400 border-2 border-slate-950 shadow-lg"
            style={{ width: `${14 * invScale}px`, height: `${14 * invScale}px` }}
          />
          <div className="w-0.5 bg-cyan-400" style={{ height: `${20 * invScale}px` }} />
        </div>

        {/* 4 Corner Scale Handles */}
        {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
          <div
            key={corner}
            onPointerDown={(e) => startScale(corner, e)}
            title="Drag to scale (Hold Shift to lock aspect ratio)"
            className="absolute bg-white border-2 border-cyan-500 rounded-sm shadow-md"
            style={{
              width: `${12 * invScale}px`,
              height: `${12 * invScale}px`,
              cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
              left: corner.includes('w') ? `${-6 * invScale}px` : undefined,
              right: corner.includes('e') ? `${-6 * invScale}px` : undefined,
              top: corner.includes('n') ? `${-6 * invScale}px` : undefined,
              bottom: corner.includes('s') ? `${-6 * invScale}px` : undefined,
            }}
          />
        ))}
      </div>

      {/* Floating Action Pill (Un-flipped & scaled to stay crisp at any zoom) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute flex items-center gap-1.5 bg-[#12111d]/95 border border-cyan-400/50 rounded-2xl px-2.5 py-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl text-xs font-bold text-white"
        style={{
          left: cx,
          top: Math.min(canvasHeight - 60, cy + boxH / 2 + 24 * invScale),
          transform: `translateX(-50%) scale(${invScale}) ${stageFlipped ? 'scaleX(-1)' : ''}`,
          transformOrigin: 'top center',
        }}
      >
        <span className="text-[10px] font-mono text-cyan-300 px-1">
          {Math.round(rotationDeg)}° · {Math.round(Math.abs(scaleX) * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setScaleX((s) => -s)}
          className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-zinc-200 cursor-pointer"
          title="Flip Selection Horizontal"
        >
          <FlipHorizontal2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setScaleY((s) => -s)}
          className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-zinc-200 cursor-pointer"
          title="Flip Selection Vertical"
        >
          <FlipVertical2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setCx(session.x + session.w / 2);
            setCy(session.y + session.h / 2);
            setScaleX(1);
            setScaleY(1);
            setRotationDeg(0);
          }}
          className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-zinc-200 cursor-pointer"
          title="Reset Transform"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-white/15 mx-0.5" />
        <button
          type="button"
          onClick={onCancel}
          className="h-7 px-2.5 rounded-lg bg-white/5 hover:bg-rose-500/30 border border-white/10 text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
          title="Cancel Transform (Esc)"
        >
          <X className="h-3.5 w-3.5" />
          <span>Cancel</span>
        </button>
        <button
          type="button"
          onClick={() => onApply({ cx, cy, scaleX, scaleY, rotationDeg })}
          className="h-7 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black flex items-center gap-1 cursor-pointer shadow"
          title="Apply Transform (Enter)"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Apply</span>
        </button>
      </div>
    </div>
  );
}
