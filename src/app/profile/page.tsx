"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import { getUserPortfolioItems, getDatabaseVideosAsPortfolioItems, updateUserProfileData, deletePortfolioItem, toggleLikePortfolioItem } from '@/lib/portfolio-service';
import type { PortfolioItem, WipStage, Video } from '@/lib/types';
import { cn } from '@/lib/utils';
import { VideoCard } from '@/components/VideoCard';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DonateDialog } from '@/components/DonateDialog';

import { MOCK_PORTFOLIO_ITEMS } from '@/lib/mock-portfolio-data';
import { PortfolioItemCard } from '@/components/portfolio/PortfolioItemCard';
import { PortfolioHeroBanner } from '@/components/portfolio/PortfolioHeroBanner';
import { UploadPortfolioItemModal } from '@/components/portfolio/UploadPortfolioItemModal';
import { EditPortfolioItemModal } from '@/components/portfolio/EditPortfolioItemModal';
import { PortfolioFounderDealModal } from '@/components/portfolio/PortfolioFounderDealModal';
import { PortfolioItemDetailModal } from '@/components/portfolio/PortfolioItemDetailModal';
import { getFollowedArtists } from '@/lib/following-service';
import { EditProfileModal } from '@/components/portfolio/EditProfileModal';
import { ReelStudioModal } from '@/components/portfolio/ReelStudioModal';
import { UsernameSetupModal } from '@/components/portfolio/UsernameSetupModal';

import { 
  CreditCard, 
  LogOut, 
  Edit, 
  ShieldCheck, 
  Plus, 
  Share2, 
  Sparkles, 
  Layers, 
  Globe, 
  Youtube, 
  Video, 
  Twitter, 
  Instagram, 
  Briefcase, 
  Film,
  ArrowUpDown,
  Wand2,
  Heart,
  Bookmark,
  Check,
  ArrowRight,
  Lock,
  CheckCircle2,
  Eye,
  MapPin,
  Camera,
  Users
} from 'lucide-react';

const PATTERN_CLASSES: Record<string, string> = {
  obsidian_grid: 'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]',
  studio_dots: 'bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px]',
  violet_nebula: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/60 via-zinc-950 to-black',
  blueprint_mesh: 'bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)] bg-[size:32px_32px]',
  emerald_glow: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/60 via-zinc-950 to-black',
  minimal_pitch: 'bg-black',
};

const CARD_TINT_CLASSES: Record<string, string> = {
  glass_purple: 'bg-[#0e0a20]/60 border-purple-500/30 backdrop-blur-3xl backdrop-saturate-150 shadow-[0_20px_60px_rgba(0,0,0,0.7)] hover:border-purple-500/50',
  glass_obsidian: 'bg-[#0c0c12]/65 border-white/20 backdrop-blur-3xl backdrop-saturate-150 shadow-[0_20px_60px_rgba(0,0,0,0.7)] hover:border-white/35',
  glass_emerald: 'bg-[#061812]/60 border-emerald-500/30 backdrop-blur-3xl backdrop-saturate-150 shadow-[0_20px_60px_rgba(0,0,0,0.7)] hover:border-emerald-500/50',
  glass_cyan: 'bg-[#061622]/60 border-cyan-500/30 backdrop-blur-3xl backdrop-saturate-150 shadow-[0_20px_60px_rgba(0,0,0,0.7)] hover:border-cyan-500/50',
  glass_gold: 'bg-[#1c1409]/60 border-amber-500/30 backdrop-blur-3xl backdrop-saturate-150 shadow-[0_20px_60px_rgba(0,0,0,0.7)] hover:border-amber-500/50',
};

const AVATAR_GLOW_CLASSES: Record<string, string> = {
  none: 'border-4 border-zinc-950 shadow-xl bg-zinc-900',
  violet: 'ring-4 ring-purple-500/60 shadow-[0_0_35px_rgba(168,85,247,0.6)] border-4 border-zinc-950 bg-zinc-900',
  emerald: 'ring-4 ring-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.6)] border-4 border-zinc-950 bg-zinc-900',
  cyan: 'ring-4 ring-cyan-500/60 shadow-[0_0_35px_rgba(6,182,212,0.6)] border-4 border-zinc-950 bg-zinc-900',
  amber: 'ring-4 ring-amber-500/60 shadow-[0_0_35px_rgba(245,158,11,0.6)] border-4 border-zinc-950 bg-zinc-900',
  rose: 'ring-4 ring-rose-500/60 shadow-[0_0_35px_rgba(244,63,94,0.6)] border-4 border-zinc-950 bg-zinc-900',
};

