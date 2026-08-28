'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Play, 
  PenTool, 
  ExternalLink, 
  ChevronRight, 
  ChevronLeft, 
  Flame, 
  Radio, 
  Award, 
  ArrowRight,
  Layers,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ScrollingBentoShelf() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-4 text-left select-none">
      {/* Header with Scroll Arrows */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Featured Tutorials & Studio Drops
            </h3>
            <p className="text-xs text-zinc-400 font-medium">
              Tactile masterclasses, draw-over guides, and community announcements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all hover:scale-105"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all hover:scale-105"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Bento Track */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x"
      >
        {/* Bento 1: Large Primary High-Contrast Card (Matching the White "Get Started" Card) */}
        <div className="shrink-0 w-[320px] sm:w-[360px] md:w-[400px] rounded-[32px] bg-white text-zinc-950 p-6 md:p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden group snap-start transition-transform hover:scale-[1.01]">
          <div className="relative z-10 space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase tracking-wider border border-zinc-200">
              Interactive Masterclass
            </span>
            <h4 className="text-3xl font-black tracking-tight text-zinc-900 pt-1 leading-tight">
              Master Kinetic Weight & Arcs
            </h4>
            <p className="text-xs text-zinc-600 font-medium pt-1 leading-relaxed">
              Step-by-step breakdown on silhouette clarity, spacing, and anticipation.
            </p>
          </div>

          {/* Stylus / Hand Artwork Overlay */}
          <div className="relative h-44 w-full my-2 flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80"
              alt="Animation Study"
              className="w-full h-full object-cover rounded-2xl shadow-inner group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-2xl pointer-events-none" />
            
            {/* Draw-over Action Trigger Button */}
            <Link
              href="https://anim.works"
              target="_blank"
              className="absolute bottom-3 left-3 p-3 rounded-full bg-purple-600 text-white hover:bg-purple-500 shadow-xl transition-transform hover:scale-110 flex items-center gap-1.5 text-xs font-bold"
            >
              <PenTool className="w-4 h-4" />
              <span className="text-[11px] pr-1">Draw-over Study</span>
            </Link>
          </div>

          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-zinc-100">
            <span className="text-xs text-zinc-500 font-bold">Free Community Guide</span>
            <Link href="/categories">
              <Button size="sm" className="h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs">
                Start Studying
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento 2: 2-Tier Stacked Vertical Column (Matching the Chick & Teddy Bear Stack) */}
        <div className="shrink-0 w-[280px] sm:w-[320px] flex flex-col gap-4 snap-start">
          {/* Top Stacked Card */}
          <div className="flex-1 rounded-[28px] bg-white/[0.04] border border-white/10 hover:border-purple-500/40 p-4 shadow-xl flex items-center justify-between gap-3 group transition-all cursor-pointer">
            <div className="space-y-1 min-w-0 text-left">
              <span className="text-[9px] font-bold uppercase tracking-wider text-purple-300">Tutorial Drop</span>
              <h5 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors leading-tight">
                3-Frame Smear Arcs & Motion Lines
              </h5>
              <p className="text-[10px] text-zinc-400 font-medium">ToonBoom & Maya 2024</p>
            </div>
            <div className="h-16 w-16 rounded-2xl overflow-hidden bg-black/60 shrink-0 border border-white/10">
              <img
                src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80"
                alt="Smear tutorial"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
            </div>
          </div>

          {/* Bottom Stacked Card */}
          <div className="flex-1 rounded-[28px] bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 p-4 shadow-xl flex items-center justify-between gap-3 group transition-all cursor-pointer">
            <div className="space-y-1 min-w-0 text-left">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">Creature Study</span>
              <h5 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors leading-tight">
                Quadruped Spine & Scapula Mechanics
              </h5>
              <p className="text-[10px] text-zinc-400 font-medium">Blender 4.2 Breakdown</p>
            </div>
            <div className="h-16 w-16 rounded-2xl overflow-hidden bg-black/60 shrink-0 border border-white/10">
              <img
                src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80"
                alt="Creature study"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
            </div>
          </div>
        </div>

        {/* Bento 3: Dark Rounded Announcement Cards (Matching the Lucky Turtle & Piggy Cards) */}
        <div className="shrink-0 w-[240px] sm:w-[280px] rounded-[32px] bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-white/10 hover:border-purple-500/40 p-5 shadow-2xl flex flex-col justify-between snap-start group transition-all">
          <div className="space-y-1 text-left">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span>Tonight @ 7:00 PM EST</span>
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            </div>
            <h4 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors leading-tight pt-1">
              Live Critique & Study Room
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Submit your blocking or splining pass for real-time draw-overs.
            </p>
          </div>

          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black/60 my-3 border border-white/5">
            <img
              src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80"
              alt="Live Study"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>

          <Button
            onClick={() => window.open('https://syncsketch.com', '_blank')}
            className="w-full h-9 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
          >
            <span>Join Sync Room</span>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>

        {/* Bento 4: Production Grant Announcement Card */}
        <div className="shrink-0 w-[240px] sm:w-[280px] rounded-[32px] bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border border-white/10 hover:border-amber-500/40 p-5 shadow-2xl flex flex-col justify-between snap-start group transition-all">
          <div className="space-y-1 text-left">
            <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono font-bold">
              <span>$500 Community Grant</span>
              <Award className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h4 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors leading-tight pt-1">
              Monthly Challenge Winner
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Top voted animation wins the August grant and Hero Deck showcase.
            </p>
          </div>

          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black/60 my-3 border border-white/5">
            <img
              src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80"
              alt="Challenge Winner"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>

          <Link href="/feed">
            <Button
              variant="outline"
              className="w-full h-9 rounded-xl bg-white/5 hover:bg-white/15 text-amber-300 border-amber-500/30 font-bold text-xs"
            >
              Vote on Entries
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
