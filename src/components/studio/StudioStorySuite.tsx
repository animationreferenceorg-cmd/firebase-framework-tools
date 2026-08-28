'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Film, 
  Sparkles, 
  Play, 
  Pause, 
  Plus, 
  Check, 
  SkipBack, 
  SkipForward, 
  Paintbrush, 
  Upload, 
  ExternalLink,
  Video,
  Clock,
  Camera,
  Layers,
  CheckCircle2,
  X,
  Copy,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface StoryboardPanelItem {
  id: string;
  shotNumber: string;
  panelNumber: string;
  sceneHeading: string;
  action: string;
  dialogue: string;
  camera: string;
  duration: number; // in seconds
  imageUrl: string;
  artist: string;
}

export interface ScriptSceneItem {
  id: string;
  sceneNumber: string;
  heading: string;
  action: string;
  character: string;
  dialogue: string;
  notes: string;
}

const initialScriptScenes: ScriptSceneItem[] = [
  {
    id: 'sc-1',
    sceneNumber: 'SCENE 01',
    heading: 'INT. ANCIENT DOJO - NIGHT',
    action: 'Rain strikes the bamboo roof. TORCHES flicker in the dark shadow of the courtyard. KAI (20s, Ronin) draws his katana.',
    character: 'KAI',
    dialogue: 'You were too late. The artifact belongs to the shadows now.',
    notes: 'Camera slow pan across Kai’s silhouette. Thunder strikes on dialogue end.',
  },
  {
    id: 'sc-2',
    sceneNumber: 'SCENE 02',
    heading: 'EXT. TEMPLE ROOFTOP - NIGHT',
    action: 'Kai leaps across the roof tiles into the moonlight. THREE NINJAS drop from the pine trees behind him.',
    character: 'NINJA LEADER',
    dialogue: 'Surrender the scroll or meet the edge of blade!',
    notes: 'High angle wide shot. Dynamic camera tracking left to right.',
  }
];

const initialPanels: StoryboardPanelItem[] = [
  {
    id: 'sb-1',
    shotNumber: 'SHOT 01',
    panelNumber: 'PANEL A',
    sceneHeading: 'INT. ANCIENT DOJO - NIGHT',
    action: 'Kai stands in dark shadow holding sword hilt as rain falls.',
    dialogue: 'You were too late...',
    camera: 'Slow Push In / Low Angle',
    duration: 2.5,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    artist: 'Elena Rostova'
  },
  {
    id: 'sb-2',
    shotNumber: 'SHOT 01',
    panelNumber: 'PANEL B',
    sceneHeading: 'INT. ANCIENT DOJO - NIGHT',
    action: 'Katana blade reflects torch light in rain.',
    dialogue: 'The artifact belongs to shadows now.',
    camera: 'Extreme Close Up / Eye Tracking',
    duration: 3.0,
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80',
    artist: 'Elena Rostova'
  },
  {
    id: 'sb-3',
    shotNumber: 'SHOT 02',
    panelNumber: 'PANEL A',
    sceneHeading: 'EXT. TEMPLE ROOFTOP - NIGHT',
    action: 'Kai leaps into moonlight across roof tiles.',
    dialogue: '[Thunder Sound FX]',
    camera: 'Wide Action Pan Left to Right',
    duration: 2.0,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    artist: 'Sarah Chen'
  }
];

