'use client';

import React from 'react';
import type { CanvasGuideMode } from '@/lib/paint/types';

export const GUIDE_MODE_LABELS: Record<CanvasGuideMode, string> = {
  none: 'Off',
  thirds: 'Rule of Thirds',
  safe: 'Action / Title Safe',
  field12: '12-Field Grid',
  persp1: '1-Pt Perspective',
  persp2: '2-Pt Perspective',
};

interface CanvasGuidesOverlayProps {
  mode: CanvasGuideMode;
  width: number;
  height: number;
}

export function CanvasGuidesOverlay({ mode, width, height }: CanvasGuidesOverlayProps) {
  if (mode === 'none') return null;

  const cx = width / 2;
  const cy = height / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 pointer-events-none z-20"
    >
      {/* 1. RULE OF THIRDS */}
      {mode === 'thirds' && (
        <g stroke="rgba(56, 189, 248, 0.55)" strokeWidth={2} fill="none">
          <line x1={width / 3} y1={0} x2={width / 3} y2={height} />
          <line x1={(width * 2) / 3} y1={0} x2={(width * 2) / 3} y2={height} />
          <line x1={0} y1={height / 3} x2={width} y2={height / 3} />
          <line x1={0} y1={(height * 2) / 3} x2={width} y2={(height * 2) / 3} />
          {/* Golden power points */}
          {[width / 3, (width * 2) / 3].map((x) =>
            [height / 3, (height * 2) / 3].map((y) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={6} stroke="rgba(56,189,248,0.85)" strokeWidth={2} />
            ))
          )}
        </g>
      )}

      {/* 2. BROADCAST / STORYBOARD PRO ACTION SAFE (90%) & TITLE SAFE (80%) */}
      {mode === 'safe' && (
        <g fill="none">
          {/* Action Safe (5% inset) */}
          <rect
            x={width * 0.05}
            y={height * 0.05}
            width={width * 0.9}
            height={height * 0.9}
            stroke="rgba(34, 197, 94, 0.7)"
            strokeWidth={2}
            strokeDasharray="10 6"
          />
          <text x={width * 0.05 + 10} y={height * 0.05 + 22} fill="rgba(34, 197, 94, 0.85)" fontSize={14} fontFamily="monospace" fontWeight="bold">
            ACTION SAFE (90%)
          </text>

          {/* Title Safe (10% inset) */}
          <rect
            x={width * 0.1}
            y={height * 0.1}
            width={width * 0.8}
            height={height * 0.8}
            stroke="rgba(244, 63, 94, 0.7)"
            strokeWidth={2}
            strokeDasharray="6 6"
          />
          <text x={width * 0.1 + 10} y={height * 0.1 + 22} fill="rgba(244, 63, 94, 0.85)" fontSize={14} fontFamily="monospace" fontWeight="bold">
            TITLE SAFE (80%)
          </text>

          {/* Center Crosshair */}
          <line x1={cx - 28} y1={cy} x2={cx + 28} y2={cy} stroke="rgba(255,255,255,0.65)" strokeWidth={2} />
          <line x1={cx} y1={cy - 28} x2={cx} y2={cy + 28} stroke="rgba(255,255,255,0.65)" strokeWidth={2} />
        </g>
      )}

      {/* 3. CLASSIC TOON BOOM / DISNEY 12-FIELD ANIMATION GRID */}
      {mode === 'field12' && (
        <g fill="none">
          {/* 24 columns x 14 rows */}
          {Array.from({ length: 23 }, (_, i) => {
            const x = ((i + 1) / 24) * width;
            const isCenter = i === 11;
            return (
              <line
                key={`v-${i}`}
                x1={x}
                y1={0}
                x2={x}
                y2={height}
                stroke={isCenter ? 'rgba(244, 63, 94, 0.7)' : 'rgba(139, 92, 246, 0.28)'}
                strokeWidth={isCenter ? 2 : 1}
              />
            );
          })}
          {Array.from({ length: 13 }, (_, i) => {
            const y = ((i + 1) / 14) * height;
            const isCenter = i === 6;
            return (
              <line
                key={`h-${i}`}
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke={isCenter ? 'rgba(244, 63, 94, 0.7)' : 'rgba(139, 92, 246, 0.28)'}
                strokeWidth={isCenter ? 2 : 1}
              />
            );
          })}
          {/* Diagonal field axes */}
          <line x1={0} y1={0} x2={width} y2={height} stroke="rgba(139, 92, 246, 0.22)" strokeWidth={1} strokeDasharray="6 6" />
          <line x1={width} y1={0} x2={0} y2={height} stroke="rgba(139, 92, 246, 0.22)" strokeWidth={1} strokeDasharray="6 6" />
          <circle cx={cx} cy={cy} r={8} stroke="rgba(244, 63, 94, 0.8)" strokeWidth={2} />
        </g>
      )}

      {/* 4. 1-POINT PERSPECTIVE */}
      {mode === 'persp1' && (
        <g fill="none">
          {/* Horizon Line */}
          <line x1={0} y1={cy} x2={width} y2={cy} stroke="rgba(34, 211, 238, 0.8)" strokeWidth={2} />
          {/* 16 radial rays from center vanishing point */}
          {Array.from({ length: 16 }, (_, i) => {
            const angle = (i * Math.PI * 2) / 16;
            const r = Math.hypot(width, height);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={cx + Math.cos(angle) * r}
                y2={cy + Math.sin(angle) * r}
                stroke="rgba(34, 211, 238, 0.35)"
                strokeWidth={1.5}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={9} fill="rgba(34, 211, 238, 0.9)" />
        </g>
      )}

      {/* 5. 2-POINT PERSPECTIVE */}
      {mode === 'persp2' && (
        <g fill="none">
          {/* Horizon Line */}
          <line x1={0} y1={cy} x2={width} y2={cy} stroke="rgba(251, 191, 36, 0.8)" strokeWidth={2} />
          {/* Left VP (8% X) & Right VP (92% X) */}
          {[
            { vx: width * 0.06, color: 'rgba(56, 189, 248, 0.35)', dot: '#38bdf8' },
            { vx: width * 0.94, color: 'rgba(244, 114, 182, 0.35)', dot: '#f472b6' },
          ].map((vp, idx) => (
            <g key={idx}>
              {Array.from({ length: 12 }, (_, i) => {
                const angle = ((i - 5.5) * Math.PI) / 14;
                const dir = idx === 0 ? 1 : -1;
                const r = width * 1.3;
                return (
                  <line
                    key={i}
                    x1={vp.vx}
                    y1={cy}
                    x2={vp.vx + dir * Math.cos(angle) * r}
                    y2={cy + Math.sin(angle) * r}
                    stroke={vp.color}
                    strokeWidth={1.5}
                  />
                );
              })}
              <circle cx={vp.vx} cy={cy} r={8} fill={vp.dot} />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
