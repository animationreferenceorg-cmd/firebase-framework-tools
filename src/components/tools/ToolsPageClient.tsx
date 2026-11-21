'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Sparkles,
  RefreshCw,
  Film,
  Layers,
  UploadCloud,
  CheckCircle2,
  Sliders,
  ArrowRight,
  Monitor,
  Crown,
  Infinity as InfinityIcon,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type HostTab = 'maya' | 'blender';

const HOST_DATA: Record<
  HostTab,
  {
    name: string;
    shortName: string;
    versions: string;
    accentBadge: string;
    buttonGradient: string;
    image: string;
    downloadUrl: string;
    zipName: string;
    tagline: string;
    steps: string[];
    highlights: string[];
  }
> = {
  maya: {
    name: 'AnimRef Studio for Maya',
    shortName: 'Maya Studio',
    versions: 'Maya 2020 – 2026 · Win & macOS',
    accentBadge: 'border-cyan-400/35 bg-cyan-500/15 text-cyan-200',
    buttonGradient: 'from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500',
    image: '/images/plugins/maya-studio-preview.jpg',
    downloadUrl: '/downloads/animref_maya_plugin.zip',
    zipName: 'animref_maya_plugin.zip',
    tagline:
      'Native dark obsidian PySide Studio Window docked or floating in Maya. Imports 60fps VP2 image sequences centered at (0, 0, 0) with an automatic Scene Planes controller.',
    steps: [
      'Download and unzip animref_maya_plugin.zip.',
      'Drag & drop drag_and_drop_install.mel into your Maya viewport.',
      'Sign in once via browser — your Moodboards, Uploaded clips & auto-updates sync automatically.',
    ],
    highlights: [
      'Clean dark video player with frame stepping, speed, loop & Maya timeline sync',
      'Live Scene Planes tab auto-opens when you click any plane in your viewport',
      'Size, Opacity, Center (0,0,0), Flip X, Lock, Magic Align & ±1f/±5f nudge',
      'Upload local videos/images to Moodboards + Dedicated Unlimited Uploaded tab',
      'Record Maya playblasts & open as editable drafts on AnimationReference.org',
      'Automatic SHA-256 self-updater with 1-click Reload Plugin button',
    ],
  },
  blender: {
    name: 'AnimRef Studio for Blender',
    shortName: 'Blender Studio',
    versions: 'Blender 3.6 – 5.1+ · Extensions & Add-ons',
    accentBadge: 'border-orange-400/35 bg-orange-500/15 text-orange-200',
    buttonGradient: 'from-orange-500 to-violet-600 hover:from-orange-400 hover:to-violet-500',
    image: '/images/plugins/blender-studio-preview.jpg',
    downloadUrl: '/downloads/animref_blender_addon.zip',
    zipName: 'animref_blender_addon.zip',
    tagline:
      'Frameless dark obsidian Companion Studio Window matching Maya plus a native View3D → N → AnimRef sidebar to control any plane already in your scene live.',
    steps: [
      'Download animref_blender_addon.zip (keep it zipped).',
      'In Blender, open Edit → Preferences → Get Extensions / Add-ons → Install from Disk.',
      'Press N in the 3D Viewport → AnimRef tab → click Open AnimRef Studio Window.',
    ],
    highlights: [
      'Frameless dark Companion Studio Window with hover-to-play cards & frame scrubber',
      'Default Blender N-panel controls your active scene plane live in the viewport',
      'Import as 3D Reference Plane (auto-framed), Camera Background PiP, or VSE strip',
      'Upload local videos/images to Moodboards + Dedicated Unlimited Uploaded tab',
      'Record Blender playblasts & open as editable drafts on AnimationReference.org',
      'Automatic SHA-256 self-updater so new features arrive automatically',
    ],
  },
};

const WORKFLOW_STEPS = [
  {
    step: '01',
    icon: Layers,
    title: 'Sync Your AnimRef Moodboards',
    desc: 'Sign in once via browser. Every moodboard, saved clip, and uploaded reference on AnimationReference.org appears inside Maya & Blender instantly.',
  },
  {
    step: '02',
    icon: Sliders,
    title: 'Import to (0,0,0) & Control Live',
    desc: 'Drop a reference plane straight into the middle of your grid. Tweak Size, Opacity, Flip, Lock, and Magic Align timing right beside your rig.',
  },
  {
    step: '03',
    icon: UploadCloud,
    title: 'Upload Refs & Playblast Drafts',
    desc: 'Upload your own videos into Moodboards (unlimited imports forever) or record a playblast draft to polish and publish on AnimationReference.org.',
  },
];

