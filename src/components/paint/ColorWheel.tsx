'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { hexToHsv, hsvToHex, type HSV } from '@/lib/paint/color';

interface ColorWheelProps {
  color: string;
  onChange: (hex: string) => void;
  /** Fired once when a drag ends — use this to log color history, not onChange (which fires continuously while dragging). */
  onCommit?: (hex: string) => void;
  size?: number;
}

const RING_THICKNESS = 24;
const SQUARE_SIZE_RATIO = 0.62; // relative to the ring's inner diameter

export function ColorWheel({ color, onChange, onCommit, size = 230 }: ColorWheelProps) {
  const ringCanvasRef = useRef<HTMLCanvasElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<'ring' | 'square' | null>(null);
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(color));

  // Keep local HSV in sync if the color changes from outside (e.g. eyedropper).
  useEffect(() => {
    const incoming = hexToHsv(color);
    setHsv((prev) => {
      if (hsvToHex(prev).toLowerCase() === color.toLowerCase()) return prev;
      return incoming;
    });
  }, [color]);

  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  const radius = size / 2;
  const innerRadius = radius - RING_THICKNESS;
  const squareSize = innerRadius * 2 * SQUARE_SIZE_RATIO;

  // Paint the hue ring once (it never changes).
  useEffect(() => {
    const canvas = ringCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = size / 2, cy = size / 2;
    ctx.clearRect(0, 0, size, size);
    for (let deg = 0; deg < 360; deg++) {
      const start = ((deg - 0.5) * Math.PI) / 180;
      const end = ((deg + 0.5) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - RING_THICKNESS / 2, start, end);
      ctx.lineWidth = RING_THICKNESS;
      ctx.strokeStyle = `hsl(${deg}, 100%, 50%)`;
      ctx.stroke();
    }
  }, [size, radius]);

  const updateFromRing = useCallback((clientX: number, clientY: number) => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - cy, clientX - cx);
    let deg = (angle * 180) / Math.PI;
    if (deg < 0) deg += 360;
    const next = { ...hsvRef.current, h: deg };
    setHsv(next);
    onChange(hsvToHex(next));
  }, [onChange]);

  const updateFromSquare = useCallback((clientX: number, clientY: number) => {
    const square = squareRef.current;
    if (!square) return;
    const rect = square.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    const next = { ...hsvRef.current, s, v };
    setHsv(next);
    onChange(hsvToHex(next));
  }, [onChange]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (draggingRef.current === 'ring') {
        e.preventDefault();
        updateFromRing(e.clientX, e.clientY);
      } else if (draggingRef.current === 'square') {
        e.preventDefault();
        updateFromSquare(e.clientX, e.clientY);
      }
    };

    const handleUp = () => {
      if (draggingRef.current) {
        onCommit?.(hsvToHex(hsvRef.current));
      }
      draggingRef.current = null;
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleUp, { passive: false });

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [updateFromRing, updateFromSquare, onCommit]);

  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;
  const knobAngleRad = (hsv.h * Math.PI) / 180;
  const knobRadius = radius - RING_THICKNESS / 2;
  const knobX = radius + Math.cos(knobAngleRad) * knobRadius;
  const knobY = radius + Math.sin(knobAngleRad) * knobRadius;

  return (
    <div
      ref={wheelRef}
      className="relative select-none touch-none cursor-pointer"
      style={{ width: size, height: size }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        const rect = wheelRef.current!.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Expanded hit target for pen stylus on outer ring
        if (dist >= innerRadius - 8) {
          draggingRef.current = 'ring';
          try {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
          } catch {
            // Fallback
          }
          updateFromRing(e.clientX, e.clientY);
        }
      }}
    >
      <canvas ref={ringCanvasRef} width={size} height={size} className="absolute inset-0 pointer-events-none" />

      {/* Hue knob */}
      <div
        className="absolute h-5 w-5 rounded-full border-2 border-white shadow-lg pointer-events-none transition-transform"
        style={{ left: knobX, top: knobY, transform: 'translate(-50%, -50%)', backgroundColor: hueColor }}
      />

      {/* Saturation/Value square */}
      <div
        ref={squareRef}
        className="absolute rounded-xl overflow-hidden cursor-crosshair touch-none shadow-inner border border-white/10"
        style={{
          width: squareSize,
          height: squareSize,
          left: radius - squareSize / 2,
          top: radius - squareSize / 2,
          backgroundColor: hueColor,
          backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          draggingRef.current = 'square';
          try {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
          } catch {
            // Fallback
          }
          updateFromSquare(e.clientX, e.clientY);
        }}
      >
        <div
          className="absolute h-4 w-4 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: hsvToHex(hsv),
          }}
        />
      </div>
    </div>
  );
}
