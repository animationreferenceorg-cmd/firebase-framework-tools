"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Heart, Layers, Sparkles, Trash2, Calendar, Share2, Wrench, ArrowLeft } from 'lucide-react';
import type { PortfolioItem, WipStage } from '@/lib/types';
import { toggleLikePortfolioItem, deletePortfolioItem } from '@/lib/portfolio-service';
import { isArtistFollowed, toggleFollowArtist } from '@/lib/following-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';

interface PortfolioItemDetailModalProps {
  item: PortfolioItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onItemDeleted?: (itemId: string) => void;
}

const STAGE_CONFIG: Record<WipStage, { label: string; color: string; bg: string }> = {
  concept: { label: 'Concept Pass', color: 'text-amber-400 border-amber-500/30', bg: 'bg-amber-500/10' },
  blocking: { label: 'Blocking Pass', color: 'text-orange-400 border-orange-500/30', bg: 'bg-orange-500/10' },
  splining: { label: 'Splining Pass', color: 'text-blue-400 border-blue-500/30', bg: 'bg-blue-500/10' },
  polish: { label: 'Polish Pass', color: 'text-purple-400 border-purple-500/30', bg: 'bg-purple-500/10' },
  cleanup: { label: 'Cleanup Pass', color: 'text-teal-400 border-teal-500/30', bg: 'bg-teal-500/10' },
  completed: { label: 'Completed', color: 'text-emerald-400 border-emerald-500/30', bg: 'bg-emerald-500/10' },
};

