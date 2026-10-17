'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  Sparkles,
  Layers,
  User,
  Loader2,
  X,
  Share2,
  Check,
  Info,
  Palette,
  ExternalLink as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaveToBoardModal } from '@/components/SaveToBoardModal';
import { useToast } from '@/hooks/use-toast';
import { useViewingQuota } from '@/hooks/use-viewing-quota';
import { VideoQuotaSlate } from '@/components/VideoQuotaSlate';
import { cn } from '@/lib/utils';
import type { Video } from '@/lib/types';
import type { UnifiedSearchResult } from '@/app/api/import/search/route';
import type { ArtStationAsset } from '@/app/api/import/artstation-project/route';

export interface ArtworkDetailModalProps {
  item: UnifiedSearchResult | Video;
  isOpen: boolean;
  onClose: () => void;
}

export function ArtworkDetailModal({ item, isOpen, onClose }: ArtworkDetailModalProps) {
  const { toast } = useToast();

  // Normalize fields between UnifiedSearchResult and Video
  const rawTitle = item.title || 'Artwork Reference';
  const initialImage = (item as any).mediaUrl || (item as any).posterUrl || (item as any).thumbnailUrl || '';
  const authorName = (item as any).authorName || (item as any).author_name || 'Artist';
  const authorUsername = (item as any).authorUsername || '';
  const authorAvatar = (item as any).authorAvatar || (item as any).author_avatar || '';
  const sourceUrl = (item as any).sourceUrl || (item as any).originalUrl || '';
  const source = (item as any).source || 'artstation';
  const hashId = (item as any).hashId || '';

  // Active displayed asset
  const [activeImage, setActiveImage] = useState<string>(initialImage);
  const [activeTitle, setActiveTitle] = useState<string>(rawTitle);
  const [activeSourceUrl, setActiveSourceUrl] = useState<string>(sourceUrl);
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [resolvedAuthor, setResolvedAuthor] = useState<string>(authorName);
  const [resolvedUsername, setResolvedUsername] = useState<string>(authorUsername);
  const [resolvedAvatar, setResolvedAvatar] = useState<string>(authorAvatar);

  // Dynamic project assets & artist portfolio
  const [assets, setAssets] = useState<ArtStationAsset[]>([]);
  const [moreFromArtist, setMoreFromArtist] = useState<ArtStationAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);

  // UI States
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Viewing quota integration: permanent re-watch for unlocked images, 25 guest limit, 35 daily limit
  const quota = useViewingQuota();
  const refId = (item as any).id || (item as any).hashId || hashId || rawTitle;
  const alreadyUnlocked = quota.isVideoUnlocked(refId);
  const isBlocked = quota.hasReachedLimit && !alreadyUnlocked;

  useEffect(() => {
    if (!isOpen || !refId || alreadyUnlocked || isBlocked) return;
    quota.attemptUnlock(refId);
  }, [isOpen, refId, alreadyUnlocked, isBlocked, quota]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Global Escape key & Arrow navigation listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevAsset();
      } else if (e.key === 'ArrowRight') {
        handleNextAsset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, assets.length, activeAssetIndex]);

  // Reset when item changes
  useEffect(() => {
    setActiveImage(initialImage);
    setActiveTitle(rawTitle);
    setActiveSourceUrl(sourceUrl);
    setResolvedAuthor(authorName);
    setResolvedUsername(authorUsername);
    setResolvedAvatar(authorAvatar);
    setZoom(1);
    setImageFailed(false);
    setActiveAssetIndex(0);
    setProjectDescription('');
  }, [initialImage, rawTitle, sourceUrl, authorName, authorUsername, authorAvatar]);

  // Dynamically fetch project assets & artist turnarounds
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingAssets(true);

    const fetchProjectAssets = async () => {
      try {
        const queryParams = new URLSearchParams({
          author: authorName,
          username: authorUsername,
          title: rawTitle,
          image: initialImage,
          hash: hashId,
          sourceUrl: sourceUrl,
        });

        const res = await fetch(`/api/import/artstation-project?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const projectSheets = data.assets || [];
            const otherPosts = data.moreFromArtist || [];
            // Merge all artist posts so user can browse all creator works directly
            const combined = data.allArtistPosts && data.allArtistPosts.length > 0 
              ? data.allArtistPosts 
              : [...projectSheets, ...otherPosts];

            if (combined.length > 0) {
              setAssets(combined);
              setActiveImage(combined[0].imageUrl);
              setActiveTitle(combined[0].title || data.title || rawTitle);
              if (combined[0].sourceUrl) setActiveSourceUrl(combined[0].sourceUrl);
            }
            if (data.description) setProjectDescription(data.description);
            if (data.title) setActiveTitle(data.title);
            if (data.authorName) setResolvedAuthor(data.authorName);
            if (data.authorUsername) setResolvedUsername(data.authorUsername);
            if (data.authorAvatar) setResolvedAvatar(data.authorAvatar);
            if (data.moreFromArtist) setMoreFromArtist(data.moreFromArtist);
          }
        }
      } catch (err) {
        console.error('Failed to load ArtStation project assets:', err);
      } finally {
        if (isMounted) setLoadingAssets(false);
      }
    };

    fetchProjectAssets();

    return () => {
      isMounted = false;
    };
  }, [isOpen, authorName, authorUsername, rawTitle, initialImage, hashId, sourceUrl]);

  if (!isOpen) return null;

  const handleSelectAsset = (asset: ArtStationAsset, index: number) => {
    setActiveAssetIndex(index);
    setActiveImage(asset.imageUrl);
    setActiveTitle(asset.title || rawTitle);
    if (asset.sourceUrl) setActiveSourceUrl(asset.sourceUrl);
    setZoom(1);
    setImageFailed(false);
  };

  const handlePrevAsset = () => {
    if (assets.length <= 1) return;
    const nextIdx = (activeAssetIndex - 1 + assets.length) % assets.length;
    handleSelectAsset(assets[nextIdx], nextIdx);
  };

  const handleNextAsset = () => {
    if (assets.length <= 1) return;
    const nextIdx = (activeAssetIndex + 1) % assets.length;
    handleSelectAsset(assets[nextIdx], nextIdx);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.3, 0.6));
  const handleResetZoom = () => setZoom(1);

  const handleCopyLink = async () => {
    const url = activeSourceUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast({
        title: 'Link copied to clipboard',
        description: 'You can now share this ArtStation reference.',
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not copy link',
      });
    }
  };

  // Normalized video object for SaveToBoardModal
  const videoObject: Video = {
    id: item.id || `art_${Date.now()}`,
    type: 'social',
    title: activeTitle,
    description: projectDescription || (item as any).description || `Artwork by ${resolvedAuthor} on ${source}`,
    thumbnailUrl: activeImage,
    posterUrl: activeImage,
    videoUrl: '',
    tags: (item as any).tags || [source, 'concept-art', 'turnaround', 'vis-dev'],
    categoryIds: ['external-hub', source],
    categories: [source === 'artstation' ? 'ArtStation' : 'Visual Development'],
    author_name: resolvedAuthor,
    authorAvatar: resolvedAvatar,
    originalUrl: activeSourceUrl,
    status: 'published',
    isShort: false,
    createdAt: Date.now(),
  } as Video;

  const currentDisplayUrl = imageFailed
    ? `/api/proxy/image?url=${encodeURIComponent(activeImage)}`
    : activeImage;

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-[#07050d] text-white">
      {/* Top Navigation Bar */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0d0a18]/95 px-3 backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-9 shrink-0 gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer"
            title="Back to library"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          {/* Provider Pill */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-[#13AFF0]/15 px-2.5 py-1 text-xs font-bold text-[#13AFF0] border border-[#13AFF0]/30 shadow-[0_0_12px_rgba(19,175,240,0.2)] shrink-0">
            <Palette className="h-3.5 w-3.5" />
            ArtStation Post
          </span>

          {quota.ready && !quota.unlimited && (
            <div
              className={cn(
                "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 transition-colors",
                quota.hasReachedLimit
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-white/5 border-white/10 text-zinc-300"
              )}
              title={
                quota.isGuest
                  ? `Guest reference quota: ${quota.todayRemaining} of ${quota.limit} free clips left. Create an account to unlock 35 clips every day!`
                  : `Daily reference quota: ${quota.todayRemaining} of ${quota.limit} clips left today. Resets tomorrow. Previously opened clips stay playable anytime.`
              }
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", quota.hasReachedLimit ? "bg-amber-400" : "bg-purple-400")} />
              <span>
                {quota.todayRemaining}/{quota.limit} {quota.isGuest ? 'guest free' : 'left today'}
              </span>
            </div>
          )}

          {/* Title & Artist Identity */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xs sm:text-sm font-bold text-white tracking-tight" title={activeTitle}>
              {activeTitle}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 truncate">
              <span>By</span>
              <span className="text-zinc-200 font-semibold">{resolvedAuthor}</span>
              {resolvedUsername && (
                <span className="text-zinc-500 font-mono">@{resolvedUsername}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls & Top-Right Close Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.6}
              title="Zoom Out"
              className="h-8 w-8 p-0 text-zinc-300 hover:text-white cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="px-1 text-[11px] font-mono text-zinc-400">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              title="Zoom In"
              className="h-8 w-8 p-0 text-zinc-300 hover:text-white cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="h-8 w-8 p-0 text-zinc-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>

          {/* Toggle Info Sidebar Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className={`h-9 px-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
              showSidebar
                ? 'border-violet-500/40 bg-violet-500/15 text-violet-200'
                : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Toggle Post Details"
          >
            <Info className="h-4 w-4" />
            <span className="hidden xl:inline ml-1.5">Project Info</span>
          </Button>

          {/* External ArtStation Link */}
          {activeSourceUrl && (
            <a
              href={activeSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-[#13AFF0]/30 bg-[#13AFF0]/10 px-2.5 sm:px-3 text-xs font-bold text-[#13AFF0] hover:bg-[#13AFF0]/20 hover:text-white transition-all"
              title="Open full post on ArtStation"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ArtStation</span>
            </a>
          )}

          {/* Save to Board Button */}
          <Button
            onClick={() => setShowSaveModal(true)}
            className="h-9 gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white shadow-lg hover:bg-violet-500 transition-all cursor-pointer"
          >
            <BookmarkPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>

          {/* Prominent, Unmissable X Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-xl border border-white/15 bg-white/5 text-zinc-300 hover:bg-red-500/20 hover:text-white hover:border-red-500/40 transition-all cursor-pointer ml-1"
            title="Close Artwork (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area: Stage + Sidebar */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Central Artwork Stage */}
        <div
          className="relative flex-1 overflow-hidden flex items-center justify-center p-3 sm:p-6 select-none cursor-pointer"
          onClick={(e) => {
            // Clicking backdrop outside image closes modal
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          {/* Explicit backdrop overlay click catcher */}
          <div
            className="absolute inset-0 z-0 bg-transparent cursor-pointer"
            onClick={onClose}
            title="Click outside to close (Esc)"
          />

          {/* Multi-Asset Previous Navigation Arrow */}
          {assets.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevAsset();
              }}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all hover:bg-violet-600 hover:scale-110 cursor-pointer"
              title="Previous Post / Sheet (Arrow Left)"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Multi-Asset Next Navigation Arrow */}
          {assets.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextAsset();
              }}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all hover:bg-violet-600 hover:scale-110 cursor-pointer"
              title="Next Post / Sheet (Arrow Right)"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Current Sheet Counter Floating Badge */}
          {assets.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-xs font-semibold text-zinc-200 shadow-xl pointer-events-none">
              <Layers className="h-3.5 w-3.5 text-violet-400" />
              <span>
                Post {activeAssetIndex + 1} of {assets.length}
              </span>
            </div>
          )}

          {/* Center Image Container or Quota Paywall Slate */}
          {isBlocked ? (
            <div className="relative z-10 w-full max-w-xl mx-auto p-4">
              <VideoQuotaSlate
                posterUrl={currentDisplayUrl}
                unlockedCount={quota.unlockedCount}
                todayCount={quota.todayCount}
                limit={quota.limit}
                isGuest={quota.isGuest}
                onBrowseUnlocked={onClose}
              />
            </div>
          ) : (
            <div
              className="relative z-10 max-h-full max-w-full flex items-center justify-center transition-transform duration-200 ease-out cursor-default"
              style={{ transform: `scale(${zoom})` }}
              onClick={(e) => e.stopPropagation()}
            >
              {currentDisplayUrl ? (
                <img
                  src={currentDisplayUrl}
                  alt={activeTitle}
                  referrerPolicy="no-referrer"
                  className="max-h-[72vh] sm:max-h-[76vh] w-auto max-w-[88vw] rounded-2xl object-contain shadow-[0_20px_70px_rgba(0,0,0,0.9)] border border-white/10"
                  onError={() => {
                    if (!imageFailed) {
                      setImageFailed(true);
                    }
                  }}
                />
              ) : (
                <div className="flex h-64 w-96 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/50">
                  <Palette className="h-8 w-8 text-zinc-500" />
                  <p className="text-xs text-zinc-400">Artwork not available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Project Details & Artist Sidebar (Collapsible) */}
        {showSidebar && (
          <aside className="w-80 lg:w-96 shrink-0 border-l border-white/10 bg-[#0a0815]/95 p-5 backdrop-blur-2xl overflow-y-auto flex flex-col justify-between hidden md:flex z-20">
            <div className="space-y-6">
              {/* Artist Card */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {resolvedAvatar ? (
                    <img
                      src={resolvedAvatar}
                      alt={resolvedAuthor}
                      className="h-12 w-12 rounded-full border border-white/20 object-cover shadow-md"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 font-bold text-base">
                      {resolvedAuthor.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-sm truncate">
                      {resolvedAuthor}
                    </h3>
                    {resolvedUsername && (
                      <p className="text-xs text-zinc-400 font-mono">
                        @{resolvedUsername}
                      </p>
                    )}
                  </div>
                </div>

                {resolvedUsername && (
                  <a
                    href={`https://www.artstation.com/${resolvedUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 border border-white/10 transition-colors"
                  >
                    <span>View ArtStation Portfolio</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              {/* Project Title & Stats */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                  Concept &amp; Turnaround Sheet
                </span>
                <h2 className="text-lg font-black text-white leading-snug">
                  {activeTitle}
                </h2>
                {assets.length > 0 && (
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{assets.length} high-resolution project sheets included</span>
                  </p>
                )}
              </div>

              {/* Full Artist Description / Notes */}
              {projectDescription ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Artist Notes &amp; Project Story
                  </h4>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap max-h-56 overflow-y-auto scrollbar-thin">
                    {projectDescription}
                  </div>
                </div>
              ) : null}

              {/* Tags & Categories */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Reference Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {['artstation', 'turnaround', 'vis-dev', 'concept-art', 'character-design', 'model-sheet'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 border border-white/5"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-white/10 space-y-2 mt-6">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full h-10 rounded-xl border-white/10 bg-white/5 text-xs font-bold text-zinc-200 hover:bg-white/10 hover:text-white"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-emerald-400" /> Link Copied
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" /> Copy Reference Link
                  </>
                )}
              </Button>

              {activeSourceUrl && (
                <a
                  href={activeSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-[#13AFF0] hover:bg-[#13AFF0]/90 text-xs font-bold text-white shadow-lg transition-all"
                >
                  <span>Open Full Project on ArtStation</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Filmstrip Tray: Dynamically Pulled Project Assets & Artist Series */}
      <footer className="relative z-20 shrink-0 border-t border-white/10 bg-[#0d0a18]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-bold text-zinc-200">
              Creator Works &amp; Posts by {resolvedAuthor}
            </span>
            {assets.length > 0 && (
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-violet-300 border border-violet-500/30">
                {activeAssetIndex + 1} / {assets.length}
              </span>
            )}
          </div>
          {loadingAssets ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
              <span>Fetching all creator works from ArtStation...</span>
            </div>
          ) : (
            <span className="text-[11px] text-zinc-400 hidden sm:inline">
              Click any work or use <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">→</kbd> to browse
            </span>
          )}
        </div>

        {/* Horizontal Thumbnails Carousel */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {assets.map((asset, index) => {
            const isSelected = index === activeAssetIndex;
            return (
              <button
                key={`${asset.id}_${index}`}
                onClick={() => handleSelectAsset(asset, index)}
                className={`group relative aspect-[4/3] h-16 sm:h-20 shrink-0 overflow-hidden rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-violet-500 ring-2 ring-violet-500/50 scale-105 shadow-[0_0_15px_rgba(139,92,246,0.5)]'
                    : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                }`}
              >
                <img
                  src={asset.imageUrl}
                  alt={asset.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                  <span className="truncate text-[9px] font-bold text-white">
                    {asset.title || `Work ${index + 1}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </footer>

      {/* Save to Board Modal Integration */}
      <SaveToBoardModal
        video={videoObject}
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
      />
    </div>
  );
}
