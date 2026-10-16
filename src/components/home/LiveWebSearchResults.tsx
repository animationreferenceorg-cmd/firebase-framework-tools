'use client';

import React, { useState } from 'react';
import { 
  Bookmark, 
  Box,
  Check, 
  ExternalLink, 
  Globe, 
  Loader2, 
  Palette, 
  Pin, 
  Sparkles, 
  Zap, 
  Film 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedSearchResult } from '@/app/api/import/search/route';

interface LiveWebSearchResultsProps {
  query: string;
  results: UnifiedSearchResult[];
  loading: boolean;
  className?: string;
}

export function LiveWebSearchResults({ query, results, loading, className = '' }: LiveWebSearchResultsProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const handleSaveItem = async (item: UnifiedSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: 'Sign in to save',
        description: 'Log in to save this reference to your library and boards.',
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
          <span className="inline-flex items-center gap-1 rounded-full bg-[#1CAAD9]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#1CAAD9] border border-[#1CAAD9]/30 shadow-[0_0_10px_rgba(28,170,217,0.2)]">
            <Box className="h-3 w-3" />
            Sketchfab 3D
          </span>
        );
      case 'artstation':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#13AFF0]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#13AFF0] border border-[#13AFF0]/30 shadow-[0_0_10px_rgba(19,175,240,0.2)]">
            <Palette className="h-3 w-3" />
            ArtStation
          </span>
        );
      case 'pinterest':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E60023]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#FF5252] border border-[#E60023]/30 shadow-[0_0_10px_rgba(230,0,35,0.2)]">
            <Pin className="h-3 w-3" />
            Pinterest
          </span>
        );
      case 'sakugabooru':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <Zap className="h-3 w-3" />
            Sakuga 2D
          </span>
        );
      case 'wikimedia':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <Sparkles className="h-3 w-3" />
            Muybridge / Commons
          </span>
        );
      case 'archive':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold text-violet-300 border border-violet-500/30 shadow-[0_0_10px_rgba(167,139,250,0.2)]">
            <Film className="h-3 w-3" />
            Archive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-zinc-300">
            <Globe className="h-3 w-3" />
            Web
          </span>
        );
    }
  };

  const filteredResults = sourceFilter === 'all' 
    ? results 
    : results.filter(r => r.source === sourceFilter);

  const availableSources = Array.from(new Set(results.map(r => r.source)));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Sub-Filter pills if multiple sources returned */}
      {availableSources.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSourceFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
              sourceFilter === 'all'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            All Sources ({results.length})
          </button>
          {availableSources.map(src => {
            const count = results.filter(r => r.source === src).length;
            const label = src === 'artstation' ? 'ArtStation'
              : src === 'pinterest' ? 'Pinterest'
              : src === 'sakugabooru' ? 'Sakugabooru'
              : src === 'wikimedia' ? 'Wikimedia'
              : src === 'archive' ? 'Archive'
              : src;
            return (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  sourceFilter === src
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-2xl bg-zinc-900/60 animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-12 text-center">
          <Globe className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
          <p className="text-sm font-semibold text-zinc-300">
            No live external results for &quot;{query}&quot;
          </p>
          <p className="text-xs text-zinc-500 mt-1">Try another search keyword such as &quot;walk cycle&quot;, &quot;character turnaround&quot;, or &quot;smear frame&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredResults.map((item) => {
            const isSaved = savedIds.has(item.id);
            const isSaving = savingId === item.id;
            const isHovered = hoveredId === item.id;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 transition-all duration-300 hover:border-violet-500/40 hover:shadow-[0_8px_30px_rgba(124,58,237,0.15)]"
              >
                {/* Media Container */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/60">
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
                    <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80 backdrop-blur-md">
                      {item.mediaType === 'model3d' ? '3D Model' : item.mediaType}
                    </span>
                  </div>

                  {/* Quick Action Overlay */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-90 transition-opacity">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open Original Source"
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
    </div>
  );
}
