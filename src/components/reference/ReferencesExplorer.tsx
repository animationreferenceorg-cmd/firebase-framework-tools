'use client';

import { useEffect, useMemo, useState } from 'react';
import { Chrome, Scissors, Search, Smartphone, Sparkles, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getPublicReferenceClips } from '@/lib/reference-service';
import type { ReferenceClip } from '@/lib/types';
import { ReferenceClipCard } from './ReferenceClipCard';
import { CaptureClipDialog } from './CaptureClipDialog';
import { DirectUploadDialog } from './DirectUploadDialog';
import { MobileInstallDialog } from './MobileInstallDialog';
import { ExtensionInfoDialog } from './ExtensionInfoDialog';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  'All',
  'Acting',
  'Body Mechanics',
  'Combat',
  'Creature',
  'Dance',
  'Facial',
  'Locomotion',
  'Sports',
  'Stunts',
];

export function ReferencesExplorer() {
  const [clips, setClips] = useState<ReferenceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const loadClips = () => {
    getPublicReferenceClips()
      .then(setClips)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClips();
    setIsMobileDevice(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadClips();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const hasPendingCapture = clips.some((clip) => clip.captureStatus === 'queued' || clip.captureStatus === 'processing' || clip.bunnySyncStatus === 'pending');
    if (!hasPendingCapture) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadClips();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [clips]);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return clips.filter((clip) => {
      const matchesCategory = selectedCategory === 'All' || clip.category?.toLowerCase() === selectedCategory.toLowerCase();
      const searchable = `${clip.title} ${clip.category} ${(clip.tags || []).join(' ')} ${(clip.visualTags || []).join(' ')} ${(clip.palette || []).join(' ')} ${(clip.paletteBuckets || []).join(' ')}`.toLowerCase();
      const matchesSearch = !needle || searchable.includes(needle);
      const matchesColor = !selectedColor || (clip.palette || []).includes(selectedColor);
      return matchesCategory && matchesSearch && matchesColor;
    });
  }, [clips, search, selectedCategory, selectedColor]);

  const paletteOptions = useMemo(() => [...new Set(clips.flatMap((clip) => clip.palette || []))].slice(0, 16), [clips]);

  return (
    <>
      {/* Mobile Top Install Prompt Banner (Visible on mobile devices) */}
      {isMobileDevice && (
        <div className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-950/40 p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/20 text-purple-300">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-xs font-bold">Using a Mobile Device?</h3>
              <p className="text-[11px] text-purple-200">Save Animation Reference to your Home Screen for 1-click mobile clipping.</p>
            </div>
          </div>
          <MobileInstallDialog>
            <Button size="sm" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 font-semibold text-xs whitespace-nowrap">
              <Smartphone className="mr-1.5 h-3.5 w-3.5" />
              Save App to Home Screen
            </Button>
          </MobileInstallDialog>
        </div>
      )}

      {/* Main Reference Navigation & Quick Options Banner */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-950/80 p-5 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-purple-500/10 text-purple-300">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">How would you like to save reference?</h2>
              <p className="text-xs text-zinc-400">Collect motion from YouTube, Instagram, TikTok, and web links</p>
            </div>
          </div>

          {/* 3 Explicit Option Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <CaptureClipDialog onCreated={loadClips} />
            <DirectUploadDialog onCreated={loadClips} />

            <MobileInstallDialog>
              <Button variant="outline" className="border-white/10 bg-black/40 hover:bg-purple-950/40 text-purple-300">
                <Smartphone className="mr-2 h-4 w-4" />
                Mobile App
              </Button>
            </MobileInstallDialog>

            <ExtensionInfoDialog>
              <Button variant="outline" className="border-white/10 bg-black/40 hover:bg-purple-950/40 text-purple-300">
                <Chrome className="mr-2 h-4 w-4" />
                Extension
              </Button>
            </ExtensionInfoDialog>
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                  : 'border border-white/10 bg-black/40 text-zinc-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="relative mx-auto mb-10 max-w-2xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sword weight, acting beats, quadruped locomotion…"
          className="h-14 rounded-2xl border-white/10 bg-black/50 pl-12 text-sm focus:border-purple-500"
        />
      </div>

      {paletteOptions.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-xs font-semibold text-zinc-500">Color palette</span>
          {paletteOptions.map((hex) => (
            <button key={hex} type="button" onClick={() => setSelectedColor(selectedColor === hex ? null : hex)} title={`Filter by ${hex}`} aria-label={`Filter by ${hex}`} className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 ${selectedColor === hex ? 'border-white ring-2 ring-purple-500' : 'border-white/20'}`} style={{ backgroundColor: hex }} />
          ))}
          {selectedColor && <button type="button" onClick={() => setSelectedColor(null)} className="ml-2 text-xs text-purple-300 hover:text-white">Clear color</button>}
        </div>
      )}

      {/* Main Reference Collection Grid or Empty State */}
      {loading ? (
        <div className="grid place-items-center py-24 text-zinc-500">Loading community reference clips…</div>
      ) : filtered.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((clip) => (
            <ReferenceClipCard clip={clip} key={clip.id} onDeleted={(clipId) => setClips(current => current.filter(item => item.id !== clipId))} onTagClick={setSearch} onColorClick={setSelectedColor} />
          ))}
        </div>
      ) : (
        <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 bg-zinc-950/40 py-20 px-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-purple-500/20 bg-purple-950/30 text-purple-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-white">
            {selectedCategory !== 'All' ? `No ${selectedCategory} clips found yet` : 'The first clip starts the collection'}
          </h2>
          <p className="mt-2 max-w-md text-sm text-zinc-400">
            Add a reference clip from YouTube, Instagram, or TikTok to kick off this community vault.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <CaptureClipDialog onCreated={loadClips} />
            <DirectUploadDialog onCreated={loadClips} />

            <MobileInstallDialog>
              <Button variant="outline" className="border-white/10 bg-black/40 hover:bg-purple-950/40 text-purple-300">
                <Smartphone className="mr-2 h-4 w-4" />
                Mobile App
              </Button>
            </MobileInstallDialog>

            <ExtensionInfoDialog>
              <Button variant="outline" className="border-white/10 bg-black/40 hover:bg-purple-950/40 text-purple-300">
                <Chrome className="mr-2 h-4 w-4" />
                Extension
              </Button>
            </ExtensionInfoDialog>
          </div>
        </div>
      )}
    </>
  );
}
