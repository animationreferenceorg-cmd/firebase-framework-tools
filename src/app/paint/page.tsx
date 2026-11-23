'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { PaintCanvas } from '@/components/paint/PaintCanvas';
import { FreeTransformOverlay, type FreeTransformSession, type FreeTransformResult } from '@/components/paint/FreeTransformOverlay';
import { CameraOverlay, DEFAULT_CAMERA_MOVE } from '@/components/paint/CameraOverlay';
import { CanvasGuidesOverlay, GUIDE_MODE_LABELS } from '@/components/paint/CanvasGuidesOverlay';
import { LayersPanel } from '@/components/paint/LayersPanel';
import { FramesPanel } from '@/components/paint/FramesPanel';
import { ProcreateHeader, type PaintWorkspaceMode } from '@/components/paint/ProcreateHeader';
import { ProcreateSliderDock } from '@/components/paint/ProcreateSliderDock';
import { ToolOptionsBar } from '@/components/paint/ToolOptionsBar';
import { ProcreateBrushStudio } from '@/components/paint/ProcreateBrushStudio';
import { BrushContextMenu } from '@/components/paint/BrushContextMenu';
import { CanvasSettingsDialog } from '@/components/paint/CanvasSettingsDialog';
import { CURATED_REFERENCES, ReferenceVideoModal, type ReferenceVideoItem } from '@/components/paint/ReferenceVideoModal';
import { ReferenceComparisonModal } from '@/components/paint/ReferenceComparisonModal';
import { ReferenceOverlay } from '@/components/paint/ReferenceOverlay';
import { NewProjectModal } from '@/components/paint/NewProjectModal';
import { HistoryManager, type LayerSnapshot } from '@/lib/paint/history';
import { createLayerCanvas, processBrushTextureImage, applyBrightnessContrast, applyHueSaturation, cloneCanvas, flattenLayers, renderThumbnail, tintSilhouette, invertMask, maskToSelection, maskBounds } from '@/lib/paint/engine';
import { createBuiltinBrushLibrary } from '@/lib/paint/builtinBrushes';
import { ExportModal } from '@/components/paint/ExportModal';
import { AdjustmentsDialog } from '@/components/paint/AdjustmentsDialog';
import { ToonBoomStoryboardTimeline } from '@/components/paint/ToonBoomStoryboardTimeline';
import { CanvasScriptDock } from '@/components/paint/CanvasScriptDock';
import {
  serializeProject,
  deserializeProject,
  downloadProject,
  readProjectFile,
  autosaveProject,
  loadAutosavedProject,
} from '@/lib/paint/persistence';
import type { Layer, ToolType, BrushSettings, BlendMode, CustomBrushTexture, Selection, SymmetryMode, Frame, CameraMove, OnionShift, CanvasGuideMode } from '@/lib/paint/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Clapperboard, Pin, PinOff, Film, Eye, Split, X, Camera, Radio, FlipHorizontal2, Play, Pause, ChevronLeft, ChevronRight, RotateCcw, RotateCw, Move, Video, Grid3x3 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

/** An autosave newer than this reopens silently (e.g. a refresh); older ones prompt. */
const RESUME_SILENTLY_WITHIN_MS = 30 * 60 * 1000;

function formatAgo(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 48) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
}

const DEFAULT_CANVAS_SIZE = { width: 1920, height: 1080 };

function createLayer(name: string, size: { width: number; height: number }): Layer {
  return {
    id: nanoid(),
    name,
    canvas: createLayerCanvas(size.width, size.height),
    visible: true,
    opacity: 1,
    blendMode: 'source-over',
  };
}