export default function ProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { userProfile, loading: userProfileLoading, mutate } = useUser();
  const loading = authLoading || userProfileLoading;
  const router = useRouter();
  const { toast } = useToast();

  const isStudioMaster = userProfile?.isPremium && userProfile?.tier === 'tier5';
  const activePatternClass = PATTERN_CLASSES[userProfile?.profilePattern || 'obsidian_grid'] || PATTERN_CLASSES.obsidian_grid;
  const activeCardTintClass = CARD_TINT_CLASSES[userProfile?.profileCardTint || 'glass_purple'] || CARD_TINT_CLASSES.glass_purple;
  const activeAvatarGlowClass = AVATAR_GLOW_CLASSES[userProfile?.avatarGlow || 'none'] || AVATAR_GLOW_CLASSES.none;

  // Portfolio items state
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [featuredItemId, setFeaturedItemId] = useState<string | null>(null);

  // Liked & Saved Videos
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [likedVideosLoading, setLikedVideosLoading] = useState(false);
  const [savedSubTab, setSavedSubTab] = useState<'liked' | 'saved' | 'categories'>('liked');

  // Tabs & Filters
  const [activeWorkTab, setActiveWorkTab] = useState<'all' | 'portfolio' | 'wip' | 'following'>('all');
  const [selectedWipStage, setSelectedWipStage] = useState<WipStage | 'all'>('all');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isUsernameSetupOpen, setIsUsernameSetupOpen] = useState(false);
  const [isReelStudioOpen, setIsReelStudioOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Stripe Billing states
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [showDonateDialog, setShowDonateDialog] = useState(false);

  // Check if new user needs username setup
  useEffect(() => {
    if (authUser && !loading) {
      if (!userProfile?.username) {
        setIsUsernameSetupOpen(true);
      }
    }
  }, [authUser, loading, userProfile]);

  // Load user's portfolio items
  useEffect(() => {
    if (!authUser?.uid) {
      setItemsLoading(false);
      return;
    }
    const currentUid: string = authUser.uid;

    async function loadItems() {
      setItemsLoading(true);
      try {
        const data = await getUserPortfolioItems(currentUid);
        const showPortfolioPreview = new URLSearchParams(window.location.search).get('portfolioPreview') === '1';
        if (showPortfolioPreview) {
          const previewItems = MOCK_PORTFOLIO_ITEMS.map((item) => ({
            ...item,
            id: `preview-${item.id}`,
            userId: currentUid,
            authorName: authUser.displayName || 'Demo Animator',
            authorAvatar: authUser.photoURL || item.authorAvatar,
          }));
          setPortfolioItems(previewItems);
          setFeaturedItemId(previewItems[0]?.id || null);
        } else {
          setPortfolioItems(data || []);
        }
      } catch (err) {
        console.error("Error loading portfolio items:", err);
        setPortfolioItems([]);
      } finally {
        setItemsLoading(false);
      }
    }

    loadItems();
  }, [authUser]);

  // Load user's liked & saved videos
  useEffect(() => {
    async function loadLikedAndSavedVideos() {
      const likedIds = userProfile?.likedVideoIds || [];
      const savedIds = userProfile?.savedVideoIds || [];
      if (likedIds.length === 0 && savedIds.length === 0) {
        setLikedVideos([]);
        setSavedVideos([]);
        return;
      }

      setLikedVideosLoading(true);
      try {
        const snapshotVideos = await getSnapshotVideos();
        const videoMap = new Map<string, Video>();
        snapshotVideos.forEach(v => videoMap.set(v.id, v));

        // Helper to get video by ID from snapshot or Firestore
        const fetchVideoById = async (id: string): Promise<Video | null> => {
          if (videoMap.has(id)) return videoMap.get(id)!;
          try {
            const vSnap = await getDoc(doc(db, "videos", id));
            if (vSnap.exists()) return { id: vSnap.id, ...vSnap.data() } as Video;
          } catch (e) {
            console.error("Error fetching video:", id, e);
          }
          return null;
        };

        const likedList = (await Promise.all(likedIds.map(fetchVideoById))).filter(Boolean) as Video[];
        const savedList = (await Promise.all(savedIds.map(fetchVideoById))).filter(Boolean) as Video[];

        setLikedVideos(likedList);
        setSavedVideos(savedList);
      } catch (err) {
        console.error("Error loading liked/saved videos:", err);
      } finally {
        setLikedVideosLoading(false);
      }
    }

    loadLikedAndSavedVideos();
  }, [userProfile?.likedVideoIds, userProfile?.savedVideoIds]);

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= portfolioItems.length) return;

    const newItems = [...portfolioItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    newItems.forEach((item, idx) => {
      item.sortIndex = idx;
    });

    setPortfolioItems(newItems);
  };

  // Handle Stripe sync redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sync') === 'true' && authUser?.uid && authUser?.email) {
      toast({ title: 'Updating...', description: 'Syncing your subscription changes...' });
      
      const syncWithRetry = async (retries = 3) => {
        try {
          const idToken = await authUser.getIdToken();
          const r = await fetch('/api/sync-stripe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ userId: authUser.uid, email: authUser.email })
          });
          const data = await r.json();
          if (data.success) {
            toast({ title: 'Success!', description: 'Your plan changes have been applied.' });
            mutate();
            window.history.replaceState({}, '', '/profile');
          } else if (retries > 0) {
            setTimeout(() => syncWithRetry(retries - 1), 3000);
          } else {
            window.history.replaceState({}, '', '/profile');
          }
        } catch (e) {
          if (retries > 0) setTimeout(() => syncWithRetry(retries - 1), 3000);
        }
      };

      syncWithRetry();
    }
  }, [authUser, mutate, toast]);

  // Redirect guest if Firebase configured
  useEffect(() => {
    if (!loading && !authUser && isFirebaseConfigured()) {
      router.push('/login');
    }
  }, [loading, authUser, router]);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/');
  };

  const handlePortal = async () => {
    if (isPortalLoading) return;
    setIsPortalLoading(true);
    try {
      const idToken = await authUser?.getIdToken();
      const url = new URL(window.location.href);
      url.searchParams.set('sync', 'true');
      
      const response = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ userId: authUser?.uid, returnUrl: url.toString() }),
      });
      const data = await response.json();
      if (data.url) window.location.assign(data.url);
      else throw new Error(data.error);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleSharePublicProfile = () => {
    if (!authUser?.uid) return;
    const slug = userProfile?.username || authUser.uid;
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Profile Link Copied!', description: `Direct portfolio link (${url}) copied to clipboard.` });
  };

  const handlePreviewPublicProfile = () => {
    if (!authUser?.uid) return;
    const slug = userProfile?.username || authUser.uid;
    window.open(`/${slug}`, '_blank');
  };

  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFounderDealOpen, setIsFounderDealOpen] = useState(false);

  const followedArtists = authUser ? getFollowedArtists(authUser.uid) : [];

  const handleItemCreated = (newItem: PortfolioItem) => {
    setPortfolioItems([newItem, ...portfolioItems]);
  };

  const handleItemUpdated = (updatedItem: PortfolioItem) => {
    setPortfolioItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem);
    }
  };

  const handleItemDeleted = async (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("Are you sure you want to delete this post?")) {
      setPortfolioItems((prev) => prev.filter((i) => i.id !== itemId));
      if (authUser?.uid) {
        await deletePortfolioItem(itemId, authUser.uid);
      }
      toast({ title: 'Post Deleted', description: 'Item has been removed from your portfolio.' });
    }
  };

  const handleLikeItem = async (targetItem: PortfolioItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!authUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to like items.', variant: 'destructive' });
      return;
    }
    try {
      const res = await toggleLikePortfolioItem(targetItem.id, authUser.uid);
      setPortfolioItems((prev) =>
        prev.map((i) => {
          if (i.id === targetItem.id) {
            const likedBy = i.likedBy || [];
            const updatedLikedBy = res.isLiked
              ? [...likedBy.filter((id) => id !== authUser.uid), authUser.uid]
              : likedBy.filter((id) => id !== authUser.uid);
            return { ...i, likesCount: res.count, likedBy: updatedLikedBy };
          }
          return i;
        })
      );
    } catch (error: any) {
      console.error("Error toggling like:", error);
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto px-4 md:px-6 pt-6 pb-16 min-h-screen text-white">
        <div className="space-y-6 mb-12">
          <Skeleton className="h-48 w-full rounded-2xl bg-zinc-900" />
          <div className="flex gap-4">
            <Skeleton className="h-28 w-28 rounded-full bg-zinc-900" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-64 bg-zinc-900" />
              <Skeleton className="h-4 w-48 bg-zinc-900" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!authUser && isFirebaseConfigured()) {
    return null;
  }

  const currentUser = authUser || {
    displayName: 'Guest User',
    email: 'guest@example.com',
    photoURL: `https://placehold.co/100x100.png`
  };

  const filteredItems = portfolioItems.filter((item) => {
    if (activeWorkTab === 'portfolio' && item.type !== 'portfolio') return false;
    if (activeWorkTab === 'wip' && item.type !== 'wip') return false;
    if (activeWorkTab === 'wip' && selectedWipStage !== 'all' && item.wipStage !== selectedWipStage) return false;
    return true;
  });

  const portfolioCount = portfolioItems.filter((i) => i.type === 'portfolio').length;
  const wipCount = portfolioItems.filter((i) => i.type === 'wip').length;

  const bgColor = userProfile?.profileBgColor || '#09090b';

  return (
    <main
      className={cn("min-h-screen text-white pb-20 relative transition-colors duration-500", activePatternClass)}
      style={{ backgroundColor: bgColor }}
    >
      {/* ArtStation & Recruiter Style Custom Cover Banner - Stretches from Top to Bottom of Profile Card */}
      <div
        className="absolute top-0 inset-x-0 h-[400px] sm:h-[500px] md:h-[700px] lg:h-[780px] w-full overflow-hidden group pointer-events-none z-0"
        style={{
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.6) 82%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.6) 82%, rgba(0,0,0,0) 100%)',
        }}
      >
        {userProfile?.bannerUrl ? (
          <img
            src={userProfile.bannerUrl}
            alt="Cover Banner"
            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-950/80 via-zinc-950 to-indigo-950/80" />
        )}

        {/* Top Vignette for Nav Contrast */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/85 via-black/35 to-transparent pointer-events-none z-10" />

        {/* Dynamic Smooth Color Blend Dissolving at Bottom of Profile Card */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, transparent 45%, ${bgColor}77 78%, ${bgColor} 100%)`
          }}
        />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/10 blur-[140px] pointer-events-none" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 pt-16 sm:pt-20 md:pt-28 lg:pt-36 relative z-20">
        {/* Change Cover Banner Button for Profile Owner */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="px-4 py-2 rounded-full bg-black/80 hover:bg-purple-900/90 border border-purple-500/40 text-xs font-bold text-white shadow-2xl backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
          >
            <Camera className="h-4 w-4 text-purple-400" /> Change Cover Banner
          </button>
        </div>

        {/* Recruiter Profile Glassmorphism Card */}
        <div className={cn("p-6 md:p-8 rounded-3xl relative overflow-hidden space-y-6 border transition-all duration-500 group/card", activeCardTintClass)}>
          {/* Inner Gloss Sheen & Specular Highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30 pointer-events-none rounded-3xl" />
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Left: Avatar & Professional Bio */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className={cn("h-20 w-20 sm:h-28 sm:w-28 md:h-36 md:w-36 transition-all duration-300 shrink-0", activeAvatarGlowClass)}>
                <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || ''} />
                <AvatarFallback className="text-3xl font-black bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
                  {userProfile?.username?.charAt(0).toUpperCase() ?? currentUser.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                {/* Name & Availability Pill */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight">{currentUser.displayName}</h1>
                  
                  {/* Recruiter Availability Badge */}
                  <div className="px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold shadow-md flex items-center gap-1.5 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Available for Hire & Studio Contracts</span>
                  </div>

                  {userProfile?.isPremium && (
  <Badge variant="outline" className="bg-purple-950/80 text-purple-300 border-purple-500/40 text-xs font-semibold">
    Pro Animator
  </Badge>
)}
                </div>

                {/* Social & Professional Links Bar - Directly Below Name */}
                <div className="flex flex-wrap gap-2 py-1 items-center">
                  {userProfile?.artstationUrl && (
                    <a href={userProfile.artstationUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-blue-400/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-400" /> ArtStation
                    </a>
                  )}
                  {userProfile?.youtubeUrl && (
                    <a href={userProfile.youtubeUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-red-500/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Youtube className="h-3.5 w-3.5 text-red-500" /> YouTube
                    </a>
                  )}
                  {userProfile?.vimeoUrl && (
                    <a href={userProfile.vimeoUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-sky-400/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-sky-400" /> Vimeo
                    </a>
                  )}
                  {userProfile?.twitterUrl && (
                    <a href={userProfile.twitterUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-sky-500/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Twitter className="h-3.5 w-3.5 text-sky-500" /> Twitter / X
                    </a>
                  )}
                  {userProfile?.instagramUrl && (
                    <a href={userProfile.instagramUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-pink-500/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram
                    </a>
                  )}
                  {userProfile?.websiteUrl && (
                    <a href={userProfile.websiteUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-emerald-400/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-emerald-400" /> Website
                    </a>
                  )}
                </div>

                {/* Professional Headline */}
                {userProfile?.headline ? (
                  <p className="text-sm md:text-base font-bold text-purple-300 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>{userProfile.headline}</span>
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 font-mono">{userProfile?.username ?? currentUser.email}</p>
                )}

                {/* Bio & Location */}
                {userProfile?.bio && (
                  <p className="text-xs md:text-sm text-zinc-300 max-w-3xl leading-relaxed font-normal">
                    {userProfile.bio}
                  </p>
                )}

                {/* Profile Stats Bar (Likes, Saves & Shots) */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <Link href="/list">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-white/10 hover:border-rose-500/50 text-xs font-bold text-zinc-200 transition-colors cursor-pointer shadow-md">
                      <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-500/20" />
                      <span>{userProfile?.likedVideoIds?.length || 0} Liked Clips</span>
                    </div>
                  </Link>

                  <Link href="/list">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-white/10 hover:border-amber-500/50 text-xs font-bold text-zinc-200 transition-colors cursor-pointer shadow-md">
                      <Bookmark className="h-3.5 w-3.5 text-amber-400 fill-amber-400/20" />
                      <span>{userProfile?.likedCategoryIds?.length || 0} Saved Collections</span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-white/10 text-xs font-bold text-zinc-200 shadow-md">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    <span>{portfolioItems.length} Portfolio Shots</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Action Bar */}
            {authUser && (
              <div className="flex flex-wrap lg:flex-col gap-2.5 items-stretch shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10">
                <Button onClick={() => setIsUploadOpen(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-purple-600/30 gap-1.5 cursor-pointer">
                  <Plus className="h-4 w-4" /> Upload Animation / WIP
                </Button>
                <Button onClick={() => setIsReelStudioOpen(true)} variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold cursor-pointer gap-1.5">
                  <Wand2 className="h-4 w-4 text-amber-400" /> Open Reel Editor
                </Button>
                <Button variant="outline" onClick={handlePreviewPublicProfile} className="border-white/15 text-zinc-200 hover:bg-white/10 cursor-pointer gap-1.5 font-bold">
                  <Eye className="h-4 w-4 text-cyan-400" /> Preview Public View
                </Button>
                <Button variant="outline" onClick={() => setIsEditProfileOpen(true)} className="border-white/15 text-zinc-200 hover:bg-white/10 cursor-pointer font-bold">
                  <Edit className="mr-1.5 h-4 w-4" /> Edit Profile
                </Button>
                <Button variant="outline" onClick={handleSharePublicProfile} className="border-white/15 text-zinc-200 hover:bg-white/10 cursor-pointer font-bold">
                  <Share2 className="mr-1.5 h-4 w-4" /> Share Link
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Profile Tabs */}
        <div className="mt-8">
          <Tabs defaultValue="works" className="w-full">
            <TabsList className="bg-zinc-900 border border-white/10 mb-6">
              <TabsTrigger value="works" className="data-[state=active]:bg-primary data-[state=active]:text-white font-bold">
                Portfolio & WIPs ({portfolioItems.length})
              </TabsTrigger>
              <TabsTrigger value="saved" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <Bookmark className="h-3.5 w-3.5 mr-1 text-amber-400" />
                Saved & Moodboards ({(userProfile?.likedVideoIds?.length || 0) + (userProfile?.likedCategoryIds?.length || 0)})
              </TabsTrigger>
              <TabsTrigger value="subscription" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Subscription & Billing
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Portfolio & WIPs */}
            <TabsContent value="works" className="space-y-6">
              {/* Large Featured Demo Reel Hero Banner */}
              <PortfolioHeroBanner
                items={portfolioItems}
                featuredItemId={featuredItemId}
                isOwner={true}
                userCategories={userProfile?.customPortfolioCategories || []}
                onAddCategory={async (newCategory) => {
                  if (userProfile && authUser) {
                    const existing = userProfile.customPortfolioCategories || [];
                    if (!existing.includes(newCategory)) {
                      const updated = [...existing, newCategory];
                      await updateUserProfileData(authUser.uid, { customPortfolioCategories: updated });
                      mutate();
                      toast({ title: 'Category Tab Added!', description: `Added tab "${newCategory}" to your profile.` });
                    }
                  }
                }}
                onSelectFeaturedItem={(item) => setFeaturedItemId(item.id)}
                onCardClick={(item) => {
                  setSelectedItem(item);
                  setIsDetailOpen(true);
                }}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <Tabs value={activeWorkTab} onValueChange={(v: any) => setActiveWorkTab(v)} className="w-auto">
                    <TabsList className="bg-zinc-900/60 border border-white/10">
                      <TabsTrigger value="all" className="data-[state=active]:bg-zinc-800 text-xs">
                        All Works ({portfolioItems.length})
                      </TabsTrigger>
                      <TabsTrigger value="portfolio" className="data-[state=active]:bg-zinc-800 text-xs">
                        <Sparkles className="h-3 w-3 mr-1 text-emerald-400" />
                        Portfolio ({portfolioCount})
                      </TabsTrigger>
                      <TabsTrigger value="wip" className="data-[state=active]:bg-zinc-800 text-xs">
                        <Layers className="h-3 w-3 mr-1 text-amber-400" />
                        WIPs ({wipCount})
                      </TabsTrigger>
                      <TabsTrigger value="following" className="data-[state=active]:bg-zinc-800 text-xs">
                        <Users className="h-3 w-3 mr-1 text-purple-400" />
                        Following Artists ({followedArtists.length})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Rearrange Order Toggle Button */}
                  {authUser && (
                    <Button
                      size="sm"
                      variant={isReordering ? 'default' : 'outline'}
                      onClick={() => setIsReordering(!isReordering)}
                      className={`h-8 text-xs font-medium transition-all ${
                        isReordering
                          ? 'bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-md'
                          : 'border-white/10 text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                      {isReordering ? 'Done Rearranging' : 'Rearrange Order'}
                    </Button>
                  )}
                </div>

                {/* WIP Stage Pills Filter */}
                {activeWorkTab === 'wip' && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-zinc-400 mr-1 font-medium">Stage:</span>
                    {(['all', 'concept', 'blocking', 'splining', 'polish', 'cleanup', 'completed'] as const).map((stage) => (
                      <Button
                        key={stage}
                        size="sm"
                        variant={selectedWipStage === stage ? 'default' : 'ghost'}
                        onClick={() => setSelectedWipStage(stage)}
                        className={`h-7 text-xs capitalize ${
                          selectedWipStage === stage
                            ? 'bg-amber-500 hover:bg-amber-600 text-black font-semibold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {stage}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Grid */}
              {activeWorkTab === 'following' ? (
                followedArtists.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-zinc-900/30">
                    <Users className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-zinc-300">No followed artists yet</h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                      Click "+ Follow Artist" on any creator profile or detail view to save your favorite animators to your My Lists tab.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                    {followedArtists.map((artist) => (
                      <div
                        key={artist.uid}
                        onClick={() => window.open(`/${artist.username}`, '_blank')}
                        className="group p-5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer flex items-center justify-between shadow-xl"
                      >
                        <div className="flex items-center gap-3.5">
                          <Avatar className="h-11 w-11 border-2 border-purple-500/50">
                            <AvatarImage src={artist.avatarUrl} alt={artist.displayName} />
                            <AvatarFallback className="bg-purple-900 text-white font-bold">
                              {artist.displayName?.charAt(0).toUpperCase() || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                              {artist.displayName}
                            </h4>
                            <p className="text-xs text-zinc-400 font-mono">@{artist.username}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs text-purple-400 group-hover:text-white font-semibold">
                          View Portfolio →
                        </Button>
                      </div>
                    ))}
                  </div>
                )
              ) : itemsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="aspect-video w-full rounded-xl bg-zinc-900" />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-zinc-900/30">
                  <Film className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-zinc-300">No animation pieces yet</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                    Showcase your animation blocking passes, polished shots, or full reels with tags and software tools.
                  </p>
                  {authUser && (
                    <Button onClick={() => setIsUploadOpen(true)} className="mt-4 bg-primary hover:bg-primary/90 text-white font-semibold">
                      <Plus className="mr-1.5 h-4 w-4" /> Upload First Animation / WIP
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                  {filteredItems.map((item, index) => (
                    <PortfolioItemCard
                      key={item.id}
                      item={item}
                      onClick={() => {
                        setSelectedItem(item);
                        setIsDetailOpen(true);
                      }}
                      onEdit={(e) => {
                        e.stopPropagation();
                        setEditingItem(item);
                        setIsEditOpen(true);
                      }}
                      onDelete={(e) => handleItemDeleted(item.id, e)}
                      onLike={(e) => handleLikeItem(item, e)}
                      currentUserId={authUser?.uid}
                      isReordering={isReordering}
                      onMoveUp={() => handleMoveItem(index, 'up')}
                      onMoveDown={() => handleMoveItem(index, 'down')}
                      canMoveUp={index > 0}
                      canMoveDown={index < filteredItems.length - 1}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Saved & Liked Library */}
            <TabsContent value="saved" className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => setSavedSubTab('liked')} className={cn("p-5 rounded-2xl border space-y-2 text-left transition-all", savedSubTab === 'liked' ? 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/30' : 'bg-white/5 border-white/10 hover:border-white/20')}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400">LIKED CLIPS</span>
                    <Heart className={cn("h-4 w-4", savedSubTab === 'liked' ? 'text-rose-400 fill-rose-400' : 'text-rose-400')} />
                  </div>
                  <p className="text-3xl font-black text-white">{userProfile?.likedVideoIds?.length || 0}</p>
                  <p className="text-[11px] text-zinc-400 font-medium">Favorited video reference clips</p>
                </button>

                <button onClick={() => setSavedSubTab('saved')} className={cn("p-5 rounded-2xl border space-y-2 text-left transition-all", savedSubTab === 'saved' ? 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-950/30' : 'bg-white/5 border-white/10 hover:border-white/20')}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400">SAVED / BOOKMARKED</span>
                    <Bookmark className={cn("h-4 w-4", savedSubTab === 'saved' ? 'text-amber-400 fill-amber-400' : 'text-amber-400')} />
                  </div>
                  <p className="text-3xl font-black text-white">{userProfile?.savedVideoIds?.length || 0}</p>
                  <p className="text-[11px] text-zinc-400 font-medium">Bookmarked for later study</p>
                </button>

                <button onClick={() => setSavedSubTab('categories')} className={cn("p-5 rounded-2xl border space-y-2 text-left transition-all", savedSubTab === 'categories' ? 'bg-cyan-950/30 border-cyan-500/40 shadow-lg shadow-cyan-950/30' : 'bg-white/5 border-white/10 hover:border-white/20')}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400">LIKED CATEGORIES</span>
                    <Layers className={cn("h-4 w-4", savedSubTab === 'categories' ? 'text-cyan-400' : 'text-cyan-400')} />
                  </div>
                  <p className="text-3xl font-black text-white">{userProfile?.likedCategoryIds?.length || 0}</p>
                  <p className="text-[11px] text-zinc-400 font-medium">Saved reference topics & tags</p>
                </button>
              </div>

              {/* Liked Videos Grid */}
              {savedSubTab === 'liked' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Heart className="h-5 w-5 text-rose-400 fill-rose-400" />
                      Recently Liked Clips
                    </h3>
                    <span className="text-xs text-zinc-400 font-mono">{userProfile?.likedVideoIds?.length || 0} clips</span>
                  </div>

                  {likedVideosLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : likedVideos.length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-zinc-900/30">
                      <Heart className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-zinc-300">No liked clips yet</h3>
                      <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">Like reference clips while browsing to save them here for quick access.</p>
                      <Button asChild className="mt-4 bg-primary hover:bg-primary/90 text-white font-semibold">
                        <Link href="/home">Browse References</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {likedVideos.map(v => <VideoCard key={v.id} video={v} />)}
                    </div>
                  )}
                </div>
              )}

              {/* Saved / Bookmarked Videos Grid */}
              {savedSubTab === 'saved' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Bookmark className="h-5 w-5 text-amber-400 fill-amber-400" />
                      Saved for Later
                    </h3>
                    <span className="text-xs text-zinc-400 font-mono">{userProfile?.savedVideoIds?.length || 0} clips</span>
                  </div>

                  {savedVideos.length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-zinc-900/30">
                      <Bookmark className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-zinc-300">No saved clips yet</h3>
                      <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">Bookmark reference clips to save them for later study.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {savedVideos.map(v => <VideoCard key={v.id} video={v} />)}
                    </div>
                  )}
                </div>
              )}

              {/* Liked Categories */}
              {savedSubTab === 'categories' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Layers className="h-5 w-5 text-cyan-400" />
                      Liked Categories & Topics
                    </h3>
                  </div>

                  {(userProfile?.likedCategoryIds?.length || 0) === 0 ? (
                    <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-zinc-900/30">
                      <Layers className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-zinc-300">No liked categories yet</h3>
                      <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">Like categories while browsing to quick-access them here.</p>
                      <Button asChild className="mt-4 bg-primary hover:bg-primary/90 text-white font-semibold">
                        <Link href="/categories">Browse Categories</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {userProfile?.likedCategoryIds?.map((catId: string) => (
                        <Link key={catId} href={`/categories?category=${catId}`} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-all space-y-1 text-left">
                          <Layers className="h-5 w-5 text-cyan-400 mb-2" />
                          <h4 className="text-sm font-bold text-white capitalize">{catId.replace(/-/g, ' ')}</h4>
                          <p className="text-[10px] text-zinc-400">Saved reference category</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Subscription & ArtStation Pro Monetization */}
            <TabsContent value="subscription" className="space-y-6">
              <Card className="bg-zinc-900 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Subscription & Creator Monetization</span>
                    <Badge variant="outline" className="bg-purple-950/60 text-purple-300 border-purple-800/40 text-xs font-mono">
                      ARTSTATION PRO MODEL
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Posting portfolio & WIP shots is 100% free for all animators. Pro unlocks custom domains, digital storefronts, and studio recruiter visibility.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl bg-zinc-950/80 border border-purple-500/30">
                    <div>
                      <p className="font-bold text-white text-base">
                        Current Status: <span className={userProfile?.isPremium ? "text-purple-400 font-black" : "text-emerald-400 font-bold"}>
                          {userProfile?.isPremium ? (
                            userProfile?.tier === 'tier5' ? 'Anim.works Pro ($5/mo)' :
                            `Supporter (${userProfile?.tier})`
                          ) : 'Free Artist Account ($0/mo)'}
                        </span>
                      </p>
                      <p className="text-zinc-400 text-xs mt-1">
                        {!userProfile?.isPremium ? 'All portfolio posting & WIP tracking features are unlocked for free.' : 'Thank you for supporting the platform!'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="default" onClick={() => setShowDonateDialog(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold">
                        <CreditCard className="mr-2 h-4 w-4" />
                        {userProfile?.isPremium ? 'Manage Pro Plan' : 'Upgrade to Pro ($5/mo)'}
                      </Button>
                      
                      {userProfile?.isPremium && (
                        <Button variant="secondary" onClick={handlePortal} disabled={isPortalLoading} className="bg-white/10 hover:bg-white/20 text-white border-0">
                          {isPortalLoading ? 'Loading...' : 'Stripe Portal'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Plan Feature Comparison Table (ArtStation Style) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Free Plan Box */}
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                      <div className="space-y-1">
                        <span className="text-xs font-mono font-bold text-emerald-400 uppercase">FREE FOREVER</span>
                        <h4 className="text-xl font-black text-white">Artist Free Tier</h4>
                        <p className="text-xs text-zinc-400">Everything needed to host your work and connect with the community.</p>
                      </div>

                      <ul className="space-y-2 text-xs font-medium text-zinc-300">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>Unlimited 4K Animation & WIP Shot Hosting</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>Blocking, Splining, & Polish Stage Badges</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>Community Feed Exposure & Showreel Embeds</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>Custom Profile Link (anim.works/u/username)</span>
                        </li>
                      </ul>
                    </div>

                    {/* Pro Plan Box */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/60 via-zinc-950 to-black border border-purple-500/40 space-y-4 shadow-xl">
                      <div className="space-y-1">
                        <span className="text-xs font-mono font-bold text-amber-400 uppercase">PRO MONETIZATION ($5/MO)</span>
                        <h4 className="text-xl font-black text-white flex items-center gap-2">
                          <span>ArtStation Pro Suite</span>
                          <Sparkles className="h-4 w-4 text-amber-400" />
                        </h4>
                        <p className="text-xs text-zinc-300">Monetize your rigs, assets, and get recruiter priority.</p>
                      </div>

                      <ul className="space-y-2 text-xs font-medium text-zinc-200">
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                          <span><strong>Custom Domain:</strong> yourname.anim.works website</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                          <span><strong>Digital Storefront:</strong> Sell Maya/Blender Rigs & Pickers (Keep 95%)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                          <span><strong>Recruiter Priority:</strong> Highlighted "Open for Work" Recruiter Banner</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                          <span><strong>Password Protected Reels:</strong> Private client review links</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                          <span><strong>Studio Analytics:</strong> Recruiter view counts & showreel watch data</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      {authUser && (
        <>
          <UploadPortfolioItemModal
            open={isUploadOpen}
            onOpenChange={setIsUploadOpen}
            userId={authUser?.uid || ''}
            authorName={userProfile?.displayName || authUser?.displayName || 'Animator'}
            authorAvatar={userProfile?.photoURL || authUser?.photoURL || undefined}
            onItemCreated={handleItemCreated}
          />
          <EditPortfolioItemModal
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            item={editingItem}
            currentUserId={authUser?.uid || ''}
            onItemUpdated={handleItemUpdated}
          />
          <PortfolioFounderDealModal
            open={isFounderDealOpen}
            onOpenChange={setIsFounderDealOpen}
            onProceedFree={() => setIsUploadOpen(true)}
          />
          <ReelStudioModal
            open={isReelStudioOpen}
            onOpenChange={setIsReelStudioOpen}
            availableItems={portfolioItems}
            onReelPublished={(publishedItems) => {
              setPortfolioItems(publishedItems);
            }}
          />
        </>
      )}

      <EditProfileModal
        open={isEditProfileOpen}
        onOpenChange={setIsEditProfileOpen}
        userProfile={userProfile}
        onProfileUpdated={async () => {
          mutate();
        }}
      />

      <PortfolioItemDetailModal
        item={selectedItem}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        currentUserId={authUser?.uid}
        onItemDeleted={handleItemDeleted}
      />

      <UsernameSetupModal
        open={isUsernameSetupOpen}
        onOpenChange={setIsUsernameSetupOpen}
        userProfile={userProfile}
        onUsernameSet={async () => {
          mutate();
        }}
      />

      <DonateDialog open={showDonateDialog} onOpenChange={setShowDonateDialog} />

      <footer className="w-full px-4 md:px-8 lg:px-12 mt-16 border-t border-white/5 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
          <span>© 2025 AnimationReference.org</span>
          <Link href="/terms" className="hover:text-zinc-400 transition-colors">
            Terms of Service
          </Link>
        </div>
      </footer>
    </main>
  );
}
