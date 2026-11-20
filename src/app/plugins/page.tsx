import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Download,
  Sparkles,
  CheckCircle2,
  Clapperboard,
  Layers,
  Clock,
  Camera,
  Upload,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Maya & Blender Animation Reference Plugins | Free Download',
  description:
    'Import animation references directly into Autodesk Maya (2022–2027) and Blender (3.6–5.0). Picture-in-Picture camera overlays, Magic Align frame sync, timeline pose markers, and 1-click MP4 playblast uploads.',
  keywords: [
    'maya animation reference plugin',
    'blender animation reference addon',
    'maya image plane reference plugin',
    'blender camera background video reference',
    'maya playblast mp4 plugin',
    'animation reference studio plugin',
  ],
  alternates: { canonical: '/plugins' },
};

const MAYA_FEATURES = [
  'Dockable Maya workspaceControl panel & floating Mini Monitor',
  'Camera Image Plane with 1-click PiP corner presets & 3D World Card',
  'Magic Align frame sync, -5f/-1f/+1f/+5f slip nudge, mirror & opacity',
  'Color-coded Maya Time Slider Pose Bookmarks (Anticipation, Contact, Passing, Extreme)',
  '1-click MP4 / AVI Viewport Playblast + automatic upload to AnimationReference.org',
  'Supports Maya 2022–2027 (PySide2 & PySide6) on Windows, macOS & Linux',
];

const BLENDER_FEATURES = [
  'Native View3D Sidebar (N-Panel) with zero external pip dependencies',
  'Camera Background Video with PiP presets, 3D Image Empty & Video Sequencer (VSE)',
  'Active Scene Reference Manager: Magic Align, Nudge/Slip, Mirror, Opacity & Match FPS',
  '1-click Timeline Pose Markers & built-in FFmpeg OpenGL Viewport Playblast (MP4 / AVI)',
  '1-click Browser Sign-In (Google & Email) + direct playblast upload to your account',
  'Compatible with Blender 3.6, 4.0, 4.2+ Extensions, and 5.0',
];

export default function PluginsPage() {
  return (
    <main className="relative min-h-screen bg-[#08070e] text-white pb-28">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-4/5 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600/20 via-indigo-600/15 to-cyan-500/15 blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="mx-auto max-w-3xl text-center space-y-4">
          <Badge className="bg-purple-500/15 text-purple-200 border border-purple-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-purple-300" />
            Official 3D Studio Plugins
          </Badge>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-white via-purple-50 to-zinc-400">
            Animation Reference Inside Maya &amp; Blender
          </h1>
          <p className="text-base text-zinc-400 sm:text-lg leading-relaxed">
            Stop downloading, converting, and manually wiring image planes. Search millions of motion references,
            sync frames to your timeline, drop pose markers, and playblast straight from your 3D viewport.
          </p>
        </header>

        {/* Plugin Download Cards */}
        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          {/* Autodesk Maya */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-cyan-500/25 bg-gradient-to-b from-[#0d1420]/90 to-[#0a0a12]/95 p-8 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                    Maya 2022–2027 · PySide2 &amp; PySide6
                  </span>
                  <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                    Autodesk Maya Plugin
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Drag-and-drop installer · Auto shelf button · Dockable studio panel
                  </p>
                </div>
                <Clapperboard className="h-9 w-9 shrink-0 text-cyan-400" />
              </div>

              <ul className="space-y-2.5 text-sm text-zinc-300">
                {MAYA_FEATURES.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-zinc-400 space-y-1.5">
                <p className="font-bold text-zinc-200">Quick Install (30 seconds):</p>
                <p>1. Unzip <code className="text-cyan-300">animref_maya_plugin.zip</code>.</p>
                <p>2. Drag <code className="text-cyan-300">drag_and_drop_install.py</code> into your Maya viewport.</p>
                <p>3. Click the new <strong className="text-white">AnimRef</strong> shelf icon &amp; sign in via browser.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold shadow-lg shadow-cyan-500/20"
              >
                <a href="/downloads/animref_maya_plugin.zip" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download for Maya (.zip)
                </a>
              </Button>
            </div>
          </div>

          {/* Blender */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-orange-500/25 bg-gradient-to-b from-[#1a110a]/90 to-[#0a0a12]/95 p-8 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-300 border border-orange-500/30">
                    Blender 3.6 – 5.0 · Extensions Ready
                  </span>
                  <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                    Blender Studio Add-on
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Zero external dependencies · Native N-Panel · Built-in FFmpeg Playblast
                  </p>
                </div>
                <Layers className="h-9 w-9 shrink-0 text-orange-400" />
              </div>

              <ul className="space-y-2.5 text-sm text-zinc-300">
                {BLENDER_FEATURES.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-zinc-400 space-y-1.5">
                <p className="font-bold text-zinc-200">Quick Install (30 seconds):</p>
                <p>1. Download <code className="text-orange-300">animref_blender_addon.zip</code> (do not unzip).</p>
                <p>2. In Blender: <strong className="text-white">Edit → Preferences → Add-ons → Install...</strong></p>
                <p>3. Enable <strong className="text-white">AnimationReference.org Studio</strong> and press <code className="text-orange-300">N</code> → <strong className="text-white">AnimRef</strong>.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-zinc-950 font-extrabold shadow-lg shadow-orange-500/20"
              >
                <a href="/downloads/animref_blender_addon.zip" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download for Blender (.zip)
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Workflow Highlights */}
        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Camera,
              title: 'PiP Camera Overlays',
              desc: 'Drop reference clips right into your shot camera corner with live opacity, mirror flip, and zero viewport clutter.',
            },
            {
              icon: Clock,
              title: 'Magic Align & Frame Nudge',
              desc: 'Sync any contact pose to your active timeline frame in 1 click and slip timing by ±1f or ±5f on the fly.',
            },
            {
              icon: Upload,
              title: '1-Click Playblast Upload',
              desc: 'Capture clean H.264 MP4 playblasts and publish straight to your AnimationReference.org portfolio or WIP feed.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-2">
              <Icon className="h-6 w-6 text-purple-400" />
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </section>

        {/* Pro CTA */}
        <section className="mt-16 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-purple-950/70 p-8 sm:p-10 text-center space-y-4">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pro Unlocks Unlimited Direct Video Imports
          </div>
          <h2 className="text-2xl font-black sm:text-3xl">
            Try Pro for $1 Your First Month
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-zinc-300">
            Both plugins are free to install. Upgrade to Pro ($1 first month, then $5/mo) for unlimited direct
            24 FPS MP4 imports into Maya &amp; Blender, private NDA boards, and playblast compare.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-extrabold">
              <Link href="/pricing">
                Claim $1 Pro Pass
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