export function StudioStorySuite({ onNavigateToReview }: { onNavigateToReview?: () => void }) {
  const { toast } = useToast();
  const router = useRouter();

  // Tab State: 'script' (Tab 1) | 'storyboard' (Tab 2)
  const [activeStoryTab, setActiveStoryTab] = useState<'script' | 'storyboard'>('script');

  // Script State
  const [scenes, setScenes] = useState<ScriptSceneItem[]>(initialScriptScenes);

  // Storyboard Panels State
  const [panels, setPanels] = useState<StoryboardPanelItem[]>(initialPanels);
  const [activePanelId, setActivePanelId] = useState<string>(panels[0]?.id || '');

  // Animatic Player State
  const [isAnimaticModalOpen, setIsAnimaticModalOpen] = useState(false);
  const [isPlayingAnimatic, setIsPlayingAnimatic] = useState(false);
  const [currentAnimaticIndex, setCurrentAnimaticIndex] = useState(0);

  const totalAnimaticDuration = panels.reduce((sum, p) => sum + p.duration, 0);

  // Animatic Timer Effect
  useEffect(() => {
    let timer: any = null;
    if (isPlayingAnimatic && panels.length > 0) {
      const currentPanel = panels[currentAnimaticIndex];
      timer = setTimeout(() => {
        if (currentAnimaticIndex < panels.length - 1) {
          setCurrentAnimaticIndex(prev => prev + 1);
        } else {
          setIsPlayingAnimatic(false);
          setCurrentAnimaticIndex(0);
        }
      }, (currentPanel?.duration || 2.5) * 1000);
    }
    return () => clearTimeout(timer);
  }, [isPlayingAnimatic, currentAnimaticIndex, panels]);

  // Copy Script Scenes ➔ Storyboard Grid
  const handleCopyScriptToStoryboards = () => {
    const newPanels: StoryboardPanelItem[] = scenes.map((sc, idx) => ({
      id: `sb-copied-${sc.id}-${Date.now()}`,
      shotNumber: `SHOT 0${idx + 1}`,
      panelNumber: 'PANEL A',
      sceneHeading: sc.heading,
      action: sc.action,
      dialogue: sc.dialogue,
      camera: sc.notes || 'Medium Shot',
      duration: 3.0,
      imageUrl: idx % 2 === 0 
        ? 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80' 
        : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      artist: 'Unassigned Story Artist'
    }));

    setPanels([...panels, ...newPanels]);
    setActiveStoryTab('storyboard');
    toast({
      title: "Script Copied to Storyboard Grid! 📋",
      description: `Created ${newPanels.length} new storyboard panel slots from script scenes. Storyboard artists can now draw keyframes!`,
    });
  };

  // Open Paint Tool with Panel Loaded for Drawing Frame-by-Frame
  const handleOpenPaintToolForPanel = (panelId: string) => {
    toast({
      title: "Launching Paint Studio... 🎨",
      description: "Opening canvas for frame-by-frame storyboard keyframe editing.",
    });
    router.push(`/paint?panelId=${panelId}`);
  };

  const handleTurnIntoAnimatic = () => {
    setIsAnimaticModalOpen(true);
    setCurrentAnimaticIndex(0);
    setIsPlayingAnimatic(true);
    toast({
      title: "Animatic Reel Generated! 🎬",
      description: `Compiled ${panels.length} panels (${totalAnimaticDuration.toFixed(1)}s total) into live Animatic player.`,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050508] text-zinc-300 font-sans overflow-hidden select-none">
      
      {/* ──────────────── 1. STORY SUITE TOP TAB HEADER ──────────────── */}
      <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between shrink-0 bg-[#0a0a0f] z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-black text-white text-base">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <span>Story & Screenplay Suite</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* SUB-TAB SWITCHER: TAB 1 (SCRIPT) | TAB 2 (STORYBOARDS) */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setActiveStoryTab('script')}
              className={cn(
                "px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer",
                activeStoryTab === 'script' 
                  ? "bg-purple-600 text-white shadow-md font-black" 
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <FileText className="h-4 w-4" />
              <span>Tab 1: Script Editor</span>
            </button>

            <button
              onClick={() => setActiveStoryTab('storyboard')}
              className={cn(
                "px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer",
                activeStoryTab === 'storyboard' 
                  ? "bg-purple-600 text-white shadow-md font-black" 
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Film className="h-4 w-4" />
              <span>Tab 2: Storyboards Across</span>
              <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-mono">
                {panels.length}
              </span>
            </button>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center gap-3">
          {activeStoryTab === 'script' ? (
            <button
              onClick={handleCopyScriptToStoryboards}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Copy className="h-4 w-4" />
              <span>📋 Copy Script to Storyboards</span>
            </button>
          ) : (
            <button
              onClick={handleTurnIntoAnimatic}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
            >
              <Film className="h-4 w-4 fill-white" />
              <span>🎬 Turn Whole Storyboard into Animatic</span>
            </button>
          )}
        </div>
      </div>

      {/* ──────────────── 2. TAB 1: SCRIPT EDITOR (SCREENPLAY) ──────────────── */}
      {activeStoryTab === 'script' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-8 bg-[#07070b]">
          <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
            
            {/* Script Writer Info Bar */}
            <div className="bg-[#10111a] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
              <div>
                <h2 className="text-sm font-bold text-white">Screenplay Editor & Fountain Formatting</h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">Write scenes, action notes, and dialogue. Click 'Copy Script' to populate storyboards.</p>
              </div>

              <button
                onClick={handleCopyScriptToStoryboards}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy to Storyboards ➔</span>
              </button>
            </div>

            {/* Screenplay Scene Cards */}
            <div className="space-y-6">
              {scenes.map((sc, idx) => (
                <div 
                  key={sc.id} 
                  className="bg-[#0e0f17] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 font-mono shadow-2xl relative group"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-sm font-black text-blue-400 tracking-wider">{sc.sceneNumber}: {sc.heading}</span>
                    <span className="text-xs font-bold text-zinc-500">Scene #{idx + 1}</span>
                  </div>

                  {/* Action Description */}
                  <textarea
                    value={sc.action}
                    onChange={(e) => {
                      const updated = [...scenes];
                      updated[idx].action = e.target.value;
                      setScenes(updated);
                    }}
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-zinc-200 font-serif leading-relaxed focus:outline-none focus:border-blue-500/50 resize-none h-20"
                    placeholder="Enter scene action line..."
                  />

                  {/* Character & Dialogue Block */}
                  <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col items-center gap-2 text-center">
                    <input
                      type="text"
                      value={sc.character}
                      onChange={(e) => {
                        const updated = [...scenes];
                        updated[idx].character = e.target.value;
                        setScenes(updated);
                      }}
                      className="bg-transparent text-xs font-black text-zinc-100 text-center uppercase tracking-widest focus:outline-none"
                    />
                    <textarea
                      value={sc.dialogue}
                      onChange={(e) => {
                        const updated = [...scenes];
                        updated[idx].dialogue = e.target.value;
                        setScenes(updated);
                      }}
                      className="w-full bg-transparent text-xs text-zinc-300 italic text-center focus:outline-none resize-none h-12"
                      placeholder="Enter dialogue line..."
                    />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ──────────────── 3. TAB 2: STORYBOARD GRID (PANELS ACROSS) ──────────────── */}
      {activeStoryTab === 'storyboard' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-8 bg-[#07070b]">
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>Submitted Storyboard Keyframe Panels</span>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded font-mono font-bold">
                  {panels.length} PANELS • ({totalAnimaticDuration.toFixed(1)}s TOTAL)
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">Click any storyboard panel to launch Paint Studio & draw keyframes frame-by-frame.</p>
            </div>

            <button
              onClick={handleTurnIntoAnimatic}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Film className="h-4 w-4 fill-white" />
              <span>Play Animatic Reel</span>
            </button>
          </div>

          {/* HORIZONTAL STORYBOARD PANEL GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {panels.map((panel) => (
              <div
                key={panel.id}
                onClick={() => handleOpenPaintToolForPanel(panel.id)}
                className="bg-[#0e0f17] border border-white/10 hover:border-purple-500/50 rounded-2xl p-4 flex flex-col gap-3 transition-all cursor-pointer shadow-xl group relative hover:scale-[1.01]"
              >
                {/* Panel Image Thumbnail Frame */}
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black relative border border-white/10 shadow-md">
                  <img 
                    src={panel.imageUrl} 
                    alt={panel.panelNumber} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />

                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono font-bold text-white border border-white/10">
                    {panel.shotNumber} • {panel.panelNumber}
                  </div>

                  {/* Draw in Paint Tool Overlay */}
                  <div className="absolute inset-0 bg-purple-900/40 opacity-0 group-hover:opacity-100 backdrop-blur-xs transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs shadow-2xl">
                    <Paintbrush className="h-4 w-4 text-purple-300" />
                    <span>Click to Draw Keyframes in Paint Studio</span>
                  </div>
                </div>

                {/* Panel Action & Dialogue details */}
                <div className="flex flex-col gap-1 font-mono text-xs">
                  <span className="text-zinc-400 text-[10px]">{panel.sceneHeading}</span>
                  <p className="text-zinc-200 leading-snug line-clamp-2">{panel.action}</p>
                  {panel.dialogue && (
                    <p className="text-amber-400 italic text-[11px] truncate">"{panel.dialogue}"</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-white/5 font-mono">
                  <span>Camera: {panel.camera}</span>
                  <span className="text-indigo-400 font-bold">{panel.duration}s</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ──────────────── 4. LIVE 1-CLICK ANIMATIC PLAYER MODAL ──────────────── */}
      {isAnimaticModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in-50">
          <div className="bg-[#12131d] border border-white/10 rounded-2xl w-full max-w-4xl flex flex-col overflow-hidden shadow-2xl">
            
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#181926]">
              <div className="flex items-center gap-3">
                <Film className="h-5 w-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Live Storyboard Animatic Reel</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Panel {currentAnimaticIndex + 1} of {panels.length} • Total {totalAnimaticDuration.toFixed(1)}s
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setIsAnimaticModalOpen(false);
                  setIsPlayingAnimatic(false);
                }}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Player Display Screen */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-white/10">
              {panels[currentAnimaticIndex] && (
                <img 
                  src={panels[currentAnimaticIndex].imageUrl} 
                  alt="Animatic Frame" 
                  className="w-full h-full object-contain"
                />
              )}

              {/* Subtitle Dialogue Overlay */}
              <div className="absolute bottom-6 left-12 right-12 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center">
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {panels[currentAnimaticIndex]?.dialogue || panels[currentAnimaticIndex]?.action}
                </span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="p-4 bg-[#181926] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlayingAnimatic(!isPlayingAnimatic)}
                  className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center transition-transform hover:scale-105 shadow-md cursor-pointer"
                >
                  {isPlayingAnimatic ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
                </button>

                <div className="flex flex-col text-xs font-mono">
                  <span className="text-white font-bold">{panels[currentAnimaticIndex]?.shotNumber} {panels[currentAnimaticIndex]?.panelNumber} ({panels[currentAnimaticIndex]?.camera})</span>
                  <span className="text-zinc-400">{panels[currentAnimaticIndex]?.sceneHeading}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  toast({
                    title: "Exporting Animatic to SyncSketch / Frame.io Review 🎬",
                    description: "Animatic reel sent to director dailies review playlist.",
                  });
                  setIsAnimaticModalOpen(false);
                  if (onNavigateToReview) onNavigateToReview();
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Video className="h-4 w-4" />
                <span>Export to SyncSketch Review</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
