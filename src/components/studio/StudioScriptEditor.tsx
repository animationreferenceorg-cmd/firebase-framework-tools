'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Film, 
  Download, 
  Plus, 
  Play, 
  Check, 
  Layers, 
  BookOpen,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface ScriptScene {
  id: string;
  heading: string;
  action: string;
  character: string;
  dialogue: string;
  notes: string;
}

export function StudioScriptEditor({
  onConvertToStoryboard
}: {
  onConvertToStoryboard?: (scenes: ScriptScene[]) => void;
}) {
  const [scenes, setScenes] = useState<ScriptScene[]>([
    {
      id: 'sc-1',
      heading: 'INT. ANCIENT DOJO - NIGHT',
      action: 'Rain strikes the bamboo roof. TORCHES flicker in the dark shadow of the courtyard. KAI (20s, Ronin) draws his katana.',
      character: 'KAI',
      dialogue: 'You were too late. The artifact belongs to the shadows now.',
      notes: 'Camera slow pan across Kai’s silhouette. Thunder strikes on dialogue end.',
    },
    {
      id: 'sc-2',
      heading: 'EXT. TEMPLE ROOFTOP - NIGHT',
      action: 'Kai leaps across the roof tiles into the moonlight. THREE NINJAS drop from the pine trees behind him.',
      character: 'NINJA LEADER',
      dialogue: 'Surrender the scroll or meet the edge of blade!',
      notes: 'High angle wide shot. Dynamic camera tracking left to right.',
    },
  ]);

  const [activeSceneId, setActiveSceneId] = useState<string>(scenes[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateStoryboard = () => {
    setIsGenerating(true);
    toast({
      title: "Generating Storyboard...",
      description: "AI is analyzing script actions and generating visual panels.",
    });

    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Storyboard Generated! ✅",
        description: `${scenes.length} panels have been created from your script.`,
      });
      if (onConvertToStoryboard) {
        onConvertToStoryboard(scenes);
      }
    }, 2000);
  };

  const handleAddScene = () => {
    const newSc: ScriptScene = {
      id: `sc-${Date.now()}`,
      heading: 'EXT. NEW SCENE LOCATION - DAY',
      action: 'Describe character movement and environmental action here...',
      character: 'CHARACTER NAME',
      dialogue: 'Enter dialogue line here...',
      notes: 'Camera movement and timing notes...',
    };
    setScenes([...scenes, newSc]);
    setActiveSceneId(newSc.id);
  };

  const handleUpdateScene = (id: string, field: keyof ScriptScene, value: string) => {
    setScenes(scenes.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#050508] p-6 text-zinc-300">
      
      {/* Header Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>Industry Screenplay & Scriptwriting Studio</span>
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-md font-mono font-bold tracking-widest">
              {scenes.length} SCENES
            </span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">Format Screenplays & Auto-Convert Scenes to Storyboard Panels</p>
        </div>

        <div className="flex items-center gap-3">
          {onConvertToStoryboard && (
            <button
              onClick={handleGenerateStoryboard}
              disabled={isGenerating}
              className={cn(
                "px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer",
                isGenerating 
                  ? "bg-blue-500 text-white border-blue-400" 
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-400/50 shadow-lg shadow-blue-500/30"
              )}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
              <span>{isGenerating ? 'Generating Panels...' : 'Generate Storyboard'}</span>
            </button>
          )}

          <button
            onClick={handleAddScene}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shadow-sm border border-white/5 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Scene</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        
        {/* Left Column: Scene List */}
        <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-4 flex flex-col gap-4 overflow-hidden shadow-md">
          <label className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">SCENE OUTLINE ({scenes.length})</label>
          
          <div className="space-y-2 overflow-y-auto pr-2 -mr-2">
            {scenes.map((sc, idx) => (
              <div
                key={sc.id}
                onClick={() => setActiveSceneId(sc.id)}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2",
                  activeSceneId === sc.id
                    ? "bg-[#161622] border-purple-500/50 text-white shadow-sm ring-1 ring-purple-500/20"
                    : "bg-[#12121a] border-white/5 text-zinc-300 hover:border-white/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-purple-400 tracking-wider">SCENE #{idx + 1}</span>
                  <span className="text-[9px] font-mono text-zinc-500 tracking-wider">FORMATTED</span>
                </div>
                <h3 className="text-xs font-mono font-bold truncate text-zinc-200">{sc.heading}</h3>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{sc.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Columns: Screenplay Page Editor */}
        <div className="md:col-span-2 bg-[#0a0a0f] border border-white/5 rounded-2xl p-6 flex flex-col gap-5 overflow-y-auto shadow-md">
          
          {activeScene && (
            <>
              {/* Scene Heading */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-purple-400/80 mb-2 tracking-wider">SCENE HEADING (INT./EXT. LOCATION - TIME)</label>
                <input
                  type="text"
                  value={activeScene.heading}
                  onChange={(e) => handleUpdateScene(activeScene.id, 'heading', e.target.value)}
                  className="w-full bg-[#12121a] border border-purple-500/30 rounded-lg px-4 py-3 font-mono font-black text-sm text-purple-300 uppercase focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Action Description */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-500 mb-2 tracking-wider">ACTION & VISUAL DESCRIPTION</label>
                <textarea
                  value={activeScene.action}
                  onChange={(e) => handleUpdateScene(activeScene.id, 'action', e.target.value)}
                  rows={3}
                  className="w-full bg-[#12121a] border border-white/5 rounded-lg p-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                />
              </div>

              {/* Character & Dialogue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-zinc-500 mb-2 tracking-wider">CHARACTER NAME</label>
                  <input
                    type="text"
                    value={activeScene.character}
                    onChange={(e) => handleUpdateScene(activeScene.id, 'character', e.target.value)}
                    className="w-full bg-[#12121a] border border-white/5 rounded-lg px-3 py-2.5 text-xs font-mono font-bold text-zinc-200 uppercase focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-zinc-500 mb-2 tracking-wider">DIALOGUE LINE</label>
                  <input
                    type="text"
                    value={activeScene.dialogue}
                    onChange={(e) => handleUpdateScene(activeScene.id, 'dialogue', e.target.value)}
                    className="w-full bg-[#12121a] border border-white/5 rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Camera & Animatic Direction Notes */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-zinc-500 mb-2 tracking-wider">CAMERA ANGLE & ANIMATIC DIRECTION</label>
                <input
                  type="text"
                  value={activeScene.notes}
                  onChange={(e) => handleUpdateScene(activeScene.id, 'notes', e.target.value)}
                  className="w-full bg-[#12121a] border border-white/5 rounded-lg p-3 text-xs font-mono text-amber-400/80 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              {/* Screenplay Page Mock Preview Box */}
              <div className="mt-4 p-8 bg-[#fdfdfd] border border-white/10 rounded-xl flex flex-col items-center gap-4 text-zinc-900 shadow-md">
                <span className="text-[10px] text-zinc-400 font-bold font-sans uppercase tracking-widest w-full text-center border-b border-zinc-200 pb-2 mb-2">PAGE PREVIEW (Courier Format)</span>
                <div className="w-full max-w-lg flex flex-col gap-3 font-mono text-xs leading-relaxed" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
                  <div className="font-bold uppercase">{activeScene.heading}</div>
                  <div className="text-zinc-800">{activeScene.action}</div>
                  <div className="text-center font-bold uppercase mt-4 w-1/2 mx-auto">{activeScene.character}</div>
                  <div className="text-left text-zinc-900 w-3/4 mx-auto">{activeScene.dialogue}</div>
                </div>
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
}
