'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortfolioItemCard } from '@/components/portfolio/PortfolioItemCard';
import { getPublicPortfolioItems, toggleLikePortfolioItem, incrementPortfolioItemShares } from '@/lib/portfolio-service';
import { saveVideo, unsaveVideo } from '@/lib/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import type { PortfolioItem } from '@/lib/types';
import Link from 'next/link';

export function CommunityFeedShelf() {
  const { user } = useAuth();
  const { userProfile, mutate: mutateUserProfile } = useUser();
  const { toast } = useToast();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        const feedItems = await getPublicPortfolioItems({ limitCount: 4 });
        setItems(feedItems);
      } catch (error) {
        console.error('Error loading community feed:', error);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, [user?.uid]);

  const handleLikeItem = async (targetItem: PortfolioItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.uid) {
      toast({ title: 'Sign in required', description: 'Please sign in to like items.', variant: 'destructive' });
      return;
    }
    try {
      const res = await toggleLikePortfolioItem(targetItem.id, user.uid);
      setItems((prev) =>
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

  const handleShareItem = async (targetItem: PortfolioItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/feed?item=${targetItem.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Portfolio link copied to clipboard.' });
      const sharesCount = await incrementPortfolioItemShares(targetItem.id);
      setItems((prev) =>
        prev.map((i) => {
          if (i.id === targetItem.id) {
            return { ...i, sharesCount };
          }
          return i;
        })
      );
    } catch (error: any) {
      console.error("Error sharing item:", error);
    }
  };

  if (loading) {
    return (
      <section className="mb-12 mt-6 animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/5" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-white/5 rounded-md" />
            <div className="h-4 w-32 bg-white/5 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video bg-white/5 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-12 mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 px-1">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Community Feed
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[10px] font-black text-white">
                <Sparkles className="h-3 w-3" />
              </span>
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              Latest submissions and portfolio updates from the community.
            </p>
          </div>
        </div>

        <Link href="/profile" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-black transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] rounded-xl hover:scale-105">
            Submit Your Work
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Feed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
        {items.map((item) => (
          <PortfolioItemCard 
            key={item.id} 
            item={item} 
            currentUserId={user?.uid}
            isSaved={Boolean(userProfile?.savedVideoIds?.includes(item.id))}
            onLike={(e) => handleLikeItem(item, e)}
            onSave={(e) => handleSaveItem(item, e)}
            onShare={(e) => handleShareItem(item, e)}
            onClick={() => {
              if (item.userId) {
                window.location.href = `/u/${item.userId}`;
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}
