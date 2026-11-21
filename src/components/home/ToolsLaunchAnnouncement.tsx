'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Download,
  ArrowRight,
  X,
  CheckCircle2,
  Maximize2,
  Sliders,
  RefreshCw,
  UploadCloud,
  Film,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

const BANNER_DISMISS_KEY = 'animref:tools-launch-banner-v2';
const POPUP_SEEN_KEY = 'animref:tools-launch-popup-v1';

const PREVIEWS = {
  maya: {
    label: 'Maya Studio',
    badge: 'MAYA 2020–2026',
    badgeClass: 'border-cyan-400/35 bg-cyan-500/15 text-cyan-200',
    image: '/images/plugins/maya-studio-preview.png',
    caption: 'Native dark obsidian Studio Window docked in Maya — imports 60fps reference planes centered at (0,0,0) with live Scene Plane controls.',
    downloadUrl: '/downloads/animref_maya_plugin.zip',
    downloadLabel: 'Download for Maya',
  },
  blender: {
    label: 'Blender Studio',
    badge: 'BLENDER 3.6–5.1+',
    badgeClass: 'border-orange-400/35 bg-orange-500/15 text-orange-200',
    image: '/images/plugins/blender-studio-preview.png',
    caption: 'Frameless dark Companion Studio + native View3D N-panel controller for live Size, Opacity, Origin, Flip & Timeline Sync.',
    downloadUrl: '/downloads/animref_blender_addon.zip',
    downloadLabel: 'Download for Blender',
  },
} as const;

type PreviewKey = keyof typeof PREVIEWS;

