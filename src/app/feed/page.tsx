'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import type { PortfolioItem } from '@/lib/types';
import { getPublicPortfolioItems, toggleLikePortfolioItem } from '@/lib/portfolio-service';
import { saveVideo, unsaveVideo } from '@/lib/firestore';
import { PortfolioItemCard } from '@/components/portfolio/PortfolioItemCard';
import { PortfolioItemDetailModal } from '@/components/portfolio/PortfolioItemDetailModal';
import { UploadPortfolioItemModal } from '@/components/portfolio/UploadPortfolioItemModal';
import { FilterBar, TabOption, TypeOption, PillOption } from '@/components/FilterBar';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Users, 
  Plus, 
  AlertCircle,
  UploadCloud,
  ArrowRight,
  UserCheck,
  Zap,
  Layers
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const ITEMS_PER_PAGE = 24;

export default function CommunityFeedPage() {
  const { user } = useAuth();
  const { userProfile, mutate: mutateUserProfile } = useUser();
  const { toast } = useToast();

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMockPreview, setIsMockPreview] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleLikeItem = async (targetItem: PortfolioItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.uid) {
      toast({ title: 'Sign in required', description: 'Please sign in to like items.', variant: 'destructive' });
      return;
    }
    try {
      const res = await toggleLikePortfolioItem(targetItem.id, user.uid);
      setPortfolioItems((prev) =>
        prev.map((i) => {
          if (i.id === targetItem.id) {
            const likedBy = i.likedBy || [];
            const updatedLikedBy = res.isLiked
              ? [...likedBy.filter((id) => id !== user.uid), user.uid]
              : likedBy.filter((id) => id !== user.uid);
            return { ...i, likesCount: res.count, likedBy: updatedLikedBy };
          }
          return i;
        })
      );
    } catch (error: any) {
      console.error("Error toggling like:", error);
    }
  };

  const handleSaveItem = async (targetItem: PortfolioItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.uid) {
      toast({ title: 'Sign in required', description: 'Please sign in to save items.', variant: 'destructive' });
      return;
    }
    const isSaved = Boolean(userProfile?.savedVideoIds?.includes(targetItem.id));
    try {
      if (isSaved) {
        await unsaveVideo(user.uid, targetItem.id);
        toast({ title: 'Removed from Saved', description: 'Item removed from your library.' });
      } else {
        await saveVideo(user.uid, targetItem.id);
        toast({ title: 'Saved to Library!', description: 'Item added to your saved videos & portfolio clips.' });
      }
      mutateUserProfile?.();
    } catch (error: any) {
      console.error("Error toggling save:", error);
    }
  };

  // Pagination & Filters
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [activeTab, setActiveTab] = useState<TabOption>('featured');
  const [activeType, setActiveType] = useState<TypeOption>('all');
  const [activePill, setActivePill] = useState<PillOption>('all');
  const [columns, setColumns] = useState<number>(4);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const data = await getPublicPortfolioItems({ limitCount: 200 });
        setPortfolioItems(data || []);
        setIsMockPreview(false);
      } catch (e) {
        console.error('Failed to load community portfolio items', e);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  const handleOpenUploadModal = () => {
    if (!user) {
      toast({
        title: "Account Required",
        description: "Please sign in or create an account to publish your portfolio shots.",
      });
      window.location.href = '/profile';
      return;
    }
    setIsUploadModalOpen(true);
  };

  const filteredItems = useMemo(() => {
    let result = portfolioItems;

    if (activeTab === 'community') {
      result = result.filter(v => v.type === 'portfolio' || v.type === 'wip');
    }

    if (activeType !== 'all') {
      const typeLower = activeType.toLowerCase();
      result = result.filter(v => {
        const tags = v.tags?.map(t => t.toLowerCase()) || [];
        const fullText = (v.title + ' ' + (v.description || '')).toLowerCase();
        return tags.some(t => t.includes(typeLower)) || fullText.includes(typeLower);
      });
    }

    if (activePill !== 'all' && activePill !== 'shorts') {
      const pillKeywords: Record<string, string[]> = {
        locomotion: ['locomotion', 'walk', 'run', 'jump', 'parkour', 'sprint', 'crawl', 'stagger'],
        combat: ['combat', 'fight', 'sword', 'punch', 'kick', 'action', 'martial', 'attack'],
        acting: ['acting', 'facial', 'lip sync', 'dialogue', 'expression', 'gesture', 'emotion'],
        creature: ['creature', 'animal', 'quadruped', 'monster', 'dragon', 'dog', 'bird', 'horse'],
        mechanics: ['mechanic', 'body mechanic', 'weight', 'physics', 'push', 'pull', 'lift', 'fall'],
        vfx: ['vfx', 'fx', 'fire', 'water', 'smoke', 'explosion', 'magic', 'energy'],
      };

      const keywords = pillKeywords[activePill] || [];
      result = result.filter(v => {
        const tags = v.tags?.map(t => t.toLowerCase()) || [];
        const fullText = (v.title + ' ' + (v.description || '')).toLowerCase();
        return keywords.some(kw => tags.some(t => t.includes(kw)) || fullText.includes(kw));
      });
    }

    if (activeTab === 'latest') return [...result].reverse();
    return result;
  }, [portfolioItems, activeTab, activeType, activePill]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeTab, activeType, activePill]);

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);
  const hasMore = visibleCount < filteredItems.length;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisibleCount(filteredItems.length);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredItems.length));
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, filteredItems.length]);

  return (
    <div className="min-h-screen min-w-0 space-y-6 pb-16 pt-1 text-left text-foreground sm:space-y-10 sm:pb-20 sm:pt-2">
      {/* 1. Page Header */}
      <div className="flex min-w-0 flex-col items-start justify-between gap-4 px-0.5 sm:px-1 md:flex-row md:items-center md:gap-6">
        <div className="min-w-0 max-w-2xl space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 shadow-sm">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Animation Community
            </span>
          </div>

          <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            Community Submissions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
            Explore work-in-progress passes, blocking reels, and polished shots uploaded directly by community animators.
          </p>
        </div>

        <div className="flex w-full items-center gap-3 md:w-auto">
          <Button 
            onClick={handleOpenUploadModal}
            className="h-12 w-full justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-rose-600 px-5 text-xs font-bold text-white shadow-xl shadow-purple-950/60 transition-all hover:from-purple-500 hover:to-rose-500 md:h-11 md:w-auto md:px-6 md:hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Work to Portfolio</span>
          </Button>
        </div>
      </div>

      {/* 2. Hero Call-To-Action: Promote Portfolio Uploads */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/60 via-zinc-950 to-black p-5 shadow-2xl sm:rounded-3xl sm:p-10">
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-purple-600/15 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center lg:gap-8">
          <div className="min-w-0 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Built for Animators</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight">
              Share Your Motion. <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                Build Your Professional Portfolio.
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed">
              Showcase your blocking passes, splining iterations, and final polish reels. Get peer feedback, tag your rigs & software, and let studios discover your work.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2 sm:gap-3">
              <div className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center text-[10px] font-semibold leading-tight text-zinc-300 sm:flex-row sm:gap-2 sm:p-2.5 sm:text-left sm:text-xs">
                <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Track WIP Stages</span>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center text-[10px] font-semibold leading-tight text-zinc-300 sm:flex-row sm:gap-2 sm:p-2.5 sm:text-left sm:text-xs">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Auto Silent Previews</span>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center text-[10px] font-semibold leading-tight text-zinc-300 sm:flex-row sm:gap-2 sm:p-2.5 sm:text-left sm:text-xs">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Featured Profile</span>
              </div>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col">
            <Button 
              onClick={handleOpenUploadModal}
              size="lg"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 text-sm font-black text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all hover:bg-purple-500 hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] sm:h-14 sm:px-8 lg:w-auto lg:hover:scale-105"
            >
              <UploadCloud className="w-5 h-5" />
              <span>Start Submitting Shots</span>
            </Button>

            <Link href="/profile">
              <Button 
                variant="outline"
                size="lg"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-white/15 bg-white/[0.05] px-6 text-sm font-bold text-white transition-all hover:bg-white/10 sm:h-14 sm:px-8"
              >
                <span>View Portfolio Profile</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Community Submissions & WIP Passes Section */}
      <section className="min-w-0 space-y-3 pt-2 sm:space-y-4 sm:pt-4">
        <div className="flex flex-col justify-between gap-3 px-0.5 sm:flex-row sm:items-center sm:gap-4 sm:px-1">
          <div className="flex min-w-0 flex-wrap items-start gap-2 sm:items-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="min-w-0 flex-1 text-lg font-black leading-tight tracking-tight text-white sm:text-xl md:text-2xl">
              Community Submissions & WIP Passes
            </h3>
            <Badge variant="outline" className="shrink-0 border-purple-800/40 bg-purple-950/60 text-xs font-bold text-purple-300">
              {filteredItems.length} Posts
            </Badge>
          </div>

          {isMockPreview && (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-semibold px-3 py-1 w-fit">
              ✨ Showcase Preview (Submit your work to be featured first!)
            </Badge>
          )}
        </div>

        {/* Filter Bar */}
        <FilterBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeType={activeType}
          setActiveType={setActiveType}
          columns={columns}
          setColumns={setColumns}
          activePill={activePill}
          setActivePill={setActivePill}
        />

        {/* Grid or Empty State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="grid place-items-center py-20 text-center rounded-3xl border border-dashed border-white/10 bg-zinc-950/50">
            <AlertCircle className="w-10 h-10 text-zinc-500 mb-3" />
            <h3 className="text-lg font-bold text-white">No submissions match your filter</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-sm">
              Be the first animator to post a shot in this category!
            </p>
            <Button 
              onClick={handleOpenUploadModal} 
              className="mt-5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
            >
              + Submit Your Work
            </Button>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:[grid-template-columns:repeat(var(--community-columns),minmax(0,1fr))]"
            style={{ '--community-columns': columns } as React.CSSProperties}
          >
            {visibleItems.map((item) => (
              <PortfolioItemCard 
                key={item.id} 
                item={item} 
                currentUserId={user?.uid}
                isSaved={Boolean(userProfile?.savedVideoIds?.includes(item.id))}
                onClick={() => { setSelectedItem(item); setIsDetailOpen(true); }}
                onLike={(e) => handleLikeItem(item, e)}
                onSave={(e) => handleSaveItem(item, e)}
              />
            ))}
          </div>
        )}

        {/* Infinite Scroll Loading */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold">
              <Sparkles className="h-5 w-5 animate-spin text-purple-500" />
              <span>Loading more community showcases...</span>
            </div>
          </div>
        )}
      </section>

      {/* Upload Portfolio Item Modal Trigger */}
      <UploadPortfolioItemModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        userId={user?.uid || 'guest-user'}
        authorName={userProfile?.displayName || user?.displayName || 'Animator'}
        authorAvatar={userProfile?.photoURL || user?.photoURL || ''}
        onItemCreated={(newItem) => {
          setPortfolioItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
          setIsMockPreview(false);
          toast({
            title: "Shot Published!",
            description: "Your submission is now live on the community feed.",
          });
        }}
      />
      <PortfolioItemDetailModal
        item={selectedItem}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        currentUserId={user?.uid}
        onItemDeleted={(itemId) => setPortfolioItems((current) => current.filter((item) => item.id !== itemId))}
      />
    </div>
  );
}
