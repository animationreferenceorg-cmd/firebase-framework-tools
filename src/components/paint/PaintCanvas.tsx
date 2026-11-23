'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { Layer, ToolType, BrushSettings, CanvasSize, Point, CustomBrushTexture, Selection, SymmetryMode, OnionShift } from '@/lib/paint/types';
import { normalizedPressure, STROKE_TOOLS } from '@/lib/paint/types';
import {
  strokeSegment,
  stampBrush,
  floodFill,
  hexToRgba,
  smoothPoint,
  createLayerCanvas,
  cloneCanvas,
  smudgeSegment,
  cloneStampSegment,
  rectSelectionMask,
  polygonSelectionMask,
  magicWandSelectionMask,
  combineSelectionMask,
  maskToSelection,
  withSelectionClip,
  paintGradient,
  blurSegment,
  sharpenSegment,
  dodgeBurnSegment,
  compositeLayersToContext,
} from '@/lib/paint/engine';

interface PaintCanvasProps {
  layers: Layer[];
  activeLayerId: string;
  tool: ToolType;
  brush: BrushSettings;
  canvasSize: CanvasSize;
  zoom: number;
  onBeforeStroke: () => void;
  onAfterStroke: () => void;
  onEyedropperPick: (hex: string) => void;
  selection: Selection | null;
  onSelectionChange: (sel: Selection | null) => void;
  customTextures: CustomBrushTexture[];
  onRequestContextMenu: (clientX: number, clientY: number) => void;
  isSpaceHeld: boolean;
  maskTargetLayerId: string | null;
  symmetry: SymmetryMode;
  onionSkinPrev?: HTMLCanvasElement | null;
  onionSkinNext?: HTMLCanvasElement | null;
  onionSkinOpacity?: number;
  /** Toon Boom Harmony / Callipeg Shift & Trace light-table peg offset for onion-skin ghosts. */
  onionShift?: OnionShift;
  hasBackgroundVideo?: boolean;
  /** Non-destructive horizontal canvas mirror (Callipeg/Procreate 'H' flip). */
  flipped?: boolean;
  /** Non-destructive canvas rotation in degrees (Harmony/Storyboard Pro 'R' rotate). */
  rotationDeg?: number;
  /** Parent stage CSS scale zoom, used for exact inverse-rotated pointer math. */
  stageZoom?: number;
  /** Increment to force a display redraw after external layer pixel edits (e.g. Free Transform). */
  redrawToken?: number;
  /** Increment to clear the clone-stamp source point from outside. */
  cloneSourceResetToken?: number;
}

