'use client';

import React from 'react';
import { 
  FileText, 
  MessageSquare, 
  Film, 
  Camera
} from 'lucide-react';

interface CanvasScriptDockProps {
  dialogue: string;
  onDialogueChange: (text: string) => void;
  action: string;
  onActionChange: (text: string) => void;
  camera: string;
  duration: number;
  shotNumber: string;
  panelNumber: string;
  onDurationChange?: (duration: number) => void;
}

export function CanvasScriptDock({
  dialogue,
  onDialogueChange,
  action,
  onActionChange,
  camera,
  duration,
  shotNumber,
  panelNumber,
  onDurationChange,
}: CanvasScriptDockProps) {
  return (
    <div 
      data-ui-panel="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full bg-[#111118]/95 backdrop-blur-2xl border-t border-white/10 p-5 text-white font-sans select-none transition-none rounded-b-2xl overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
            <FileText className="h-4 w-4 text-indigo-400" />
          </div>
          <span className="text-zinc-200 text-sm font-bold tracking-wide">Script Sheet</span>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <span className="bg-white/5 text-zinc-300 border border-white/10 px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold shadow-inner">
            {shotNumber} <span className="text-zinc-600 mx-1">•</span> {panelNumber}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 font-semibold bg-white/5 border border-white/5 px-2.5 py-1 rounded-md shadow-inner">
            <Camera className="h-3.5 w-3.5 text-zinc-500" /> 
            <span>{camera}</span>
          </div>
          <div className="flex items-center gap-1 bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded-md border border-indigo-500/20 font-mono font-bold shadow-inner">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={duration}
              onChange={(e) => onDurationChange?.(parseFloat(e.target.value) || 0.1)}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-transparent w-12 outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span>s</span>
          </div>
        </div>
      </div>

      {/* Script Inputs */}
      <div className="grid grid-cols-2 gap-5 pt-4">
        
        {/* Dialogue Block */}
        <div className="flex flex-col gap-2 relative group">
          <label className="text-[10px] text-zinc-400 font-bold flex items-center gap-1.5 uppercase tracking-widest pl-1">
            <MessageSquare className="h-3.5 w-3.5 text-amber-500" /> Dialogue
          </label>
          <textarea
            value={dialogue}
            onChange={(e) => onDialogueChange(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Enter character dialogue..."
            className="bg-black/40 border border-white/5 focus:border-amber-500/50 hover:border-white/10 text-amber-50/90 font-serif text-sm italic p-3.5 rounded-xl focus:outline-none resize-none h-[100px] leading-relaxed shadow-inner transition-colors placeholder:text-zinc-700"
          />
        </div>

        {/* Action Block */}
        <div className="flex flex-col gap-2 relative group">
          <label className="text-[10px] text-zinc-400 font-bold flex items-center gap-1.5 uppercase tracking-widest pl-1">
            <Film className="h-3.5 w-3.5 text-indigo-400" /> Action
          </label>
          <textarea
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Enter scene action description..."
            className="bg-black/40 border border-white/5 focus:border-indigo-500/50 hover:border-white/10 text-zinc-200 font-sans text-sm p-3.5 rounded-xl focus:outline-none resize-none h-[100px] leading-relaxed shadow-inner transition-colors placeholder:text-zinc-700"
          />
        </div>

      </div>
    </div>
  );
}
