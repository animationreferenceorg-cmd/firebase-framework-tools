'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Terminal, 
  CheckCircle2, 
  Zap, 
  Sparkles, 
  Box, 
  Layers, 
  Sliders, 
  ArrowRight,
  ExternalLink,
  Film,
  Camera
} from 'lucide-react';

export default function PluginsPage() {
  const [activeTab, setActiveTab] = useState<'maya' | 'blender'>('maya');

  return (
    <main className="min-h-screen bg-[#070512] text-white selection:bg-purple-500/30 selection:text-purple-200 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-1/4 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full" />
        <div className="absolute top-[20%] right-1/4 w-[500px] h-[500px] bg-orange-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-16">
        {/* Hero Section */}
        <header className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Official Studio 3D Plugins
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Stream Animation References Straight Into{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Maya & Blender
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate friction between study and execution. Search 10,000+ references, create synchronized camera planes, slip timing, and stream clips into your 3D viewport in 1 click.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a href="/downloads/animref_maya_plugin.zip" download="animref_maya_plugin.zip">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl h-12 px-6 font-bold shadow-lg shadow-purple-600/30 gap-2">
                <Download className="h-4 w-4" />
                Download Maya Plugin (.zip)
              </Button>
            </a>
            <a href="/downloads/animref_blender_addon.zip" download="animref_blender_addon.zip">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl h-12 px-6 font-bold shadow-lg shadow-orange-600/30 gap-2">
                <Download className="h-4 w-4" />
                Download Blender Add-on (.zip)
              </Button>
            </a>
          </div>
        </header>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3 backdrop-blur-xl">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Box className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">In-Viewport Reference Search</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Browse and search locomotion, combat choreography, and acting references directly inside Maya and Blender without ever switching windows.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3 backdrop-blur-xl">
            <div className="h-10 w-10 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300">
              <Camera className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Auto-Rigged Camera Planes</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Automatically creates a dedicated reference camera, attaches the video with frame extensions, and locks it behind your character rigs.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3 backdrop-blur-xl">
            <div className="h-10 w-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-300">
              <Sliders className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Frame Slip & FPS Conformer</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Slip timing forward or backward (-100 to +100 frames) to match your blocking keys, and conform scene frame rates in a single click.
            </p>
          </div>
        </section>

        {/* Deep Dive & Installation Tabs */}
        <section className="space-y-6 pt-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Installation & Quickstart</h2>
            <p className="text-xs sm:text-sm text-zinc-400">Step-by-step instructions for Maya and Blender.</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-2 bg-black/40 border border-white/10 rounded-2xl p-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('maya')}
                className={`rounded-xl font-semibold text-sm py-2.5 transition-all cursor-pointer ${
                  activeTab === 'maya' 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Autodesk Maya (2020 - 2026)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('blender')}
                className={`rounded-xl font-semibold text-sm py-2.5 transition-all cursor-pointer ${
                  activeTab === 'blender' 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Blender (3.6 - 4.3+)
              </button>
            </div>

            {/* Maya Guide */}
            {activeTab === 'maya' && (
              <div className="p-8 rounded-3xl bg-black/40 border border-purple-500/20 space-y-6 backdrop-blur-xl animate-in fade-in-50 duration-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">Autodesk Maya Studio Plugin</h3>
                    <p className="text-xs text-zinc-400">Compatible with PySide2 (Maya 2020-2024) and PySide6 (Maya 2025+)</p>
                  </div>
                  <a href="/downloads/animref_maya_plugin.zip" download="animref_maya_plugin.zip">
                    <Button className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold text-xs gap-1.5 shadow-md">
                      <Download className="h-4 w-4" />
                      Download animref_maya_plugin.zip
                    </Button>
                  </a>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="h-7 w-7 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">1</div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">Extract the Plugin</h4>
                      <p className="text-xs text-zinc-400">Extract <code className="text-purple-300">animref_maya_plugin.zip</code> anywhere on your computer.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="h-7 w-7 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">2</div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">Drag & Drop Install</h4>
                      <p className="text-xs text-zinc-400">
                        Drag <code className="text-purple-300 font-bold">drag_and_drop_install.mel</code> directly into your Maya 3D Viewport. It automatically adds the <code className="text-purple-300">AnimRef</code> button to your active shelf!
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="h-7 w-7 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">3</div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">Stream & Animate</h4>
                      <p className="text-xs text-zinc-400">
                        Click the shelf button to open the dockable window. Click <code className="text-purple-300">Send to Maya</code> from any reference on the site to stream clips directly into your viewport!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Blender Guide */}
            {activeTab === 'blender' && (
              <div className="p-8 rounded-3xl bg-black/40 border border-orange-500/20 space-y-6 backdrop-blur-xl animate-in fade-in-50 duration-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">Blender Studio Add-on</h3>
                    <p className="text-xs text-zinc-400">Compatible with Blender 3.6 LTS, 4.0, 4.1, 4.2 LTS, and 4.3+</p>
                  </div>
                  <a href="/downloads/animref_blender_addon.zip" download="animref_blender_addon.zip">
                    <Button className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold text-xs gap-1.5 shadow-md">
                      <Download className="h-4 w-4" />
                      Download animref_blender_addon.zip
                    </Button>
                  </a>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="h-7 w-7 rounded-full bg-orange-500/20 text-orange-300 font-bold text-xs flex items-center justify-center shrink-0">1</div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">Open Blender Preferences</h4>
                      <p className="text-xs text-zinc-400">In Blender, navigate to <code className="text-orange-300">Edit &gt; Preferences &gt; Add-ons</code>.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="h-7 w-7 rounded-full bg-orange-500/20 text-orange-300 font-bold text-xs flex items-center justify-center shrink-0">2</div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">Install Add-on (.zip)</h4>
                      <p className="text-xs text-zinc-400">
                        Click <code className="text-orange-300 font-bold">Install...</code> (or Install from Disk), select <code className="text-orange-300">animref_blender_addon.zip</code>, and enable the checkbox next to <b>Animation Reference</b>.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="h-7 w-7 rounded-full bg-orange-500/20 text-orange-300 font-bold text-xs flex items-center justify-center shrink-0">3</div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">Access in 3D Viewport</h4>
                      <p className="text-xs text-zinc-400">
                        Press <code className="text-orange-300 font-bold">N</code> in your 3D Viewport to open the sidebar. Click the <b>AnimRef</b> tab to start streaming and searching references!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Back to library CTA */}
        <div className="text-center pt-8 border-t border-white/5">
          <Link href="/home">
            <Button variant="ghost" className="text-zinc-400 hover:text-white gap-2 text-sm">
              <Film className="h-4 w-4" />
              Return to Animation Reference Library
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