export function ToolsPageClient() {
  const [heroHost, setHeroHost] = useState<HostTab>('maya');
  const active = HOST_DATA[heroHost];

  return (
    <div className="min-h-screen max-w-6xl mx-auto py-8 md:py-12 space-y-14 text-foreground">
      {/* 1. Interactive Studio Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-violet-500/30 bg-gradient-to-br from-[#141026] via-[#0e0c18] to-[#08090f] p-6 md:p-10 shadow-2xl shadow-violet-950/40">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/35 bg-violet-500/15 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-violet-200">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" />
              <span>Official Maya &amp; Blender Plugins</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.06]">
              Your Moodboards,{' '}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                Inside Maya &amp; Blender
              </span>
            </h1>

            <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
              Import animation references straight into your 3D viewport, control timing &amp; opacity live,
              and stay automatically updated. Free users get <strong className="text-white">15 daily imports</strong>{' '}
              plus <strong className="text-emerald-300">unlimited own uploads</strong> — and{' '}
              <strong className="text-violet-200">Pro members unlock unlimited imports from all AnimRef Moodboards &amp; the entire 8,000+ library</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a href="/downloads/animref_maya_plugin.zip" download>
                <Button className="h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-extrabold px-5 gap-2 shadow-lg shadow-violet-900/40 cursor-pointer">
                  <Download className="h-4 w-4" />
                  <span>Download for Maya</span>
                </Button>
              </a>
              <a href="/downloads/animref_blender_addon.zip" download>
                <Button className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-violet-600 hover:from-orange-400 hover:to-violet-500 text-white font-extrabold px-5 gap-2 shadow-lg shadow-orange-950/30 cursor-pointer">
                  <Download className="h-4 w-4" />
                  <span>Download for Blender</span>
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-400 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                SHA-256 auto-updates
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-violet-400" />
                Zero external dependencies
              </span>
              <Link href="/extension/connect" className="text-violet-300 hover:text-violet-200 font-bold inline-flex items-center gap-1">
                <span>1-Click Connect</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Interactive Preview Switcher */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex rounded-xl border border-white/10 bg-black/50 p-1">
                {(['maya', 'blender'] as HostTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setHeroHost(tab)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                      heroHost === tab
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {HOST_DATA[tab].shortName}
                  </button>
                ))}
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${active.accentBadge}`}>
                {active.versions}
              </span>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#050508] aspect-video shadow-2xl shadow-black/70">
              <img
                src={active.image}
                alt={active.name}
                className="h-full w-full object-cover transition-all duration-300"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-12">
                <p className="text-xs text-zinc-200 font-medium">{active.tagline}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Free vs. Pro Imports Comparison (Highlighting Pro Unlimited Moodboard Imports!) */}
      <section className="space-y-5">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-violet-300">
            <Crown className="h-3.5 w-3.5 text-amber-300" />
            <span>Free vs. Pro Plugin Access</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Start Free. Go Pro for{' '}
            <span className="bg-gradient-to-r from-amber-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              Unlimited Moodboard Imports
            </span>
          </h2>
          <p className="text-xs md:text-sm text-zinc-400">
            Both plugins are 100% free to download and use. Upgrade to Pro when you want unlimited imports from every AnimRef Moodboard and the full library.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Tier Card */}
          <div className="rounded-3xl border border-white/10 bg-[#111119] p-6 md:p-7 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Free Animator</h3>
                  <p className="text-xs text-zinc-400">Included with every free account</p>
                </div>
                <span className="text-2xl font-black text-white">$0</span>
              </div>

              <ul className="space-y-2.5 text-xs text-zinc-300">
                {[
                  'Full Maya & Blender Studio plugins included free',
                  '15 free daily reference imports from Moodboards & Library',
                  'Unlimited imports on your own uploaded references (Uploaded tab)',
                  'Upload local videos, GIFs & images straight to Moodboards',
                  'Live Scene Plane Controls + Playblast Draft staging',
                  'Automatic SHA-256 self-updates forever',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2.5">
              <a href="/downloads/animref_maya_plugin.zip" download className="flex-1">
                <Button variant="outline" className="w-full h-10 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold cursor-pointer">
                  Get Maya Free
                </Button>
              </a>
              <a href="/downloads/animref_blender_addon.zip" download className="flex-1">
                <Button variant="outline" className="w-full h-10 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold cursor-pointer">
                  Get Blender Free
                </Button>
              </a>
            </div>
          </div>

          {/* Pro Tier Card */}
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/50 bg-gradient-to-br from-[#191230] via-[#131024] to-[#111119] p-6 md:p-7 flex flex-col justify-between gap-6 shadow-2xl shadow-violet-950/40">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-violet-500/20 blur-2xl" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-300/35 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 mb-1">
                    <InfinityIcon className="h-3 w-3" />
                    <span>Unlimited Moodboard Imports</span>
                  </div>
                  <h3 className="text-lg font-black text-white">AnimationReference Pro</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-300">$1</div>
                  <div className="text-[10px] text-zinc-400 font-semibold">first month · then $5/mo</div>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-zinc-200">
                <li className="flex items-start gap-2.5 font-bold text-white">
                  <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  <span>Unlimited imports from all AnimRef Moodboards into Maya &amp; Blender (no daily cap)</span>
                </li>
                <li className="flex items-start gap-2.5 font-bold text-white">
                  <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  <span>Unlimited imports across the entire 8,000+ community reference library</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  <span>Unlimited clean 24 FPS MP4 downloads &amp; private production moodboards</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  <span>Director Pitch Deck PDF exports, Contact Sheets &amp; unlimited library viewing</span>
                </li>
              </ul>
            </div>

            <Link href="/pricing" className="relative z-10 block">
              <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold gap-2 shadow-lg shadow-violet-900/40 cursor-pointer">
                <Sparkles className="h-4 w-4" />
                <span>Unlock Unlimited Moodboard Imports — $1 First Month</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Three-Step Workflow Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {WORKFLOW_STEPS.map((w) => {
          const Icon = w.icon;
          return (
            <div key={w.step} className="rounded-2xl border border-white/10 bg-[#111119] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-violet-500/15 border border-violet-400/25 flex items-center justify-center text-violet-300">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-xs font-black text-zinc-600">{w.step}</span>
              </div>
              <h3 className="text-sm font-extrabold text-white">{w.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{w.desc}</p>
            </div>
          );
        })}
      </section>

      {/* 4. Detailed Maya & Blender Download + Install Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(['maya', 'blender'] as HostTab[]).map((key) => {
          const host = HOST_DATA[key];
          const isMaya = key === 'maya';
          return (
            <div
              key={key}
              className={`rounded-3xl border ${
                isMaya ? 'border-cyan-500/25' : 'border-orange-500/25'
              } bg-[#111119] p-6 md:p-7 flex flex-col justify-between gap-6 shadow-xl`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-2xl border flex items-center justify-center font-black text-lg ${
                        isMaya
                          ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
                          : 'bg-orange-500/15 border-orange-400/30 text-orange-300'
                      }`}
                    >
                      {isMaya ? 'M' : 'B'}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">{host.name}</h2>
                      <p className={`text-xs font-semibold ${isMaya ? 'text-cyan-300' : 'text-orange-300'}`}>
                        {host.versions}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                    Free
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#09090e] aspect-video shadow-lg">
                  <img src={host.image} alt={host.name} className="h-full w-full object-cover" />
                </div>

                <ul className="space-y-2 text-xs text-zinc-300">
                  {host.highlights.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 mt-0.5 ${isMaya ? 'text-cyan-400' : 'text-orange-400'}`}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="rounded-2xl border border-white/10 bg-[#09090e] p-4 space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                    Quick 3-Step Install
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-zinc-300">
                    {host.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <a href={host.downloadUrl} download className="block">
                <Button
                  className={`w-full h-12 rounded-2xl bg-gradient-to-r ${host.buttonGradient} text-white font-extrabold text-sm gap-2 cursor-pointer`}
                >
                  <Download className="h-4 w-4" />
                  <span>Download {host.zipName}</span>
                </Button>
              </a>
            </div>
          );
        })}
      </section>

      {/* 5. Web Companion Tools Strip */}
      <section className="rounded-3xl border border-white/10 bg-[#111119] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-violet-300">
            <Monitor className="h-4 w-4" />
            <span>Synced Across Web &amp; 3D</span>
          </div>
          <h3 className="text-lg font-black text-white">Moodboards, Frame-by-Frame Player &amp; Paint Drawovers</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Every board you build on AnimationReference.org syncs automatically into Maya &amp; Blender — and Pro
            members can import unlimited references straight from their AnimRef Moodboards with zero daily limits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <Link href="/moodboard">
            <Button variant="outline" className="rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-bold gap-1.5 cursor-pointer">
              <Layers className="h-3.5 w-3.5" />
              <span>Open Moodboards</span>
            </Button>
          </Link>
          <Link href="/pricing">
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold gap-1.5 cursor-pointer">
              <Film className="h-3.5 w-3.5" />
              <span>Go Pro ($1 First Month)</span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
