'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Film,
  Play,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedSearchResult } from '@/app/api/import/search/route';
import type { Video } from '@/lib/types';
import { searchResultToVideo } from '@/lib/reference-hub';
import { VideoFullscreenViewer } from '@/components/VideoFullscreenViewer';
import { ArtworkDetailModal } from '@/components/reference/ArtworkDetailModal';

interface LiveWebSearchResultsProps {
  query: string;
  results: UnifiedSearchResult[];
  loading: boolean;
  className?: string;
}

function HoverVideo({ src, poster, isHovered }: { src: string; poster?: string; isHovered: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isHovered) {
      el.muted = true;
      el.defaultMuted = true;
      const attemptPlay = () => {
        if (!el) return;
        el.muted = true;
        el.play().catch(() => {});
      };
      if (el.readyState >= 2) {
        attemptPlay();
      } else {
        el.addEventListener('canplay', attemptPlay, { once: true });
        el.addEventListener('loadeddata', attemptPlay, { once: true });
      }
    } else {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {}
    }
  }, [isHovered]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      playsInline
      muted
      loop
      preload="metadata"
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

function SafeImage({ src, fallbackSrc, alt }: { src: string; fallbackSrc?: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  const [failedOnce, setFailedOnce] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setFailedOnce(false);
  }, [src]);

  const handleError = () => {
    if (!failedOnce && src) {
      setFailedOnce(true);
      setImgSrc(`/api/proxy/image?url=${encodeURIComponent(src)}`);
    } else if (fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={handleError}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

export function LiveWebSearchResults({ query, results, loading, className = '' }: LiveWebSearchResultsProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Interactive View Modals
  const [selectedArtwork, setSelectedArtwork] = useState<UnifiedSearchResult | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [active3DModel, setActive3DModel] = useState<UnifiedSearchResult | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (active3DModel) setActive3DModel(null);
        if (selectedArtwork) setSelectedArtwork(null);
        if (selectedVideo) setSelectedVideo(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active3DModel, selectedArtwork, selectedVideo]);

  const handleCardClick = (item: UnifiedSearchResult) => {
    if (item.embedUrl || item.source === 'sketchfab' || item.mediaType === 'model3d') {
      setActive3DModel(item);
    } else if (
      item.mediaType === 'video' ||
      (item.mediaUrl && (item.mediaUrl.endsWith('.mp4') || item.mediaUrl.endsWith('.webm')))
    ) {
      const converted = searchResultToVideo(item);
      setSelectedVideo(converted);
    } else {
      setSelectedArtwork(item);
    }
  };

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
      setSavedIds((prev) => new Set([...prev, item.id]));
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

  const filteredResults =
    sourceFilter === 'all'
      ? results
      : results.filter((r) => r.source === sourceFilter);

  const sourcesAvailable = Array.from(new Set(results.map((r) => r.source)));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-violet-400 animate-pulse" />
          <h2 className="text-base font-bold text-white tracking-wide">
            Live Web References
          </h2>
          <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
            {results.length} found
          </span>
        </div>

        {/* Source Pills */}
        {sourcesAvailable.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSourceFilter('all')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                sourceFilter === 'all'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              All Sources
            </button>
            {sourcesAvailable.map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  sourceFilter === src
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {src}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid Results */}
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
          <p className="text-xs text-zinc-500 mt-1">
            Try another search keyword such as &quot;walk cycle&quot;, &quot;character turnaround&quot;, or &quot;smear frame&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredResults.map((item) => {
            const isSaved = savedIds.has(item.id);
            const isSaving = savingId === item.id;
            const isHovered = hoveredId === item.id;
            const isVideo =
              item.mediaType === 'video' ||
              (item.mediaUrl && (item.mediaUrl.endsWith('.mp4') || item.mediaUrl.endsWith('.webm')));

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleCardClick(item)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 transition-all duration-300 hover:border-violet-500/40 hover:shadow-[0_8px_30px_rgba(124,58,237,0.15)] cursor-pointer"
              >
                {/* Media Container */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/60">
                  {isVideo ? (
                    <HoverVideo
                      src={item.mediaUrl}
                      poster={item.thumbnailUrl}
                      isHovered={isHovered}
                    />
                  ) : (
                    <SafeImage
                      src={item.mediaUrl || item.thumbnailUrl}
                      fallbackSrc={item.thumbnailUrl}
                      alt={item.title}
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

                  {/* Play Indicator for Videos */}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all ${isHovered ? 'scale-75 opacity-0' : 'scale-100 opacity-90'}`}>
                        <Play className="h-5 w-5 fill-white ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Quick Action Overlay */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-90 transition-opacity z-10">
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

      {/* Artwork Project Viewer Modal */}
      {selectedArtwork && (
        <ArtworkDetailModal
          item={selectedArtwork}
          isOpen={Boolean(selectedArtwork)}
          onClose={() => setSelectedArtwork(null)}
        />
      )}

      {/* Video Fullscreen Player Dialog */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[260]">
          <VideoFullscreenViewer
            video={selectedVideo}
            title={selectedVideo.title}
            description={selectedVideo.description}
            onClose={() => setSelectedVideo(null)}
          />
        </div>
      )}

      {/* 3D Model Inspector Modal */}
      {active3DModel && (
        <Dialog open={Boolean(active3DModel)} onOpenChange={() => setActive3DModel(null)}>
          <DialogContent className="max-w-4xl border-white/10 bg-zinc-950/95 p-6 backdrop-blur-2xl">
            <DialogTitle className="flex items-center justify-between text-lg font-bold text-white">
              <span className="flex items-center gap-2">
                <Box className="h-5 w-5 text-[#1CAAD9]" />
                {active3DModel.title}
              </span>
              <a
                href={active3DModel.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
              >
                View on Sketchfab <ExternalLink className="h-3 w-3" />
              </a>
            </DialogTitle>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black mt-4">
              {active3DModel.embedUrl ? (
                <iframe
                  src={active3DModel.embedUrl}
                  title={active3DModel.title}
                  allow="autoplay; fullscreen; xr-spatial-tracking"
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-500">
                  3D Embed Not Available
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
