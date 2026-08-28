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
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Frame, CanvasSize } from '@/lib/paint/types';
import { createLayerCanvas } from '@/lib/paint/engine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: Frame[];
  canvasSize: CanvasSize;
  fps: number;
}

export function ExportModal({
  isOpen,
  onClose,
  frames,
  canvasSize,
  fps,
}: ExportModalProps) {
  const [exportType, setExportType] = useState<'mp4' | 'webm' | 'spritesheet' | 'png'>('mp4');
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
      a.download = `animation_${fps}fps_${frames.length}cels.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      setExportProgress(100);
    };

    recorder.start();

    // Render frames sequentially into video recorder
    for (let i = 0; i < frames.length; i++) {
      setExportProgress(Math.round(((i + 1) / frames.length) * 80) + 10);
      ctx.clearRect(0, 0, recCanvas.width, recCanvas.height);

      if (includeBackground) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, recCanvas.width, recCanvas.height);
      }

      const frame = frames[i];
      if (frame.layers) {
        frame.layers.forEach((layer) => {
          if (layer.visible && layer.canvas) {
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
            ctx.drawImage(layer.canvas, 0, 0);
            ctx.restore();
          }
        });
      }

      await new Promise((res) => setTimeout(res, 1000 / fps));
    }

    recorder.stop();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#12121a] border border-white/15 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161622]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Animation Export Suite</h2>
              <p className="text-xs text-zinc-400 font-mono">Export MP4 Videos, WebM, Spritesheets & PNG Sequences</p>
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
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl">
                <button
                  onClick={() => setExportType('mp4')}
                  className={cn(
                    "py-2 px-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                    exportType === 'mp4'
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Video className="h-4 w-4 text-purple-300" />
                  <span>MP4 Video</span>
                </button>

                <button
                  onClick={() => setExportType('webm')}
                  className={cn(
                    "py-2 px-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                    exportType === 'webm'
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Film className="h-4 w-4 text-purple-300" />
                  <span>WebM Video</span>
                </button>

                <button
                  onClick={() => setExportType('spritesheet')}
                  className={cn(
                    "py-2 px-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                    exportType === 'spritesheet'
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Grid className="h-4 w-4 text-purple-300" />
                  <span>Spritesheet</span>
                </button>

                <button
                  onClick={() => setExportType('png')}
                  className={cn(
                    "py-2 px-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer",
                    exportType === 'png'
                      ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <ImageIcon className="h-4 w-4 text-purple-300" />
                  <span>PNG Frame</span>
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
                if (exportType === 'mp4') handleExportVideo('mp4');
                else if (exportType === 'webm') handleExportVideo('webm');
                else if (exportType === 'spritesheet') handleExportSpritesheet();
                else handleExportPNG();
              }}
              disabled={isExporting}
              className="mt-2 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(168,85,247,0.5)] border border-purple-300/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <span>Generating Video ({exportProgress}%)...</span>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download {exportType.toUpperCase()} Video / File</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
