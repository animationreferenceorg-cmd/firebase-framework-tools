'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, Headphones, Users, Mic, MicOff, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CrewCollabWidget() {
  const [isMuted, setIsMuted] = useState(false);
  const [isInVoice, setIsInVoice] = useState(true);

  if (!isInVoice) return null;

  return (
    <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-900/80 via-purple-850/80 to-indigo-900/80 border border-purple-500/30 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 text-left transition-all hover:scale-[1.02] group">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative">
          <Avatar className="h-8 w-8 border border-purple-400/50 shadow-md">
            <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" alt="Arthur Shelby" />
            <AvatarFallback className="bg-purple-950 text-white text-[10px] font-bold">AS</AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950 animate-pulse" />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] text-purple-300 font-semibold truncate leading-tight">Live Review Room</p>
          <p className="text-xs font-bold text-white truncate leading-tight">Arthur Shelby</p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            isMuted ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-zinc-300 hover:text-white hover:bg-white/20"
          )}
          title={isMuted ? "Unmute" : "Mute Voice"}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => window.open('https://anim.works', '_blank')}
          className="p-1.5 rounded-lg bg-white/10 text-zinc-300 hover:text-white hover:bg-white/20 transition-colors"
          title="Open Sync Room"
        >
          <Headphones className="w-3.5 h-3.5 text-purple-300" />
        </button>
      </div>
    </div>
  );
}
