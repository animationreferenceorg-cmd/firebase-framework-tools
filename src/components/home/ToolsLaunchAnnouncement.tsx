'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Download, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'animref:tools-launch-announcement-v1';

export function ToolsLaunchAnnouncement() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true);
      }
    } catch {}
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-[#141024] via-[#121121] to-[#0f1622] px-5 py-4 md:px-6 md:py-5 shadow-xl shadow-violet-950/25">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/20 blur-2xl" />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-violet-900/40">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-500/20 border border-violet-400/35 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-200">
                New Release
              </span>
              <h2 className="text-sm md:text-base font-extrabold text-white tracking-tight">
                AnimRef Studio Plugins for Maya &amp; Blender are Live!
              </h2>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Import references straight into Maya &amp; Blender (15 free daily + unlimited own uploads), control planes live in your viewport, sync moodboards, and get automatic updates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a href="/downloads/animref_maya_plugin.zip" download>
            <Button size="sm" variant="outline" className="h-9 rounded-xl border-cyan-400/35 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-xs font-bold gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5" />
              <span>Maya</span>
            </Button>
          </a>
          <a href="/downloads/animref_blender_addon.zip" download>
            <Button size="sm" variant="outline" className="h-9 rounded-xl border-orange-400/35 bg-orange-500/10 hover:bg-orange-500/20 text-orange-200 text-xs font-bold gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5" />
              <span>Blender</span>
            </Button>
          </a>
          <Link href="/tools">
            <Button size="sm" className="h-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-extrabold gap-1.5 px-3.5 cursor-pointer">
              <span>Tools Page</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss announcement"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