export const PortfolioItemDetailModal: React.FC<PortfolioItemDetailModalProps> = ({
  item,
  open,
  onOpenChange,
  currentUserId,
  onItemDeleted,
}) => {
  const { toast } = useToast();
  const [isLiking, setIsLiking] = useState(false);
  const [likesCount, setLikesCount] = useState(item?.likesCount || 0);
  const [isLiked, setIsLiked] = useState(
    currentUserId && item?.likedBy ? item.likedBy.includes(currentUserId) : false
  );
  const [isDeleting, setIsDeleting] = useState(false);

  if (!item) return null;

  const isOwner = currentUserId && currentUserId === item.userId;
  const stageInfo = item.wipStage ? STAGE_CONFIG[item.wipStage] : null;

  const isImageMedia =
    item.mediaType === 'image' ||
    item.mediaType === 'gif' ||
    (item.mediaUrl && (
      item.mediaUrl.startsWith('data:image/') ||
      item.mediaUrl.includes('unsplash.com') ||
      /\.(png|jpg|jpeg|webp|gif|svg|avif|heic|bmp)($|\?)/i.test(item.mediaUrl.split('#')[0])
    ));

  const handleLike = async () => {
    if (!currentUserId) {
      toast({ title: 'Sign in required', description: 'Please sign in to like items.', variant: 'destructive' });
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    try {
      const res = await toggleLikePortfolioItem(item.id, currentUserId);
      setIsLiked(res.isLiked);
      setLikesCount(res.count);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    if (!window.confirm('Are you sure you want to delete this portfolio item?')) return;

    setIsDeleting(true);
    try {
      await deletePortfolioItem(item.id, currentUserId);
      toast({ title: 'Deleted', description: 'Portfolio item deleted successfully.' });
      onItemDeleted?.(item.id);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error deleting item', description: e.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: 'Portfolio link copied to clipboard.' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none border-0 bg-[#0f0c1d]/95 backdrop-blur-xl overflow-y-auto z-[200]">
        <DialogHeader className="hidden">
          <DialogTitle className="sr-only">{item.title}</DialogTitle>
        </DialogHeader>

        {/* Back Button (Top Right — identical to Home Screen) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="fixed top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md h-10 w-10 z-[220] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="min-h-screen w-full relative">
          <main className="container mx-auto px-4 pt-10 pb-16">
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Top Back Navigation Bar */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Profile</span>
                </Button>

                {/* Top Actions */}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleShare} className="h-9 border-white/10 text-zinc-300 hover:bg-white/10 rounded-full px-4 text-xs font-semibold cursor-pointer">
                    <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share Link
                  </Button>
                  {isOwner && (
                    <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting} className="h-9 rounded-full px-4 text-xs font-semibold cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Piece
                    </Button>
                  )}
                </div>
              </div>

              {/* Theater Media Container (Images vs Videos) */}
              {isImageMedia ? (
                <div className="relative min-h-[450px] md:min-h-[600px] w-full rounded-2xl overflow-hidden shadow-[0_0_50px_-10px_rgba(124,58,237,0.35)] bg-black/90 border border-white/10 flex items-center justify-center p-4 group">
                  <div
                    className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110 pointer-events-none"
                    style={{ backgroundImage: `url(${item.mediaUrl})` }}
                  />
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    className="relative max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                </div>
              ) : (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-[0_0_50px_-10px_rgba(124,58,237,0.35)] bg-black border border-white/10">
                  <UniversalVideoPlayer
                    url={item.mediaUrl}
                    poster={item.thumbnailUrl}
                    autoPlay={true}
                    muted={false}
                    controls={true}
                  />
                </div>
              )}

              {/* Detailed Meta Section Below Player */}
              <div className="space-y-6 text-white pt-2">
                {/* Title & Likes Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      {item.type === 'wip' ? (
                        <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-bold px-2.5 py-1 shadow">
                          <Layers className="h-3.5 w-3.5 mr-1" />
                          Work In Progress (WIP)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-bold px-2.5 py-1 shadow">
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                          Portfolio Piece
                        </Badge>
                      )}

                      {stageInfo && (
                        <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-1 shadow", stageInfo.bg, stageInfo.color)}>
                          {stageInfo.label}
                        </Badge>
                      )}

                      {item.category && (
                        <Badge variant="outline" className="bg-primary/20 text-primary border-primary/40 text-xs font-bold px-2.5 py-1 shadow">
                          {item.category}
                        </Badge>
                      )}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
                      {item.title}
                    </h1>
                  </div>

                  {/* Likes & Views Buttons */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300 font-semibold">
                      <Eye className="h-4 w-4 text-zinc-400" />
                      <span>{item.viewsCount || 0} views</span>
                    </div>

                    <Button
                      size="default"
                      onClick={handleLike}
                      disabled={isLiking}
                      className={cn(
                        "rounded-full px-5 gap-2 font-bold shadow-lg transition-all cursor-pointer",
                        isLiked
                          ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30"
                          : "bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-white border border-white/15"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", isLiked && "fill-white text-white")} />
                      <span>{likesCount} Likes</span>
                    </Button>
                  </div>
                </div>

                {/* Author Info & Detailed Production Description */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                    {/* Author Card with Follow Button */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-primary/60 shadow-md">
                          <AvatarImage src={item.authorAvatar} alt={item.authorName} />
                          <AvatarFallback className="font-bold bg-primary text-white">
                            {item.authorName?.charAt(0).toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-base text-white">{item.authorName}</h3>
                          <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Published {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently'}
                          </p>
                        </div>
                      </div>

                      {currentUserId && currentUserId !== item.userId && (
                        <Button
                          size="sm"
                          variant={isArtistFollowed(currentUserId, item.userId) ? "outline" : "default"}
                          onClick={async () => {
                            const isNow = await toggleFollowArtist(currentUserId, {
                              uid: item.userId,
                              username: item.authorName?.toLowerCase().replace(/\s+/g, '') || item.userId,
                              displayName: item.authorName || 'Animator',
                              avatarUrl: item.authorAvatar,
                            });
                            toast({
                              title: isNow ? 'Following Artist!' : 'Unfollowed',
                              description: isNow ? `${item.authorName} has been saved to your My Lists tab.` : `Removed from your followed artists.`,
                            });
                          }}
                          className={cn(
                            "rounded-full px-4 text-xs font-bold gap-1.5 transition-all cursor-pointer",
                            isArtistFollowed(currentUserId, item.userId)
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-purple-600/30"
                          )}
                        >
                          {isArtistFollowed(currentUserId, item.userId) ? 'Following' : '+ Follow Artist'}
                        </Button>
                      )}
                    </div>

                    {/* Full Notes & Detailed Description */}
                    {item.description ? (
                      <div className="space-y-2.5">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
                          Detailed Description & Breakdown Notes
                        </h3>
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-zinc-300 text-base leading-relaxed whitespace-pre-line shadow-inner">
                          {item.description}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400">
                          Description
                        </h3>
                        <p className="text-sm text-zinc-500 italic">No additional breakdown notes provided for this piece.</p>
                      </div>
                    )}
                  </div>

                  {/* Software & Tags Sidebar */}
                  <div className="space-y-6">
                    {/* Software Tools Used */}
                    {item.software && item.software.length > 0 && (
                      <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                          <Wrench className="h-4 w-4" /> Software Used
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {item.software.map((sw) => (
                            <Badge key={sw} className="bg-purple-950/80 text-purple-200 border-purple-700/50 text-xs font-bold px-3 py-1 shadow">
                              {sw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Animation Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary">
                          Animation Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="bg-primary/10 text-white border-primary/40 text-xs font-semibold px-3 py-1 shadow">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
};
