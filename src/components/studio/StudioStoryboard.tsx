'use client';

import React, { useState } from 'react';
import { 
  Film, 
  Plus, 
  Play, 
  Pause, 
  Paintbrush, 
  Clock, 
  Camera, 
  ChevronRight, 
  Trash2, 
  Download,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface StoryboardPanel {
  id: string;
  shotNumber: string;
  panelNumber: string;
  action: string;
  dialogue: string;
  camera: string;
  duration: number; // in seconds
  imageUrl?: string;
}

export function StudioStoryboard({
  panels: initialPanels,
}: {
  panels?: StoryboardPanel[];
}) {
  const [panels, setPanels] = useState<StoryboardPanel[]>(initialPanels || [
    {
      id: 'sb-1',
      shotNumber: 'SHOT 01',
      panelNumber: 'PANEL A',
      action: 'Kai stands in dark shadow holding sword hilt.',
      dialogue: 'You were too late...',
      camera: 'Slow Push In / Low Angle',
      duration: 2.5,
      imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'sb-2',
      shotNumber: 'SHOT 01',
      panelNumber: 'PANEL B',
      action: 'Katana blade reflects torch light in rain.',
      dialogue: 'The artifact belongs to shadows now.',
      camera: 'Extreme Close Up / Eye Tracking',
      duration: 3.0,
      imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'sb-3',
      shotNumber: 'SHOT 02',
      panelNumber: 'PANEL A',
      action: 'Kai leaps into moonlight across roof tiles.',
      dialogue: '[Thunder Sound FX]',
      camera: 'Wide Action Pan Left to Right',
      duration: 2.0,
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    },
  ]);

  const [activePanelId, setActivePanelId] = useState<string>(panels[0]?.id || '');
  const [isAnimaticPlaying, setIsAnimaticPlaying] = useState<boolean>(false);
  const [currentAnimaticIdx, setCurrentAnimaticIdx] = useState<number>(0);

  const handleAddPanel = () => {
    const p: StoryboardPanel = {
      id: `sb-${Date.now()}`,
      shotNumber: `SHOT 0${panels.length + 1}`,
      panelNumber: 'PANEL A',
      action: 'Action description here...',
      dialogue: 'Dialogue line here...',
      camera: 'Camera Angle / Movement',
      duration: 2.0,
    };
    setPanels([...panels, p]);
    setActivePanelId(p.id);
  };

  const handleUpdatePanel = (id: string, field: keyof StoryboardPanel, value: any) => {
    setPanels(panels.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleDeletePanel = (id: string) => {
    setPanels(panels.filter((p) => p.id !== id));
  };

  const totalDuration = panels.reduce((acc, p) => acc + (p.duration || 0), 0);
  const activePanel = panels.find((p) => p.id === activePanelId) || panels[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#050508] p-6 text-zinc-300">
      
      {/* Storyboard Header Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>Interactive Storyboard & Animatic Studio</span>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-md font-mono font-bold tracking-widest">
              {panels.length} PANELS ({totalDuration.toFixed(1)}s TOTAL)
            </span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">Sequence Shot Panels, Draw Keyframes, & Preview Animatic Playback</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/paint"
            className="px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Paintbrush className="h-4 w-4" />
            <span>Draw in Paint Studio</span>
          </Link>

          <button
            onClick={handleAddPanel}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shadow-sm border border-white/5 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Panel</span>
          </button>
        </div>
      </div>

      {/* Storyboard Panel Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto pr-2 -mr-2">
        {panels.map((panel, idx) => (
          <div
            key={panel.id}
            onClick={() => setActivePanelId(panel.id)}
            className={cn(
              "bg-[#12121a] border rounded-xl p-4 flex flex-col gap-3 transition-all cursor-pointer shadow-md group relative",
              activePanelId === panel.id
                ? "border-purple-500/50 ring-1 ring-purple-500/20 bg-[#161622]"
                : "border-white/5 hover:border-white/10"
            )}
          >
            {/* Panel Top Meta Bar */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-indigo-400 uppercase tracking-widest">{panel.shotNumber}</span>
                <span className="text-[10px] font-mono font-bold bg-white/5 text-zinc-400 px-2 py-0.5 rounded-md tracking-wider">{panel.panelNumber}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 bg-[#050508] px-2 py-0.5 rounded border border-white/5">
                  <Clock className="h-3 w-3 text-indigo-500/70" />
                  {panel.duration}s
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeletePanel(panel.id); }}
                  className="h-6 w-6 rounded hover:bg-red-500/10 flex items-center justify-center text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Storyboard Drawing Thumbnail Box */}
            <div className="aspect-[16/9] w-full bg-[#050508] border border-white/5 rounded-lg overflow-hidden relative flex items-center justify-center group-hover:border-purple-500/30 transition-colors">
              {panel.imageUrl ? (
                <img src={panel.imageUrl} alt={panel.action} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
                  <Camera className="h-5 w-5 text-zinc-700" />
                  <span>No Frame</span>
                </div>
              )}

              {/* Direct Draw Link Overlay */}
              <Link
                href="/paint"
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-[11px] font-mono font-bold tracking-wider text-purple-300 transition-opacity backdrop-blur-sm"
              >
                <Paintbrush className="h-4 w-4" />
                <span>Draw Frame</span>
              </Link>
            </div>

            {/* Camera Angle Tag */}
            <div className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-md truncate uppercase tracking-widest flex items-center gap-2">
              <Camera className="h-3 w-3" /> {panel.camera}
            </div>

            {/* Action Description & Dialogue Inputs */}
            <div className="flex flex-col gap-2 mt-1">
              <input
                type="text"
                value={panel.action}
                onChange={(e) => handleUpdatePanel(panel.id, 'action', e.target.value)}
                placeholder="Action description..."
                className="bg-[#050508] border border-white/5 rounded-md px-3 py-2 text-[13px] text-zinc-200 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <input
                type="text"
                value={panel.dialogue}
                onChange={(e) => handleUpdatePanel(panel.id, 'dialogue', e.target.value)}
                placeholder="Dialogue line..."
                className="bg-[#050508] border border-white/5 rounded-md px-3 py-2 text-[13px] text-zinc-400 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
