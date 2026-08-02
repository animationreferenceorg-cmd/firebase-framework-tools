"use client";

import React, { useState, useRef } from 'react';
import type { PortfolioItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  SkipForward, 
  SkipBack, 
  Play, 
  Film,
  ChevronLeft,
  ChevronRight,
  Plus,
  Star,
  Sparkles,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';

interface PortfolioHeroBannerProps {
  items: PortfolioItem[];
  featuredItemId?: string | null;
  isOwner?: boolean;
  userCategories?: string[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  onAddCategory?: (category: string) => void;
  onSelectFeaturedItem?: (item: PortfolioItem) => void;
  onCardClick?: (item: PortfolioItem) => void;
}

export const PortfolioHeroBanner: React.FC<PortfolioHeroBannerProps> = ({
  items,
  featuredItemId,
  isOwner = false,
  userCategories = [],
  selectedCategory = 'All Works',
  onSelectCategory,
  onAddCategory,
  onSelectFeaturedItem,
  onCardClick,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [activeCategory, setActiveCategory] = useState(selectedCategory);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const trackScrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  // Preset default categories + custom user categories
  const defaultCategories = ['All Works', '3D Animation', 'Rigging Work', 'VFX Work', 'Lighting & LookDev', 'WIP Passes'];
  const allCategories = Array.from(new Set([...defaultCategories, ...userCategories]));

  // Filter items by active category box tab
  const filteredItems = items.filter(item => {
    if (activeCategory === 'All Works') return true;
    if (activeCategory === '3D Animation') return item.type === 'portfolio' || item.software?.includes('Maya') || item.software?.includes('Blender');
    if (activeCategory === 'Rigging Work') return item.category === 'Rigging Work' || item.tags?.some(t => t.toLowerCase().includes('rig')) || item.title.toLowerCase().includes('rig');
    if (activeCategory === 'VFX Work') return item.category === 'VFX Work' || item.tags?.some(t => t.toLowerCase().includes('vfx') || t.toLowerCase().includes('fx'));
    if (activeCategory === 'Lighting & LookDev') return item.category === 'Lighting & LookDev' || item.tags?.some(t => t.toLowerCase().includes('light') || t.toLowerCase().includes('lookdev'));
    if (activeCategory === 'WIP Passes') return item.type === 'wip';
    return item.category === activeCategory || item.tags?.some(t => t.toLowerCase() === activeCategory.toLowerCase());
  });

  const displayItems = filteredItems.length > 0 ? filteredItems : items;
  const activeItem = displayItems[activeIndex] || displayItems[0] || items[0];

  const handleNextTrack = () => {
    const nextIdx = (activeIndex + 1) % displayItems.length;
    setActiveIndex(nextIdx);
    setIsPlaying(true);
    if (displayItems[nextIdx]) onSelectFeaturedItem?.(displayItems[nextIdx]);
  };

  const handlePrevTrack = () => {
    const prevIdx = (activeIndex - 1 + displayItems.length) % displayItems.length;
    setActiveIndex(prevIdx);
    setIsPlaying(true);
    if (displayItems[prevIdx]) onSelectFeaturedItem?.(displayItems[prevIdx]);
  };

  const handleSelectTrack = (index: number) => {
    setActiveIndex(index);
    setIsPlaying(true);
    if (displayItems[index]) onSelectFeaturedItem?.(displayItems[index]);
  };

  const handleScrollTrack = (direction: 'left' | 'right') => {
    if (trackScrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      trackScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full mb-8 space-y-4">
      {/* Centered Category Box Selector Above Video Player */}
      <div className="w-full flex flex-wrap items-center justify-center gap-2 px-2">
        {allCategories.map(cat => {
          const isSelected = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat);
                setActiveIndex(0);
                onSelectCategory?.(cat);
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 border cursor-pointer",
                isSelected
                  ? "bg-primary text-white border-primary ring-2 ring-primary/40 shadow-[0_0_20px_rgba(124,58,237,0.4)] scale-105"
                  : "bg-zinc-900/90 text-zinc-300 border-white/10 hover:border-white/30 hover:bg-zinc-800 hover:text-white"
              )}
            >
              {cat === 'All Works' && <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />}
              {cat === '3D Animation' && <Film className="h-3.5 w-3.5 text-blue-400" />}
              {cat === 'Rigging Work' && <Layers className="h-3.5 w-3.5 text-orange-400" />}
              {cat === 'VFX Work' && <Sparkles className="h-3.5 w-3.5 text-purple-400" />}
              {cat === 'Lighting & LookDev' && <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
              {cat === 'WIP Passes' && <Layers className="h-3.5 w-3.5 text-teal-400" />}
              <span>{cat}</span>
            </button>
          );
        })}

        {/* Add Category Tab Button for Profile Owner */}
        {isOwner && (
          <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3.5 rounded-xl border-dashed border-primary/50 text-primary hover:bg-primary/10 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Custom Tab</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Create Custom Category Tab
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Add a custom showcase tab (e.g. <strong>Rigging Showcase</strong>, <strong>VFX Work</strong>, <strong>Creature FX</strong>, or <strong>Character Design</strong>).
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300">Category Name</label>
                  <Input
                    placeholder="e.g. Rigging Showcase"
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-white text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-primary text-white font-bold"
                    onClick={() => {
                      if (newCatInput.trim()) {
                        onAddCategory?.(newCatInput.trim());
                        setActiveCategory(newCatInput.trim());
                        setNewCatInput('');
                        setIsAddCategoryOpen(false);
                      }
                    }}
                  >
                    Add Tab
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Main Hero Reel Container with Subtle Purple Corner Glow */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-purple-500/30 bg-black shadow-[0_0_50px_-5px_rgba(168,85,247,0.35)] ring-1 ring-purple-500/20 group flex flex-col">
        {/* Subtle Ambient Purple Corner Glow Orbs */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-purple-600/30 blur-[60px] rounded-full pointer-events-none z-10" />
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/30 blur-[60px] rounded-full pointer-events-none z-10" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-600/25 blur-[60px] rounded-full pointer-events-none z-10" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-600/25 blur-[60px] rounded-full pointer-events-none z-10" />

        {/* Main Video Viewport */}
        <div className="relative aspect-video w-full max-h-[75vh] bg-black overflow-hidden flex items-center justify-center">
          <UniversalVideoPlayer
            key={activeItem.id}
            url={activeItem.mediaUrl}
            poster={activeItem.thumbnailUrl}
            autoPlay={isPlaying}
            muted={true}
            loop={false}
            controls={true}
            onEnded={() => {
              handleNextTrack();
            }}
            onToggleTimeline={() => setShowTimeline(prev => !prev)}
            isTimelineVisible={showTimeline}
          />

          {/* Floating Side Skip Controls */}
          <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 z-[200] flex justify-between pointer-events-none">
            <Button
              size="icon"
              variant="secondary"
              onClick={handlePrevTrack}
              className="pointer-events-auto h-12 w-12 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-transform hover:scale-110"
            >
              <SkipBack className="h-6 w-6" />
            </Button>

            <Button
              size="icon"
              variant="secondary"
              onClick={handleNextTrack}
              className="pointer-events-auto h-12 w-12 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-transform hover:scale-110"
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Video Editor Style Timeline Track Bar Below Video */}
        <div
          className={cn(
            "w-full bg-zinc-950 border-t border-white/10 transition-all duration-500 ease-in-out overflow-hidden space-y-2",
            showTimeline
              ? "max-h-80 opacity-100 p-3 md:p-4"
              : "max-h-0 opacity-0 p-0 border-t-0 pointer-events-none"
          )}
        >
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-300 uppercase tracking-wider">
              <Film className="h-4 w-4 text-primary" />
              <span>REEL TIMELINE CLIPS ({activeIndex + 1}/{displayItems.length})</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-primary font-semibold hidden sm:inline">Active: {activeItem.title}</span>
              {/* Scroll Track Arrows */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-lg p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleScrollTrack('left')}
                  className="h-7 w-7 text-zinc-300 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleScrollTrack('right')}
                  className="h-7 w-7 text-zinc-300 hover:text-white hover:bg-white/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sectioned Timeline Track Clips */}
          <div 
            ref={trackScrollRef}
            className="flex items-center gap-3 overflow-x-auto pb-1.5 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
          >
            {displayItems.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTrack(index)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl border p-2 text-left transition-all shrink-0 min-w-[210px] max-w-[250px]",
                    isActive
                      ? "border-primary bg-primary/20 ring-2 ring-primary/60 shadow-[0_0_20px_rgba(124,58,237,0.35)]"
                      : "border-white/10 bg-zinc-900/80 hover:border-white/30 hover:bg-zinc-900"
                  )}
                >
                  <div className="relative aspect-video h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                    {item.thumbnailUrl || item.mediaUrl ? (
                      <img src={item.thumbnailUrl || item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <Play className="h-4 w-4 text-white/70" />
                      </div>
                    )}
                    <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold text-white shadow">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="overflow-hidden space-y-0.5">
                    <h4 className={cn("text-xs font-bold truncate", isActive ? "text-white" : "text-zinc-300 group-hover:text-white")}>
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                      {item.software?.[0] && (
                        <span className="bg-purple-950/80 text-purple-200 px-1.5 py-0.5 rounded border border-purple-800/40 font-semibold">
                          {item.software[0]}
                        </span>
                      )}
                      {item.tags?.[0] && (
                        <span className="bg-primary/20 text-white px-1.5 py-0.5 rounded border border-primary/30 font-medium">
                          #{item.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
