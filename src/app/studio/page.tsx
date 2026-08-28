'use client';

import React, { useState } from 'react';
import { 
  Kanban, 
  FileText, 
  Film, 
  Paintbrush, 
  MessageSquare, 
  Sparkles, 
  Settings,
  Activity,
  Home,
  Plus,
  Video,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { StudioPipelineBoard } from '@/components/studio/StudioPipelineBoard';
import { StudioScriptEditor } from '@/components/studio/StudioScriptEditor';
import { StudioStoryboard } from '@/components/studio/StudioStoryboard';
import { StudioFrameReview } from '@/components/studio/StudioFrameReview';
import { StudioChat } from '@/components/studio/StudioChat';
import { StudioDashboard } from '@/components/studio/StudioDashboard';
import { StudioAssetCMS } from '@/components/studio/StudioAssetCMS';
import { StudioStorySuite } from '@/components/studio/StudioStorySuite';
import { HardDrive, BookOpen } from 'lucide-react';

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'assets' | 'script' | 'storyboard' | 'review' | 'chat'>('pipeline');

  return (
    <div className="fixed inset-0 flex bg-[#212124] text-zinc-300 overflow-hidden select-none font-sans">
      
      {/* ──────────────── LEFT SIDEBAR (Dark Theme) ──────────────── */}
      <div className="w-64 flex flex-col h-full border-r border-white/5 py-5 px-4 gap-6 overflow-y-auto shrink-0">
        
        {/* Back to Animation Reference Link */}
        <Link 
          href="/home" 
          className="flex items-center gap-2 px-2.5 py-1.5 -mx-1 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform text-zinc-400 group-hover:text-purple-400" />
          <span>Back to Animation Reference</span>
        </Link>

        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">TeamUnity</span>
        </Link>

        {/* Menu Section */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-500 px-2 mb-2">Menu</span>
          
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer",
              activeTab === 'overview' ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-3">
              <Home className="h-4 w-4" />
              <span>Overview</span>
            </div>
            <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">12</div>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer",
              activeTab === 'pipeline' ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-3">
              <Kanban className="h-4 w-4" />
              <span>Tasks</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer",
              activeTab === 'assets' ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-3">
              <HardDrive className="h-4 w-4 text-emerald-400" />
              <span>Drive Assets</span>
            </div>
            <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">6</div>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer",
              activeTab === 'chat' ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </div>
            <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">1</div>
          </button>
          
          <button
            onClick={() => setActiveTab('script')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer",
              (activeTab === 'script' || activeTab === 'storyboard') ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-blue-400" />
              <span>Story & Script</span>
            </div>
            <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">3</div>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer",
              activeTab === 'review' ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-3">
              <Video className="h-4 w-4" />
              <span>Review</span>
            </div>
          </button>

        </div>

        {/* Projects Section */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-zinc-500">Projects</span>
            <button className="h-5 w-5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-semibold text-zinc-300 hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
              <span>Publications</span>
            </div>
            <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">4</div>
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-semibold text-zinc-400 hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <span>Planning</span>
            </div>
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-semibold text-zinc-400 hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <span>Design Internal</span>
            </div>
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-semibold text-zinc-400 hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <span>Marketing</span>
            </div>
          </button>
        </div>

        {/* Members Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-semibold text-zinc-500">Members</span>
            <button className="h-5 w-5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {[
            { name: 'Zaid Myers', time: '08:06:28', img: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=50&auto=format&fit=crop&q=80' },
            { name: 'Rebecca Young', time: '12:41:07', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&auto=format&fit=crop&q=80' },
            { name: 'Isaac Bowman', time: '01:56:22', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80' },
            { name: 'Vanessa Douglas', time: '16:35:59', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&auto=format&fit=crop&q=80' },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-3 px-2">
              <img src={m.img} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-zinc-200">{m.name}</span>
                <span className="text-[10px] text-zinc-500">{m.time} for this week</span>
              </div>
            </div>
          ))}
        </div>

        {/* Current User Bottom */}
        <div className="mt-auto px-2 flex items-center gap-3">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80" alt="Katrina Malone" className="w-8 h-8 rounded-full object-cover border-2 border-orange-500" />
          <span className="text-[13px] font-bold text-white">Katrina Malone</span>
        </div>

      </div>

      {/* ──────────────── MAIN CONTENT AREA (Light Theme) ──────────────── */}
      <div className="flex-1 flex overflow-hidden relative bg-[#f7f7f8] rounded-l-3xl border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        {activeTab === 'overview' && <StudioDashboard />}
        {activeTab === 'pipeline' && <StudioPipelineBoard onNavigateToReview={() => setActiveTab('review')} />}
        {activeTab === 'assets' && <StudioAssetCMS onNavigateToReview={() => setActiveTab('review')} />}
        {(activeTab === 'script' || activeTab === 'storyboard') && <StudioStorySuite onNavigateToReview={() => setActiveTab('review')} />}
        {activeTab === 'review' && <StudioFrameReview />}
        {activeTab === 'chat' && <StudioChat />}
      </div>

    </div>
  );
}
