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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaveToBoardModal } from '@/components/SaveToBoardModal';
import type { Video } from '@/lib/types';
import type { UnifiedSearchResult } from '@/app/api/import/search/route';
import type { ArtStationAsset } from '@/app/api/import/artstation-project/route';

export interface ArtworkDetailModalProps {
  item: UnifiedSearchResult | Video;
  isOpen: boolean;
  onClose: () => void;
}

export function ArtworkDetailModal({ item, isOpen, onClose }: ArtworkDetailModalProps) {
  // Normalize fields between UnifiedSearchResult and Video
  const title = item.title || 'Artwork Reference';
  const initialImage = (item as any).mediaUrl || (item as any).posterUrl || (item as any).thumbnailUrl || '';
  const authorName = (item as any).authorName || (item as any).author_name || 'Artist';
  const authorAvatar = (item as any).authorAvatar || '';
  const sourceUrl = (item as any).sourceUrl || (item as any).originalUrl || '';
  const source = (item as any).source || 'artstation';
  const hashId = (item as any).hashId || '';

  // Active displayed asset
  const [activeImage, setActiveImage] = useState<string>(initialImage);
  const [activeTitle, setActiveTitle] = useState<string>(title);
  const [activeSourceUrl, setActiveSourceUrl] = useState<string>(sourceUrl);

  // Dynamic project assets
  const [assets, setAssets] = useState<ArtStationAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Fallback image proxy state
  const [imageFailed, setImageFailed] = useState(false);

  // Reset when item changes
  useEffect(() => {
    setActiveImage(initialImage);
    setActiveTitle(title);
    setActiveSourceUrl(sourceUrl);
    setZoom(1);
    setImageFailed(false);
    setActiveAssetIndex(0);
  }, [initialImage, title, sourceUrl]);

  // Dynamically fetch project assets & artist turnarounds
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingAssets(true);

    const fetchProjectAssets = async () => {
      try {
        const queryParams = new URLSearchParams({
          author: authorName,
          title: title,
          image: initialImage,
          hash: hashId,
        });

        const res = await fetch(`/api/import/artstation-project?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.assets && data.assets.length > 0) {
            setAssets(data.assets);
          }
        }
      } catch (err) {
        console.error('Failed to load project assets:', err);
      } finally {
        if (isMounted) setLoadingAssets(false);
      }
    };

    fetchProjectAssets();

    return () => {
      isMounted = false;
    };
  }, [isOpen, authorName, title, initialImage, hashId]);

  if (!isOpen) return null;

  const handleSelectAsset = (asset: ArtStationAsset, index: number) => {
    setActiveAssetIndex(index);
    setActiveImage(asset.imageUrl);
    setActiveTitle(asset.title || title);
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

  // Normalized video object for SaveToBoardModal
  const videoObject: Video = {
    id: item.id || `art_${Date.now()}`,
    type: 'social',
    title: activeTitle,
    description: (item as any).description || `Artwork by ${authorName} on ${source}`,
    thumbnailUrl: activeImage,
    posterUrl: activeImage,
    videoUrl: '',
    tags: (item as any).tags || [source, 'concept-art', 'turnaround'],
    categoryIds: ['external-hub', source],
    categories: [source === 'artstation' ? 'ArtStation' : 'Visual Development'],
    author_name: authorName,
    originalUrl: activeSourceUrl,
    status: 'published',
    isShort: false,
    createdAt: Date.now(),
  };

  const currentDisplayUrl = imageFailed
    ? `/api/proxy/image?url=${encodeURIComponent(activeImage)}`
    : activeImage;

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-[#07050d] text-white">
      {/* Top Navigation Bar */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0d0a18]/95 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-10 shrink-0 gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-violet-600/30 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-300 border border-violet-500/20">
                {source}
              </span>
              <h1 className="truncate text-sm font-bold text-white sm:text-base">
                {activeTitle}
              </h1>
            </div>
            <p className="truncate text-xs text-zinc-400">
              By <span className="text-zinc-200 font-medium">{authorName}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.6}
              title="Zoom Out"
              className="h-8 w-8 p-0 text-zinc-300 hover:text-white cursor-pointer"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="px-1.5 text-xs font-mono text-zinc-400">
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
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="h-8 w-8 p-0 text-zinc-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 w-9 p-0 rounded-xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer hidden md:flex"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          {/* External Source Link */}
          {activeSourceUrl && (
            <a
              href={activeSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Source</span>
            </a>
          )}

          {/* Save to Board Button */}
          <Button
            onClick={() => setShowSaveModal(true)}
            className="h-9 gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white shadow-lg hover:bg-violet-500 hover:scale-105 transition-all cursor-pointer"
          >
            <BookmarkPlus className="h-4 w-4" />
            <span>Save to Board</span>
          </Button>
        </div>
      </header>

      {/* Main Artwork Stage */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center p-4 sm:p-8 select-none">
        {/* Navigation Arrows for Multi-Asset Projects */}
        {assets.length > 1 && (
          <>
            <button
              onClick={handlePrevAsset}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white border border-white/15 backdrop-blur-md shadow-2xl transition-all hover:bg-violet-600 hover:scale-110 cursor-pointer"
              title="Previous Asset (Left Arrow)"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleNextAsset}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white border border-white/15 backdrop-blur-md shadow-2xl transition-all hover:bg-violet-600 hover:scale-110 cursor-pointer"
              title="Next Asset (Right Arrow)"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Artwork Image Container with Smooth Zoom */}
        <div
          className="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          {currentDisplayUrl ? (
            <img
              src={currentDisplayUrl}
              alt={activeTitle}
              referrerPolicy="no-referrer"
              className="max-h-[70vh] sm:max-h-[75vh] w-auto max-w-[90vw] rounded-2xl object-contain shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10"
              onError={() => {
                if (!imageFailed) {
                  setImageFailed(true);
                }
              }}
            />
          ) : (
            <div className="flex h-64 w-96 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/50">
              <p className="text-sm text-zinc-500">Artwork not available</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Filmstrip Tray: Dynamically Pulled Project Assets & Artist Series */}
      <footer className="relative z-20 shrink-0 border-t border-white/10 bg-[#0d0a18]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-bold text-zinc-200">
              Project Assets &amp; Artist Series
            </span>
            {assets.length > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.2 text-[10px] font-mono text-zinc-300">
                {activeAssetIndex + 1} / {assets.length}
              </span>
            )}
          </div>
          {loadingAssets && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
              <span>Fetching ArtStation project...</span>
            </div>
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                  <span className="truncate text-[9px] font-medium text-white">
                    {asset.title}
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
