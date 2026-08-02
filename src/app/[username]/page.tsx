"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getUserProfileByUsernameOrId } from '@/lib/firestore';
import { getUserPortfolioItems, deletePortfolioItem } from '@/lib/portfolio-service';
import type { UserProfile, PortfolioItem, WipStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PortfolioItemCard } from '@/components/portfolio/PortfolioItemCard';
import { PortfolioHeroBanner } from '@/components/portfolio/PortfolioHeroBanner';
import { PortfolioItemDetailModal } from '@/components/portfolio/PortfolioItemDetailModal';
import { EditPortfolioItemModal } from '@/components/portfolio/EditPortfolioItemModal';
import { useToast } from '@/hooks/use-toast';
import { 
  Globe, 
  Youtube, 
  Video, 
  Twitter, 
  Instagram, 
  Briefcase, 
  Layers, 
  Sparkles, 
  Share2, 
  Film,
  ShieldCheck,
  Mail
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

export default function UsernamePublicProfilePage() {
  const params = useParams();
  const rawUsername = params?.username as string;
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'all' | 'portfolio' | 'wip'>('all');
  const [selectedWipStage, setSelectedWipStage] = useState<WipStage | 'all'>('all');

  // Detail Modal
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (!rawUsername) return;

    let isMounted = true;

    async function loadData() {
      if (isMounted) setLoading(true);
      try {
        let profData = await getUserProfileByUsernameOrId(rawUsername);

        // Fallback for current user profile if Firestore doc isn't written yet
        if (!profData && auth.currentUser) {
          try {
            const localStr = localStorage.getItem(`user_profile_${auth.currentUser.uid}`);
            if (localStr) {
              const parsed = JSON.parse(localStr);
              profData = { uid: auth.currentUser.uid, email: auth.currentUser.email, photoURL: auth.currentUser.photoURL, role: 'user', displayName: auth.currentUser.displayName, ...parsed };
            } else {
              profData = { uid: auth.currentUser.uid, email: auth.currentUser.email, photoURL: auth.currentUser.photoURL, role: 'user', displayName: auth.currentUser.displayName || 'Animator', username: rawUsername };
            }
          } catch (e) {}
        }

        if (!isMounted) return;
        setProfile(profData);

        const targetUid = profData?.uid || (auth.currentUser ? auth.currentUser.uid : rawUsername);

        // Fetch items by targetUid and rawUsername
        const [itemsByUid, itemsByUsername] = await Promise.all([
          getUserPortfolioItems(targetUid),
          getUserPortfolioItems(rawUsername)
        ]);

        const combined = [...itemsByUid, ...itemsByUsername];
        const map = new Map<string, PortfolioItem>();
        combined.forEach((item) => item?.id && map.set(item.id, item));

        if (isMounted) {
          setItems(Array.from(map.values()));
        }
      } catch (error) {
        console.error("Error loading animator profile data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    // Listen for auth state initialization in new tab
    const unsubscribe = auth.onAuthStateChanged(() => {
      if (isMounted) loadData();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [rawUsername]);

  const handleShare = () => {
    const slug = profile?.username || profile?.uid || rawUsername;
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Portfolio Link Copied!",
      description: "Direct profile link copied to clipboard.",
    });
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'portfolio' && item.type !== 'portfolio') return false;
    if (activeTab === 'wip' && item.type !== 'wip') return false;
    if (activeTab === 'wip' && selectedWipStage !== 'all' && item.wipStage !== selectedWipStage) return false;
    return true;
  });

  const portfolioCount = items.filter((i) => i.type === 'portfolio').length;
  const wipCount = items.filter((i) => i.type === 'wip').length;

  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleItemUpdated = (updatedItem: PortfolioItem) => {
    setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem);
    }
  };

  const handleDeleteItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this post?")) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      if (auth.currentUser) {
        await deletePortfolioItem(itemId, auth.currentUser.uid);
      }
      toast({ title: 'Post Deleted', description: 'Item has been removed.' });
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white pt-24 pb-20 px-4 md:px-8">
        <div className="max-w-[1700px] mx-auto space-y-6">
          <Skeleton className="h-96 w-full rounded-3xl bg-zinc-900" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-2xl bg-zinc-900" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const displayName = profile?.username || profile?.displayName || items[0]?.authorName || rawUsername;
  const avatarUrl = profile?.photoURL || items[0]?.authorAvatar;
  const activePatternClass = PATTERN_CLASSES[profile?.profilePattern || 'obsidian_grid'] || PATTERN_CLASSES.obsidian_grid;
  const activeCardTintClass = CARD_TINT_CLASSES[profile?.profileCardTint || 'glass_purple'] || CARD_TINT_CLASSES.glass_purple;
  const activeAvatarGlowClass = AVATAR_GLOW_CLASSES[profile?.avatarGlow || 'none'] || AVATAR_GLOW_CLASSES.none;
  const bgColor = profile?.profileBgColor || '#09090b';

  return (
    <main
      className={cn("min-h-screen text-white pb-20 relative transition-colors duration-500", activePatternClass)}
      style={{ backgroundColor: bgColor }}
    >
      {/* ArtStation & Recruiter Style Custom Cover Banner - Stretches from Top to Bottom of Profile Card */}
      <div
        className="absolute top-0 inset-x-0 h-[700px] md:h-[780px] w-full overflow-hidden group pointer-events-none z-0"
        style={{
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.6) 82%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.6) 82%, rgba(0,0,0,0) 100%)',
        }}
      >
        {profile?.bannerUrl ? (
          <img
            src={profile.bannerUrl}
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

      <div className="max-w-[1700px] mx-auto px-4 md:px-8 pt-28 md:pt-36 relative z-20">
        {/* Recruiter Profile Glassmorphism Card */}
        <div className={cn("p-6 md:p-8 rounded-3xl relative overflow-hidden space-y-6 border transition-all duration-500 group/card", activeCardTintClass)}>
          {/* Inner Gloss Sheen & Specular Highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30 pointer-events-none rounded-3xl" />
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Left: Avatar & Professional Bio */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className={cn("h-28 w-28 md:h-36 md:w-36 transition-all duration-300 shrink-0", activeAvatarGlowClass)}>
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="text-3xl font-black bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                {/* Name & Availability Pill */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">{displayName}</h1>
                  
                  {/* Recruiter Availability Badge */}
                  <div className="px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold shadow-md flex items-center gap-1.5 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Available for Hire & Studio Contracts</span>
                  </div>

                  {profile?.role === 'admin' && (
                    <Badge variant="default" className="bg-primary/80 text-white text-xs">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Admin
                    </Badge>
                  )}
                  {profile?.isPremium && (
                    <Badge variant="outline" className="bg-purple-950/80 text-purple-300 border-purple-500/40 text-xs font-semibold">
                      Pro Animator
                    </Badge>
                  )}
                </div>

                {/* Social & Professional Links Bar - Directly Below Name */}
                <div className="flex flex-wrap gap-2 py-1 items-center">
                  {profile?.artstationUrl && (
                    <a href={profile.artstationUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-blue-400/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-400" /> ArtStation
                    </a>
                  )}
                  {profile?.youtubeUrl && (
                    <a href={profile.youtubeUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-red-500/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Youtube className="h-3.5 w-3.5 text-red-500" /> YouTube
                    </a>
                  )}
                  {profile?.vimeoUrl && (
                    <a href={profile.vimeoUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-sky-400/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-sky-400" /> Vimeo
                    </a>
                  )}
                  {profile?.twitterUrl && (
                    <a href={profile.twitterUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-sky-500/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Twitter className="h-3.5 w-3.5 text-sky-500" /> Twitter / X
                    </a>
                  )}
                  {profile?.instagramUrl && (
                    <a href={profile.instagramUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-pink-500/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram
                    </a>
                  )}
                  {profile?.websiteUrl && (
                    <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-emerald-400/50 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-emerald-400" /> Website
                    </a>
                  )}
                </div>

                {/* Professional Headline */}
                {profile?.headline && (
                  <p className="text-sm md:text-base font-bold text-purple-300 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>{profile.headline}</span>
                  </p>
                )}

                {/* Bio */}
                {profile?.bio && (
                  <p className="text-xs md:text-sm text-zinc-300 max-w-3xl leading-relaxed font-normal">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Right Actions & Recruitment Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              {profile?.websiteUrl || profile?.twitterUrl ? (
                <a
                  href={profile.websiteUrl || profile.twitterUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Mail className="h-4 w-4" /> Contact / Recruit Animator
                </a>
              ) : null}

              <Button onClick={handleShare} variant="outline" className="border-white/15 text-zinc-200 hover:bg-white/10 font-bold text-xs gap-2">
                <Share2 className="h-4 w-4" /> Share Portfolio Link
              </Button>
            </div>
          </div>
        </div>

        {/* Portfolio / WIP Showcase Navigation */}
        <div className="mt-8 space-y-6">
          <PortfolioHeroBanner
            items={items}
            isOwner={false}
            onCardClick={(item) => {
              setSelectedItem(item);
              setIsDetailOpen(true);
            }}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-auto">
              <TabsList className="bg-zinc-900 border border-white/10">
                <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  All Works ({items.length})
                </TabsTrigger>
                <TabsTrigger value="portfolio" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  Portfolio ({portfolioCount})
                </TabsTrigger>
                <TabsTrigger value="wip" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Layers className="h-3.5 w-3.5 mr-1 text-amber-400" />
                  WIPs ({wipCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* WIP Stage Pills Filter */}
            {activeTab === 'wip' && (
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

          {/* Grid Display */}
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-zinc-900/30">
              <Film className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-zinc-300">No animation pieces found</h3>
              <p className="text-xs text-zinc-500 mt-1">This user hasn't posted any items matching this filter yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
              {filteredItems.map((item) => (
                <PortfolioItemCard
                  key={item.id}
                  item={item}
                  onClick={() => {
                    setSelectedItem(item);
                    setIsDetailOpen(true);
                  }}
                  onEdit={auth.currentUser && (auth.currentUser.uid === item.userId || auth.currentUser.uid === profile?.uid) ? (e) => {
                    e.stopPropagation();
                    setEditingItem(item);
                    setIsEditOpen(true);
                  } : undefined}
                  onDelete={auth.currentUser && (auth.currentUser.uid === item.userId || auth.currentUser.uid === profile?.uid) ? (e) => handleDeleteItem(item.id, e) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Item Detail Modal */}
      <PortfolioItemDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        item={selectedItem}
        currentUserId={auth.currentUser?.uid}
        onItemDeleted={(itemId) => setItems((prev) => prev.filter((i) => i.id !== itemId))}
      />

      {/* Edit Item Modal */}
      <EditPortfolioItemModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        item={editingItem}
        currentUserId={auth.currentUser?.uid || ''}
        onItemUpdated={handleItemUpdated}
      />
    </main>
  );
}
