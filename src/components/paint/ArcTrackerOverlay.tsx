'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  MousePointerClick,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrackedArcPoint {
  id: string;
  frame: number;
  x: number; // percentage (0 - 100) within container
  y: number; // percentage (0 - 100) within container
  time: number;
}

interface ArcTrackerOverlayProps {
  currentFrame: number;
  containerWidth: number;
  containerHeight: number;
  onAdvanceFrame?: () => void;
  title?: string;
}

export function ArcTrackerOverlay({
  currentFrame,
  containerWidth,
  containerHeight,
  onAdvanceFrame,
  title = 'Reference',
}: ArcTrackerOverlayProps) {
  const { toast } = useToast();
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [points, setPoints] = useState<TrackedArcPoint[]>([]);
  const [showArc, setShowArc] = useState(true);
  const [showSpacingChart, setShowSpacingChart] = useState(true);

  // Click on video to record point for current frame
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTrackingActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPoint: TrackedArcPoint = {
      id: `arc-${currentFrame}-${Date.now()}`,
      frame: currentFrame,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      time: Date.now(),
    };

    setPoints((prev) => {
      const filtered = prev.filter((p) => p.frame !== currentFrame);
      const next = [...filtered, newPoint].sort((a, b) => a.frame - b.frame);
      return next;
    });

    // Auto advance to next frame if requested
    if (onAdvanceFrame) {
      onAdvanceFrame();
    }
  };

  const handleClear = () => {
    setPoints([]);
    toast({ title: 'Arc cleared', description: 'All tracked motion points removed.' });
  };

  // Export Arc as transparent PNG overlay
  const handleExportArc = () => {
    if (points.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Need at least 2 points',
        description: 'Track at least 2 frames to generate a motion trajectory arc.',
      });
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = containerWidth || 1920;
    canvas.height = containerHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw smooth curve connecting points
    ctx.strokeStyle = '#c084fc'; // purple-400
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    points.forEach((p, idx) => {
      const px = (p.x / 100) * canvas.width;
      const py = (p.y / 100) * canvas.height;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Draw dots and frame numbers
    points.forEach((p) => {
      const px = (p.x / 100) * canvas.width;
      const py = (p.y / 100) * canvas.height;

      ctx.fillStyle = '#f43f5e'; // rose-500
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`F:${p.frame}`, px + 10, py - 6);
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-motion-arc.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: 'Arc Exported! 📐',
      description: 'Transparent PNG motion arc downloaded for Maya / Blender import.',
    });
  };

  // Calculate spacing differences (acceleration / deceleration)
  const spacingAnalysis = React.useMemo(() => {
    if (points.length < 3) return null;
    const distances: number[] = [];
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      distances.push(dist);
    }
    return distances;
  }, [points]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {/* Click capture overlay when tracking */}
      {isTrackingActive && (
        <div
          onClick={handleContainerClick}
          className="absolute inset-0 pointer-events-auto cursor-crosshair bg-purple-950/10"
          title="Click point to track trajectory on this frame"
        />
      )}

      {/* Trajectory Arc Lines & SVG */}
      {showArc && points.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          {/* Connecting Path */}
          {points.length >= 2 && (
            <polyline
              points={points.map((p) => `${p.x}%,${p.y}%`).join(' ')}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              className="drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]"
            />
          )}

          {/* Point markers */}
          {points.map((p) => {
            const isCurrent = p.frame === currentFrame;
            return (
              <g key={p.id} className="transition-all duration-200">
                <circle
                  cx={`${p.x}%`}
                  cy={`${p.y}%`}
                  r={isCurrent ? 7 : 4.5}
                  fill={isCurrent ? '#38bdf8' : '#e11d48'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className={isCurrent ? "drop-shadow-[0_0_12px_rgba(56,189,248,1)] animate-pulse" : ""}
                />
                <text
                  x={`${p.x}%`}
                  y={`${p.y}%`}
                  dx="8"
                  dy="-6"
                  fill={isCurrent ? '#38bdf8' : '#ffffff'}
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] select-none"
                >
                  F:{p.frame}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* Floating Arc Control Dock (Top Right) */}
      <div className="absolute top-3 right-3 pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-purple-500/30 shadow-2xl">
          <Button
            size="sm"
            onClick={() => setIsTrackingActive(!isTrackingActive)}
            className={cn(
              "h-8 px-3 rounded-xl text-xs font-bold gap-1.5 transition-all cursor-pointer",
              isTrackingActive
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            {isTrackingActive ? 'Tracking: Click Point' : 'Track Motion Arc'}
          </Button>

          {points.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowArc(!showArc)}
                className="h-8 w-8 text-zinc-400 hover:text-white rounded-lg"
                title={showArc ? "Hide Arc" : "Show Arc"}
              >
                {showArc ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleExportArc}
                className="h-8 w-8 text-purple-300 hover:text-white rounded-lg hover:bg-purple-500/20"
                title="Export Transparent PNG Arc"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="h-8 w-8 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                title="Clear Arc"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>

        {/* Spacing Chart Ruler Bar */}
        {showSpacingChart && points.length >= 2 && (
          <div className="p-2.5 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-2xl text-left max-w-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Timing & Spacing Chart
              </span>
              <span className="text-[9px] font-mono text-zinc-400">{points.length} keys</span>
            </div>

            {/* Classical Spacing Chart Visualizer */}
            <div className="relative h-6 w-full bg-white/5 rounded-lg border border-white/10 flex items-center px-2">
              <div className="w-full h-0.5 bg-white/20 relative">
                {points.map((p, idx) => {
                  const percent = (idx / (points.length - 1)) * 100;
                  const isCurrent = p.frame === currentFrame;
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border transition-all",
                        isCurrent
                          ? "bg-sky-400 border-white scale-125 z-10"
                          : idx === 0 || idx === points.length - 1
                          ? "bg-purple-500 border-white"
                          : "bg-rose-500 border-white/60"
                      )}
                      style={{ left: `${percent}%` }}
                      title={`Frame ${p.frame}`}
                    />
                  );
                })}
              </div>
            </div>

            <p className="text-[9px] text-zinc-400 leading-tight">
              Visualizes ease-in, breakdown, and ease-out timing between tracked keyframes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
