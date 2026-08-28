'use client';

import React from 'react';
import { ColorWheel } from './ColorWheel';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  recentColors: string[];
  onAddRecent: (hex: string) => void;
  size?: number;
}

export function ColorPicker({ color, onChange, recentColors, onAddRecent, size = 176 }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <ColorWheel color={color} onChange={onChange} onCommit={onAddRecent} size={size} />
      </div>

      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 rounded-md border border-white/20 shrink-0"
          style={{ backgroundColor: color }}
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onAddRecent(e.target.value)}
          className="h-7 flex-1 rounded-md bg-white/5 border border-white/10 px-2 font-mono text-white text-[11px]"
        />
      </div>

      {recentColors.length > 0 && (
        <div className="grid grid-cols-8 gap-1.5">
          {recentColors.map((c, i) => (
            <button
              key={`${c}-${i}`}
              onClick={() => onChange(c)}
              className={cn(
                'h-5 w-5 rounded-full border transition-transform hover:scale-110',
                c.toLowerCase() === color.toLowerCase() ? 'border-white ring-1 ring-purple-500' : 'border-white/20'
              )}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
}