export function PaintCanvas({
  layers,
  activeLayerId,
  tool,
  brush,
  canvasSize,
  zoom,
  onBeforeStroke,
  onAfterStroke,
  onEyedropperPick,
  selection,
  onSelectionChange,
  customTextures,
  onRequestContextMenu,
  isSpaceHeld,
  maskTargetLayerId,
  symmetry,
  onionSkinPrev,
  onionSkinNext,
  onionSkinOpacity = 0.35,
  onionShift,
  hasBackgroundVideo = false,
  flipped = false,
  rotationDeg = 0,
  stageZoom = 1,
  redrawToken = 0,
  cloneSourceResetToken = 0,
}: PaintCanvasProps) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const strokePathRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const activeLayerRef = useRef<Layer | null>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const lassoPointsRef = useRef<Point[]>([]);
  const gradientStartRef = useRef<Point | null>(null);
  const shapeStartRef = useRef<Point | null>(null);
  const cloneSourceRef = useRef<Point | null>(null);
  const cloneOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  // Frozen copy of the layer taken when a clone stroke starts. Sampling the
  // live canvas instead would feed the tool its own output and smear.
  const cloneSampleRef = useRef<HTMLCanvasElement | null>(null);
  // The clone source marker is drawn from a ref, so it needs an explicit nudge
  // to re-render when the source moves (refs don't trigger React updates).
  const [cloneSourceTick, setCloneSourceTick] = useState(0);
  const [textEditor, setTextEditor] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState('');

  /** Combines a freshly-built mask with the current selection and pushes the
   * result up as a proper Selection object. Shift adds, Alt subtracts. */
  const applySelectionMask = useCallback(
    (mask: HTMLCanvasElement, e: { shiftKey: boolean; altKey: boolean }) => {
      const mode = e.shiftKey ? 'add' : e.altKey ? 'subtract' : 'replace';
      const combined = combineSelectionMask(selection?.mask ?? null, mask, mode);
      onSelectionChange(maskToSelection(combined));
    },
    [selection, onSelectionChange]
  );

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const oCtx = overlay?.getContext('2d');
    if (overlay && oCtx) oCtx.clearRect(0, 0, overlay.width, overlay.height);
  }, []);

  /** Marching-ants preview for both the freehand and polygonal lasso. */
  const drawLassoPreview = useCallback((cursor?: Point) => {
    const overlay = overlayRef.current;
    const oCtx = overlay?.getContext('2d');
    if (!overlay || !oCtx) return;
    const pts = lassoPointsRef.current;
    oCtx.clearRect(0, 0, overlay.width, overlay.height);
    if (pts.length === 0) return;
    oCtx.save();
    oCtx.strokeStyle = '#3b82f6';
    oCtx.lineWidth = 2;
    oCtx.setLineDash([4, 4]);
    oCtx.beginPath();
    oCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) oCtx.lineTo(pts[i].x, pts[i].y);
    if (cursor) oCtx.lineTo(cursor.x, cursor.y);
    oCtx.stroke();
    oCtx.restore();
  }, []);

  const commitLassoSelection = useCallback(
    (e: { shiftKey: boolean; altKey: boolean }) => {
      const pts = lassoPointsRef.current;
      if (pts.length > 2) {
        const mask = polygonSelectionMask(canvasSize.width, canvasSize.height, pts);
        applySelectionMask(mask, e);
      }
      lassoPointsRef.current = [];
      clearOverlay();
    },
    [canvasSize, applySelectionMask, clearOverlay]
  );

  // Enter closes an in-progress polygonal lasso; Escape abandons it.
  useEffect(() => {
    if (tool !== 'polyLasso') return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') commitLassoSelection({ shiftKey: ev.shiftKey, altKey: ev.altKey });
      else if (ev.key === 'Escape') { lassoPointsRef.current = []; clearOverlay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool, commitLassoSelection, clearOverlay]);

  // Keep activeLayerRef in sync
  useEffect(() => {
    activeLayerRef.current = layers.find((l) => l.id === activeLayerId) || null;
  }, [layers, activeLayerId]);

  useEffect(() => {
    if (cloneSourceResetToken === 0) return;
    cloneSourceRef.current = null;
    cloneOffsetRef.current = null;
    setCloneSourceTick((t) => t + 1);
  }, [cloneSourceResetToken]);

  // Combine layers onto display canvas (preserving transparent drawing cels!)
  const redrawCombinedCanvas = useCallback(() => {
    const display = displayRef.current;
    if (!display) return;
    const ctx = display.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, display.width, display.height);

    // If no reference video background is pinned, fill stage canvas with white background
    if (!hasBackgroundVideo) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, display.width, display.height);
    }

    // Render pre-tinted Callipeg-style Multi-Frame Onion Skin Ghosts (with optional Harmony Shift & Trace peg offset)
    const drawGhost = (ghost: HTMLCanvasElement) => {
      ctx.save();
      ctx.globalAlpha = onionSkinOpacity;
      if (onionShift && (onionShift.dx !== 0 || onionShift.dy !== 0 || onionShift.rotDeg !== 0)) {
        const cx = display.width / 2;
        const cy = display.height / 2;
        ctx.translate(cx + onionShift.dx, cy + onionShift.dy);
        if (onionShift.rotDeg !== 0) ctx.rotate((onionShift.rotDeg * Math.PI) / 180);
        ctx.drawImage(ghost, -cx, -cy);
      } else {
        ctx.drawImage(ghost, 0, 0);
      }
      ctx.restore();
    };

    if (onionSkinPrev) drawGhost(onionSkinPrev);
    if (onionSkinNext) drawGhost(onionSkinNext);

    // Render Drawing Layers (honoring Layer Masks AND Photoshop/Procreate Clipping Masks)
    compositeLayersToContext(ctx, layers, display.width, display.height);
  }, [layers, onionSkinPrev, onionSkinNext, onionSkinOpacity, onionShift, hasBackgroundVideo, redrawToken]);

  useEffect(() => {
    redrawCombinedCanvas();
  }, [redrawCombinedCanvas]);

  const cachedRectRef = useRef<DOMRect | null>(null);
  const redrawRafRef = useRef<number | null>(null);

  // Coalesce display canvas redraws to exact monitor refresh rate (60/120Hz) instead of 240Hz pointermove floods
  const scheduleRedraw = useCallback(() => {
    if (redrawRafRef.current !== null) return;
    redrawRafRef.current = requestAnimationFrame(() => {
      redrawRafRef.current = null;
      redrawCombinedCanvas();
    });
  }, [redrawCombinedCanvas]);

  useEffect(() => {
    return () => {
      if (redrawRafRef.current !== null) cancelAnimationFrame(redrawRafRef.current);
    };
  }, []);

  // Invalidate bounding rect cache on zoom, rotation, flip, or canvas resize
  useEffect(() => {
    cachedRectRef.current = null;
  }, [zoom, stageZoom, rotationDeg, flipped, canvasSize]);

  // Convert raw client coordinates into canvas space using cached DOMRect (zero layout reflow during strokes!)
  const clientToCanvasPoint = useCallback(
    (clientX: number, clientY: number, rawPressure?: number, pointerType?: string): Point => {
      const cvs = displayRef.current;
      if (!cvs) return { x: 0, y: 0, pressure: 0.5 };

      const rect = (isDrawingRef.current && cachedRectRef.current) ? cachedRectRef.current : cvs.getBoundingClientRect();
      const p = normalizedPressure(rawPressure, pointerType);

      if (rotationDeg === 0) {
        const scaleX = cvs.width / rect.width;
        const scaleY = cvs.height / rect.height;
        const rawX = (clientX - rect.left) * scaleX;
        return {
          x: flipped ? cvs.width - rawX : rawX,
          y: (clientY - rect.top) * scaleY,
          pressure: p,
        };
      }

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const effectiveZoom = Math.max(0.01, stageZoom * zoom);
      const dx = (clientX - cx) / effectiveZoom;
      const dy = (clientY - cy) / effectiveZoom;
      const rad = (-rotationDeg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      let localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      if (flipped) localX = -localX;

      return {
        x: cvs.width / 2 + localX,
        y: cvs.height / 2 + localY,
        pressure: p,
      };
    },
    [flipped, rotationDeg, stageZoom, zoom]
  );

  // Pointer position helper with exact inverse-rotation & flip math at any zoom/angle
  const getCanvasPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): Point =>
      clientToCanvasPoint(e.clientX, e.clientY, e.nativeEvent.pressure, e.nativeEvent.pointerType),
    [clientToCanvasPoint]
  );

  const activeTargetCanvas = useCallback((): HTMLCanvasElement | null => {
    const layer = activeLayerRef.current;
    if (!layer) return null;
    if (maskTargetLayerId && maskTargetLayerId === layer.id) {
      if (!layer.mask) {
        layer.mask = createLayerCanvas(canvasSize.width, canvasSize.height);
      }
      return layer.mask;
    }
    return layer.canvas;
  }, [canvasSize, maskTargetLayerId]);

  // Pointer handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Force blur on any active input/textarea so keyboard focus is returned to canvas and text cursors are dismissed
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (isSpaceHeld) return;

    // Immediately capture Windows Stylus Pen input to bypass OS gesture recognition delays
    e.preventDefault();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // Fallback
    }

    // Cache bounding rect for zero-reflow pointermove streaming
    if (displayRef.current) {
      cachedRectRef.current = displayRef.current.getBoundingClientRect();
    }

    // Trapping Pen Stylus Barrel Right-Click Button
    if (e.button === 2 || e.button === 5 || e.buttons === 2 || e.buttons === 32) {
      onRequestContextMenu(e.clientX, e.clientY);
      return;
    }

    if (e.button !== 0) return;

    const pt = getCanvasPoint(e);

    if (tool === 'eyedropper') {
      const display = displayRef.current;
      if (!display) return;
      const ctx = display.getContext('2d');
      if (!ctx) return;
      const px = ctx.getImageData(Math.round(pt.x), Math.round(pt.y), 1, 1).data;
      const hex = `#${((1 << 24) + (px[0] << 16) + (px[1] << 8) + px[2]).toString(16).slice(1)}`;
      onEyedropperPick(hex);
      return;
    }

    // Handled before the history snapshot below — the polygonal lasso takes one
    // click per point and doesn't touch pixels, so snapshotting each click would
    // fill the undo stack with identical entries.
    if (tool === 'polyLasso') {
      if (e.detail >= 2 && lassoPointsRef.current.length > 2) {
        commitLassoSelection(e);
      } else {
        lassoPointsRef.current.push(pt);
        drawLassoPreview(pt);
      }
      isDrawingRef.current = false;
      return;
    }

    const targetCanvas = activeTargetCanvas();
    if (!targetCanvas) return;
    if (activeLayerRef.current?.locked || activeLayerRef.current?.visible === false) return;

    onBeforeStroke();
    isDrawingRef.current = true;
    strokePathRef.current = [pt];

    if (tool === 'fill') {
      // If any visible layer is marked as a Toon Boom Reference Layer (e.g. Clean Ink),
      // read boundaries from that layer while writing flat colors cleanly into the active layer!
      const refLayer = layers.find((l) => l.visible && l.isReference && l.id !== activeLayerId);
      floodFill(
        targetCanvas,
        Math.round(pt.x),
        Math.round(pt.y),
        brush.color,
        brush.tolerance ?? 32,
        refLayer?.canvas ?? null
      );
      redrawCombinedCanvas();
      onAfterStroke();
      isDrawingRef.current = false;
      return;
    }

    if (tool === 'gradient') {
      gradientStartRef.current = pt;
      return;
    }

    if (tool === 'line' || tool === 'rectangle' || tool === 'ellipse') {
      shapeStartRef.current = pt;
      return;
    }

    if (tool === 'text') {
      setTextEditor({ x: pt.x, y: pt.y });
      setTextValue('');
      isDrawingRef.current = false;
      return;
    }

    if (tool === 'lasso' || tool === 'lassoFill') {
      lassoPointsRef.current = [pt];
      return;
    }

    if (tool === 'select') {
      shapeStartRef.current = pt;
      return;
    }

    if (tool === 'magicWand') {
      const sampleCanvas = targetCanvas || displayRef.current;
      if (!sampleCanvas) return;
      const mask = magicWandSelectionMask(sampleCanvas, Math.round(pt.x), Math.round(pt.y), brush.tolerance);
      applySelectionMask(mask, e);
      isDrawingRef.current = false;
      onAfterStroke();
      return;
    }

    // Alt+click sets the clone source (matching the tooltip and Photoshop).
    // Without a source set, a plain click also sets it rather than painting
    // solid colour, which is what the old fall-through did.
    if (tool === 'cloneStamp' && (e.altKey || !cloneSourceRef.current)) {
      cloneSourceRef.current = pt;
      cloneOffsetRef.current = null;
      setCloneSourceTick((t) => t + 1);
      isDrawingRef.current = false;
      onAfterStroke();
      return;
    }

    // Lock the source→destination offset at the moment the stroke starts, so
    // the clone source travels with the brush the way Photoshop's aligned mode does.
    if (tool === 'cloneStamp' && cloneSourceRef.current) {
      cloneOffsetRef.current = {
        dx: pt.x - cloneSourceRef.current.x,
        dy: pt.y - cloneSourceRef.current.y,
      };
      cloneSampleRef.current = cloneCanvas(targetCanvas);
    }


    // Lay down the initial dab. Only the brush and eraser deposit anything on
    // press — smudge, clone, blur, sharpen and dodge/burn are all segment-based
    // and need a second point before they have anything to act on. Stamping for
    // them (as this used to) painted a blob of the active colour instead.
    if (tool === 'brush' || tool === 'eraser') {
      const activeTexture = brush.textureId
        ? customTextures.find((t) => t.id === brush.textureId)?.canvas
        : undefined;

      const paintingMask = !!maskTargetLayerId && maskTargetLayerId === activeLayerRef.current?.id;
      const alphaLocked = !paintingMask && !!activeLayerRef.current?.alphaLocked;

      withSelectionClip(targetCanvas, selection?.mask ?? null, alphaLocked, (ctx) => {
        ctx.save();
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        stampBrush(ctx, pt, brush, activeTexture);
        ctx.restore();
      });
    }

    redrawCombinedCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);

    if (cursorDotRef.current && displayRef.current) {
      // GPU-composited cursor movement (zero CSS layout reflow!)
      cursorDotRef.current.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0) translate(-50%, -50%)`;
      const d = Math.max(4, brush.size);
      if (cursorDotRef.current.style.width !== `${d}px`) {
        cursorDotRef.current.style.width = `${d}px`;
        cursorDotRef.current.style.height = `${d}px`;
      }
    }

    // The polygonal lasso rubber-bands from the last committed point to the
    // cursor between clicks, so it has to paint the overlay with no button down.
    if (tool === 'polyLasso' && lassoPointsRef.current.length > 0) {
      drawLassoPreview(pt);
      return;
    }

    if (!isDrawingRef.current) return;

    const targetCanvas = activeTargetCanvas();
    if (!targetCanvas) return;

    const path = strokePathRef.current;
    const prevPt = path[path.length - 1] || pt;

    // Photoshop Move Tool: translate layer artwork by drag delta
    if (tool === 'move') {
      const dx = pt.x - prevPt.x;
      const dy = pt.y - prevPt.y;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        const temp = cloneCanvas(targetCanvas);
        const ctx = targetCanvas.getContext('2d')!;
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.drawImage(temp, dx, dy);
        path.push(pt);
        scheduleRedraw();
      }
      return;
    }

    const activeTexture = brush.textureId
      ? customTextures.find((t) => t.id === brush.textureId)?.canvas
      : undefined;

    // Alpha lock only makes sense when painting the artwork itself — a layer
    // mask is meant to be paintable from empty.
    const paintingMask = !!maskTargetLayerId && maskTargetLayerId === activeLayerRef.current?.id;
    const alphaLocked = !paintingMask && !!activeLayerRef.current?.alphaLocked;

    if (tool === 'lasso' || tool === 'lassoFill') {
      lassoPointsRef.current.push(pt);
    } else if (STROKE_TOOLS.includes(tool)) {
      // Read high-frequency coalesced stylus/mouse sub-samples for ultra-silky curved strokes
      const coalesced =
        typeof e.nativeEvent.getCoalescedEvents === 'function'
          ? e.nativeEvent.getCoalescedEvents()
          : [];
      const samplePoints: Point[] =
        coalesced.length > 1
          ? coalesced.map((ce) => clientToCanvasPoint(ce.clientX, ce.clientY, ce.pressure, ce.pointerType))
          : [pt];

      withSelectionClip(targetCanvas, selection?.mask ?? null, alphaLocked, (ctx) => {
        ctx.save();
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        const w = targetCanvas.width;
        const h = targetCanvas.height;

        for (const rawSample of samplePoints) {
          const last = path[path.length - 1] || rawSample;
          const constrained = e.shiftKey ? constrainShapeEndpoint(tool, path[0], rawSample) : rawSample;
          const smoothed = smoothPoint(last, constrained, brush.smoothing);
          path.push(smoothed);

          if (tool === 'brush' || tool === 'eraser') {
            strokeSegment(ctx, last, smoothed, brush, activeTexture);

            if (symmetry === 'vertical' || symmetry === 'both') {
              strokeSegment(ctx, { ...last, x: w - last.x }, { ...smoothed, x: w - smoothed.x }, brush, activeTexture);
            }
            if (symmetry === 'horizontal' || symmetry === 'both') {
              strokeSegment(ctx, { ...last, y: h - last.y }, { ...smoothed, y: h - smoothed.y }, brush, activeTexture);
            }
            if (symmetry === 'both') {
              strokeSegment(
                ctx,
                { x: w - last.x, y: h - last.y, pressure: last.pressure },
                { x: w - smoothed.x, y: h - smoothed.y, pressure: smoothed.pressure },
                brush,
                activeTexture
              );
            }
          } else if (tool === 'smudge') {
            smudgeSegment(ctx, last, smoothed, brush.size, brush.smudgeStrength);
          } else if (tool === 'cloneStamp') {
            const offset = cloneOffsetRef.current;
            if (offset) {
              cloneStampSegment(ctx, cloneSampleRef.current ?? ctx.canvas, last, smoothed, offset, brush);
            }
          } else if (tool === 'blur') {
            blurSegment(ctx, last, smoothed, brush.size, brush.opacity);
          } else if (tool === 'sharpen') {
            sharpenSegment(ctx, last, smoothed, brush.size, brush.opacity);
          } else if (tool === 'dodge' || tool === 'burn') {
            dodgeBurnSegment(ctx, last, smoothed, brush.size, brush.exposure, tool);
          }
        }

        ctx.restore();
      });

      // Fast path: brush/eraser/retouch never need the overlay canvas cleared!
      scheduleRedraw();
      return;
    }

    const constrainedPt = e.shiftKey ? constrainShapeEndpoint(tool, path[0], pt) : pt;
    const smoothedPt = smoothPoint(prevPt, constrainedPt, brush.smoothing);
    path.push(smoothedPt);

    const overlay = overlayRef.current;
    if (overlay) {
      const oCtx = overlay.getContext('2d');
      if (oCtx) {
        oCtx.clearRect(0, 0, overlay.width, overlay.height);
        if (tool === 'gradient' && gradientStartRef.current) {
          oCtx.save();
          oCtx.strokeStyle = brush.color;
          oCtx.lineWidth = 2;
          oCtx.beginPath();
          oCtx.moveTo(gradientStartRef.current.x, gradientStartRef.current.y);
          oCtx.lineTo(pt.x, pt.y);
          oCtx.stroke();
          oCtx.restore();
        } else if (shapeStartRef.current && (tool === 'line' || tool === 'rectangle' || tool === 'ellipse')) {
          drawShapePreview(oCtx, tool, shapeStartRef.current, constrainedPt, brush);
        } else if (shapeStartRef.current && tool === 'select') {
          oCtx.save();
          oCtx.strokeStyle = '#3b82f6';
          oCtx.lineWidth = 2;
          oCtx.setLineDash([6, 6]);
          const x = Math.min(shapeStartRef.current.x, constrainedPt.x);
          const y = Math.min(shapeStartRef.current.y, constrainedPt.y);
          const w = Math.abs(constrainedPt.x - shapeStartRef.current.x);
          const h = Math.abs(constrainedPt.y - shapeStartRef.current.y);
          oCtx.strokeRect(x, y, w, h);
          oCtx.restore();
        } else if ((tool === 'lasso' || tool === 'lassoFill') && lassoPointsRef.current.length > 1) {
          oCtx.save();
          oCtx.beginPath();
          oCtx.moveTo(lassoPointsRef.current[0].x, lassoPointsRef.current[0].y);
          for (let i = 1; i < lassoPointsRef.current.length; i++) {
            oCtx.lineTo(lassoPointsRef.current[i].x, lassoPointsRef.current[i].y);
          }
          if (tool === 'lassoFill') {
            oCtx.closePath();
            oCtx.fillStyle = brush.color;
            oCtx.globalAlpha = Math.max(0.25, brush.opacity * 0.55);
            oCtx.fill();
            oCtx.globalAlpha = 0.9;
            oCtx.strokeStyle = '#ffffff';
            oCtx.lineWidth = 1.5;
            oCtx.setLineDash([4, 4]);
            oCtx.stroke();
          } else {
            oCtx.strokeStyle = '#3b82f6';
            oCtx.lineWidth = 2;
            oCtx.setLineDash([4, 4]);
            oCtx.stroke();
          }
          oCtx.restore();
        }
      }
    }

    scheduleRedraw();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const targetCanvas = activeTargetCanvas();
    const overlay = overlayRef.current;
    if (overlay) {
      const oCtx = overlay.getContext('2d');
      if (oCtx) oCtx.clearRect(0, 0, overlay.width, overlay.height);
    }

    const path = strokePathRef.current;
    const endPt = path[path.length - 1];

    if (targetCanvas && endPt) {
      if (tool === 'gradient' && gradientStartRef.current) {
        // Was passing the canvas where a 2D context belongs (which threw), and
        // the same colour for both stops (which is a flat fill even when it
        // doesn't throw). Now uses the real second colour and honours selection.
        const paintingMask = !!maskTargetLayerId && maskTargetLayerId === activeLayerRef.current?.id;
        const alphaLocked = !paintingMask && !!activeLayerRef.current?.alphaLocked;
        const start = gradientStartRef.current;
        withSelectionClip(targetCanvas, selection?.mask ?? null, alphaLocked, (ctx) => {
          ctx.save();
          ctx.globalAlpha = brush.opacity;
          paintGradient(
            ctx,
            start,
            endPt,
            brush.color,
            brush.secondaryColor,
            brush.gradientType,
            targetCanvas.width,
            targetCanvas.height
          );
          ctx.restore();
        });
      } else if (shapeStartRef.current && (tool === 'line' || tool === 'rectangle' || tool === 'ellipse')) {
        const tempCvs = createLayerCanvas(targetCanvas.width, targetCanvas.height);
        const tCtx = tempCvs.getContext('2d')!;
        drawShapePreview(tCtx, tool, shapeStartRef.current, endPt, brush);
        const tLayer = activeLayerRef.current;
        if (tLayer) {
          const tCtxMain = targetCanvas.getContext('2d')!;
          tCtxMain.globalAlpha = brush.opacity;
          tCtxMain.drawImage(tempCvs, 0, 0);
        }
      } else if (shapeStartRef.current && tool === 'select') {
        const x = Math.min(shapeStartRef.current.x, endPt.x);
        const y = Math.min(shapeStartRef.current.y, endPt.y);
        const w = Math.abs(endPt.x - shapeStartRef.current.x);
        const h = Math.abs(endPt.y - shapeStartRef.current.y);
        if (w > 2 && h > 2) {
          const mask = rectSelectionMask(targetCanvas.width, targetCanvas.height, x, y, w, h);
          applySelectionMask(mask, e);
        }
      } else if (tool === 'lasso' && lassoPointsRef.current.length > 2) {
        const mask = polygonSelectionMask(targetCanvas.width, targetCanvas.height, lassoPointsRef.current);
        applySelectionMask(mask, e);
      } else if (tool === 'lassoFill' && lassoPointsRef.current.length > 2) {
        // Instant Lasso Fill (flat shading / value blocking; hold Alt to erase lasso shape!)
        const pts = lassoPointsRef.current;
        const paintingMask = !!maskTargetLayerId && maskTargetLayerId === activeLayerRef.current?.id;
        const alphaLocked = !paintingMask && !!activeLayerRef.current?.alphaLocked;
        withSelectionClip(targetCanvas, selection?.mask ?? null, alphaLocked, (ctx) => {
          ctx.save();
          ctx.globalCompositeOperation = e.altKey ? 'destination-out' : 'source-over';
          ctx.globalAlpha = brush.opacity;
          ctx.fillStyle = brush.color;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      }
    }

    gradientStartRef.current = null;
    shapeStartRef.current = null;
    // The polygonal lasso accumulates across clicks — only the freehand lasso
    // finishes on pointer-up.
    if (tool !== 'polyLasso') lassoPointsRef.current = [];
    cloneSampleRef.current = null;
    strokePathRef.current = [];

    redrawCombinedCanvas();
    onAfterStroke();
  };

  const commitText = () => {
    if (!textEditor || !textValue.trim()) {
      setTextEditor(null);
      setTextValue('');
      return;
    }
    const targetCanvas = activeTargetCanvas();
    if (targetCanvas) {
      onBeforeStroke();
      const fontSize = Math.max(10, brush.size * 2);
      const lineStep = fontSize * brush.lineHeight;
      // fillText draws a single run and ignores "\n" entirely, so a multi-line
      // textarea used to collapse into one line. Draw each line explicitly.
      const lines = textValue.replace(/\r\n/g, '\n').split('\n');

      const paintingMask = !!maskTargetLayerId && maskTargetLayerId === activeLayerRef.current?.id;
      const alphaLocked = !paintingMask && !!activeLayerRef.current?.alphaLocked;

      withSelectionClip(targetCanvas, selection?.mask ?? null, alphaLocked, (ctx) => {
        ctx.save();
        ctx.fillStyle = brush.color;
        ctx.globalAlpha = brush.opacity;
        ctx.font = `${brush.fontItalic ? 'italic ' : ''}${brush.fontWeight} ${fontSize}px ${brush.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.textAlign = brush.textAlign;
        lines.forEach((line, i) => {
          ctx.fillText(line, textEditor.x, textEditor.y + i * lineStep);
        });
        ctx.restore();
      });
      redrawCombinedCanvas();
      onAfterStroke();
    }
    setTextEditor(null);
    setTextValue('');
  };

  const showBrushCursor =
    tool === 'brush' ||
    tool === 'eraser' ||
    tool === 'smudge' ||
    tool === 'cloneStamp' ||
    tool === 'blur' ||
    tool === 'sharpen' ||
    tool === 'dodge' ||
    tool === 'burn';

  return (
    <div
      className="relative shadow-2xl overflow-hidden select-none"
      style={{
        width: canvasSize.width * zoom,
        height: canvasSize.height * zoom,
      }}
    >
      <canvas
        ref={displayRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute inset-0 w-full h-full touch-none"
        style={{
          backgroundImage: hasBackgroundVideo
            ? 'none'
            : 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
          backgroundColor: hasBackgroundVideo ? 'transparent' : undefined,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          cursor: isSpaceHeld
            ? 'grab'
            : showBrushCursor
            ? 'none'
            : tool === 'eyedropper'
            ? 'crosshair'
            : tool === 'lasso' || tool === 'lassoFill' || tool === 'polyLasso' || tool === 'magicWand' || tool === 'select' || tool === 'gradient'
            ? 'crosshair'
            : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          // Do not interrupt active drawing stroke if pointer moves past canvas edge
          if (!isDrawingRef.current && cursorDotRef.current) {
            cursorDotRef.current.style.opacity = '0';
          }
        }}
        onPointerEnter={() => { if (cursorDotRef.current && showBrushCursor) cursorDotRef.current.style.opacity = '1'; }}
        onMouseDown={(e) => {
          if (e.button === 2 || e.button === 5 || e.buttons > 1) {
            e.preventDefault();
            onRequestContextMenu(e.clientX, e.clientY);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onRequestContextMenu(e.clientX, e.clientY);
        }}
      />
      <canvas
        ref={overlayRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {showBrushCursor && (
        <div
          ref={cursorDotRef}
          className="absolute left-0 top-0 rounded-full pointer-events-none opacity-0 will-change-transform"
          style={{
            transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
            border: '1.5px solid white',
            mixBlendMode: 'difference',
          }}
        />
      )}
      {selection && typeof selection.x === 'number' && !isNaN(selection.x) && (
        <div
          className="absolute border-2 border-dashed border-blue-500 pointer-events-none"
          style={{
            left: (selection.x || 0) * zoom,
            top: (selection.y || 0) * zoom,
            width: (selection.w || 0) * zoom,
            height: (selection.h || 0) * zoom,
          }}
        />
      )}
      {(symmetry === 'vertical' || symmetry === 'both') && (
        <div className="absolute top-0 bottom-0 pointer-events-none border-l border-dashed border-pink-400/70" style={{ left: (canvasSize.width / 2) * zoom }} />
      )}
      {(symmetry === 'horizontal' || symmetry === 'both') && (
        <div className="absolute left-0 right-0 pointer-events-none border-t border-dashed border-pink-400/70" style={{ top: (canvasSize.height / 2) * zoom }} />
      )}
      {tool === 'cloneStamp' && cloneSourceRef.current && (
        <div
          key={cloneSourceTick}
          className="absolute rounded-full border-2 border-pink-400 pointer-events-none"
          style={{
            left: cloneSourceRef.current.x * zoom - 8,
            top: cloneSourceRef.current.y * zoom - 8,
            width: 16,
            height: 16,
          }}
        />
      )}
      {textEditor && (
        <textarea
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setTextEditor(null); setTextValue(''); }
          }}
          style={{
            position: 'absolute',
            left: textEditor.x * zoom,
            top: textEditor.y * zoom,
            fontSize: Math.max(10, brush.size * 2) * zoom,
            color: brush.color,
            // Mirror the committed render so the editor is WYSIWYG.
            fontFamily: brush.fontFamily,
            fontWeight: brush.fontWeight,
            fontStyle: brush.fontItalic ? 'italic' : 'normal',
            lineHeight: brush.lineHeight,
            textAlign: brush.textAlign,
          }}
          className="bg-transparent border border-dashed border-blue-500 outline-none resize p-0 min-w-[100px] min-h-[1.5em]"
        />
      )}
    </div>
  );
}

function constrainShapeEndpoint(tool: ToolType, start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (tool === 'rectangle' || tool === 'ellipse') {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    return {
      x: start.x + Math.sign(dx || 1) * side,
      y: start.y + Math.sign(dy || 1) * side,
    };
  }

  if (tool === 'line') {
    const angle = Math.atan2(dy, dx);
    const step = Math.PI / 4;
    const snapped = Math.round(angle / step) * step;
    const length = Math.sqrt(dx * dx + dy * dy);
    return {
      x: start.x + Math.cos(snapped) * length,
      y: start.y + Math.sin(snapped) * length,
    };
  }

  return end;
}

function drawShapePreview(
  ctx: CanvasRenderingContext2D,
  tool: ToolType,
  start: Point,
  end: Point,
  brush: BrushSettings
) {
  ctx.save();
  ctx.strokeStyle = brush.color;
  ctx.fillStyle = hexToRgba(brush.color, brush.opacity);
  ctx.lineWidth = Math.max(1, brush.size / 4);
  ctx.lineCap = 'round';
  ctx.globalAlpha = brush.opacity;

  if (tool === 'line') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (tool === 'rectangle') {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    ctx.strokeRect(x, y, w, h);
  } else if (tool === 'ellipse') {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