export default function PaintPage() {
  const { toast } = useToast();
  // Layers hold real <canvas> elements, which only exist client-side —
  // start empty and create the first layer after mount to avoid SSR errors.
  const [workspaceMode, setWorkspaceMode] = useState<PaintWorkspaceMode>('drawing');
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>('');
  const [tool, setTool] = useState<ToolType>('brush');
  const [brush, setBrush] = useState<BrushSettings>({
    size: 24,
    opacity: 1,
    hardness: 0.85,
    color: '#111111',
    pressureSize: true,
    pressureOpacity: false,
    minPressureFactor: 0.35,
    smoothing: 0.3,
    tolerance: 32,
    smudgeStrength: 0.6,
    secondaryColor: '#ffffff',
    gradientType: 'linear',
    exposure: 0.4,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 400,
    fontItalic: false,
    lineHeight: 1.2,
    textAlign: 'left',
  });
  const [zoom, setZoom] = useState(0.6);
  const [selection, setSelection] = useState<Selection | null>(null);
  // Bumping this tells PaintCanvas to forget its clone-stamp source point.
  const [cloneSourceResetToken, setCloneSourceResetToken] = useState(0);

  const handleInvertSelection = useCallback(() => {
    setSelection((prev) => (prev ? maskToSelection(invertMask(prev.mask)) : prev));
  }, []);
  const [, forceRender] = useState(0);
  const [customTextures, setCustomTextures] = useState<CustomBrushTexture[]>([]);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [symmetry, setSymmetry] = useState<SymmetryMode>('none');
  const [maskTargetLayerId, setMaskTargetLayerId] = useState<string | null>(null);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);

  // Live Maya / Blender Viewport Stream-to-Drawover state
  const [viewportStream, setViewportStream] = useState<MediaStream | null>(null);
  const [viewportOpacity, setViewportOpacity] = useState<number>(0.85);
  const viewportVideoRef = useRef<HTMLVideoElement | null>(null);

  const stopViewportStream = useCallback(() => {
    setViewportStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((t) => t.stop());
      }
      return null;
    });
  }, []);

  const handleToggleViewportStream = useCallback(async () => {
    if (viewportStream) {
      stopViewportStream();
      toast({ title: 'Viewport Stream Stopped', description: 'Disconnected live Maya / Blender viewport feed.' });
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      toast({
        title: 'Screen capture unavailable',
        description: 'Please open Paint Studio in Chrome or Edge on desktop to stream Maya or Blender.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60, max: 60 } },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener('ended', () => {
          setViewportStream(null);
        });
      }
      setViewportStream(stream);
      toast({
        title: 'Live Maya / Blender Viewport Connected!',
        description: 'Draw arcs, silhouettes & notes directly over your live 3D viewport — or click Freeze Frame.',
      });
    } catch {
      // User cancelled window picker
    }
  }, [viewportStream, stopViewportStream, toast]);

  useEffect(() => {
    const vid = viewportVideoRef.current;
    if (!vid) return;
    if (viewportStream) {
      vid.srcObject = viewportStream;
      vid.play().catch(() => {});
    } else {
      vid.srcObject = null;
    }
  }, [viewportStream]);

  useEffect(() => {
    return () => {
      if (viewportStream) {
        viewportStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [viewportStream]);

  const handleFreezeViewportFrame = useCallback(() => {
    const vid = viewportVideoRef.current;
    if (!vid || vid.readyState < 2) {
      toast({ title: 'Waiting for viewport frame…', variant: 'destructive' });
      return;
    }
    const snapLayer = createLayer(`Viewport Snap ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`, canvasSize);
    const ctx = snapLayer.canvas.getContext('2d');
    if (ctx) {
      const vw = vid.videoWidth || canvasSize.width;
      const vh = vid.videoHeight || canvasSize.height;
      const scale = Math.min(canvasSize.width / vw, canvasSize.height / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      ctx.drawImage(vid, (canvasSize.width - dw) / 2, (canvasSize.height - dh) / 2, dw, dh);
    }
    // Insert frozen snapshot as bottom reference layer and keep user drawing on top
    setLayers((prev) => [snapLayer, ...prev]);
    toast({
      title: 'Viewport Frame Frozen to Layer!',
      description: 'Saved as a bottom layer so you can keep drawing or export your breakdown.',
    });
  }, [canvasSize, toast]);
  // `frames` holds every OTHER frame's committed state; the currently-active
  // frame's live/in-progress edits live in `layers`/`activeLayerId` above
  // and only get written back into frames[activeFrameIndex] at explicit
  // switch points (see handleSwitchFrame and friends) — mirroring every
  // stroke into a second array on every pointermove would be wasteful.
  const [frames, setFrames] = useState<Frame[]>([]);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [onionSkinEnabled, setOnionSkinEnabled] = useState(false);
  const [onionSkinOpacity, setOnionSkinOpacity] = useState(0.3);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);

  const handleUploadAudio = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      setAudioBuffer(decoded);
      setAudioFileName(file.name);
    } catch {
      // Audio decoding fallback
    }
  };

  const handleSetPoseType = (frameIdx: number, type: 'key' | 'extreme' | 'breakdown' | 'inbetween') => {
    setFrames((prev) => {
      const copy = [...prev];
      if (copy[frameIdx]) {
        copy[frameIdx] = { ...copy[frameIdx], poseType: type };
      }
      return copy;
    });
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(24);
  const fpsRef = useRef(fps);
  fpsRef.current = fps;
  const panContainerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showCanvasSettings, setShowCanvasSettings] = useState(false);
  const pendingZoomAnchorRef = useRef<{ oldZoom: number; canvasX: number; canvasY: number; mouseX: number; mouseY: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Keeps whatever content point was under the cursor fixed on screen while
  // zooming — matches Krita/Figma/Photoshop's zoom-to-cursor behavior.
  // Only the canvas itself scales with zoom; the 45vh/45vw spacer padding
  // around it is fixed, so we anchor on canvas-local coordinates (padding
  // subtracted out) rather than assuming the whole scrollable content
  // scales uniformly — that wrong assumption was the source of drift.
  useLayoutEffect(() => {
    const pending = pendingZoomAnchorRef.current;
    const container = panContainerRef.current;
    const spacer = spacerRef.current;
    if (!pending || !container || !spacer) return;
    const padLeft = parseFloat(getComputedStyle(spacer).paddingLeft);
    const padTop = parseFloat(getComputedStyle(spacer).paddingTop);
    container.scrollLeft = padLeft + pending.canvasX * zoom - pending.mouseX;
    container.scrollTop = padTop + pending.canvasY * zoom - pending.mouseY;
    pendingZoomAnchorRef.current = null;
  }, [zoom]);

  const hasCenteredRef = useRef(false);

  // Exact pixel-accurate canvas centering helper — accounts for CSS `transform: scale(zoom)`
  // with `transformOrigin: '0 0'` inside the padded pan spacer so the visible canvas is
  // ALWAYS dead-center in the stage viewport regardless of zoom, timeline, or sidebars.
  const centerCanvasAtZoom = useCallback(
    (targetZoom?: number) => {
      const container = panContainerRef.current;
      const spacer = spacerRef.current;
      if (!container || !spacer) return;
      const padLeft = parseFloat(getComputedStyle(spacer).paddingLeft) || 0;
      const padTop = parseFloat(getComputedStyle(spacer).paddingTop) || 0;
      const z = targetZoom ?? zoomRef.current;
      container.scrollLeft = Math.max(0, padLeft + (canvasSize.width * z) / 2 - container.clientWidth / 2);
      container.scrollTop = Math.max(0, padTop + (canvasSize.height * z) / 2 - container.clientHeight / 2);
    },
    [canvasSize.width, canvasSize.height]
  );

  // Compute optimal zoom so the full canvas fits comfortably in the middle of the stage
  const fitAndCenterCanvas = useCallback(() => {
    const container = panContainerRef.current;
    if (!container || container.clientWidth === 0 || container.clientHeight === 0) return;
    const availW = Math.max(240, container.clientWidth - 160);
    const availH = Math.max(200, container.clientHeight - 100);
    const bestZoom = Math.max(0.15, Math.min(1.2, Math.min(availW / canvasSize.width, availH / canvasSize.height)));
    const rounded = Math.round(bestZoom * 100) / 100;
    pendingZoomAnchorRef.current = null;
    setZoom(rounded);
    requestAnimationFrame(() => centerCanvasAtZoom(rounded));
  }, [canvasSize.width, canvasSize.height, centerCanvasAtZoom]);

  // Zoom anchored to the exact center of the viewport (used by +/-/100% buttons & Ctrl +/-)
  const zoomAroundViewportCenter = useCallback((nextZoom: number) => {
    const container = panContainerRef.current;
    const spacer = spacerRef.current;
    if (!container || !spacer) {
      setZoom(nextZoom);
      return;
    }
    const padLeft = parseFloat(getComputedStyle(spacer).paddingLeft) || 0;
    const padTop = parseFloat(getComputedStyle(spacer).paddingTop) || 0;
    const oldZoom = zoomRef.current;
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    pendingZoomAnchorRef.current = {
      oldZoom,
      canvasX: (container.scrollLeft + centerX - padLeft) / oldZoom,
      canvasY: (container.scrollTop + centerY - padTop) / oldZoom,
      mouseX: centerX,
      mouseY: centerY,
    };
    setZoom(nextZoom);
  }, []);

  // Auto-fit & center on initial mount and whenever canvas dimensions change
  useLayoutEffect(() => {
    const container = panContainerRef.current;
    if (!container) return;
    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true;
      fitAndCenterCanvas();
    }
  }, [canvasSize, activeLayerId, fitAndCenterCanvas]);

  // Keep canvas centered whenever the stage container resizes (window resize, opening/closing
  // the Animation timeline, switching workspaces, or toggling the Layers panel)
  useEffect(() => {
    const container = panContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    let lastW = container.clientWidth;
    let lastH = container.clientHeight;
    const ro = new ResizeObserver(() => {
      const nextW = container.clientWidth;
      const nextH = container.clientHeight;
      if (nextW === 0 || nextH === 0) return;
      if (Math.abs(nextW - lastW) > 2 || Math.abs(nextH - lastH) > 2) {
        lastW = nextW;
        lastH = nextH;
        if (!isPanningRef.current) {
          centerCanvasAtZoom();
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [centerCanvasAtZoom, activeLayerId]);

  // Plain scroll-wheel zoom. Attached manually with { passive: false } —
  // React's JSX onWheel prop is registered passive, so e.preventDefault()
  // inside it silently fails and the browser's native wheel-scroll runs
  // alongside our computed scroll position, causing drift (most visible on
  // the vertical axis, since a plain wheel gesture only scrolls natively
  // in Y). Reads zoom via a ref to avoid re-binding the listener every zoom.
  useEffect(() => {
    const container = panContainerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const spacer = spacerRef.current;
      if (!spacer) return;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const padLeft = parseFloat(getComputedStyle(spacer).paddingLeft);
      const padTop = parseFloat(getComputedStyle(spacer).paddingTop);
      const oldZoom = zoomRef.current;
      pendingZoomAnchorRef.current = {
        oldZoom,
        canvasX: (container.scrollLeft + mouseX - padLeft) / oldZoom,
        canvasY: (container.scrollTop + mouseY - padTop) / oldZoom,
        mouseX,
        mouseY,
      };
      // Multiplicative (exponential) step, not additive — a flat +/-0.08 per
      // tick feels wildly inconsistent across zoom levels (a huge relative
      // jump at 10%, barely perceptible at 400%). Scaling by the current
      // zoom instead keeps each tick feeling like the same proportional
      // step at any zoom level, matching Photoshop/Figma/Krita scroll-zoom.
      // Delta is clamped so an unusually large wheel/trackpad burst can't
      // cause a jarring single-event jump.
      const clampedDelta = Math.max(-100, Math.min(100, e.deltaY));
      const factor = Math.exp(-clampedDelta * 0.0015);
      setZoom((z) => Math.max(0.05, Math.min(4, z * factor)));
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [activeLayerId]);

  const addRecentColor = useCallback((hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    setRecentColors((prev) => {
      const next = [hex, ...prev.filter((c) => c.toLowerCase() !== hex.toLowerCase())];
      return next.slice(0, 16);
    });
  }, []);

  const handleUploadTexture = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const processed = processBrushTextureImage(img);
      const texture: CustomBrushTexture = {
        id: nanoid(),
        name: file.name,
        canvas: processed,
        thumbnail: processed.toDataURL('image/png'),
      };
      setCustomTextures((prev) => [...prev, texture]);
      setBrush((prev) => ({ ...prev, textureId: texture.id }));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, []);

  // An older autosave the user hasn't chosen to continue or discard yet.
  const [resumeOffer, setResumeOffer] = useState<{ project: Awaited<ReturnType<typeof loadAutosavedProject>>; savedAt: number | null } | null>(null);
  const resumeOfferRef = useRef(resumeOffer);
  resumeOfferRef.current = resumeOffer;

  const restoreProject = useCallback(async (saved: NonNullable<Awaited<ReturnType<typeof loadAutosavedProject>>>): Promise<boolean> => {
    try {
      const restored = await deserializeProject(saved);
      const active = restored.frames[restored.activeFrameIndex];
      setFrames(restored.frames);
      setActiveFrameIndex(restored.activeFrameIndex);
      setLayers(active.layers);
      setActiveLayerId(active.activeLayerId);
      setCanvasSize(restored.canvasSize);
      if (restored.fps) setFps(restored.fps);
      setCustomTextures(createBuiltinBrushLibrary());
      return true;
    } catch {
      // Corrupt/unreadable autosave: start fresh rather than getting stuck loading.
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadAutosavedProject().catch(() => null);
      const savedHasContent = saved && (saved.version === 2 ? saved.frames.length > 0 : saved.layers.length > 0);
      if (!cancelled && savedHasContent) {
        const savedAt = saved!.version === 2 ? saved!.savedAt : null;
        // A refresh mid-session continues silently; after a longer break, ask
        // instead of reopening an old doodle when the user wanted a new canvas.
        const recent = savedAt !== null && Date.now() - savedAt < RESUME_SILENTLY_WITHIN_MS;
        if (recent) {
          if (await restoreProject(saved!)) return;
        } else {
          setResumeOffer({ project: saved, savedAt });
        }
      }
      if (cancelled) return;
      const first = createLayer('Layer 1', DEFAULT_CANVAS_SIZE);
      const ctx = first.canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, first.canvas.width, first.canvas.height);
      const firstFrame: Frame = { id: nanoid(), name: 'Frame 1', layers: [first], activeLayerId: first.id };
      setFrames([firstFrame]);
      setActiveFrameIndex(0);
      setLayers([first]);
      setActiveLayerId(first.id);
      setCustomTextures(createBuiltinBrushLibrary());
    })();
    return () => { cancelled = true; };
  }, []);

  const historyRef = useRef(new HistoryManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const refreshHistoryButtons = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  const layersRef = useRef(layers);
  layersRef.current = layers;
  const canvasSizeRef = useRef(canvasSize);
  canvasSizeRef.current = canvasSize;
  const activeLayerIdRef = useRef(activeLayerId);
  activeLayerIdRef.current = activeLayerId;
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const activeFrameIndexRef = useRef(activeFrameIndex);
  activeFrameIndexRef.current = activeFrameIndex;
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The current frame's live edits only live in `layers`/`activeLayerId` —
  // frames[activeFrameIndex] is patched with them here whenever something
  // needs the full up-to-date document (autosave, save/export, frame nav).
  const framesWithLiveActive = useCallback((): Frame[] => {
    return framesRef.current.map((f, i) =>
      i === activeFrameIndexRef.current ? { 
        ...f, 
        layers: layersRef.current, 
        activeLayerId: activeLayerIdRef.current,
        thumbnail: renderThumbnail(layersRef.current, canvasSizeRef.current.width, canvasSizeRef.current.height)
      } : f
    );
  }, []);

  // Debounced — canvas-to-dataURL on every layer is too expensive to run on
  // every single pointermove, so this waits for a lull in activity instead
  // of firing on each stroke segment.
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      // Don't overwrite an older drawing the user hasn't decided about yet.
      if (resumeOfferRef.current) return;
      const project = serializeProject(framesWithLiveActive(), canvasSizeRef.current, activeFrameIndexRef.current, fpsRef.current, { reuseInactiveFrames: true });
      autosaveProject(project).catch(() => {});
    }, 1500);
  }, [framesWithLiveActive]);

  const handleBeforeStroke = useCallback(() => {
    historyRef.current.snapshot(layersRef.current);
    refreshHistoryButtons();
  }, [refreshHistoryButtons]);

  const handleAfterStroke = useCallback(() => {
    forceRender((n) => n + 1); // refresh layer thumbnails
    setFrames(framesWithLiveActive());
    scheduleAutosave();
  }, [scheduleAutosave, framesWithLiveActive]);

  const applySnapshot = (snapshot: LayerSnapshot[]) => {
    const restored: Layer[] = snapshot.map((s) => ({
      id: s.id,
      name: s.name,
      visible: s.visible,
      opacity: s.opacity,
      blendMode: s.blendMode,
      canvas: s.canvas,
      alphaLocked: s.alphaLocked,
      mask: s.mask,
      maskEnabled: s.maskEnabled,
    }));
    setLayers(restored);
    if (!restored.find((l) => l.id === activeLayerId) && restored.length > 0) {
      setActiveLayerId(restored[restored.length - 1].id);
    }
  };

  const handleUndo = () => {
    const snap = historyRef.current.undo(layersRef.current);
    if (snap) applySnapshot(snap);
    refreshHistoryButtons();
  };

  const handleRedo = () => {
    const snap = historyRef.current.redo(layersRef.current);
    if (snap) applySnapshot(snap);
    refreshHistoryButtons();
  };

  // Keyboard shortcuts — mirrors Photoshop's paint-tool conventions.
  useEffect(() => {
    // Photoshop letter assignments. Shift+key cycles to the second tool in a
    // group, the way Photoshop's own tool groups do.
    const shortcuts: Record<string, ToolType> = {
      b: 'brush', e: 'eraser', g: 'fill', f: 'lassoFill', i: 'eyedropper',
      r: 'smudge', o: 'dodge', m: 'select', l: 'lasso', w: 'magicWand',
      s: 'cloneStamp', u: 'rectangle', t: 'text', v: 'move',
    };
    const shiftShortcuts: Record<string, ToolType> = {
      r: 'blur', o: 'burn', l: 'polyLasso', u: 'ellipse', g: 'gradient',
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
        return;
      }

      // Selection shortcuts, matching Photoshop.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setSelection(null);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleInvertSelection();
        return;
      }

      // ArrowLeft / ArrowRight frame & storyboard panel stepping
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeFrameIndexRef.current > 0) {
          handleSwitchFrame(activeFrameIndexRef.current - 1);
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSwitchFrame(activeFrameIndexRef.current + 1);
        return;
      }

      // Escape deselects — Photoshop/Krita convention for getting out of an
      // active selection without having to switch tools.
      if (e.key === 'Escape') {
        setSelection(null);
        return;
      }

      // Ctrl/Cmd+D also deselects (Photoshop's actual shortcut for it).
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setSelection(null);
        return;
      }

      // Ctrl/Cmd +/- to zoom around center, Ctrl/Cmd+0 to fit & center canvas.
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomAroundViewportCenter(Math.min(3, Math.round((zoomRef.current + 0.1) * 100) / 100));
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          zoomAroundViewportCenter(Math.max(0.1, Math.round((zoomRef.current - 0.1) * 100) / 100));
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          fitAndCenterCanvas();
          return;
        }
      }

      // [ / ] brush size, Shift+[ / Shift+] hardness (Photoshop convention)
      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const sign = e.key === ']' ? 1 : -1;
        if (e.shiftKey) {
          setBrush((b) => ({ ...b, hardness: Math.max(0, Math.min(1, b.hardness + sign * 0.05)) }));
        } else {
          setBrush((b) => ({ ...b, size: Math.max(1, Math.min(400, Math.round(b.size * (1 + sign * 0.15)))) }));
        }
        return;
      }

      // Number keys set opacity like Photoshop (1=10% ... 9=90%, 0=100%)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const pct = e.key === '0' ? 100 : Number(e.key) * 10;
        setBrush((b) => ({ ...b, opacity: pct / 100 }));
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); // stop page scroll
        setIsSpaceHeld(true);
        return;
      }

      const key = e.key.toLowerCase();
      const mapped = e.shiftKey ? shiftShortcuts[key] : shortcuts[key];
      if (mapped) setTool(mapped);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse-Centered Zoom Handler (Zoom directly towards mouse pointer location like Photoshop & Figma)
  useEffect(() => {
    const el = panContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Zoom when Ctrl, Cmd, or Alt is held, OR on pinch-zoom / trackpad wheel zoom
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
        setZoom((prevZoom) => {
          const newZoom = Math.min(3.0, Math.max(0.1, prevZoom * zoomFactor));
          if (Math.abs(newZoom - prevZoom) < 0.001) return prevZoom;

          // Calculate exact cursor coordinates relative to container
          const rect = el.getBoundingClientRect();
          const cursorX = e.clientX - rect.left;
          const cursorY = e.clientY - rect.top;

          // Anchor point calculation
          const contentX = (cursorX + el.scrollLeft) / prevZoom;
          const contentY = (cursorY + el.scrollTop) / prevZoom;

          const nextScrollLeft = contentX * newZoom - cursorX;
          const nextScrollTop = contentY * newZoom - cursorY;

          requestAnimationFrame(() => {
            el.scrollLeft = nextScrollLeft;
            el.scrollTop = nextScrollTop;
          });

          return newZoom;
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleAddLayer = () => {
    handleBeforeStroke();
    const newLayer = createLayer(`Layer ${layers.length + 1}`, canvasSize);
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const handleDeleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    handleBeforeStroke();
    const idx = layers.findIndex((l) => l.id === id);
    const next = layers.filter((l) => l.id !== id);
    setLayers(next);
    if (activeLayerId === id) {
      setActiveLayerId(next[Math.max(0, idx - 1)].id);
    }
  };

  const handleDuplicateLayer = (id: string) => {
    const source = layers.find((l) => l.id === id);
    if (!source) return;
    handleBeforeStroke();
    const clone = createLayer(`${source.name} copy`, canvasSize);
    clone.canvas.getContext('2d')!.drawImage(source.canvas, 0, 0);
    clone.opacity = source.opacity;
    clone.blendMode = source.blendMode;
    const idx = layers.findIndex((l) => l.id === id);
    const next = [...layers];
    next.splice(idx + 1, 0, clone);
    setLayers(next);
    setActiveLayerId(clone.id);
  };

  const handleToggleVisibility = (id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  };

  const handleRenameLayer = (id: string, name: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, opacity } : l)));
  };

  const handleBlendModeChange = (id: string, blendMode: BlendMode) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, blendMode } : l)));
  };

  const handleToggleAlphaLock = (id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, alphaLocked: !l.alphaLocked } : l)));
  };

  const handleToggleClipped = (id: string) => {
    setLayers((prev) => {
      if (prev[0]?.id === id) return prev; // bottom layer cannot clip to anything below
      return prev.map((l) => (l.id === id ? { ...l, clippedToBelow: !l.clippedToBelow } : l));
    });
    scheduleAutosave();
  };

  const handleToggleReference = (id: string) => {
    setLayers((prev) => {
      const target = prev.find((l) => l.id === id);
      const nextVal = !target?.isReference;
      // Only one Reference Layer active at a time (Procreate / Toon Boom behavior)
      return prev.map((l) => ({ ...l, isReference: l.id === id ? nextVal : false }));
    });
    scheduleAutosave();
  };

  const handleAddMask = (id: string) => {
    handleBeforeStroke();
    setLayers((prev) => prev.map((l) => {
      if (l.id !== id || l.mask) return l;
      const mask = createLayerCanvas(l.canvas.width, l.canvas.height);
      const ctx = mask.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, mask.width, mask.height);
      return { ...l, mask, maskEnabled: true };
    }));
    setMaskTargetLayerId(id);
  };

  const handleDeleteMask = (id: string) => {
    handleBeforeStroke();
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, mask: undefined, maskEnabled: undefined } : l)));
    setMaskTargetLayerId((cur) => (cur === id ? null : cur));
  };

  const handleToggleMaskEnabled = (id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, maskEnabled: l.maskEnabled === false } : l)));
  };

  const handleSelectMaskTarget = (id: string | null) => {
    setMaskTargetLayerId(id);
    if (id) setActiveLayerId(id);
  };

  const handleApplyAdjustment = (kind: 'brightness-contrast' | 'hue-saturation', values: { a: number; b: number; c?: number }) => {
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;
    handleBeforeStroke();
    if (kind === 'brightness-contrast') {
      applyBrightnessContrast(layer.canvas, values.a, values.b);
    } else {
      applyHueSaturation(layer.canvas, values.a, values.b, values.c ?? 0);
    }
    // The canvas pixels were mutated in place, so PaintCanvas's redraw
    // effect (keyed on the `layers` array reference) won't fire on its own —
    // it needs a new array reference to notice anything changed.
    setLayers((prev) => [...prev]);
    handleAfterStroke();
  };

  const handleReorder = (id: string, direction: 'up' | 'down') => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const swapWith = direction === 'up' ? idx + 1 : idx - 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  };

  // Frame navigation resets undo history and any active selection/mask
  // target — those are working-state for whatever frame you're on, not
  // meaningful once you've moved to a different drawing.
  const scrollPosRef = useRef({ left: 0, top: 0 });
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  useLayoutEffect(() => {
    if (panContainerRef.current && !isPlayingRef.current && !isPanningRef.current) {
      if (scrollPosRef.current.left !== 0 || scrollPosRef.current.top !== 0) {
        panContainerRef.current.scrollLeft = scrollPosRef.current.left;
        panContainerRef.current.scrollTop = scrollPosRef.current.top;
      }
    }
  }, [activeFrameIndex]);

  const enterFrame = (index: number, updatedFrames: Frame[]) => {
    if (panContainerRef.current) {
      scrollPosRef.current = {
        left: panContainerRef.current.scrollLeft,
        top: panContainerRef.current.scrollTop,
      };
    }

    const target = updatedFrames[index];
    setFrames(updatedFrames);
    setLayers(target.layers);
    setActiveLayerId(target.activeLayerId);
    setActiveFrameIndex(index);
    historyRef.current.clear();
    refreshHistoryButtons();
    setSelection(null);
    setMaskTargetLayerId(null);
  };

  const handleSwitchFrame = (index: number) => {
    if (index < 0) return;
    const currentFrames = framesWithLiveActive();
    if (index < currentFrames.length) {
      enterFrame(index, currentFrames);
    } else {
      // Auto-generate keyframes up to target index so animators can scrub to any video frame tick
      const updated = [...currentFrames];
      while (updated.length <= index) {
        const newLayer = createLayer('Layer 1', canvasSize);
        updated.push({
          id: nanoid(),
          name: `Frame ${updated.length + 1}`,
          layers: [newLayer],
          activeLayerId: newLayer.id,
        });
      }
      enterFrame(index, updated);
    }
  };

  const handleAddFrame = () => {
    const newLayer = createLayer('Layer 1', canvasSize);
    const newFrame: Frame = { id: nanoid(), name: `Frame ${frames.length + 1}`, layers: [newLayer], activeLayerId: newLayer.id };
    const updated = framesWithLiveActive();
    updated.splice(activeFrameIndex + 1, 0, newFrame);
    enterFrame(activeFrameIndex + 1, updated);
  };

  const handleDuplicateFrame = () => {
    const clonedLayers = layers.map((l) => ({
      ...l,
      id: nanoid(),
      canvas: cloneCanvas(l.canvas),
      mask: l.mask ? cloneCanvas(l.mask) : undefined,
    }));
    const sourceIdx = layers.findIndex((l) => l.id === activeLayerId);
    const newActiveId = clonedLayers[sourceIdx]?.id ?? clonedLayers[clonedLayers.length - 1]?.id ?? '';
    const newFrame: Frame = { id: nanoid(), name: `Frame ${frames.length + 1}`, layers: clonedLayers, activeLayerId: newActiveId };
    const updated = framesWithLiveActive();
    updated.splice(activeFrameIndex + 1, 0, newFrame);
    enterFrame(activeFrameIndex + 1, updated);
  };

  // Extend Exposure / Hold Cel (Callipeg & Toon Boom Style F5 — increments exposure without duplicating canvases)
  const handleExtendFrame = () => {
    const current = frames[activeFrameIndex];
    if (!current) return;
    const nextHold = Math.min(24, (current.holdFrames ?? 1) + 1);
    handleSetFrameHold(activeFrameIndex, nextHold);
  };

  // Set exposure duration (holdFrames) for a single cel (1 = on 1s, 2 = on 2s, 3 = on 3s, etc.)
  const handleSetFrameHold = (frameIdx: number, holdFrames: number) => {
    const clamped = Math.max(1, Math.min(24, Math.round(holdFrames)));
    setFrames((prev) => {
      if (!prev[frameIdx]) return prev;
      const next = prev.map((f, i) => (i === frameIdx ? { ...f, holdFrames: clamped } : f));
      framesRef.current = next;
      return next;
    });
    scheduleAutosave();
  };

  // Apply uniform exposure timing (On 1s / On 2s / On 3s) across all cels in one click
  const handleApplyGlobalHold = (holdFrames: number) => {
    const clamped = Math.max(1, Math.min(24, Math.round(holdFrames)));
    setFrames((prev) => {
      const next = prev.map((f) => ({ ...f, holdFrames: clamped }));
      framesRef.current = next;
      return next;
    });
    scheduleAutosave();
  };

  // Merge Cels (Combines artwork from active frame and next frame into 1 keyframe)
  const handleMergeFrames = () => {
    if (activeFrameIndex >= frames.length - 1) return;
    const current = frames[activeFrameIndex];
    const next = frames[activeFrameIndex + 1];
    if (!current || !next) return;

    const mergedLayers = current.layers.map((l, i) => {
      const targetCanvas = cloneCanvas(l.canvas);
      const ctx = targetCanvas.getContext('2d')!;
      const nextLayer = next.layers[i];
      if (nextLayer) {
        ctx.drawImage(nextLayer.canvas, 0, 0);
      }
      return { ...l, canvas: targetCanvas };
    });

    const mergedFrame: Frame = {
      id: current.id,
      name: `${current.name} + Merged`,
      layers: mergedLayers,
      activeLayerId: current.activeLayerId,
    };

    const updated = framesWithLiveActive();
    updated.splice(activeFrameIndex, 2, mergedFrame);
    enterFrame(activeFrameIndex, updated);
  };

  const handleDeleteFrame = () => {
    if (frames.length <= 1) return;
    const updated = frames.filter((_, i) => i !== activeFrameIndex);
    enterFrame(Math.min(activeFrameIndex, updated.length - 1), updated);
  };

  const [canvasFlipped, setCanvasFlipped] = useState(false);
  const [canvasRotation, setCanvasRotation] = useState(0);
  const [transformSession, setTransformSession] = useState<FreeTransformSession | null>(null);
  const [canvasRedrawToken, setCanvasRedrawToken] = useState(0);
  const [showCameraOverlay, setShowCameraOverlay] = useState(false);
  const [guideMode, setGuideMode] = useState<CanvasGuideMode>('none');
  const [onionShift, setOnionShift] = useState<OnionShift>({ dx: 0, dy: 0, rotDeg: 0 });
  const audioPlaybackCtxRef = useRef<AudioContext | null>(null);
  const audioPlaybackSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Update 2D Storyboard Pro Camera Move on active frame
  const handleUpdateCameraMove = useCallback((nextMove: CameraMove) => {
    setFrames((prev) => {
      const idx = activeFrameIndexRef.current;
      if (!prev[idx]) return prev;
      const next = prev.map((f, i) => (i === idx ? { ...f, cameraMove: nextMove } : f));
      framesRef.current = next;
      return next;
    });
    scheduleAutosave();
  }, []);

  const handleToggleCameraOverlay = useCallback(() => {
    setShowCameraOverlay((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        const idx = activeFrameIndexRef.current;
        if (!framesRef.current[idx]?.cameraMove) {
          handleUpdateCameraMove({ ...DEFAULT_CAMERA_MOVE });
        }
      }
      return nextOpen;
    });
  }, [handleUpdateCameraMove]);

  // Start Free Transform (Ctrl+T / Alt+T / Transform button) on active selection or active layer
  const startFreeTransform = useCallback(() => {
    if (transformSession) return;
    const activeLayer = layersRef.current.find((l) => l.id === activeLayerIdRef.current);
    if (!activeLayer || activeLayer.locked || !activeLayer.visible) {
      toast({ title: 'Layer is locked or hidden', variant: 'destructive' });
      return;
    }

    const backupLayerCanvas = cloneCanvas(activeLayer.canvas);
    let bounds: { x: number; y: number; w: number; h: number };
    let sourceCanvas: HTMLCanvasElement;

    if (selection && selection.w > 0 && selection.h > 0) {
      bounds = { x: selection.x, y: selection.y, w: selection.w, h: selection.h };
      // Extract only the pixels inside the selection mask
      const masked = cloneCanvas(activeLayer.canvas);
      const mCtx = masked.getContext('2d')!;
      mCtx.globalCompositeOperation = 'destination-in';
      mCtx.drawImage(selection.mask, 0, 0);

      sourceCanvas = createLayerCanvas(bounds.w, bounds.h);
      sourceCanvas.getContext('2d')!.drawImage(masked, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);

      // Clear selected pixels from active layer while floating
      const lCtx = activeLayer.canvas.getContext('2d')!;
      lCtx.save();
      lCtx.globalCompositeOperation = 'destination-out';
      lCtx.drawImage(selection.mask, 0, 0);
      lCtx.restore();
    } else {
      bounds = maskBounds(activeLayer.canvas);
      if (bounds.w <= 0 || bounds.h <= 0) {
        toast({ title: 'Nothing to transform on this layer', description: 'Draw something first, then press Alt+T or click Transform.' });
        return;
      }
      sourceCanvas = createLayerCanvas(bounds.w, bounds.h);
      sourceCanvas.getContext('2d')!.drawImage(activeLayer.canvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);
      activeLayer.canvas.getContext('2d')!.clearRect(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
    }

    handleBeforeStroke();
    setTransformSession({
      layerId: activeLayer.id,
      sourceCanvas,
      backupLayerCanvas,
      ...bounds,
    });
    setCanvasRedrawToken((t) => t + 1);
  }, [transformSession, selection, toast]);

  const applyFreeTransform = useCallback((result: FreeTransformResult) => {
    if (!transformSession) return;
    const layer = layersRef.current.find((l) => l.id === transformSession.layerId);
    if (layer) {
      const ctx = layer.canvas.getContext('2d')!;
      ctx.save();
      ctx.translate(result.cx, result.cy);
      ctx.rotate((result.rotationDeg * Math.PI) / 180);
      ctx.scale(result.scaleX, result.scaleY);
      ctx.drawImage(transformSession.sourceCanvas, -transformSession.w / 2, -transformSession.h / 2);
      ctx.restore();
    }
    setTransformSession(null);
    setSelection(null);
    setCanvasRedrawToken((t) => t + 1);
    handleAfterStroke();
  }, [transformSession]);

  const cancelFreeTransform = useCallback(() => {
    if (!transformSession) return;
    const layer = layersRef.current.find((l) => l.id === transformSession.layerId);
    if (layer) {
      const ctx = layer.canvas.getContext('2d')!;
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      ctx.drawImage(transformSession.backupLayerCanvas, 0, 0);
    }
    setTransformSession(null);
    setCanvasRedrawToken((t) => t + 1);
  }, [transformSession]);

  // Callipeg / Procreate / Harmony shortcuts:
  // 'H' = Flip Canvas Horizontal | 'Alt+R' = Reset Rotation | 'Ctrl/Alt+T' = Free Transform
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) return;

      if ((e.ctrlKey || e.metaKey || e.altKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        startFreeTransform();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setCanvasRotation(0);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setCanvasFlipped((prev) => !prev);
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        setBrush((b) => ({ ...b, color: b.secondaryColor, secondaryColor: b.color }));
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleToggleCameraOverlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startFreeTransform, handleToggleCameraOverlay]);

  const displayFrames = useMemo(
    () => frames.map((f, i) => (i === activeFrameIndex ? { ...f, layers, activeLayerId } : f)),
    [frames, activeFrameIndex, layers, activeLayerId]
  );

  const handleResizeCanvas = (width: number, height: number) => {
    handleBeforeStroke();
    const resized = layers.map((layer) => {
      const canvas = createLayerCanvas(width, height);
      const ctx = canvas.getContext('2d')!;
      // Scale existing artwork to fit the new resolution (image-resize
      // semantics), not a crop — matches picking a new canvas resolution.
      ctx.drawImage(layer.canvas, 0, 0, layer.canvas.width, layer.canvas.height, 0, 0, width, height);
      return { ...layer, canvas };
    });
    setLayers(resized);
    setCanvasSize({ width, height });
  };

  const handleExport = () => {
    const composite = createLayerCanvas(canvasSize.width, canvasSize.height);
    const ctx = composite.getContext('2d')!;
    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
    const link = document.createElement('a');
    link.download = 'animation-reference-artwork.png';
    link.href = composite.toDataURL('image/png');
    link.click();
  };

  const handleSaveProject = () => {
    downloadProject(serializeProject(framesWithLiveActive(), canvasSize, activeFrameIndex));
  };

  const handleLoadProject = async (file: File) => {
    try {
      const parsed = await readProjectFile(file);
      const restored = await deserializeProject(parsed);
      const active = restored.frames[restored.activeFrameIndex];
      historyRef.current.clear();
      refreshHistoryButtons();
      setSelection(null);
      setMaskTargetLayerId(null);
      setFrames(restored.frames);
      setActiveFrameIndex(restored.activeFrameIndex);
      setLayers(active.layers);
      setActiveLayerId(active.activeLayerId);
      setCanvasSize(restored.canvasSize);
    } catch {
      window.alert('Could not open that file — it may not be a valid Paint Studio project.');
    }
  };

  const [isBrushStudioOpen, setIsBrushStudioOpen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [activeReferenceVideo, setActiveReferenceVideo] = useState<ReferenceVideoItem | null>(null);
  const [isPinnedToCanvas, setIsPinnedToCanvas] = useState(false);
  const [tracingOpacity, setTracingOpacity] = useState(0.45);
  const [refVideoDuration, setRefVideoDuration] = useState(0);
  const [isScrubbingRefVideo, setIsScrubbingRefVideo] = useState(false);
  const [hoverRefFrame, setHoverRefFrame] = useState<number | null>(null);
  const canvasBgVideoRef = useRef<HTMLVideoElement>(null);
  const refScrubTrackRef = useRef<HTMLDivElement>(null);
  const pendingRefSeekTimeRef = useRef<number | null>(null);
  const refScrubRafRef = useRef<number | null>(null);

  // Decode-safe, non-blocking smooth seek queue (prevents browser decoder backlog during fast Toon Boom scrubbing)
  const seekPinnedVideoSmooth = useCallback((targetTime: number) => {
    const video = canvasBgVideoRef.current;
    if (!video) return;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const clamped = duration > 0 ? Math.max(0, Math.min(duration - 0.001, targetTime)) : Math.max(0, targetTime);

    if (video.seeking) {
      pendingRefSeekTimeRef.current = clamped;
      return;
    }
    pendingRefSeekTimeRef.current = null;
    if (Math.abs(video.currentTime - clamped) > 0.004) {
      try {
        video.currentTime = clamped;
      } catch {
        // Ignore seek before metadata ready
      }
    }
  }, []);

  const handlePinnedVideoSeeked = useCallback(() => {
    const queued = pendingRefSeekTimeRef.current;
    if (queued === null) return;
    pendingRefSeekTimeRef.current = null;
    const video = canvasBgVideoRef.current;
    if (video && Math.abs(video.currentTime - queued) > 0.004) {
      try {
        video.currentTime = queued;
      } catch {
        // Ignore
      }
    }
  }, []);

  // Initialize a fresh clean transparent animation project
  const handleCreateNewProject = (settings: { name: string; canvasSize: { width: number; height: number }; fps: number }) => {
    setCanvasSize(settings.canvasSize);
    setFps(settings.fps);

    // 1. Create a fresh clean white paper layer
    const initialLayer = createLayer('Layer 1', settings.canvasSize);
    const ctx = initialLayer.canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, settings.canvasSize.width, settings.canvasSize.height);
    }

    const initialFrame: Frame = {
      id: nanoid(),
      name: 'Frame 1',
      layers: [initialLayer],
      activeLayerId: initialLayer.id,
    };

    // 2. Update state and refs synchronously to prevent autosave race conditions
    layersRef.current = [initialLayer];
    activeLayerIdRef.current = initialLayer.id;
    framesRef.current = [initialFrame];
    activeFrameIndexRef.current = 0;

    setFrames([initialFrame]);
    setActiveFrameIndex(0);
    setLayers([initialLayer]);
    setActiveLayerId(initialLayer.id);
    setActiveReferenceVideo(null);
    setIsPinnedToCanvas(false);
    setAudioBuffer(null);
    setAudioFileName(null);
    setSelection(null);
    setMaskTargetLayerId(null);

    // 3. Reset undo/redo history and seed with new clean state
    historyRef.current.clear();
    historyRef.current.snapshot([initialLayer]);
    refreshHistoryButtons();

    // 4. Overwrite autosave with fresh new project
    const cleanProject = serializeProject([initialFrame], settings.canvasSize, 0, settings.fps);
    autosaveProject(cleanProject).catch(() => {});

    toast({
      title: "New File Created 🎨",
      description: `Created fresh ${settings.name} (${settings.canvasSize.width}x${settings.canvasSize.height} @ ${settings.fps} FPS)`,
    });
  };

  // ──────────────── DEEP-LINKED REFERENCE VIDEO INITIALIZER ────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const refUrl = params.get('refVideoUrl');
    if (!refUrl) return;

    const refTitle = params.get('refTitle');
    const refId = params.get('refId');
    const pinned = params.get('pinned');
    const refFps = params.get('fps');

    const item: ReferenceVideoItem = {
      id: refId || 'ref-imported',
      title: refTitle ? decodeURIComponent(refTitle) : 'Reference Clip',
      videoUrl: decodeURIComponent(refUrl),
      category: 'Reference'
    };

    setActiveReferenceVideo(item);
    setIsPinnedToCanvas(pinned !== 'false');
    setIsTimelineOpen(true);

    if (refFps) {
      const parsedFps = parseInt(refFps, 10);
      if (!isNaN(parsedFps) && parsedFps > 0) setFps(parsedFps);
    }

    toast({
      title: "Reference Video Pinned 🎬",
      description: `Loaded "${item.title}". Draw poses, arcs & spacing directly over frames.`,
    });
  }, [toast]);

  // Auto-generate animation timeline keyframes to match the reference video length
  useEffect(() => {
    if (activeReferenceVideo) {
      const targetFrameCount = Math.max(24, Math.round(fps * 3)); // Auto-populate 3+ seconds of animation frames
      setFrames((prevFrames) => {
        if (prevFrames.length >= targetFrameCount) return prevFrames;
        const newFrames = [...prevFrames];
        while (newFrames.length < targetFrameCount) {
          const newLayer = createLayer('Layer 1', canvasSize);
          newFrames.push({
            id: nanoid(),
            name: `Frame ${newFrames.length + 1}`,
            layers: [newLayer],
            activeLayerId: newLayer.id,
          });
        }
        return newFrames;
      });
    }
  }, [activeReferenceVideo, fps, canvasSize]);

  const [loopStart, setLoopStart] = useState<number>(0);
  const [loopEnd, setLoopEnd] = useState<number>(0);

  const loopStartRef = useRef(loopStart);
  loopStartRef.current = loopStart;
  const loopEndRef = useRef(loopEnd);
  loopEndRef.current = loopEnd;

  // ──────────────── HIGH-PRECISION REQUESTANIMATIONFRAME PLAYBACK ENGINE ────────────────
  const lastFrameTimeRef = useRef<number>(0);
  const playheadRafRef = useRef<number | null>(null);
  const holdTickRef = useRef<number>(0);

  useEffect(() => {
    holdTickRef.current = 0;
    if (!isPlaying || frames.length <= 1) {
      if (playheadRafRef.current) cancelAnimationFrame(playheadRafRef.current);
      return;
    }

    // Commit any live strokes on the current frame ONCE before playback begins —
    // never clone `frames` or call `setFrames` inside the 24/60fps playback tick!
    const initialIdx = activeFrameIndexRef.current;
    const committed = framesRef.current.map((f, i) =>
      i === initialIdx ? { ...f, layers: layersRef.current, activeLayerId: activeLayerIdRef.current } : f
    );
    framesRef.current = committed;
    setFrames(committed);

    const frameInterval = 1000 / Math.max(1, fps);
    lastFrameTimeRef.current = performance.now();

    const loop = (now: number) => {
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed >= frameInterval) {
        lastFrameTimeRef.current = now - (elapsed % frameInterval);

        const total = framesRef.current.length;
        if (total > 1) {
          const curIdx = activeFrameIndexRef.current;
          const curHold = Math.max(1, framesRef.current[curIdx]?.holdFrames ?? 1);
          holdTickRef.current += 1;

          if (holdTickRef.current >= curHold) {
            holdTickRef.current = 0;
            const start = Math.max(0, Math.min(loopStartRef.current, total - 1));
            const end = Math.max(start, Math.min(loopEndRef.current > 0 ? loopEndRef.current : total - 1, total - 1));

            let nextIdx = curIdx + 1;
            if (nextIdx < start || nextIdx > end) {
              nextIdx = start;
            }

            const target = framesRef.current[nextIdx] || framesRef.current[0];
            layersRef.current = target.layers;
            activeLayerIdRef.current = target.activeLayerId;
            activeFrameIndexRef.current = nextIdx;

            setLayers(target.layers);
            setActiveLayerId(target.activeLayerId);
            setActiveFrameIndex(nextIdx);
          }
        }
      }
      playheadRafRef.current = requestAnimationFrame(loop);
    };

    playheadRafRef.current = requestAnimationFrame(loop);

    return () => {
      if (playheadRafRef.current) cancelAnimationFrame(playheadRafRef.current);
    };
  }, [isPlaying, fps, frames.length]);

  // Cumulative timeline exposure tick for the active cel (respects Callipeg holdFrames)
  const activeExposureTick = useMemo(() => {
    let tick = 0;
    for (let i = 0; i < activeFrameIndex && i < frames.length; i++) {
      tick += Math.max(1, frames[i]?.holdFrames ?? 1);
    }
    return tick;
  }, [frames, activeFrameIndex]);

  const totalPinnedRefFrames = useMemo(() => {
    const fromDuration = refVideoDuration > 0 ? Math.max(2, Math.round(refVideoDuration * Math.max(1, fps))) : 0;
    return Math.max(frames.length, fromDuration, 24);
  }, [refVideoDuration, fps, frames.length]);

  // 100% Frame-Locked Background Reference Video Sync to Timeline Playhead (decode-safe smooth seek)
  useEffect(() => {
    const video = canvasBgVideoRef.current;
    if (!isPinnedToCanvas || !video) return;

    try {
      if (!video.paused) video.pause();
    } catch {
      // Fallback
    }

    const targetTime = activeExposureTick / Math.max(1, fps);
    seekPinnedVideoSmooth(targetTime);
  }, [isPinnedToCanvas, activeExposureTick, fps, seekPinnedVideoSmooth]);

  // Real Synced Web Audio Playback (plays uploaded dialogue/music track in lockstep with timeline playhead)
  useEffect(() => {
    const stopAudio = () => {
      if (audioPlaybackSourceRef.current) {
        try {
          audioPlaybackSourceRef.current.stop();
        } catch {}
        audioPlaybackSourceRef.current.disconnect();
        audioPlaybackSourceRef.current = null;
      }
    };

    if (!isPlaying || !audioBuffer) {
      stopAudio();
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioPlaybackCtxRef.current) {
        audioPlaybackCtxRef.current = new AudioCtx();
      }
      const ctx = audioPlaybackCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      stopAudio();
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      const startOffset = Math.max(0, Math.min(audioBuffer.duration - 0.01, activeExposureTick / Math.max(1, fps)));
      source.start(0, startOffset);
      audioPlaybackSourceRef.current = source;
    } catch {
      // Ignore audio autoplay blocks
    }

    return stopAudio;
    // Intentionally start/stop on playback state or new audio buffer (avoid restarting on every frame tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, audioBuffer, fps]);

  // Silky-smooth 60fps Toon Boom scrubber pointer drag for pinned reference video
  const scrubPinnedRefFromClientX = useCallback(
    (clientX: number) => {
      const track = refScrubTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
      const targetFrame = Math.max(0, Math.min(totalPinnedRefFrames - 1, Math.round(pct * (totalPinnedRefFrames - 1))));
      setHoverRefFrame(targetFrame);

      if (refScrubRafRef.current) cancelAnimationFrame(refScrubRafRef.current);
      refScrubRafRef.current = requestAnimationFrame(() => {
        const targetTime = targetFrame / Math.max(1, fpsRef.current);
        seekPinnedVideoSmooth(targetTime);
        if (targetFrame !== activeFrameIndexRef.current) {
          handleSwitchFrame(targetFrame);
        }
      });
    },
    [totalPinnedRefFrames, seekPinnedVideoSmooth]
  );

  const handlePinnedRefScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (isPlaying) setIsPlaying(false);
    setIsScrubbingRefVideo(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    scrubPinnedRefFromClientX(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbingRefVideo) return;
    const onMove = (ev: PointerEvent) => {
      scrubPinnedRefFromClientX(ev.clientX);
    };
    const onUp = () => {
      setIsScrubbingRefVideo(false);
      setHoverRefFrame(null);
      if (refScrubRafRef.current) cancelAnimationFrame(refScrubRafRef.current);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (refScrubRafRef.current) cancelAnimationFrame(refScrubRafRef.current);
    };
  }, [isScrubbingRefVideo, scrubPinnedRefFromClientX]);

  // Callipeg-style Multi-Frame Color-Tinted Onion Skin Ghosts:
  // Auto-paused during playback (zero 1920x1080 GC churn at 24fps, crisp motion like Toon Boom/Callipeg!)
  const onionSkinPrevCanvas = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (!onionSkinEnabled || isPlaying || activeFrameIndex <= 0) return null;
    const cvs = createLayerCanvas(canvasSize.width, canvasSize.height);
    const ctx = cvs.getContext('2d')!;
    let hasContent = false;
    const offsets: Array<{ delta: number; alpha: number }> = [
      { delta: -2, alpha: 0.42 },
      { delta: -1, alpha: 1.0 },
    ];
    for (const { delta, alpha } of offsets) {
      const targetFrame = frames[activeFrameIndex + delta];
      if (!targetFrame || !targetFrame.layers || targetFrame.layers.length === 0) continue;
      const flat = flattenLayers(targetFrame.layers, canvasSize.width, canvasSize.height, false);
      const tinted = tintSilhouette(flat, '#f43f5e');
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(tinted, 0, 0);
      ctx.restore();
      hasContent = true;
    }
    return hasContent ? cvs : null;
  }, [onionSkinEnabled, isPlaying, activeFrameIndex, frames, canvasSize]);

  const onionSkinNextCanvas = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (!onionSkinEnabled || isPlaying || activeFrameIndex >= frames.length - 1) return null;
    const cvs = createLayerCanvas(canvasSize.width, canvasSize.height);
    const ctx = cvs.getContext('2d')!;
    let hasContent = false;
    const offsets: Array<{ delta: number; alpha: number }> = [
      { delta: 2, alpha: 0.42 },
      { delta: 1, alpha: 1.0 },
    ];
    for (const { delta, alpha } of offsets) {
      const targetFrame = frames[activeFrameIndex + delta];
      if (!targetFrame || !targetFrame.layers || targetFrame.layers.length === 0) continue;
      const flat = flattenLayers(targetFrame.layers, canvasSize.width, canvasSize.height, false);
      const tinted = tintSilhouette(flat, '#06b6d4');
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(tinted, 0, 0);
      ctx.restore();
      hasContent = true;
    }
    return hasContent ? cvs : null;
  }, [onionSkinEnabled, isPlaying, activeFrameIndex, frames, canvasSize]);

  const handleLoadProjectFile = async (file: File) => {
    try {
      const raw = await readProjectFile(file);
      const restored = await deserializeProject(raw);
      
      setCanvasSize(restored.canvasSize);
      if (restored.fps) setFps(restored.fps);
      setFrames(restored.frames);
      setActiveFrameIndex(restored.activeFrameIndex);

      const activeFrame = restored.frames[restored.activeFrameIndex] || restored.frames[0];
      if (activeFrame) {
        setLayers(activeFrame.layers);
        setActiveLayerId(activeFrame.activeLayerId);
      }

      framesRef.current = restored.frames;
      layersRef.current = activeFrame ? activeFrame.layers : [];
      activeLayerIdRef.current = activeFrame ? activeFrame.activeLayerId : '';
      activeFrameIndexRef.current = restored.activeFrameIndex;

      historyRef.current.clear();
      if (activeFrame) historyRef.current.snapshot(activeFrame.layers);
      refreshHistoryButtons();
      setSelection(null);
      setMaskTargetLayerId(null);

      toast({
        title: "Project File Loaded 🎬",
        description: `Loaded ${file.name} (${restored.frames.length} cels @ ${restored.canvasSize.width}x${restored.canvasSize.height})`,
      });
    } catch (err) {
      window.alert('Could not open that file — please select a valid .animref or .json project file.');
    }
  };

  const handleSelectWorkspaceMode = useCallback(
    (mode: PaintWorkspaceMode) => {
      setWorkspaceMode(mode);
      if (mode === 'drawing') {
        setIsTimelineOpen(false);
        setIsLayersPanelOpen(true);
        setOnionSkinEnabled(false);
      } else if (mode === 'storyboard') {
        setIsTimelineOpen(true);
        setOnionSkinEnabled(false);
      } else if (mode === 'animation') {
        setIsTimelineOpen(true);
        setOnionSkinEnabled(true);
      } else if (mode === 'breakdown') {
        setIsTimelineOpen(true);
        setOnionSkinEnabled(false);
        // Switch immediately to crisp bright vector drawover pen for fast motion analysis
        setTool('brush');
        setBrush((prev) => ({
          ...prev,
          vectorSmooth: true,
          textureId: undefined,
          size: Math.min(prev.size, 10),
          hardness: 1,
          smoothing: 0.45,
          color: prev.color === '#111111' ? '#ef4444' : prev.color,
        }));
      }
    },
    []
  );

  if (layers.length === 0 || !activeLayerId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0d0d12] text-zinc-500 text-sm font-semibold">
        Loading Procreate Dreams Studio…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0d0d12] text-white overflow-hidden select-none">
      
      {/* ──────────────── PROCREATE DREAMS GLASS HEADER ──────────────── */}
      <ProcreateHeader
        tool={tool}
        onToolChange={setTool}
        brush={brush}
        onBrushChange={setBrush}
        onOpenColorPicker={(x, y) => setContextMenuPos({ x, y })}
        onToggleBrushStudio={() => setIsBrushStudioOpen(!isBrushStudioOpen)}
        isBrushStudioOpen={isBrushStudioOpen}
        onToggleLayersPanel={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
        isLayersPanelOpen={isLayersPanelOpen}
        onToggleTimeline={() => setIsTimelineOpen(!isTimelineOpen)}
        isTimelineOpen={isTimelineOpen}
        onOpenAdjustments={() => setShowAdjustments(true)}
        onNewProject={() => setShowNewProjectModal(true)}
        onOpenProjectFile={handleLoadProjectFile}
        onOpenExport={() => setShowExportModal(true)}
        onPublishToPortfolio={() => setShowExportModal(true)}
        onOpenReferenceModal={() => setShowReferenceModal(true)}
        hasActiveReference={Boolean(activeReferenceVideo)}
        isViewportStreaming={Boolean(viewportStream)}
        onToggleViewportStream={handleToggleViewportStream}
        workspaceMode={workspaceMode}
        onSelectWorkspaceMode={handleSelectWorkspaceMode}
        onPrevBoard={() => {
          if (activeFrameIndex > 0) {
            handleSwitchFrame(activeFrameIndex - 1);
          }
        }}
        onNextBoard={() => {
          handleSwitchFrame(activeFrameIndex + 1);
        }}
        currentBoardLabel={`Panel ${activeFrameIndex + 1} / ${frames.length}`}
      />

      {/* ──────────────── MAIN WORKSPACE CANVAS ──────────────── */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* ──────────────── BREAKDOWN WORKSPACE QUICK-ACTION BAR ──────────────── */}
        {workspaceMode === 'breakdown' && !viewportStream && !isPinnedToCanvas && (
          <div
            data-ui-panel="true"
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-400/35 bg-[#110f1f]/95 px-3.5 py-2 text-xs font-bold text-white shadow-[0_18px_45px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 pr-1">
              Breakdown Kit
            </span>
            <button
              type="button"
              onClick={handleToggleViewportStream}
              className="inline-flex h-7 items-center gap-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 px-2.5 text-[11px] font-extrabold text-cyan-100 transition cursor-pointer"
            >
              <Radio className="h-3.5 w-3.5 text-cyan-300" />
              <span>Stream Maya / Blender</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReferenceModal(true)}
              className="inline-flex h-7 items-center gap-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/35 border border-violet-400/40 px-2.5 text-[11px] font-extrabold text-violet-100 transition cursor-pointer"
            >
              <Film className="h-3.5 w-3.5 text-violet-300" />
              <span>Pin Reference Video</span>
            </button>
            <button
              type="button"
              onClick={() => setShowComparisonModal(true)}
              className="inline-flex h-7 items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-2.5 text-[11px] font-bold text-zinc-100 transition cursor-pointer"
            >
              <Split className="h-3.5 w-3.5 text-zinc-300" />
              <span>Compare</span>
            </button>

            <div className="w-px h-4 bg-white/15 mx-0.5" />

            {/* 1-Click Vector Drawover Analysis Pens */}
            {[
              { label: 'Arc', color: '#ef4444' },
              { label: 'Line of Action', color: '#38bdf8' },
              { label: 'Spacing', color: '#f59e0b' },
              { label: 'Silhouette', color: '#a855f7' },
            ].map((pen) => (
              <button
                key={pen.label}
                type="button"
                onClick={() => {
                  setTool('brush');
                  setBrush((b) => ({
                    ...b,
                    color: pen.color,
                    vectorSmooth: true,
                    textureId: undefined,
                    hardness: 1,
                    size: 7,
                    smoothing: 0.45,
                  }));
                }}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 text-[10px] font-bold text-zinc-200 hover:border-white/40 hover:text-white transition cursor-pointer"
                title={`Switch to ${pen.label} Vector Pen`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pen.color }} />
                <span>{pen.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ──────────────── LIVE MAYA / BLENDER VIEWPORT CONTROLS BAR ──────────────── */}
        {viewportStream && (
          <div className="absolute top-4 left-24 z-40 flex items-center gap-3 bg-[#101828]/95 backdrop-blur-3xl border border-emerald-400/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] px-4 py-2 text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-400 animate-pulse shrink-0" />
              <span className="text-emerald-200 text-xs">Maya / Blender Live</span>
            </div>

            <div className="w-px h-4 bg-white/15" />

            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <Eye className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
              <input
                type="range"
                min={0.15}
                max={1}
                step={0.05}
                value={viewportOpacity}
                onChange={(e) => setViewportOpacity(parseFloat(e.target.value))}
                className="w-20 h-1 accent-cyan-400 cursor-pointer"
              />
              <span className="text-cyan-200 font-bold min-w-[32px]">{Math.round(viewportOpacity * 100)}%</span>
            </div>

            <div className="w-px h-4 bg-white/15" />

            <button
              onClick={handleFreezeViewportFrame}
              className="px-2.5 py-1.5 rounded-xl bg-violet-600/35 hover:bg-violet-600 border border-violet-400/50 text-violet-100 hover:text-white transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5"
              title="Snapshot the current 3D viewport frame onto a locked bottom layer"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Freeze Frame</span>
            </button>

            <button
              onClick={stopViewportStream}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 border border-rose-400/40 text-rose-200 hover:text-white transition-all cursor-pointer text-xs font-bold flex items-center gap-1"
              title="Stop live viewport stream"
            >
              <X className="h-3.5 w-3.5" />
              <span>Stop</span>
            </button>
          </div>
        )}

        {/* ──────────────── TOON BOOM PINNED REFERENCE SCRUBBER & CONTROLS BAR ──────────────── */}
        {isPinnedToCanvas && activeReferenceVideo && (
          <div
            data-ui-panel="true"
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 bg-[#12111d]/95 backdrop-blur-3xl border border-purple-500/45 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] px-3.5 py-2 text-xs font-bold text-white max-w-[92vw]"
          >
            {/* Video Title */}
            <div className="flex items-center gap-1.5 max-w-[140px] shrink-0">
              <Pin className="h-3.5 w-3.5 text-purple-400 fill-purple-400 shrink-0" />
              <span className="truncate text-white text-[11px]" title={activeReferenceVideo.title}>
                {activeReferenceVideo.title}
              </span>
            </div>

            <div className="w-px h-4 bg-white/15 shrink-0" />

            {/* Play / Pause & -1f / +1f Frame Steppers */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                  isPlaying
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "bg-purple-600 text-white hover:bg-purple-500"
                )}
                title={isPlaying ? "Pause (Space)" : "Play Synced Reference & Drawover (Space)"}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isPlaying) setIsPlaying(false);
                  handleSwitchFrame(Math.max(0, activeFrameIndex - 1));
                }}
                className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Previous Frame (←)"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isPlaying) setIsPlaying(false);
                  handleSwitchFrame(Math.min(totalPinnedRefFrames - 1, activeFrameIndex + 1));
                }}
                className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Next Frame (→)"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Silky-Smooth Toon Boom Scrub Rail */}
            <div className="flex items-center gap-2 min-w-[180px] sm:min-w-[260px]">
              <div
                ref={refScrubTrackRef}
                onPointerDown={handlePinnedRefScrubPointerDown}
                onPointerMove={(e) => {
                  if (isScrubbingRefVideo) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
                  setHoverRefFrame(Math.round(pct * (totalPinnedRefFrames - 1)));
                }}
                onPointerLeave={() => {
                  if (!isScrubbingRefVideo) setHoverRefFrame(null);
                }}
                className="relative flex-1 h-6 flex items-center cursor-ew-resize touch-none select-none group"
                title="Drag to scrub pinned reference video & drawover frames smoothly"
              >
                {/* Track Background */}
                <div className="w-full h-2 rounded-full bg-white/10 border border-white/10 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, (activeExposureTick / Math.max(1, totalPinnedRefFrames - 1)) * 100))}%`,
                    }}
                  />
                </div>

                {/* Playhead Thumb */}
                <div
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.9)] pointer-events-none transition-transform",
                    isScrubbingRefVideo ? "scale-125" : "group-hover:scale-110"
                  )}
                  style={{
                    left: `${Math.min(100, Math.max(0, (activeExposureTick / Math.max(1, totalPinnedRefFrames - 1)) * 100))}%`,
                  }}
                />

                {/* Hover / Scrub Frame Pill */}
                {hoverRefFrame !== null && (
                  <div
                    className="absolute -bottom-6 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 border border-purple-400/50 text-[9px] font-mono font-black text-purple-200 pointer-events-none whitespace-nowrap shadow-lg"
                    style={{
                      left: `${Math.min(100, Math.max(0, (hoverRefFrame / Math.max(1, totalPinnedRefFrames - 1)) * 100))}%`,
                    }}
                  >
                    F{String(hoverRefFrame + 1).padStart(3, '0')}
                  </div>
                )}
              </div>

              <span className="text-[10px] font-mono font-black text-purple-200 bg-purple-500/15 border border-purple-400/30 rounded-lg px-2 py-1 whitespace-nowrap shrink-0">
                F{String(activeExposureTick + 1).padStart(3, '0')} / {String(totalPinnedRefFrames).padStart(3, '0')}
              </span>
            </div>

            <div className="w-px h-4 bg-white/15 shrink-0" />

            {/* Tracing Opacity Slider */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0" title="Reference Video Opacity">
              <Eye className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={tracingOpacity}
                onChange={(e) => setTracingOpacity(parseFloat(e.target.value))}
                className="w-16 h-1 accent-purple-500 cursor-pointer"
              />
              <span className="text-purple-300 font-bold min-w-[28px]">{Math.round(tracingOpacity * 100)}%</span>
            </div>

            <div className="w-px h-4 bg-white/15 shrink-0" />

            {/* Change / Unpin / Remove */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowReferenceModal(true)}
                className="h-7 px-2 rounded-lg bg-purple-600/25 hover:bg-purple-600 border border-purple-400/40 text-purple-200 hover:text-white transition-all cursor-pointer text-[11px] font-bold flex items-center gap-1"
                title="Change reference video"
              >
                <Film className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Change</span>
              </button>
              <button
                onClick={() => setIsPinnedToCanvas(false)}
                className="h-7 px-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer text-[11px] font-bold flex items-center gap-1"
                title="Unpin reference video back to floating window"
              >
                <PinOff className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Unpin</span>
              </button>
              <button
                onClick={() => {
                  setActiveReferenceVideo(null);
                  setIsPinnedToCanvas(false);
                  setRefVideoDuration(0);
                }}
                className="h-7 w-7 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                title="Remove reference video from project"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* PHOTOSHOP / TOON BOOM 9-SLOT LEFT TOOL RAIL */}
        <ProcreateSliderDock
          tool={tool}
          onToolChange={setTool}
          brush={brush}
          onBrushChange={setBrush}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onOpenReferenceModal={() => setShowReferenceModal(true)}
          onOpenColorPicker={(x, y) => setContextMenuPos({ x, y })}
          onStartTransform={startFreeTransform}
          isTransforming={Boolean(transformSession)}
          showCameraOverlay={showCameraOverlay}
          onToggleCameraOverlay={handleToggleCameraOverlay}
        />

        <ToolOptionsBar
          tool={tool}
          brush={brush}
          onBrushChange={setBrush}
          selection={selection}
          onDeselect={() => setSelection(null)}
          onInvertSelection={handleInvertSelection}
          onResetCloneSource={() => setCloneSourceResetToken((t) => t + 1)}
          onStartTransform={startFreeTransform}
          referenceLayerName={layers.find((l) => l.visible && l.isReference)?.name ?? null}
        />

        {/* FLOATING PROCREATE BRUSH STUDIO POP-OVER */}
        {isBrushStudioOpen && (
          <ProcreateBrushStudio
            brush={brush}
            onBrushChange={setBrush}
            onClose={() => setIsBrushStudioOpen(false)}
            customTextures={customTextures}
          />
        )}

        {/* WORKSPACE CANVAS STAGE */}
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={panContainerRef}
            className="absolute inset-0 overflow-auto touch-none bg-[#0e0e14] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
            }}
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              // Ignore clicks/touches on floating UI panels, buttons, inputs, sliders, and controls
              if (
                target.closest('[data-ui-panel="true"]') ||
                target.closest('button') ||
                target.closest('input') ||
                target.closest('select') ||
                target.closest('textarea')
              ) {
                return;
              }

              const isDirectStageClick = target === panContainerRef.current || target === spacerRef.current;

              // Allow panning on Spacebar, Middle Mouse, Move/Pan tool, OR direct click & drag on stage background
              if (isSpaceHeld || e.button === 1 || tool === 'move' || isDirectStageClick) {
                e.preventDefault();
                e.stopPropagation();
                isPanningRef.current = true;
                lastPanPointRef.current = { x: e.clientX, y: e.clientY };
                try {
                  (e.currentTarget as Element).setPointerCapture(e.pointerId);
                } catch {
                  // Fallback
                }
              }
            }}
            onPointerMove={(e) => {
              if (!isPanningRef.current || !lastPanPointRef.current || !panContainerRef.current) return;
              e.preventDefault();
              const dx = e.clientX - lastPanPointRef.current.x;
              const dy = e.clientY - lastPanPointRef.current.y;
              panContainerRef.current.scrollLeft -= dx;
              panContainerRef.current.scrollTop -= dy;
              lastPanPointRef.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              isPanningRef.current = false;
              lastPanPointRef.current = null;
              try {
                (e.currentTarget as Element).releasePointerCapture(e.pointerId);
              } catch {
                // Fallback
              }
            }}
            onPointerLeave={() => { isPanningRef.current = false; lastPanPointRef.current = null; }}
            onAuxClick={(e) => { if (e.button === 1) e.preventDefault(); }}
            onClick={(e) => {
              if (e.target === panContainerRef.current || e.target === spacerRef.current) {
                setSelection(null);
              }
            }}
          >
            <div ref={spacerRef} className="inline-block touch-none" style={{ padding: '60vh 60vw' }}>

              {/* ──────────────── PHOTOSHOP-STYLE UNIFORM TRANSFORM SCALED STORYBOARD PAPER SHEET ──────────────── */}
              <div 
                style={{ 
                  width: canvasSize.width, 
                  transform: `scale(${zoom})`, 
                  transformOrigin: '0 0' 
                }} 
                className={cn(
                  "relative z-10 flex flex-col items-center shadow-2xl rounded-2xl overflow-hidden border-2 border-slate-300 transition-none",
                  (isPinnedToCanvas && activeReferenceVideo) || viewportStream ? "bg-black" : "bg-white"
                )}
              >
                {/* Mirrorable & Rotatable Canvas + Video Stage (leaves Storyboard Script Dock un-mirrored) */}
                <div
                  className="relative"
                  style={{
                    width: canvasSize.width,
                    height: canvasSize.height,
                    transform: [
                      canvasRotation ? `rotate(${canvasRotation}deg)` : '',
                      canvasFlipped ? 'scaleX(-1)' : '',
                    ].filter(Boolean).join(' ') || undefined,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Live Maya / Blender 60fps Viewport Stream Overlay (rendered behind transparent drawing canvas) */}
                  {viewportStream && (
                    <div
                      className="absolute top-0 left-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center bg-black"
                      style={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        opacity: viewportOpacity,
                      }}
                    >
                      <video
                        ref={viewportVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* Pinned Tracing Reference Video Overlay (rendered behind drawing canvas) */}
                  {isPinnedToCanvas && activeReferenceVideo && (
                    <div 
                      className="absolute top-0 left-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center bg-black"
                      style={{ 
                        width: canvasSize.width, 
                        height: canvasSize.height,
                        opacity: tracingOpacity 
                      }}
                    >
                      <video
                        ref={canvasBgVideoRef}
                        src={activeReferenceVideo.videoUrl}
                        muted
                        playsInline
                        preload="auto"
                        onSeeked={handlePinnedVideoSeeked}
                        onLoadedMetadata={(e) => {
                          const vid = e.currentTarget;
                          if (vid && vid.duration && vid.duration > 0) {
                            setRefVideoDuration(vid.duration);
                            const totalFrames = Math.max(24, Math.round(vid.duration * fps));
                            setFrames((prev) => {
                              if (prev.length >= totalFrames) return prev;
                              const updated = [...prev];
                              while (updated.length < totalFrames) {
                                const newLayer = createLayer('Layer 1', canvasSize);
                                updated.push({
                                  id: nanoid(),
                                  name: `Frame ${updated.length + 1}`,
                                  layers: [newLayer],
                                  activeLayerId: newLayer.id,
                                });
                              }
                              return updated;
                            });
                            seekPinnedVideoSmooth(activeExposureTick / Math.max(1, fps));
                          }
                        }}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <PaintCanvas
                    layers={layers}
                    activeLayerId={activeLayerId}
                    tool={tool}
                    brush={brush}
                    canvasSize={canvasSize}
                    zoom={1}
                    onBeforeStroke={handleBeforeStroke}
                    onAfterStroke={handleAfterStroke}
                    onEyedropperPick={(hex) => { setBrush((b) => ({ ...b, color: hex })); addRecentColor(hex); }}
                    selection={selection}
                    onSelectionChange={setSelection}
                    customTextures={customTextures}
                    onRequestContextMenu={(x, y) => setContextMenuPos({ x, y })}
                    isSpaceHeld={isSpaceHeld}
                    maskTargetLayerId={maskTargetLayerId}
                    symmetry={symmetry}
                    cloneSourceResetToken={cloneSourceResetToken}
                    onionSkinPrev={onionSkinPrevCanvas}
                    onionSkinNext={onionSkinNextCanvas}
                    onionSkinOpacity={onionSkinOpacity}
                    onionShift={onionShift}
                    hasBackgroundVideo={(isPinnedToCanvas && !!activeReferenceVideo) || Boolean(viewportStream)}
                    flipped={canvasFlipped}
                    rotationDeg={canvasRotation}
                    stageZoom={zoom}
                    redrawToken={canvasRedrawToken}
                  />

                  <CanvasGuidesOverlay
                    mode={guideMode}
                    width={canvasSize.width}
                    height={canvasSize.height}
                  />

                  {transformSession && (
                    <FreeTransformOverlay
                      session={transformSession}
                      canvasWidth={canvasSize.width}
                      canvasHeight={canvasSize.height}
                      stageZoom={zoom}
                      stageRotationDeg={canvasRotation}
                      stageFlipped={canvasFlipped}
                      onApply={applyFreeTransform}
                      onCancel={cancelFreeTransform}
                    />
                  )}

                  {showCameraOverlay && !transformSession && (
                    <CameraOverlay
                      cameraMove={frames[activeFrameIndex]?.cameraMove || DEFAULT_CAMERA_MOVE}
                      canvasWidth={canvasSize.width}
                      canvasHeight={canvasSize.height}
                      stageZoom={zoom}
                      onChange={handleUpdateCameraMove}
                      onClose={() => setShowCameraOverlay(false)}
                    />
                  )}
                </div>

                {workspaceMode === 'storyboard' && (
                  <div className="w-full border-t-8 border-slate-300 bg-slate-100 mt-0">
                    <CanvasScriptDock
                      shotNumber={`SHOT ${Math.floor(activeFrameIndex / 3) + 1}`}
                      panelNumber={`PANEL ${activeFrameIndex + 1}`}
                      dialogue={frames[activeFrameIndex]?.storyboardScript?.dialogue || ''}
                      onDialogueChange={(val) => {
                        setFrames((prev) => {
                          const next = [...prev];
                          if (next[activeFrameIndex]) {
                            next[activeFrameIndex] = {
                              ...next[activeFrameIndex],
                              storyboardScript: {
                                ...(next[activeFrameIndex].storyboardScript || { dialogue: '', action: '', camera: 'Standard Angle', duration: 2.0 }),
                                dialogue: val,
                              }
                            };
                          }
                          return next;
                        });
                        scheduleAutosave();
                      }}
                      action={frames[activeFrameIndex]?.storyboardScript?.action || ''}
                      onActionChange={(val) => {
                        setFrames((prev) => {
                          const next = [...prev];
                          if (next[activeFrameIndex]) {
                            next[activeFrameIndex] = {
                              ...next[activeFrameIndex],
                              storyboardScript: {
                                ...(next[activeFrameIndex].storyboardScript || { dialogue: '', action: '', camera: 'Standard Angle', duration: 2.0 }),
                                action: val,
                              }
                            };
                          }
                          return next;
                        });
                        scheduleAutosave();
                      }}
                      camera={frames[activeFrameIndex]?.storyboardScript?.camera || 'Standard Angle'}
                      duration={frames[activeFrameIndex]?.storyboardScript?.duration || 2.0}
                      onDurationChange={(val) => {
                        setFrames((prev) => {
                          const next = [...prev];
                          if (next[activeFrameIndex]) {
                            next[activeFrameIndex] = {
                              ...next[activeFrameIndex],
                              storyboardScript: {
                                ...(next[activeFrameIndex].storyboardScript || { dialogue: '', action: '', camera: 'Standard Angle', duration: 2.0 }),
                                duration: val,
                              }
                            };
                          }
                          return next;
                        });
                        scheduleAutosave();
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            {contextMenuPos && (
              <BrushContextMenu
                x={contextMenuPos.x}
                y={contextMenuPos.y}
                brush={brush}
                onBrushChange={setBrush}
                customTextures={customTextures}
                onUploadTexture={handleUploadTexture}
                onClose={() => setContextMenuPos(null)}
                recentColors={recentColors}
                onAddRecentColor={addRecentColor}
              />
            )}
          </div>

          {/* Floating Viewport-Only HUD (Guides, Flip, Rotate, Zoom & Fit) */}
          <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-[#161620]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] px-2 py-1.5 z-40">
            {/* Animation Field & Perspective Guides Cycler */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const order: CanvasGuideMode[] = ['none', 'thirds', 'safe', 'field12', 'persp1', 'persp2'];
                setGuideMode((cur) => order[(order.indexOf(cur) + 1) % order.length]);
              }}
              className={cn(
                "h-8 px-2 rounded-xl text-xs font-bold gap-1 flex items-center transition-colors",
                guideMode !== 'none'
                  ? "bg-sky-500/25 text-sky-200 border border-sky-400/45 hover:bg-sky-500/35 w-auto"
                  : "text-zinc-300 hover:text-white hover:bg-white/10 w-8"
              )}
              title={`Cycle Guides: Rule of Thirds · Action/Title Safe · 12-Field · 1-Pt / 2-Pt Perspective (Current: ${GUIDE_MODE_LABELS[guideMode]})`}
            >
              <Grid3x3 className="h-3.5 w-3.5 shrink-0" />
              {guideMode !== 'none' && (
                <span className="text-[10px] font-mono whitespace-nowrap">{GUIDE_MODE_LABELS[guideMode]}</span>
              )}
            </Button>

            <div className="w-px h-5 bg-white/10" />

            {/* Canvas Rotation Controls (-15° / Angle Reset / +15°) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCanvasRotation((r) => r - 15)}
              className="h-8 w-7 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10"
              title="Rotate Canvas -15°"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            {canvasRotation !== 0 && (
              <button
                onClick={() => setCanvasRotation(0)}
                className="text-[10px] font-mono font-bold px-1.5 py-1 rounded-lg bg-violet-600/30 border border-violet-400/40 text-violet-200 hover:text-white cursor-pointer"
                title="Reset Canvas Rotation to 0° (Alt+R)"
              >
                {canvasRotation}°
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCanvasRotation((r) => r + 15)}
              className="h-8 w-7 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10"
              title="Rotate Canvas +15°"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCanvasFlipped((f) => !f)}
              className={cn(
                "h-8 px-2 rounded-xl text-xs font-bold gap-1 flex items-center transition-colors",
                canvasFlipped
                  ? "bg-violet-600/35 text-violet-200 border border-violet-400/50 hover:bg-violet-600/50 w-auto"
                  : "text-zinc-300 hover:text-white hover:bg-white/10 w-8"
              )}
              title="Flip Canvas Horizontal (H) — check proportions"
            >
              <FlipHorizontal2 className="h-4 w-4 shrink-0" />
              {canvasFlipped && <span className="text-[10px] font-mono tracking-wider">FLIPPED</span>}
            </Button>
            <div className="w-px h-5 bg-white/10" />
            <Button variant="ghost" size="icon" onClick={() => zoomAroundViewportCenter(Math.max(0.05, Math.round((zoom - 0.1) * 100) / 100))} className="h-8 w-8 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10" title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <button
              onClick={() => {
                pendingZoomAnchorRef.current = null;
                setZoom(1);
                requestAnimationFrame(() => centerCanvasAtZoom(1));
              }}
              className="text-xs font-mono font-bold w-14 text-center text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 py-1 rounded-lg border border-white/10 transition-colors cursor-pointer"
              title="Reset to 100% & Center"
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button variant="ghost" size="icon" onClick={() => zoomAroundViewportCenter(Math.min(4, Math.round((zoom + 0.1) * 100) / 100))} className="h-8 w-8 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10" title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={fitAndCenterCanvas} className="h-8 w-8 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10" title="Fit & Center Canvas (Ctrl+0)">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ──────────────── PROCREATE FLOATING LAYERS PANEL ──────────────── */}
        {isLayersPanelOpen && (
          <LayersPanel
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={(id) => { setActiveLayerId(id); setMaskTargetLayerId(null); }}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onToggleVisibility={handleToggleVisibility}
            onRenameLayer={handleRenameLayer}
            onOpacityChange={handleOpacityChange}
            onBlendModeChange={handleBlendModeChange}
            onReorder={handleReorder}
            onToggleAlphaLock={handleToggleAlphaLock}
            onToggleClipped={handleToggleClipped}
            onToggleReference={handleToggleReference}
            onAddMask={handleAddMask}
            onDeleteMask={handleDeleteMask}
            onToggleMaskEnabled={handleToggleMaskEnabled}
            maskTargetLayerId={maskTargetLayerId}
            onSelectMaskTarget={handleSelectMaskTarget}
          />
        )}
      </div>

      {/* ──────────────── PROCREATE DREAMS / TOON BOOM ANIMATION & STORYBOARD TIMELINE ──────────────── */}
      {workspaceMode === 'storyboard' ? (
        <ToonBoomStoryboardTimeline
          panels={frames.map((f, i) => ({
            id: f.id,
            shotNumber: `SHOT ${Math.floor(i / 3) + 1}`,
            panelNumber: `PANEL ${i + 1}`,
            duration: f.storyboardScript?.duration || 2.0,
            dialogue: f.storyboardScript?.dialogue || '',
            action: f.storyboardScript?.action || '',
            camera: f.storyboardScript?.camera || 'Medium Shot',
            imageUrl: f.thumbnail || ''
          }))}
          activeIdx={activeFrameIndex}
          onSelectPanel={(idx) => {
            if (typeof idx === 'number' && idx >= 0 && idx < frames.length) {
              handleSwitchFrame(idx);
            }
          }}
          onAddPanel={handleAddFrame}
          onDeletePanel={(idx) => {
            handleSwitchFrame(idx);
            handleDeleteFrame();
          }}
          onDurationChange={(idx, duration) => {
            setFrames((prev) => {
              const next = [...prev];
              if (next[idx]) {
                next[idx] = {
                  ...next[idx],
                  storyboardScript: {
                    ...(next[idx].storyboardScript || { dialogue: '', action: '', camera: 'Medium Shot', duration: 2.0 }),
                    duration,
                  }
                };
              }
              return next;
            });
            scheduleAutosave();
          }}
          onionSkinEnabled={onionSkinEnabled}
          onToggleOnionSkin={() => setOnionSkinEnabled(!onionSkinEnabled)}
          onionSkinOpacity={onionSkinOpacity}
          onOnionSkinOpacityChange={setOnionSkinOpacity}
        />
      ) : isTimelineOpen && (
        <FramesPanel
          frames={displayFrames}
          activeFrameIndex={activeFrameIndex}
          canvasSize={canvasSize}
          onSelectFrame={handleSwitchFrame}
          onAddFrame={handleAddFrame}
          onDuplicateFrame={handleDuplicateFrame}
          onExtendFrame={handleExtendFrame}
          onMergeFrames={handleMergeFrames}
          onDeleteFrame={handleDeleteFrame}
          onionSkinPrev={onionSkinEnabled}
          onToggleOnionSkinPrev={() => setOnionSkinEnabled(!onionSkinEnabled)}
          onionSkinNext={onionSkinEnabled}
          onToggleOnionSkinNext={() => setOnionSkinEnabled(!onionSkinEnabled)}
          onionSkinOpacity={onionSkinOpacity}
          onOnionSkinOpacityChange={setOnionSkinOpacity}
          onionShift={onionShift}
          onOnionShiftChange={setOnionShift}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          fps={fps}
          onFpsChange={setFps}
          onCloseTimeline={() => setIsTimelineOpen(false)}
          referenceVideoTitle={activeReferenceVideo?.title}
          loopStart={loopStart}
          loopEnd={loopEnd}
          onLoopStartChange={setLoopStart}
          onLoopEndChange={setLoopEnd}
          onSetPoseType={handleSetPoseType}
          onSetFrameHold={handleSetFrameHold}
          onApplyGlobalHold={handleApplyGlobalHold}
          audioBuffer={audioBuffer}
          audioFileName={audioFileName}
          onUploadAudio={handleUploadAudio}
          onRemoveAudio={() => { setAudioBuffer(null); setAudioFileName(null); }}
        />
      )}

      <CanvasSettingsDialog
        open={showCanvasSettings}
        onOpenChange={setShowCanvasSettings}
        currentSize={canvasSize}
        onApply={handleResizeCanvas}
      />

      <AdjustmentsDialog
        open={showAdjustments}
        onOpenChange={setShowAdjustments}
        onApply={handleApplyAdjustment}
      />

      {/* ──────────────── NEW ANIMATION PROJECT MODAL ──────────────── */}
      {showNewProjectModal && (
        <NewProjectModal
          onCreateProject={handleCreateNewProject}
          onClose={() => setShowNewProjectModal(false)}
        />
      )}

      {/* Older autosave found: let the user pick instead of silently reopening it. */}
      {resumeOffer && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="paint-resume-title">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141414] p-6 text-white shadow-2xl">
            <h2 id="paint-resume-title" className="text-lg font-bold">Continue your last drawing?</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {resumeOffer.savedAt ? `You last worked on it ${formatAgo(resumeOffer.savedAt)}.` : 'You have a saved drawing from an earlier session.'}
              {' '}Starting a new canvas replaces it once you draw.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={async () => {
                  const offer = resumeOfferRef.current;
                  setResumeOffer(null);
                  if (offer?.project && !(await restoreProject(offer.project))) {
                    toast({ variant: 'destructive', title: 'Could not open your last drawing', description: 'It may be damaged. A new canvas is ready instead.' });
                  }
                }}
              >
                Continue drawing
              </Button>
              <Button variant="outline" className="flex-1 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => setResumeOffer(null)}>
                New canvas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── FULL MOODBOARD STYLE SAVED REFERENCE LIBRARY MODAL ──────────────── */}
      {showReferenceModal && (
        <ReferenceVideoModal
          onSelectVideo={(video) => {
            setActiveReferenceVideo(video);
            setShowReferenceModal(false);
          }}
          onClose={() => setShowReferenceModal(false)}
        />
      )}

      {/* ──────────────── DUAL SPLIT-SCREEN REFERENCE COMPARISON MODAL ──────────────── */}
      {showComparisonModal && (
        <ReferenceComparisonModal
          isOpen={showComparisonModal}
          onClose={() => setShowComparisonModal(false)}
          primaryVideo={activeReferenceVideo}
          availableVideos={CURATED_REFERENCES}
        />
      )}

      {/* ──────────────── FLOATING TRACING & TIMELINE-SYNCED REFERENCE VIDEO OVERLAY ──────────────── */}
      {activeReferenceVideo && !isPinnedToCanvas && (
        <ReferenceOverlay
          video={activeReferenceVideo}
          activeFrameIndex={activeFrameIndex}
          fps={fps}
          onClose={() => {
            setActiveReferenceVideo(null);
            setIsPinnedToCanvas(false);
          }}
          onOpenLibraryModal={() => setShowReferenceModal(true)}
          onPinToCanvas={() => {
            setIsPinnedToCanvas(true);
            setIsTimelineOpen(true);
          }}
          isPinned={isPinnedToCanvas}
        />
      )}

      {/* ──────────────── GAME-READY EXPORT SUITE MODAL ──────────────── */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        frames={displayFrames}
        canvasSize={canvasSize}
        fps={fps}
        referenceVideo={isPinnedToCanvas && activeReferenceVideo ? { videoUrl: activeReferenceVideo.videoUrl, opacity: tracingOpacity } : null}
      />
    </div>
  );
}