export function ToolsLaunchAnnouncement() {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewKey>('maya');
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(BANNER_DISMISS_KEY) === '1') {
        setBannerDismissed(true);
      }
      const alreadySeenPopup = localStorage.getItem(POPUP_SEEN_KEY) === '1';
      if (!alreadySeenPopup) {
        const timer = window.setTimeout(() => {
          setPopupOpen(true);
          try {
            localStorage.setItem(POPUP_SEEN_KEY, '1');
          } catch { }
        }, 1200);
        return () => window.clearTimeout(timer);
      }
    } catch { }
  }, []);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISS_KEY, '1');
    } catch { }
  };

  const current = PREVIEWS[activeTab];

  return (
    <>
      {!bannerDismissed && (
        <section className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-[#141026] via-[#100e1c] to-[#0a0c14] p-5 md:p-7 shadow-2xl shadow-violet-950/35">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismissBanner}
            aria-label="Dismiss announcement"
            className="absolute right-4 top-4 z-20 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left copy & CTAs */}
            <div className="lg:col-span-6 space-y-4 pr-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md shadow-violet-900/40">
                  <Sparkles className="h-3 w-3" />
                  New Launch
                </span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  Free · Auto-Updating
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-[1.12]">
                Maya &amp; Blender Studio Plugins are{' '}
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  Here
                </span>
              </h2>

              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                Browse 8,000+ references, sync your AnimRef Moodboards, import 3D reference planes straight to{' '}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-violet-200">(0, 0, 0)</code>,
                and control timing live. <strong className="text-violet-200">Pro users get unlimited imports from AnimRef Moodboards</strong> (free accounts get 15/day + unlimited own uploads).
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-zinc-200">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Film className="h-3.5 w-3.5 text-violet-400" />
                  15 free daily imports
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <UploadCloud className="h-3.5 w-3.5 text-emerald-400" />
                  Unlimited own uploads
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                  Live viewport controls
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <RefreshCw className="h-3.5 w-3.5 text-fuchsia-400" />
                  Auto-updates
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <a href="/downloads/animref_maya_plugin.zip" download>
                  <Button className="h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold px-4 gap-1.5 shadow-lg shadow-violet-900/40 cursor-pointer">
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Maya</span>
                  </Button>
                </a>
                <a href="/downloads/animref_blender_addon.zip" download>
                  <Button className="h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-orange-400/35 text-orange-100 text-xs font-extrabold px-4 gap-1.5 cursor-pointer">
                    <Download className="h-3.5 w-3.5 text-orange-300" />
                    <span>Download Blender</span>
                  </Button>
                </a>
                <Link href="/tools">
                  <Button variant="ghost" className="h-10 rounded-xl text-zinc-200 hover:text-white hover:bg-white/10 text-xs font-bold gap-1 px-3 cursor-pointer">
                    <span>Install Guide</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right interactive screenshot showcase */}
            <div className="lg:col-span-6 space-y-2.5">
              {/* Switcher pills */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1">
                  {(['maya', 'blender'] as PreviewKey[]).map((key) => {
                    const active = activeTab === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition-all cursor-pointer ${active
                            ? 'bg-violet-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                          }`}
                      >
                        {PREVIEWS[key].label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setPopupOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-zinc-200 transition-colors cursor-pointer"
                >
                  <Maximize2 className="h-3 w-3 text-violet-300" />
                  <span>Expand Preview</span>
                </button>
              </div>

              {/* Screenshot frame */}
              <div
                onClick={() => setPopupOpen(true)}
                className="group relative overflow-hidden rounded-2xl border border-white/15 bg-[#09090e] aspect-video cursor-pointer shadow-xl shadow-black/60"
              >
                <img
                  src={current.image}
                  alt={`${current.label} Plugin Screenshot`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3.5 pt-10 flex items-end justify-between gap-3">
                  <p className="text-[11px] text-zinc-200 font-medium line-clamp-2">{current.caption}</p>
                  <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${current.badgeClass}`}>
                    {current.badge}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Launch Announcement Pop-Up Modal (auto-opens once for new visitors, or on click) */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-3xl bg-[#0b0a12] border border-violet-500/35 text-white shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="relative bg-gradient-to-br from-[#161129] via-[#0e0c18] to-[#09090e] p-6 md:p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 border border-violet-400/35 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-violet-200">
                  <Sparkles className="h-3 w-3" />
                  <span>Just Launched · Free Plugins</span>
                </div>
                <DialogTitle className="text-xl md:text-2xl font-black tracking-tight text-white">
                  AnimRef Studio for Maya &amp; Blender
                </DialogTitle>
              </div>

              <div className="inline-flex rounded-xl border border-white/10 bg-black/50 p-1">
                {(['maya', 'blender'] as PreviewKey[]).map((key) => {
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${active
                          ? 'bg-violet-600 text-white shadow'
                          : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                      {PREVIEWS[key].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Large Visual Screenshot */}
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#050508] aspect-video shadow-2xl">
              <img
                src={current.image}
                alt={`${current.label} Screenshot`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-12 flex items-end justify-between gap-3">
                <p className="text-xs text-zinc-200 font-medium">{current.caption}</p>
                <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${current.badgeClass}`}>
                  {current.badge}
                </span>
              </div>
            </div>

            {/* Quick Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-zinc-300">
              {[
                'Pro users get unlimited imports from AnimRef Moodboards & the entire 8,000+ library',
                'Free accounts get 15 daily library imports + unlimited imports on your own uploads',
                'Live viewport plane controls: Size, Opacity, Center (0,0,0), Flip & Magic Align',
                'Upload videos/images to Moodboards + automatic SHA-256 self-updates forever',
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{line}</span>
                </div>
              ))}
            </div>

            {/* Modal Footer CTAs */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <a href="/downloads/animref_maya_plugin.zip" download>
                  <Button className="h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-extrabold px-4 gap-1.5 cursor-pointer">
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Maya (.zip)</span>
                  </Button>
                </a>
                <a href="/downloads/animref_blender_addon.zip" download>
                  <Button className="h-10 rounded-xl bg-gradient-to-r from-orange-500 to-violet-600 hover:from-orange-400 hover:to-violet-500 text-white text-xs font-extrabold px-4 gap-1.5 cursor-pointer">
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Blender (.zip)</span>
                  </Button>
                </a>
              </div>
              <Link href="/tools" onClick={() => setPopupOpen(false)}>
                <Button variant="ghost" className="h-10 rounded-xl text-violet-300 hover:text-white hover:bg-white/10 text-xs font-bold gap-1 cursor-pointer">
                  <span>Full Install Guide</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
