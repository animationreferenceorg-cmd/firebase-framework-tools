'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, Check, Chrome, Download, ExternalLink, Globe, Loader2, Search, Smartphone, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getPublicReferenceClips } from '@/lib/reference-service';
import type { ReferenceClip } from '@/lib/types';
import { ReferenceClipCard } from './ReferenceClipCard';
import { CaptureClipDialog } from './CaptureClipDialog';
import { DirectUploadDialog } from './DirectUploadDialog';
import { MobileInstallDialog } from './MobileInstallDialog';
import { ExtensionInfoDialog } from './ExtensionInfoDialog';
import { Button } from '@/components/ui/button';
import { isMobileInstallCandidate } from '@/lib/pwa';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [clips, setClips] = useState<ReferenceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [searchTab, setSearchTab] = useState<'library' | 'web'>('library');
  const [webResults, setWebResults] = useState<any[]>([]);
  const [webLoading, setWebLoading] = useState(false);
  const [webSource, setWebSource] = useState<'all' | 'sakugabooru' | 'wikimedia' | 'archive' | 'openverse'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const loadClips = () => {
    getPublicReferenceClips()
      .then(setClips)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const q = search.trim();
    if (!q || q.length < 2) {
      setWebResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setWebLoading(true);
        const res = await fetch(`/api/import/search?q=${encodeURIComponent(q)}&source=${webSource}`);
        if (res.ok) {
          const data = await res.json();
          setWebResults(data.results || []);
        }
      } catch {
        // Silently handle search error
      } finally {
        setWebLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search, webSource]);

  const handleSaveWebItem = async (item: any) => {
    if (!user) {
      toast({ title: 'Sign in to save', description: 'Log in to save this reference clip to your boards.' });
      return;
    }
    setSavingId(item.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          sourceUrl: item.sourceUrl,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          mediaUrl: item.mediaUrl,
          mediaType: item.mediaType,
          sourceAuthorName: item.authorName,
          tags: item.tags || [],
          category: selectedCategory !== 'All' ? selectedCategory : 'Acting',
          isPrivate: false,
        }),
      });
      if (!res.ok) throw new Error('Could not save reference.');
      setSavedIds((prev) => new Set([...prev, item.id]));
      toast({ title: 'Saved to library!', description: `"${item.title}" added to your references.` });
      loadClips();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not save reference', description: err.message });
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    loadClips();
    setIsMobileDevice(isMobileInstallCandidate());

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
      <div className="relative mx-auto mb-6 max-w-2xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sword weight, acting beats, quadruped locomotion, anime smears…"
          className="h-14 rounded-2xl border-white/10 bg-black/50 pl-12 text-sm focus:border-purple-500"
        />
      </div>

      {/* Search Mode Tabs (Library vs Web Sources) */}
      {search.trim().length > 0 && (
        <div className="mx-auto mb-8 flex max-w-md items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-1.5 text-xs">
          <button
            onClick={() => setSearchTab('library')}
            className={`flex-1 rounded-xl py-2 font-bold transition flex items-center justify-center gap-2 ${
              searchTab === 'library'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Community Library</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{filtered.length}</span>
          </button>
          <button
            onClick={() => setSearchTab('web')}
            className={`flex-1 rounded-xl py-2 font-bold transition flex items-center justify-center gap-2 ${
              searchTab === 'web'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Live Web Sources</span>
            {webLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-purple-300" />
            ) : (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{webResults.length}</span>
            )}
          </button>
        </div>
      )}

      {paletteOptions.length > 0 && searchTab === 'library' && (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-xs font-semibold text-zinc-500">Color palette</span>
          {paletteOptions.map((hex) => (
            <button key={hex} type="button" onClick={() => setSelectedColor(selectedColor === hex ? null : hex)} title={`Filter by ${hex}`} aria-label={`Filter by ${hex}`} className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 ${selectedColor === hex ? 'border-white ring-2 ring-purple-500' : 'border-white/20'}`} style={{ backgroundColor: hex }} />
          ))}
          {selectedColor && <button type="button" onClick={() => setSelectedColor(null)} className="ml-2 text-xs text-purple-300 hover:text-white">Clear color</button>}
        </div>
      )}

      {/* VIEW 1: LIVE WEB SEARCH RESULTS */}
      {searchTab === 'web' ? (
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-purple-950/20 p-4">
            <div className="flex items-center gap-2.5">
              <Globe className="h-5 w-5 text-purple-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Live Search across External Repositories</h3>
                <p className="text-xs text-zinc-400">Sakugabooru (2D Animation Cuts), Wikimedia (Locomotion Plates), Internet Archive (Stunts), Openverse</p>
              </div>
            </div>
            {/* Filter by provider pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(['all', 'sakugabooru', 'wikimedia', 'archive', 'openverse'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setWebSource(src)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition ${
                    webSource === src ? 'bg-purple-600 text-white' : 'border border-white/10 bg-black/40 text-zinc-400 hover:text-white'
                  }`}
                >
                  {src === 'all' ? 'All Sources' : src}
                </button>
              ))}
            </div>
          </div>

          {webLoading ? (
            <div className="grid place-items-center py-20 text-zinc-400">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm font-medium">Searching animation cuts, locomotion plates, and stunt reference…</p>
            </div>
          ) : webResults.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {webResults.map((item) => {
                const isSaved = savedIds.has(item.id);
                const isSaving = savingId === item.id;
                return (
                  <div key={item.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20">
                    <div className="relative aspect-video w-full overflow-hidden bg-black">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-zinc-600">No preview available</div>
                      )}
                      <span className={`absolute top-2.5 left-2.5 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-md ${
                        item.source === 'sakugabooru' ? 'bg-emerald-600 text-white' :
                        item.source === 'wikimedia' ? 'bg-blue-600 text-white' :
                        item.source === 'archive' ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'
                      }`}>
                        {item.source}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <h4 className="line-clamp-2 text-sm font-bold text-white group-hover:text-purple-300">{item.title}</h4>
                        {item.authorName && (
                          <p className="mt-1 text-xs text-zinc-400">By {item.authorName}</p>
                        )}
                        {item.description && (
                          <p className="mt-2 line-clamp-2 text-[11px] text-zinc-500">{item.description}</p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Source
                        </a>

                        <Button
                          size="sm"
                          disabled={isSaved || isSaving}
                          onClick={() => handleSaveWebItem(item)}
                          className={isSaved ? 'bg-emerald-600 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white text-xs'}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Saving…
                            </>
                          ) : isSaved ? (
                            <>
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              Saved!
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="mr-1.5 h-3.5 w-3.5" />
                              Save to Library
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid place-items-center rounded-3xl border border-dashed border-white/10 py-16 text-center text-zinc-500">
              <p className="text-sm">No live web results found for &ldquo;{search}&rdquo;.</p>
              <p className="mt-1 text-xs text-zinc-600">Try broader terms like &ldquo;run&rdquo;, &ldquo;jump&rdquo;, &ldquo;fight&rdquo;, or &ldquo;smear&rdquo;.</p>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: COMMUNITY LIBRARY GRID */
        <>
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
                {search ? `No library clips matching "${search}"` : selectedCategory !== 'All' ? `No ${selectedCategory} clips found yet` : 'The first clip starts the collection'}
              </h2>
              <p className="mt-2 max-w-md text-sm text-zinc-400">
                {search && webResults.length > 0 ? (
                  <span>We found <span className="font-bold text-purple-300">{webResults.length} matching references</span> on Sakugabooru and Wikimedia! Switch to the Live Web tab above to see them.</span>
                ) : (
                  'Add a reference clip from YouTube, Pinterest, ArtStation, or Sakugabooru to kick off this collection.'
                )}
              </p>

              {search && webResults.length > 0 && (
                <Button onClick={() => setSearchTab('web')} className="mt-6 bg-purple-600 hover:bg-purple-500 text-white font-bold">
                  <Globe className="mr-2 h-4 w-4" />
                  View {webResults.length} Live Web Results
                </Button>
              )}

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
      )}
    </>
  );
}
