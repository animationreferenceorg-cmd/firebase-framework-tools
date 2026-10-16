'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Box,
  Check, 
  Dices,
  ExternalLink, 
  Globe, 
  Loader2, 
  Maximize2, 
  Palette, 
  Pin, 
  Play, 
  RefreshCw, 
  Sparkles, 
  X,
  Zap,
  Film
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedSearchResult } from '@/app/api/import/search/route';
import Link from 'next/link';

interface LiveWebDiscoveryShelfProps {
  className?: string;
}

export function LiveWebDiscoveryShelf({ className = '' }: LiveWebDiscoveryShelfProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [active3DModel, setActive3DModel] = useState<UnifiedSearchResult | null>(null);

  const fetchRandomizedStream = async () => {
    setLoading(true);
    try {
      const url = `/api/import/search?mode=explore&t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load stream');
      const data = await res.json();
      setItems(data.results || []);
      setVisibleCount(20);
    } catch (err: any) {
      console.error('Error loading external stream:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomizedStream();
  }, []);

  const handleSaveItem = async (item: UnifiedSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: 'Sign in to save',
        description: 'Log in to save this reference clip to your personal library and boards.',
      });
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
          category: 'Acting',
          isPrivate: false,
        }),
      });

      if (!res.ok) throw new Error('Could not save to library');
      setSavedIds(prev => new Set([...prev, item.id]));
      toast({
        title: 'Saved to library!',
        description: `"${item.title.slice(0, 40)}..." is now in your collection.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err.message || 'Could not save reference',
      });
    } finally {
      setSavingId(null);
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'sketchfab':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#1CAAD9]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#1CAAD9] border border-[#1CAAD9]/40 shadow-[0_0_10px_rgba(28,170,217,0.25)] backdrop-blur-md">
            <Box className="h-3 w-3" />
            Sketchfab 3D
          </span>
        );
      case 'artstation':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#13AFF0]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#13AFF0] border border-[#13AFF0]/40 shadow-[0_0_10px_rgba(19,175,240,0.25)] backdrop-blur-md">
            <Palette className="h-3 w-3" />
            ArtStation
          </span>
        );
      case 'pinterest':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E60023]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#FF5252] border border-[#E60023]/40 shadow-[0_0_10px_rgba(230,0,35,0.25)] backdrop-blur-md">
            <Pin className="h-3 w-3" />
            Pinterest
          </span>
        );
      case 'sakugabooru':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)] backdrop-blur-md">
            <Zap className="h-3 w-3" />
            Sakuga 2D
          </span>
        );
      case 'wikimedia':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)] backdrop-blur-md">
            <Sparkles className="h-3 w-3" />
            Locomotion
          </span>
        );
      case 'archive':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold text-violet-300 border border-violet-500/40 shadow-[0_0_10px_rgba(167,139,250,0.25)] backdrop-blur-md">
            <Film className="h-3 w-3" />
            Stunts
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-zinc-300 backdrop-blur-md">
            <Globe className="h-3 w-3" />
            Web Reference
          </span>
        );
    }
  };

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <section className={`space-y-6 ${className}`}>
      {/* Header with Randomized Description & Shuffle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Inspiration Stream • Randomized Mix
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              {items.length > 0 && `${items.length} references loaded`}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Animation, Vis Dev & 3D Model Discovery
          </h2>
          <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
            A seamlessly randomized, live-updating stream of character turnarounds, visual development art, animated 3D models, smear cuts, and locomotion studies across the web.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRandomizedStream}
            disabled={loading}
            className="border-violet-500/30 bg-violet-950/40 text-violet-200 hover:bg-violet-900/60 hover:text-white font-bold transition-all shadow-[0_0_15px_rgba(124,58,237,0.15)]"
          >
            <Dices className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Roll Fresh Mix
          </Button>
          <Link href="/references" className="text-xs font-bold text-zinc-400 hover:text-white underline underline-offset-4">
            Library Explorer →
          </Link>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-2xl bg-zinc-900/60 animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-12 text-center">
          <Globe className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
          <p className="text-sm font-semibold text-zinc-300">No references loaded at the moment</p>
          <Button onClick={fetchRandomizedStream} className="mt-4 bg-violet-600 text-white font-bold">
            Try Again
          </Button>
        </div>
      ) : (
        /* Randomized Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleItems.map((item) => {
            const isSaved = savedIds.has(item.id);
            const isSaving = savingId === item.id;
            const isHovered = hoveredId === item.id;
            const is3D = item.source === 'sketchfab' || item.mediaType === 'model3d';

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 transition-all duration-300 hover:border-violet-500/40 hover:shadow-[0_8px_30px_rgba(124,58,237,0.15)]"
              >
                {/* Media Container */}
                <div 
                  className="relative aspect-[4/3] w-full overflow-hidden bg-black/60 cursor-pointer"
                  onClick={() => {
                    if (item.embedUrl) {
                      setActive3DModel(item);
                    } else if (item.sourceUrl) {
                      window.open(item.sourceUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  {item.mediaType === 'video' ? (
                    <video
                      src={item.mediaUrl}
                      poster={item.thumbnailUrl}
                      playsInline
                      muted
                      loop
                      autoPlay={isHovered}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={item.mediaUrl || item.thumbnailUrl}
                      alt={item.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== item.thumbnailUrl && item.thumbnailUrl) {
                          target.src = item.thumbnailUrl;
                        }
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    {getSourceBadge(item.source)}
                    <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md">
                      {is3D ? '3D Model' : item.mediaType}
                    </span>
                  </div>

                  {/* 3D Model Play Overlay Icon */}
                  {is3D && item.embedUrl && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 rounded-full bg-violet-600/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-xl backdrop-blur-md">
                        <Box className="h-4 w-4 animate-bounce" />
                        Interact in 3D
                      </div>
                    </div>
                  )}

                  {/* Quick Action Overlay (Bottom Right) */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-90 transition-opacity">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open Original Page"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-zinc-300 backdrop-blur-md hover:bg-white hover:text-black transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    <Button
                      size="sm"
                      onClick={(e) => handleSaveItem(item, e)}
                      disabled={isSaved || isSaving}
                      className={`h-8 rounded-full px-3 text-xs font-bold shadow-lg transition-all ${
                        isSaved
                          ? 'bg-emerald-500 text-white cursor-default'
                          : 'bg-violet-600 hover:bg-violet-500 text-white hover:scale-105'
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isSaved ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" /> Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="mr-1 h-3.5 w-3.5" /> Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Card Info */}
                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <div>
                    <h3 className="line-clamp-2 text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                      {item.title}
                    </h3>
                    {item.authorName && (
                      <p className="mt-1 text-[11px] text-zinc-400 truncate">
                        {item.authorName}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Randomized References Button */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setVisibleCount(c => c + 20)}
            className="rounded-full border-white/10 bg-zinc-900/80 px-6 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-violet-500/40 shadow-lg transition-all"
          >
            Load More Inspiration (+20 of {items.length})
          </Button>
        </div>
      )}

      {/* Interactive 3D Model Modal */}
      {active3DModel && active3DModel.embedUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => setActive3DModel(null)}
        >
          <div 
            className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/80 px-5 py-3">
              <div className="flex items-center gap-2">
                <Box className="h-5 w-5 text-[#1CAAD9]" />
                <h3 className="font-bold text-white text-sm sm:text-base truncate max-w-lg">
                  {active3DModel.title}
                </h3>
                <span className="rounded-full bg-[#1CAAD9]/20 px-2 py-0.5 text-[10px] font-bold text-[#1CAAD9]">
                  Interactive 3D
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={(e) => handleSaveItem(active3DModel, e)}
                  disabled={savedIds.has(active3DModel.id) || savingId === active3DModel.id}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold"
                >
                  {savedIds.has(active3DModel.id) ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" /> Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="mr-1 h-3.5 w-3.5" /> Save Model
                    </>
                  )}
                </Button>
                <a
                  href={active3DModel.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-white/10 p-2 text-zinc-300 hover:bg-white/20 hover:text-white"
                  title="Open on Sketchfab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setActive3DModel(null)}
                  className="rounded-lg bg-white/10 p-2 text-zinc-300 hover:bg-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Iframe */}
            <div className="relative flex-1 bg-black">
              <iframe
                title={active3DModel.title}
                src={active3DModel.embedUrl}
                className="h-full w-full border-0"
                allow="autoplay; fullscreen; xr-spatial-tracking"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
