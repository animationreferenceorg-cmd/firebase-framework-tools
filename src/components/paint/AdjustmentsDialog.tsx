'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type AdjustmentKind = 'brightness-contrast' | 'hue-saturation';

interface AdjustmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (kind: AdjustmentKind, values: { a: number; b: number; c?: number }) => void;
}

export function AdjustmentsDialog({ open, onOpenChange, onApply }: AdjustmentsDialogProps) {
  const [kind, setKind] = useState<AdjustmentKind>('brightness-contrast');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(0);

  const reset = () => {
    setBrightness(0); setContrast(0); setHue(0); setSaturation(0); setLightness(0);
  };

  const handleApply = () => {
    if (kind === 'brightness-contrast') {
      onApply('brightness-contrast', { a: brightness, b: contrast });
    } else {
      onApply('hue-saturation', { a: hue, b: saturation, c: lightness });
    }
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md bg-[hsl(250,40%,7%)] border-[hsl(250,30%,15%)] text-white rounded-2xl">
        <DialogHeader>
          <DialogTitle>Adjustments</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Applies directly to the active layer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5 p-1 bg-white/5 rounded-lg border border-white/10">
          {(['brightness-contrast', 'hue-saturation'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors',
                kind === k ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
              )}
            >
              {k === 'brightness-contrast' ? 'Brightness / Contrast' : 'Hue / Saturation'}
            </button>
          ))}
        </div>

        {kind === 'brightness-contrast' ? (
          <div className="space-y-4 py-2">
            <AdjustSlider label="Brightness" value={brightness} onChange={setBrightness} />
            <AdjustSlider label="Contrast" value={contrast} onChange={setContrast} />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <AdjustSlider label="Hue" value={hue} onChange={setHue} min={-180} max={180} />
            <AdjustSlider label="Saturation" value={saturation} onChange={setSaturation} />
            <AdjustSlider label="Lightness" value={lightness} onChange={setLightness} />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleApply} className="bg-purple-600 hover:bg-purple-500">Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustSlider({ label, value, onChange, min = -100, max = 100 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="font-mono text-zinc-300">{value}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={1} />
    </div>
  );
}
