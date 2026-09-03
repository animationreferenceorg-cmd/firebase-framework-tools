'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { PaintCanvas } from '@/components/paint/PaintCanvas';
import { LayersPanel } from '@/components/paint/LayersPanel';
import { FramesPanel } from '@/components/paint/FramesPanel';
import { ProcreateHeader } from '@/components/paint/ProcreateHeader';
import { ProcreateSliderDock } from '@/components/paint/ProcreateSliderDock';
import { ToolOptionsBar } from '@/components/paint/ToolOptionsBar';
import { ProcreateBrushStudio } from '@/components/paint/ProcreateBrushStudio';
import { BrushContextMenu } from '@/components/paint/BrushContextMenu';
import { CanvasSettingsDialog } from '@/components/paint/CanvasSettingsDialog';
import { ReferenceVideoModal, type ReferenceVideoItem } from '@/components/paint/ReferenceVideoModal';
import { ReferenceComparisonModal } from '@/components/paint/ReferenceComparisonModal';
import { ReferenceOverlay } from '@/components/paint/ReferenceOverlay';
import { NewProjectModal } from '@/components/paint/NewProjectModal';
import { HistoryManager, type LayerSnapshot } from '@/lib/paint/history';
import { createLayerCanvas, processBrushTextureImage, applyBrightnessContrast, applyHueSaturation, cloneCanvas, flattenLayers, tintSilhouette, invertMask, maskToSelection } from '@/lib/paint/engine';
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
import type { Layer, ToolType, BrushSettings, BlendMode, CustomBrushTexture, Selection, SymmetryMode, Frame } from '@/lib/paint/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Clapperboard, Pin, PinOff, Film, Eye, Split, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  const [workspaceMode, setWorkspaceMode] = useState<'animation' | 'storyboard'>('animation');
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
  const [fps, setFps] = useState(6);
  const panContainerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
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

  // Centers the canvas in the viewport on first load and whenever the canvas
  // is resized. Deliberately excludes `zoom` — the zoom-to-cursor effect
  // above owns scroll position during interactive zooming.
  // We use hasCenteredRef so it only runs once when panContainerRef first mounts,
  // instead of depending on activeLayerId which caused the camera to shoot back
  // to the center every time the user added or changed a layer!
  useLayoutEffect(() => {
    const container = panContainerRef.current;
    if (!container) return;
    // We want to re-center if canvasSize changes, but otherwise only once on initial mount
    // To handle canvasSize changes, we could track lastCanvasSize, but for now just centering
    // on first mount is the most critical fix.
    if (!hasCenteredRef.current) {
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
      container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
      hasCenteredRef.current = true;
    }
  }, [canvasSize, activeLayerId]); // Keep activeLayerId in deps so it fires when the loading screen unmounts

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadAutosavedProject().catch(() => null);
      const savedHasContent = saved && (saved.version === 2 ? saved.frames.length > 0 : saved.layers.length > 0);
      if (!cancelled && savedHasContent) {
        try {
          const restored = await deserializeProject(saved!);
          const active = restored.frames[restored.activeFrameIndex];
          setFrames(restored.frames);
          setActiveFrameIndex(restored.activeFrameIndex);
          setLayers(active.layers);
          setActiveLayerId(active.activeLayerId);
          setCanvasSize(restored.canvasSize);
          setCustomTextures(createBuiltinBrushLibrary());
          return;
        } catch {
          // Corrupt/unreadable autosave — fall through to a fresh document
          // rather than leaving the app stuck on the loading screen.
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
        thumbnail: flattenLayers(layersRef.current, canvasSizeRef.current.width, canvasSizeRef.current.height, false).toDataURL('image/png')
      } : f
    );
  }, []);

  // Debounced — canvas-to-dataURL on every layer is too expensive to run on
  // every single pointermove, so this waits for a lull in activity instead
  // of firing on each stroke segment.
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const project = serializeProject(framesWithLiveActive(), canvasSizeRef.current, activeFrameIndexRef.current);
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
      b: 'brush', e: 'eraser', g: 'fill', i: 'eyedropper',
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

      // Ctrl/Cmd +/- to zoom, Ctrl/Cmd+0 to reset to fit-ish default.
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom((z) => Math.min(3, z + 0.1));
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          setZoom((z) => Math.max(0.1, z - 0.1));
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          setZoom(0.6);
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

  // Extend Exposure / Hold Cel (Toon Boom Style F5)
  const handleExtendFrame = () => {
    const current = frames[activeFrameIndex];
    if (!current) return;
    const clonedLayers = current.layers.map((l) => ({
      ...l,
      id: nanoid(),
      canvas: cloneCanvas(l.canvas),
      mask: l.mask ? cloneCanvas(l.mask) : undefined,
    }));
    const newFrame: Frame = { id: nanoid(), name: `${current.name} (Hold)`, layers: clonedLayers, activeLayerId: current.activeLayerId };
    const updated = framesWithLiveActive();
    updated.splice(activeFrameIndex + 1, 0, newFrame);
    enterFrame(activeFrameIndex + 1, updated);
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


  // Tinted, background-excluded silhouettes of the neighboring frames for
  // the onion-skin ghost overlay (see flattenLayers/tintSilhouette).
  // Tinted ghost silhouettes of the neighboring frames for the onion-skin overlay
  const onionSkinPrev = useMemo(() => {
    if (!onionSkinEnabled || activeFrameIndex <= 0) return null;
    const prevFrame = frames[activeFrameIndex - 1];
    if (!prevFrame || prevFrame.layers.length === 0) return null;
    return tintSilhouette(flattenLayers(prevFrame.layers, canvasSize.width, canvasSize.height, false), '#3b82f6');
  }, [onionSkinEnabled, frames, activeFrameIndex, canvasSize]);

  const onionSkinNext = useMemo(() => {
    if (!onionSkinEnabled || activeFrameIndex >= frames.length - 1) return null;
    const nextFrame = frames[activeFrameIndex + 1];
    if (!nextFrame || nextFrame.layers.length === 0) return null;
    return tintSilhouette(flattenLayers(nextFrame.layers, canvasSize.width, canvasSize.height, false), '#f97316');
  }, [onionSkinEnabled, frames, activeFrameIndex, canvasSize]);

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
  const [tracingOpacity, setTracingOpacity] = useState(0.4);
  const canvasBgVideoRef = useRef<HTMLVideoElement>(null);

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
    const cleanProject = serializeProject([initialFrame], settings.canvasSize, 0);
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

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      if (playheadRafRef.current) cancelAnimationFrame(playheadRafRef.current);
      return;
    }

    const frameInterval = 1000 / Math.max(1, fps);
    lastFrameTimeRef.current = performance.now();

    const loop = (now: number) => {
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed >= frameInterval) {
        lastFrameTimeRef.current = now - (elapsed % frameInterval);

        const total = framesRef.current.length;
        if (total > 1) {
          const curIdx = activeFrameIndexRef.current;
          const start = Math.max(0, Math.min(loopStartRef.current, total - 1));
          const end = Math.max(start, Math.min(loopEndRef.current > 0 ? loopEndRef.current : total - 1, total - 1));

          let nextIdx = curIdx + 1;
          if (nextIdx < start || nextIdx > end) {
            nextIdx = start;
          }

          const updated = framesRef.current.map((f, i) =>
            i === curIdx ? { ...f, layers: layersRef.current, activeLayerId: activeLayerIdRef.current } : f
          );
          const target = updated[nextIdx] || updated[0];

          framesRef.current = updated;
          layersRef.current = target.layers;
          activeLayerIdRef.current = target.activeLayerId;
          activeFrameIndexRef.current = nextIdx;

          setFrames(updated);
          setLayers(target.layers);
          setActiveLayerId(target.activeLayerId);
          setActiveFrameIndex(nextIdx);
        }
      }
      playheadRafRef.current = requestAnimationFrame(loop);
    };

    playheadRafRef.current = requestAnimationFrame(loop);

    return () => {
      if (playheadRafRef.current) cancelAnimationFrame(playheadRafRef.current);
    };
  }, [isPlaying, fps, frames.length]);

  // 100% Frame-Locked Background Reference Video Sync to Timeline Playhead & Loop Range
  useEffect(() => {
    const video = canvasBgVideoRef.current;
    if (!isPinnedToCanvas || !video) return;

    // Pause native video playback engine to enforce frame-accurate sync with timeline
    try {
      video.pause();
    } catch {
      // Fallback
    }

    const targetTime = activeFrameIndex / Math.max(1, fps);
    if (Math.abs(video.currentTime - targetTime) > 0.02) {
      video.currentTime = Math.min(video.duration || 0, targetTime);
    }
  }, [isPinnedToCanvas, activeFrameIndex, fps]);

  // Compute Onion Skin Ghost Canvases for Previous (Blue) and Next (Orange) frames
  const onionSkinPrevCanvas = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (!onionSkinEnabled || activeFrameIndex <= 0) return null;
    const prevFrame = frames[activeFrameIndex - 1];
    if (!prevFrame || !prevFrame.layers) return null;
    const cvs = createLayerCanvas(canvasSize.width, canvasSize.height);
    const ctx = cvs.getContext('2d')!;
    for (const layer of prevFrame.layers) {
      if (layer.visible) {
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }
    }
    return cvs;
  }, [onionSkinEnabled, activeFrameIndex, frames, canvasSize]);

  const onionSkinNextCanvas = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (!onionSkinEnabled || activeFrameIndex >= frames.length - 1) return null;
    const nextFrame = frames[activeFrameIndex + 1];
    if (!nextFrame || !nextFrame.layers) return null;
    const cvs = createLayerCanvas(canvasSize.width, canvasSize.height);
    const ctx = cvs.getContext('2d')!;
    for (const layer of nextFrame.layers) {
      if (layer.visible) {
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }
    }
    return cvs;
  }, [onionSkinEnabled, activeFrameIndex, frames, canvasSize]);

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
        workspaceMode={workspaceMode}
        onToggleWorkspaceMode={() => setWorkspaceMode(workspaceMode === 'storyboard' ? 'animation' : 'storyboard')}
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
        
        {/* ──────────────── TOP-LEFT CANVAS REFERENCE CONTROLS BAR ──────────────── */}
        {isPinnedToCanvas && activeReferenceVideo && (
          <div className="absolute top-4 left-24 z-40 flex items-center gap-3 bg-[#161622]/95 backdrop-blur-3xl border border-purple-500/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] px-4 py-2 text-xs font-bold text-white animate-in slide-in-from-left-2 duration-200">
            
            {/* Video Title */}
            <div className="flex items-center gap-2 max-w-[200px]">
              <Pin className="h-4 w-4 text-purple-400 fill-purple-400 shrink-0" />
              <span className="truncate text-white text-xs">{activeReferenceVideo.title}</span>
            </div>

            <div className="w-px h-4 bg-white/15" />

            {/* Tracing Opacity Slider */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <Eye className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={tracingOpacity}
                onChange={(e) => setTracingOpacity(parseFloat(e.target.value))}
                className="w-20 h-1 accent-purple-500 cursor-pointer"
              />
              <span className="text-purple-300 font-bold min-w-[32px]">{Math.round(tracingOpacity * 100)}%</span>
            </div>

            <div className="w-px h-4 bg-white/15" />

            {/* Change / Update Reference Video Button */}
            <button
              onClick={() => setShowReferenceModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 border border-purple-400/40 text-purple-200 hover:text-white transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow"
              title="Change or update reference video"
            >
              <Film className="h-3.5 w-3.5" />
              <span>Change</span>
            </button>

            {/* Unpin Button */}
            <button
              onClick={() => setIsPinnedToCanvas(false)}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5"
              title="Unpin reference video from canvas background"
            >
              <PinOff className="h-3.5 w-3.5" />
              <span>Unpin</span>
            </button>

            {/* Remove / Clear Reference Video Button */}
            <button
              onClick={() => {
                setActiveReferenceVideo(null);
                setIsPinnedToCanvas(false);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white transition-all cursor-pointer text-xs font-bold flex items-center gap-1 shadow"
              title="Remove reference video from project"
            >
              <X className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>

          </div>
        )}

        {/* PROCREATE SIGNATURE FLOATING LEFT SLIDER & TOOL DOCK */}
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
        />

        <ToolOptionsBar
          tool={tool}
          brush={brush}
          onBrushChange={setBrush}
          selection={selection}
          onDeselect={() => setSelection(null)}
          onInvertSelection={handleInvertSelection}
          onResetCloneSource={() => setCloneSourceResetToken((t) => t + 1)}
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
                  isPinnedToCanvas && activeReferenceVideo ? "bg-black" : "bg-white"
                )}
              >
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
                      autoPlay
                      loop
                      onLoadedMetadata={(e) => {
                        const vid = e.currentTarget;
                        if (vid && vid.duration && vid.duration > 0) {
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
                        }
                      }}
                      className="w-full h-full object-cover"
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
                  hasBackgroundVideo={isPinnedToCanvas && !!activeReferenceVideo}
                />

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

          {/* Floating Canvas Zoom HUD */}
          <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-[#161620]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] px-2 py-1.5 z-40">
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.05, z - 0.1))} className="h-8 w-8 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10" title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <button
              onClick={() => setZoom(1)}
              className="text-xs font-mono font-bold w-14 text-center text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 py-1 rounded-lg border border-white/10 transition-colors cursor-pointer"
              title="Reset to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(4, z + 0.1))} className="h-8 w-8 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10" title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom(0.6)} className="h-8 w-8 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10" title="Fit Screen">
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
          availableVideos={[
            { id: '1', title: 'Action Parkour Flip', category: 'Locomotion', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
            { id: '2', title: 'Sword Combat Strike', category: 'Combat', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
            { id: '3', title: 'Heavy Weight Lifting', category: 'Acting', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
          ]}
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
          onPinToCanvas={() => setIsPinnedToCanvas(true)}
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
      />
    </div>
  );
}
