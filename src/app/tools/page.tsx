import type { Metadata } from 'next';
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
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Maya & Blender Animation Reference Plugins | AnimationReference.org Tools',
  description:
    'Download the official AnimationReference.org Studio plugins for Autodesk Maya and Blender. Browse 8,000+ references, import 3D reference planes at origin, control timing live, upload to moodboards, and get automatic updates.',
};

const SHARED_FEATURES = [
  {
    icon: Film,
    title: '15 Free Daily Imports + Unlimited Own Uploads',
    description:
      'Every signed-in animator gets 15 free daily library imports into Maya or Blender, plus unlimited imports on references you upload yourself.',
  },
  {
    icon: Sliders,
    title: 'Live Scene Plane Controls',
    description:
      'Adjust size, opacity, center to (0,0,0), flip horizontally, lock unselectable mode, and Magic Align or nudge timing (-5f/-1f/+1f/+5f) without leaving your viewport.',
  },
  {
    icon: UploadCloud,
    title: 'Moodboard Sync & Playblast Drafts',
    description:
      'Upload local videos, GIFs, or images straight into your AnimationReference.org moodboards, or stage viewport playblasts as drafts to edit before publishing.',
  },
  {
    icon: RefreshCw,
    title: 'Automatic SHA-256 Self-Updates',
    description:
      'Install once and stay up to date forever. Both plugins automatically check for updates on launch and apply verified updates in the background.',
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen max-w-6xl mx-auto py-8 md:py-12 space-y-12 text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-[#12101d] via-[#0e0c18] to-[#09090e] p-7 md:p-12 shadow-2xl shadow-violet-950/30">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-600/15 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-violet-200">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            <span>Official 3D Studio Plugins</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.08]">
            Bring AnimationReference.org directly inside{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              Maya &amp; Blender
            </span>
          </h1>

          <p className="text-sm md:text-base text-zinc-300 leading-relaxed max-w-2xl">
            Browse 8,000+ animation references, sync your moodboards, import reference planes straight to{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-violet-200">(0, 0, 0)</code>,
            control timing live in your viewport, and upload references or playblasts — with automatic updates built in.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a href="/downloads/animref_maya_plugin.zip" download>
              <Button className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-5 gap-2 shadow-lg shadow-violet-900/40 cursor-pointer">
                <Download className="h-4 w-4" />
                <span>Download for Maya</span>
              </Button>
            </a>
            <a href="/downloads/animref_blender_addon.zip" download>
              <Button className="h-11 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold px-5 gap-2 cursor-pointer">
                <Download className="h-4 w-4 text-orange-300" />
                <span>Download for Blender</span>
              </Button>
            </a>
            <Link href="/extension/connect">
              <Button variant="ghost" className="h-11 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 gap-1.5 cursor-pointer">
                <span>1-Click Account Connect</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Two Main Plugin Download Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maya Card */}
        <div className="rounded-3xl border border-cyan-500/25 bg-[#111119] p-6 md:p-8 flex flex-col justify-between gap-6 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-black text-lg">
                  M
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">AnimRef Studio for Maya</h2>
                  <p className="text-xs text-cyan-300 font-semibold">Autodesk Maya 2020 – 2026 (Windows / macOS)</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                Free
              </span>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              Native PySide dark obsidian Studio Window docked or floating in Maya. Imports clean 60fps VP2 image sequences
              centered at origin <code className="text-xs text-cyan-200">(0, 0, 0)</code>, with an automatic{' '}
              <strong className="text-white">Scene Planes</strong> tab that activates whenever you click a plane in the viewport.
            </p>

            <ul className="space-y-2 text-xs text-zinc-300">
              {[
                'Simple dark video player with frame stepping, speed, loop & Maya timeline sync',
                'Live Scene Planes tab: Size, Opacity, Center (0,0,0), Flip, Lock, Magic Align & ±1f/±5f nudge',
                'Upload local videos/images to Moodboards + Dedicated Unlimited Uploaded tab',
                'Record Maya playblasts & open as editable drafts on AnimationReference.org',
                'Built-in SHA-256 auto-updater with 1-click Reload Plugin button',
              ].map((feat) => (
                <li key={feat} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-white/10 bg-[#09090e] p-4 space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                Quick 3-Step Install
              </div>
              <ol className="list-decimal list-inside space-y-1 text-xs text-zinc-300">
                <li>Download and unzip <code className="text-violet-300">animref_maya_plugin.zip</code>.</li>
                <li>Drag &amp; drop <code className="text-violet-300">drag_and_drop_install.mel</code> into your Maya viewport.</li>
                <li>Sign in once via browser — your Moodboards, Uploaded clips &amp; auto-updates sync automatically.</li>
              </ol>
            </div>
          </div>

          <a href="/downloads/animref_maya_plugin.zip" download className="block">
            <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-extrabold text-sm gap-2 cursor-pointer">
              <Download className="h-4 w-4" />
              <span>Download Maya Plugin (.zip)</span>
            </Button>
          </a>
        </div>

        {/* Blender Card */}
        <div className="rounded-3xl border border-orange-500/25 bg-[#111119] p-6 md:p-8 flex flex-col justify-between gap-6 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-orange-500/15 border border-orange-400/30 flex items-center justify-center text-orange-300 font-black text-lg">
                  B
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">AnimRef Studio for Blender</h2>
                  <p className="text-xs text-orange-300 font-semibold">Blender 3.6 – 5.1+ (Extensions &amp; Legacy Add-ons)</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                Free
              </span>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              Includes both a frameless dark obsidian <strong className="text-white">Companion Studio Window</strong> with
              hover-to-play cards and a native <strong className="text-white">View3D → N → AnimRef</strong> sidebar
              for instant live control of any reference plane already in your scene.
            </p>

            <ul className="space-y-2 text-xs text-zinc-300">
              {[
                'Frameless Companion Studio Window matching Maya with hover previews & frame scrubber',
                'Default Blender N-panel controls your active scene plane live (Size, Opacity, Origin, Lock, Flip, Sync)',
                'Import as 3D Reference Plane (auto-framed), Camera Background PiP, or VSE strip',
                'Upload local videos/images to Moodboards + Dedicated Unlimited Uploaded tab',
                'Built-in SHA-256 auto-updater so new features arrive automatically',
              ].map((feat) => (
                <li key={feat} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-white/10 bg-[#09090e] p-4 space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                Quick 3-Step Install
              </div>
              <ol className="list-decimal list-inside space-y-1 text-xs text-zinc-300">
                <li>Download <code className="text-orange-300">animref_blender_addon.zip</code> (do not unzip).</li>
                <li>In Blender, go to <strong className="text-white">Edit → Preferences → Get Extensions / Add-ons → Install from Disk</strong>.</li>
                <li>Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">N</kbd> in the 3D Viewport → <strong className="text-white">AnimRef</strong> tab → click <strong className="text-white">Open AnimRef Studio Window</strong>.</li>
              </ol>
            </div>
          </div>

          <a href="/downloads/animref_blender_addon.zip" download className="block">
            <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-violet-600 hover:from-orange-400 hover:to-violet-500 text-white font-extrabold text-sm gap-2 cursor-pointer">
              <Download className="h-4 w-4" />
              <span>Download Blender Add-on (.zip)</span>
            </Button>
          </a>
        </div>
      </section>

      {/* Shared Features Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-violet-300">
          <Wand2 className="h-4 w-4" />
          <span>Built for Production Animators</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SHARED_FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-[#111119] p-5 flex items-start gap-4"
              >
                <div className="h-10 w-10 rounded-xl bg-violet-500/15 border border-violet-400/25 flex items-center justify-center text-violet-300 shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-white">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Web Tools Row */}
      <section className="rounded-3xl border border-white/10 bg-[#111119] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-violet-300">
            <Monitor className="h-4 w-4" />
            <span>Also Included on AnimationReference.org</span>
          </div>
          <h3 className="text-lg font-black text-white">Moodboards, Frame-by-Frame Player &amp; Paint Drawovers</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Every reference you upload or save in Maya or Blender stays synced with your web Moodboards,
            frame-by-frame player, and drawover canvas.
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
              <Sparkles className="h-3.5 w-3.5" />
              <span>Upgrade to Pro ($1 First Month)</span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
