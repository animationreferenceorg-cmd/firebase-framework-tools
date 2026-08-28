'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { PortfolioItem, WipStage } from '@/lib/types';
import { getPublicPortfolioItems } from '@/lib/portfolio-service';
import { PortfolioItemCard } from '@/components/portfolio/PortfolioItemCard';
import { PortfolioItemDetailModal } from '@/components/portfolio/PortfolioItemDetailModal';
import { UploadPortfolioItemModal } from '@/components/portfolio/UploadPortfolioItemModal';
import { FilterBar, TabOption, TypeOption, PillOption } from '@/components/FilterBar';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Users, 
  Plus, 
  Film,
  AlertCircle,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Zap,
  Eye,
  Heart,
  Layers
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const ITEMS_PER_PAGE = 24;

export default function CommunityFeedPage() {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const { toast } = useToast();

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMockPreview, setIsMockPreview] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Pagination & Filters
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [activeTab, setActiveTab] = useState<TabOption>('featured');
  const [activeType, setActiveType] = useState<TypeOption>('all');
  const [activePill, setActivePill] = useState<PillOption>('all');
  const [columns, setColumns] = useState<number>(4);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const data = await getPublicPortfolioItems({ limitCount: 200 });
        
        if (data.length === 0) {
          const { MOCK_PORTFOLIO_ITEMS } = await import('@/lib/mock-portfolio-data');
          setPortfolioItems(MOCK_PORTFOLIO_ITEMS.slice(0, 3));
          setIsMockPreview(true);
        } else {
          setPortfolioItems(data);
          setIsMockPreview(false);
        }
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

  useEffect(() => {
    if (inView && visibleCount < filteredItems.length) {
      setVisibleCount(prev => prev + 24);
    }
  }, [inView, visibleCount, filteredItems.length]);

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);
  const hasMore = visibleCount < filteredItems.length;

  return (
    <div className="min-h-screen text-foreground space-y-10 pb-20 pt-2 text-left">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 shadow-sm">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Animation Community
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Community Submissions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
            Explore work-in-progress passes, blocking reels, and polished shots uploaded directly by community animators.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            onClick={handleOpenUploadModal}
            className="h-11 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold text-xs shadow-xl shadow-purple-950/60 flex items-center gap-2 hover:scale-105 transition-all w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>+ Submit Work to Portfolio</span>
          </Button>
        </div>
      </div>

      {/* 2. Hero Call-To-Action: Promote Portfolio Uploads */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/60 via-zinc-950 to-black p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-purple-600/15 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-300 font-semibold">
                <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Track WIP Stages</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-300 font-semibold">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Auto Silent Previews</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-300 font-semibold">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Featured Profile</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
            <Button 
              onClick={handleOpenUploadModal}
              size="lg"
              className="h-14 px-8 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-5 h-5" />
              <span>Start Submitting Shots</span>
            </Button>

            <Link href="/profile">
              <Button 
                variant="outline"
                size="lg"
                className="h-14 px-8 rounded-2xl bg-white/[0.05] border-white/15 hover:bg-white/10 text-white font-bold text-sm transition-all w-full flex items-center justify-center gap-2"
              >
                <span>View Portfolio Profile</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Community Submissions & WIP Passes Section */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Community Submissions & WIP Passes
            </h3>
            <Badge variant="outline" className="bg-purple-950/60 text-purple-300 border-purple-800/40 text-xs font-bold">
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
          <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {visibleItems.map((item) => (
              <PortfolioItemCard 
                key={item.id} 
                item={item} 
                onClick={() => { setSelectedItem(item); setIsDetailOpen(true); }}
              />
            ))}
          </div>
        )}

        {/* Infinite Scroll Loading */}
        {hasMore && (
          <div ref={inViewRef} className="flex justify-center py-8">
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
