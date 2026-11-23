'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Grid, 
  Video, 
  Image as ImageIcon, 
  Check, 
  Sparkles,
  Film,
  Play,
  Send,
  Loader2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Frame, CanvasSize } from '@/lib/paint/types';
import { createLayerCanvas, compositeLayersToContext } from '@/lib/paint/engine';
import { interpolateCamera } from './CameraOverlay';
import { serializeProject, downloadProject } from '@/lib/paint/persistence';
import { Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { playFramesIntoCanvas, renderFramesWithReference, type ReferenceExportOptions } from '@/lib/paint/reference-export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: Frame[];
  canvasSize: CanvasSize;
  fps: number;
  /** The pinned tracing reference, if any; video exports can include it underneath. */
  referenceVideo?: ReferenceExportOptions | null;
}

export function ExportModal({
  isOpen,
  onClose,
  frames,
  canvasSize,
  fps,
  referenceVideo = null,
}: ExportModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [portfolioTitle, setPortfolioTitle] = useState<string>('');
  // Export the drawing over the reference footage (requested by users), on by default when one is pinned.
  const [includeReference, setIncludeReference] = useState<boolean>(true);
  const withReference = Boolean(referenceVideo && includeReference);
  const [exportType, setExportType] = useState<'mp4' | 'webm' | 'spritesheet' | 'png' | 'pdf' | 'project'>('mp4');
  const [burnTimecode, setBurnTimecode] = useState<boolean>(true);
  const [columns, setColumns] = useState<number>(4);
  const [includeBackground, setIncludeBackground] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-calculate default columns based on frame count
  useEffect(() => {
    if (frames.length > 0) {
      setColumns(Math.max(1, Math.min(8, Math.ceil(Math.sqrt(frames.length)))));
    }
  }, [frames.length]);

  // Render live export preview
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current || frames.length === 0) return;
    const canvas = previewCanvasRef.current;

    if (exportType === 'spritesheet') {
      const cols = Math.max(1, columns);
      const rows = Math.ceil(frames.length / cols);
      
      const maxPreviewWidth = 480;
      const aspect = (rows * canvasSize.height) / (cols * canvasSize.width);
      canvas.width = maxPreviewWidth;
      canvas.height = Math.round(maxPreviewWidth * aspect);

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (includeBackground) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const cellW = canvas.width / cols;
      const cellH = canvas.height / rows;

      frames.forEach((frame, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const cellX = c * cellW;
        const cellY = r * cellH;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cellX, cellY, cellW, cellH);

        if (frame.layers) {
          frame.layers.forEach((layer) => {
            if (layer.visible && layer.canvas) {
              ctx.save();
              ctx.globalAlpha = layer.opacity;
              ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
              ctx.drawImage(layer.canvas, cellX, cellY, cellW, cellH);
              ctx.restore();
            }
          });
        }

        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`#${idx + 1}`, cellX + 4, cellY + 12);
      });
    } else {
      // Regular Video or Single Frame Preview
      canvas.width = 480;
      canvas.height = Math.round((480 * canvasSize.height) / canvasSize.width);
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (includeBackground) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const firstFrame = frames[0];
      if (firstFrame && firstFrame.layers) {
        firstFrame.layers.forEach((layer) => {
          if (layer.visible && layer.canvas) {
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
            ctx.drawImage(layer.canvas, 0, 0, canvas.width, canvas.height);
            ctx.restore();
          }
        });
      }
    }
  }, [isOpen, exportType, columns, includeBackground, backgroundColor, frames, canvasSize]);

  if (!isOpen) return null;

  // Handle Export Spritesheet PNG
  const handleExportSpritesheet = () => {
    setIsExporting(true);
    setExportProgress(10);

    setTimeout(() => {
      const cols = Math.max(1, columns);
      const rows = Math.ceil(frames.length / cols);
      const fullW = cols * canvasSize.width;
      const fullH = rows * canvasSize.height;

      const outCanvas = createLayerCanvas(fullW, fullH);
      const ctx = outCanvas.getContext('2d')!;

      if (includeBackground) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, fullW, fullH);
      }

      frames.forEach((frame, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const cellX = c * canvasSize.width;
        const cellY = r * canvasSize.height;

        if (frame.layers) {
          frame.layers.forEach((layer) => {
            if (layer.visible && layer.canvas) {
              ctx.save();
              ctx.globalAlpha = layer.opacity;
              ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
              ctx.drawImage(layer.canvas, cellX, cellY);
              ctx.restore();
            }
          });
        }
      });

      setExportProgress(90);

      outCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `animation_spritesheet_${cols}x${rows}_${frames.length}cels.png`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setExportProgress(100);
      }, 'image/png');
    }, 100);
  };

  // Handle Export MP4 / WebM Regular Video File
  const handleExportVideo = async (targetFormat: 'mp4' | 'webm') => {
    setIsExporting(true);
    setExportProgress(10);

    const recCanvas = createLayerCanvas(canvasSize.width, canvasSize.height);
    const ctx = recCanvas.getContext('2d')!;

    // Resolve supported MIME type
    let mimeType = 'video/webm';
    if (targetFormat === 'mp4') {
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E')) mimeType = 'video/mp4;codecs=avc1.42E01E';
      else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
      else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mimeType = 'video/webm;codecs=vp9';
    } else {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mimeType = 'video/webm;codecs=vp9';
      else if (MediaRecorder.isTypeSupported('video/webm')) mimeType = 'video/webm';
    }

    let referenceFrames: Blob[] | null = null;
    if (withReference && referenceVideo) {
      try {
        referenceFrames = await renderFramesWithReference(frames, canvasSize, fps, referenceVideo, (f) => setExportProgress(Math.round(5 + f * 55)));
      } catch (err: any) {
        setIsExporting(false);
        setExportProgress(0);
        toast({
          variant: 'destructive',
          title: 'Could not include the reference video',
          description: `${err?.message || 'The reference failed to load.'} Turn off "Include reference video" to export the drawing alone.`,
        });
        return;
      }
    }

    const stream = recCanvas.captureStream(fps);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      recorder = new MediaRecorder(stream);
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const ext = targetFormat === 'mp4' && mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animation_${withReference ? 'with-reference_' : ''}${fps}fps_${frames.length}cels.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      setExportProgress(100);
    };

    recorder.start();

    if (referenceFrames) {
      await playFramesIntoCanvas(referenceFrames, recCanvas, fps, (f) => setExportProgress(Math.round(60 + f * 38)));
      recorder.stop();
      return;
    }

    // Render frames sequentially honoring Callipeg holdFrames, 2D Camera pan/zoom moves,
    // Clipping Masks, and optional Storyboard Pro timecode burn-in!
    const totalExposureTicks = frames.reduce((acc, f) => acc + Math.max(1, f.holdFrames ?? 1), 0);
    let renderedTick = 0;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const hold = Math.max(1, frame.holdFrames ?? 1);

      // Pre-composite this cel once (with Clipping Masks & Layer Masks)
      const celCanvas = createLayerCanvas(canvasSize.width, canvasSize.height);
      const celCtx = celCanvas.getContext('2d')!;
      if (includeBackground) {
        celCtx.fillStyle = backgroundColor;
        celCtx.fillRect(0, 0, celCanvas.width, celCanvas.height);
      }
      if (frame.layers) {
        compositeLayersToContext(celCtx, frame.layers, celCanvas.width, celCanvas.height);
      }

      for (let h = 0; h < hold; h++) {
        renderedTick += 1;
        setExportProgress(Math.round((renderedTick / Math.max(1, totalExposureTicks)) * 85) + 10);
        ctx.clearRect(0, 0, recCanvas.width, recCanvas.height);

        if (frame.cameraMove?.enabled) {
          const t = hold > 1 ? h / (hold - 1) : 0;
          const kf = interpolateCamera(frame.cameraMove, t);
          const cropW = canvasSize.width / Math.max(1, kf.zoom);
          const cropH = canvasSize.height / Math.max(1, kf.zoom);
          const sx = kf.x * canvasSize.width - cropW / 2;
          const sy = kf.y * canvasSize.height - cropH / 2;
          ctx.drawImage(celCanvas, sx, sy, cropW, cropH, 0, 0, recCanvas.width, recCanvas.height);
        } else {
          ctx.drawImage(celCanvas, 0, 0);
        }

        if (burnTimecode) {
          const shotNum = Math.floor(i / 3) + 1;
          const label = `SH${String(shotNum).padStart(2, '0')}_P${String(i + 1).padStart(2, '0')}  ·  F${String(renderedTick).padStart(3, '0')} / ${String(totalExposureTicks).padStart(3, '0')}  ·  ${fps} FPS`;
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(20, recCanvas.height - 46, 320, 30);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px monospace';
          ctx.fillText(label, 32, recCanvas.height - 26);
          ctx.restore();
        }

        await new Promise((res) => setTimeout(res, 1000 / Math.max(1, fps)));
      }
    }

    recorder.stop();
  };

  // Handle Studio 3-Up Storyboard PDF Export (Print-Ready Sheet with Dialogue, Action, Camera & Duration)
  const handleExportStoryboardPDF = () => {
    setIsExporting(true);
    const panelCards = frames.map((frame, i) => {
      const thumbCanvas = createLayerCanvas(640, Math.round((640 * canvasSize.height) / canvasSize.width));
      const tCtx = thumbCanvas.getContext('2d')!;
      tCtx.fillStyle = includeBackground ? backgroundColor : '#ffffff';
      tCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);

      const fullCel = createLayerCanvas(canvasSize.width, canvasSize.height);
      if (frame.layers) {
        compositeLayersToContext(fullCel.getContext('2d')!, frame.layers, canvasSize.width, canvasSize.height);
      }
      tCtx.drawImage(fullCel, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.88);
      const shotNum = Math.floor(i / 3) + 1;
      const hold = Math.max(1, frame.holdFrames ?? 1);
      const dur = frame.storyboardScript?.duration ?? Number((hold / Math.max(1, fps)).toFixed(2));
      const camLabel = frame.cameraMove?.enabled
        ? `2D Cam: ${Math.round(frame.cameraMove.start.zoom * 100)}% -> ${Math.round(frame.cameraMove.end.zoom * 100)}% (${frame.cameraMove.easing})`
        : frame.storyboardScript?.camera || 'Static';
      const dialogue = (frame.storyboardScript?.dialogue || '').replace(/</g, '&lt;');
      const action = (frame.storyboardScript?.action || '').replace(/</g, '&lt;');

      return `
        <div class="panel-row">
          <div class="thumb-wrap">
            <img src="${dataUrl}" alt="Panel ${i + 1}" />
            <div class="badge">SH${String(shotNum).padStart(2, '0')} · P${String(i + 1).padStart(2, '0')}</div>
          </div>
          <div class="meta">
            <div class="meta-top">
              <strong>Shot ${shotNum} / Panel ${i + 1}</strong>
              <span>${hold}f · ${dur}s · ${camLabel}</span>
            </div>
            <div class="field"><label>ACTION:</label> ${action || '<span class="muted">—</span>'}</div>
            <div class="field"><label>DIALOGUE:</label> ${dialogue || '<span class="muted">—</span>'}</div>
          </div>
        </div>
      `;
    });

    const pages: string[] = [];
    for (let p = 0; p < panelCards.length; p += 3) {
      pages.push(`
        <section class="sheet-page">
          <header class="sheet-head">
            <div><strong>${(portfolioTitle.trim() || 'AnimationReference.org Storyboard').replace(/</g, '&lt;')}</strong></div>
            <div>Page ${Math.floor(p / 3) + 1} / ${Math.ceil(panelCards.length / 3)} · ${frames.length} Panels · ${fps} FPS</div>
          </header>
          ${panelCards.slice(p, p + 3).join('')}
        </section>
      `);
    }

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Storyboard Sheet PDF — AnimationReference.org</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: #18181b; color: #111827; }
    .sheet-page { width: 8.5in; min-height: 11in; margin: 16px auto; background: #fff; padding: 0.45in; display: flex; flex-direction: column; gap: 16px; page-break-after: always; }
    .sheet-head { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 2px solid #111827; padding-bottom: 8px; }
    .panel-row { display: grid; grid-template-columns: 3.6in 1fr; gap: 14px; border: 1.5px solid #d4d4d8; border-radius: 8px; padding: 10px; }
    .thumb-wrap { position: relative; border: 1px solid #a1a1aa; border-radius: 4px; overflow: hidden; background: #000; }
    .thumb-wrap img { width: 100%; display: block; aspect-ratio: 16/9; object-fit: contain; }
    .badge { position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.78); color: #fff; font: 700 10px monospace; padding: 3px 6px; border-radius: 4px; }
    .meta { display: flex; flex-direction: column; gap: 8px; font-size: 12px; }
    .meta-top { display: flex; justify-content: space-between; font-size: 11px; color: #3f3f46; border-bottom: 1px solid #e4e4e7; padding-bottom: 4px; }
    .field label { font-weight: 800; font-size: 10px; color: #6d28d9; margin-right: 4px; }
    .muted { color: #a1a1aa; }
    @media print { body { background: #fff; } .sheet-page { margin: 0; box-shadow: none; } }
  </style>
</head>
<body>
  ${pages.join('')}
  <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    } else {
      toast({
        title: 'Pop-up blocked',
        description: 'Allow pop-ups for this site to open the print-ready Storyboard PDF sheet.',
        variant: 'destructive',
      });
    }
    setIsExporting(false);
  };

  // Handle Export Single Frame PNG
  const handleExportPNG = () => {
    setIsExporting(true);
    const firstFrame = frames[0];
    if (!firstFrame) return;

    const outCanvas = createLayerCanvas(canvasSize.width, canvasSize.height);
    const ctx = outCanvas.getContext('2d')!;

    if (includeBackground) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }

    if (firstFrame.layers) {
      firstFrame.layers.forEach((layer) => {
        if (layer.visible && layer.canvas) {
          ctx.save();
          ctx.globalAlpha = layer.opacity;
          ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
          ctx.drawImage(layer.canvas, 0, 0);
          ctx.restore();
        }
      });
    }

    outCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frame_1_${canvasSize.width}x${canvasSize.height}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }, 'image/png');
  };

  // Handle Export .animref Native Project File (Preserves all cels, layers, blend modes, masks & timing data)
  const handleExportProjectFile = () => {
    setIsExporting(true);
    try {
      const project = serializeProject(frames, canvasSize, 0, fps);
      downloadProject(project, 'animation-project.animref');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#12121a] border border-white/15 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161622]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Animation Export Suite</h2>
              <p className="text-xs text-zinc-400 font-mono">Export MP4 Videos, WebM, Spritesheets, PNG & Native .animref Project Files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[75vh]">
          
          {/* Left Column: Format & Options */}
          <div className="flex flex-col gap-5">
            
            {/* Format Selector Tabs */}
            <div>
              <label className="block text-xs font-mono font-bold text-zinc-400 mb-2">EXPORT FORMAT</label>
              <div className="grid grid-cols-6 gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl">
                <button
                  onClick={() => setExportType('mp4')}
                  className={cn(
                    "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                    exportType === 'mp4'
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Video className="h-3.5 w-3.5 text-purple-300" />
                  <span>MP4</span>
                </button>

                <button
                  onClick={() => setExportType('webm')}
                  className={cn(
                    "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                    exportType === 'webm'
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Film className="h-3.5 w-3.5 text-purple-300" />
                  <span>WebM</span>
                </button>

                <button
                  onClick={() => setExportType('spritesheet')}
                  className={cn(
                    "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                    exportType === 'spritesheet'
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Grid className="h-3.5 w-3.5 text-purple-300" />
                  <span>Sheet</span>
                </button>

                <button
                  onClick={() => setExportType('png')}
                  className={cn(
                    "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                    exportType === 'png'
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <ImageIcon className="h-3.5 w-3.5 text-purple-300" />
                  <span>PNG</span>
                </button>

                <button
                  onClick={() => setExportType('pdf')}
                  className={cn(
                    "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                    exportType === 'pdf'
                      ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                  title="Print-Ready 3-Up Studio Storyboard PDF"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-300" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={() => setExportType('project')}
                  className={cn(
                    "py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                    exportType === 'project'
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Layers className="h-3.5 w-3.5 text-purple-300" />
                  <span>.animref</span>
                </button>
              </div>
            </div>

            {/* Spritesheet Layout Options */}
            {exportType === 'spritesheet' && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-zinc-300">GRID COLUMNS:</span>
                  <span className="text-xs font-mono font-bold text-purple-400">{columns} COLS</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={Math.min(12, frames.length)}
                  value={columns}
                  onChange={(e) => setColumns(parseInt(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="text-[11px] text-zinc-400 font-mono">
                  Result: <strong className="text-white">{columns}x{Math.ceil(frames.length / columns)} Grid</strong> ({columns * canvasSize.width}px × {Math.ceil(frames.length / columns) * canvasSize.height}px)
                </div>
              </div>
            )}

            {/* Reference footage underneath (video exports only) */}
            {referenceVideo && (exportType === 'mp4' || exportType === 'webm') && (
              <label className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer">
                <span>
                  <span className="block text-xs font-bold text-zinc-300">Include reference video</span>
                  <span className="block text-[11px] text-zinc-400">Your drawing over the pinned reference, at {Math.round(referenceVideo.opacity * 100)}% opacity like the tracing view.</span>
                </span>
                <input
                  type="checkbox"
                  checked={includeReference}
                  onChange={(e) => setIncludeReference(e.target.checked)}
                  className="h-4 w-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>
            )}

            {/* Timecode & Shot Burn-in toggle (video exports) */}
            {(exportType === 'mp4' || exportType === 'webm') && (
              <label className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer">
                <span>
                  <span className="block text-xs font-bold text-zinc-200">Studio Timecode & Shot Burn-In</span>
                  <span className="block text-[11px] text-zinc-400">Overlays SH01_P01 · F024 · {fps} FPS and renders 2D Camera pan/zoom & exposure holds.</span>
                </span>
                <input
                  type="checkbox"
                  checked={burnTimecode}
                  onChange={(e) => setBurnTimecode(e.target.checked)}
                  className="h-4 w-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>
            )}

            {/* Background Fill Settings */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-zinc-300">Include Background Fill</span>
                <input
                  type="checkbox"
                  checked={includeBackground}
                  onChange={(e) => setIncludeBackground(e.target.checked)}
                  className="h-4 w-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>

              {includeBackground ? (
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-8 w-12 bg-transparent border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono text-zinc-400">{backgroundColor} (Solid Background)</span>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-400">Export with <strong className="text-purple-300">Transparent Background</strong> (Ideal for Game Engines & Overlay)</p>
              )}
            </div>

            {/* Info Summary */}
            <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-purple-300 font-mono">
              <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
              <span>Total Cels: <strong>{frames.length}</strong> | FPS: <strong>{fps}</strong> | Res: <strong>{canvasSize.width}×{canvasSize.height}</strong></span>
            </div>

          </div>

          {/* Right Column: Live Export Preview */}
          <div className="flex flex-col gap-3">
            <label className="block text-xs font-mono font-bold text-zinc-400">LIVE EXPORT PREVIEW</label>
            
            <div className="flex-1 min-h-[220px] bg-[#09090e] border border-white/15 rounded-2xl flex items-center justify-center p-3 relative overflow-hidden">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-[240px] rounded-lg shadow-xl object-contain"
                style={{
                  backgroundImage: includeBackground ? 'none' : 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              />
            </div>

            {/* Action Export Button */}
            <button
              onClick={() => {
                if (exportType === 'project') handleExportProjectFile();
                else if (exportType === 'pdf') handleExportStoryboardPDF();
                else if (exportType === 'mp4') handleExportVideo('mp4');
                else if (exportType === 'webm') handleExportVideo('webm');
                else if (exportType === 'spritesheet') handleExportSpritesheet();
                else handleExportPNG();
              }}
              disabled={isExporting || isPublishing}
              className="mt-2 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(168,85,247,0.5)] border border-purple-300/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <span>Exporting ({exportProgress}%)...</span>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>
                    {exportType === 'project'
                      ? 'Download .animref Project File'
                      : exportType === 'pdf'
                      ? 'Open 3-Up Storyboard PDF Sheet'
                      : `Download ${exportType.toUpperCase()} File`}
                  </span>
                </>
              )}
            </button>

            {/* 1-Click Publish Straight to AnimationReference.org Portfolio */}
            <div className="mt-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-3 space-y-2">
              <input
                type="text"
                value={portfolioTitle}
                onChange={(e) => setPortfolioTitle(e.target.value)}
                placeholder="Shot / drawover title (optional)…"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white placeholder:text-zinc-400 outline-none focus:border-violet-400"
              />
              <button
                type="button"
                disabled={isPublishing || isExporting}
                onClick={async () => {
                  if (!user) {
                    toast({
                      title: 'Sign in to publish',
                      description: 'Create a free account or sign in to publish drawovers to your Portfolio.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  setIsPublishing(true);
                  try {
                    const outCanvas = createLayerCanvas(canvasSize.width, canvasSize.height);
                    const ctx = outCanvas.getContext('2d')!;
                    if (includeBackground) {
                      ctx.fillStyle = backgroundColor;
                      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
                    }
                    const first = frames[0];
                    if (first?.layers) {
                      first.layers.forEach((layer) => {
                        if (layer.visible && layer.canvas) {
                          ctx.save();
                          ctx.globalAlpha = layer.opacity;
                          ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
                          ctx.drawImage(layer.canvas, 0, 0);
                          ctx.restore();
                        }
                      });
                    }

                    const blob: Blob | null = await new Promise((resolve) => outCanvas.toBlob(resolve, 'image/png'));
                    if (!blob) throw new Error('Could not render drawover frame');

                    const form = new FormData();
                    const cleanTitle = portfolioTitle.trim() || `Paint Drawover Study (${frames.length}f)`;
                    form.append('file', blob, `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`);
                    form.append('title', cleanTitle);
                    form.append('tags', 'drawover,paint-studio,animation-study');
                    form.append('draft', 'true');

                    const token = await user.getIdToken();
                    const res = await fetch('/api/clips/upload?draft=true', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                      body: form,
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || 'Upload failed');

                    toast({
                      title: 'Sent to Portfolio Composer!',
                      description: 'Opening your draft on the Portfolio Feed so you can polish & publish.',
                    });
                    onClose();
                    router.push(data?.draftId ? `/feed?draft=${encodeURIComponent(data.draftId)}` : '/feed');
                  } catch (err: any) {
                    toast({
                      title: 'Publish failed',
                      description: err?.message || 'Could not upload drawover to portfolio.',
                      variant: 'destructive',
                    });
                  } finally {
                    setIsPublishing(false);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading to Portfolio Draft…</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Publish Drawover to Portfolio</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
