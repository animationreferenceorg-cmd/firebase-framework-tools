'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CanvasSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSize: { width: number; height: number };
  onApply: (width: number, height: number) => void;
}

const PRESETS: { label: string; width: number; height: number }[] = [
  { label: 'HD (1920 × 1080)', width: 1920, height: 1080 },
  { label: 'Square (1080 × 1080)', width: 1080, height: 1080 },
  { label: 'Portrait / Story (1080 × 1920)', width: 1080, height: 1920 },
  { label: 'QHD (2560 × 1440)', width: 2560, height: 1440 },
  { label: '4K (3840 × 2160)', width: 3840, height: 2160 },
  { label: 'A4 Print (2480 × 3508)', width: 2480, height: 3508 },
];

export function CanvasSettingsDialog({ open, onOpenChange, currentSize, onApply }: CanvasSettingsDialogProps) {
  const [width, setWidth] = useState(String(currentSize.width));
  const [height, setHeight] = useState(String(currentSize.height));
  const [lockAspect, setLockAspect] = useState(true);

  useEffect(() => {
    if (open) {
      setWidth(String(currentSize.width));
      setHeight(String(currentSize.height));
    }
  }, [open, currentSize]);

  const aspect = currentSize.width / currentSize.height;

  const handleWidthChange = (v: string) => {
    setWidth(v);
    const n = Number(v);
    if (lockAspect && n > 0) setHeight(String(Math.round(n / aspect)));
  };

  const handleHeightChange = (v: string) => {
    setHeight(v);
    const n = Number(v);
    if (lockAspect && n > 0) setWidth(String(Math.round(n * aspect)));
  };

  const applyValid = () => {
    const w = Math.max(16, Math.min(8000, Math.round(Number(width))));
    const h = Math.max(16, Math.min(8000, Math.round(Number(height))));
    if (!Number.isFinite(w) || !Number.isFinite(h)) return;
    onApply(w, h);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[hsl(250,40%,7%)] border-[hsl(250,30%,15%)] text-white rounded-2xl">
        <DialogHeader>
          <DialogTitle>Canvas Settings</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Resize the canvas resolution. Existing artwork is scaled to fit the new size.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Width (px)</Label>
              <Input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Height (px)</Label>
              <Input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={lockAspect}
              onChange={(e) => setLockAspect(e.target.checked)}
              className="accent-purple-600"
            />
            Lock aspect ratio
          </label>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Presets</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setWidth(String(p.width)); setHeight(String(p.height)); }}
                  className="px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 hover:text-white transition-colors text-left"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={applyValid} className="bg-purple-600 hover:bg-purple-500">Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
