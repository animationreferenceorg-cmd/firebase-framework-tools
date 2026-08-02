"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { updateUserProfileData } from '@/lib/portfolio-service';
import type { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { User, Camera, Upload, Briefcase, Globe, Youtube, Video, Twitter, Instagram, Sparkles, Palette, Link as LinkIcon, Check } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
  onProfileUpdated: () => void;
}

export const PRESET_PATTERNS = [
  { id: 'obsidian_grid', label: 'Cybernetic Grid', icon: '🌐' },
  { id: 'studio_dots', label: 'Dot Matrix', icon: '✨' },
  { id: 'violet_nebula', label: 'Violet Nebula', icon: '🌌' },
  { id: 'blueprint_mesh', label: 'Blueprint Mesh', icon: '📐' },
  { id: 'emerald_glow', label: 'Emerald Matrix', icon: '🟢' },
  { id: 'minimal_pitch', label: 'Pitch Black', icon: '⬛' },
];

export const PRESET_CARD_TINTS = [
  { id: 'glass_purple', label: 'Violet Glass', color: 'bg-purple-950/80 border-purple-500/40 text-purple-300' },
  { id: 'glass_obsidian', label: 'Obsidian Dark', color: 'bg-zinc-900/90 border-white/20 text-zinc-200' },
  { id: 'glass_emerald', label: 'Emerald Studio', color: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' },
  { id: 'glass_cyan', label: 'Cyber Cyan', color: 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300' },
  { id: 'glass_gold', label: 'Amber Gold', color: 'bg-amber-950/80 border-amber-500/40 text-amber-300' },
];

export const PRESET_AVATAR_GLOWS = [
  { id: 'none', label: 'No Glow', color: 'bg-zinc-800 border-zinc-700 text-zinc-300' },
  { id: 'violet', label: 'Violet Glow', color: 'bg-purple-950/80 border-purple-500/60 text-purple-300' },
  { id: 'emerald', label: 'Emerald Glow', color: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300' },
  { id: 'cyan', label: 'Cyber Cyan', color: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300' },
  { id: 'amber', label: 'Solar Gold', color: 'bg-amber-950/80 border-amber-500/60 text-amber-300' },
  { id: 'rose', label: 'Neon Rose', color: 'bg-rose-950/80 border-rose-500/60 text-rose-300' },
];

export const CANVA_COLOR_PALETTES = [
  {
    category: 'Studio Dark Classics',
    colors: [
      { hex: '#09090b', label: 'Obsidian Black' },
      { hex: '#000000', label: 'Pitch Black' },
      { hex: '#121216', label: 'Charcoal Grey' },
      { hex: '#0a0f1d', label: 'Midnight Blue' },
      { hex: '#10091d', label: 'Deep Violet' },
      { hex: '#06140e', label: 'Forest Emerald' },
    ]
  },
  {
    category: 'Cinematic & Cyber',
    colors: [
      { hex: '#07191e', label: 'Cyber Teal' },
      { hex: '#1a090d', label: 'Crimson Wine' },
      { hex: '#181005', label: 'Sunset Amber' },
      { hex: '#0b0e26', label: 'Deep Indigo' },
      { hex: '#170a19', label: 'Deep Plum' },
      { hex: '#0f172a', label: 'Nordic Slate' },
    ]
  },
  {
    category: 'Warm Studio Tones',
    colors: [
      { hex: '#140f0c', label: 'Mocha Espresso' },
      { hex: '#1c100c', label: 'Warm Terracotta' },
      { hex: '#0e140d', label: 'Olive Sage' },
      { hex: '#18181b', label: 'Studio Zinc' },
      { hex: '#0c1222', label: 'Space Navy' },
      { hex: '#130a21', label: 'Royal Velvet' },
    ]
  }
];

export const PRESET_BANNERS = [
  { label: 'Cyber Studio', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80' },
  { label: 'Neon Abstract', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80' },
  { label: 'Dark Nebula', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80' },
  { label: 'Sunset Skyline', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80' },
  { label: 'Minimal Grid', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1920&q=80' },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  open,
  onOpenChange,
  userProfile,
  onProfileUpdated,
}) => {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'links'>('profile');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [profilePattern, setProfilePattern] = useState('obsidian_grid');
  const [profileBgColor, setProfileBgColor] = useState('#09090b');
  const [profileCardTint, setProfileCardTint] = useState('glass_purple');
  const [avatarGlow, setAvatarGlow] = useState('none');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [artstationUrl, setArtstationUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  useEffect(() => {
    if (userProfile) {
      const initialName = userProfile.displayName || auth.currentUser?.displayName || '';
      const initialUsername = userProfile.username || initialName.toLowerCase().replace(/[^a-z0-9_]/g, '') || auth.currentUser?.uid || '';
      setDisplayName(initialName);
      setUsername(initialUsername);
      setHeadline(userProfile.headline || '');
      setBio(userProfile.bio || '');
      setBannerUrl(userProfile.bannerUrl || '');
      setProfilePattern(userProfile.profilePattern || 'obsidian_grid');
      setProfileBgColor(userProfile.profileBgColor || '#09090b');
      setProfileCardTint(userProfile.profileCardTint || 'glass_purple');
      setAvatarGlow(userProfile.avatarGlow || 'none');
      setWebsiteUrl(userProfile.websiteUrl || '');
      setArtstationUrl(userProfile.artstationUrl || '');
      setYoutubeUrl(userProfile.youtubeUrl || '');
      setVimeoUrl(userProfile.vimeoUrl || '');
      setTwitterUrl(userProfile.twitterUrl || '');
      setInstagramUrl(userProfile.instagramUrl || '');
    }
  }, [userProfile, open]);

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBannerUrl(event.target.result as string);
        toast({ title: 'Banner Photo Attached', description: 'Click "Save Changes" to publish your new cover banner.' });
      }
      setIsUploadingBanner(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSaving(true);
    try {
      if (displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }

      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

      const updatedData = {
        displayName,
        username: cleanUsername,
        headline: headline.trim(),
        bio: bio.trim(),
        bannerUrl: bannerUrl.trim(),
        profilePattern,
        profileBgColor,
        profileCardTint,
        avatarGlow,
        websiteUrl: websiteUrl.trim(),
        artstationUrl: artstationUrl.trim(),
        youtubeUrl: youtubeUrl.trim(),
        vimeoUrl: vimeoUrl.trim(),
        twitterUrl: twitterUrl.trim(),
        instagramUrl: instagramUrl.trim(),
      };

      await updateUserProfileData(auth.currentUser.uid, updatedData);

      try {
        const storageKey = `user_profile_${auth.currentUser.uid}`;
        const existingStr = localStorage.getItem(storageKey);
        const existing = existingStr ? JSON.parse(existingStr) : {};
        localStorage.setItem(storageKey, JSON.stringify({ ...existing, ...updatedData }));
      } catch (e) {}

      toast({ title: 'Profile Saved!', description: 'Your animator profile and theme settings have been updated.' });
      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/10 text-white p-0 rounded-3xl shadow-2xl">
        <form onSubmit={handleSave} className="space-y-0">
          {/* Instagram Style Top Header Banner & Avatar Quick Preview */}
          <div className="relative h-32 w-full bg-zinc-900 overflow-hidden border-b border-white/10">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-950 via-zinc-900 to-indigo-950" />
            )}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

            {/* Quick Header Overlay */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-white shadow-lg bg-zinc-900">
                  <AvatarImage src={auth.currentUser?.photoURL || undefined} alt={displayName} />
                  <AvatarFallback className="bg-purple-600 text-white font-bold">
                    {displayName ? displayName.charAt(0).toUpperCase() : 'A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-extrabold text-sm text-white drop-shadow-md">{displayName || 'Animator'}</h3>
                  <p className="text-[11px] text-zinc-300 font-mono drop-shadow-sm">@{username || 'animator'}</p>
                </div>
              </div>

              <Label
                htmlFor="header-banner-file-input"
                className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white font-bold text-xs cursor-pointer shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all hover:scale-105"
              >
                <Camera className="h-3.5 w-3.5 text-purple-400" /> Change Photo
              </Label>
              <input
                id="header-banner-file-input"
                type="file"
                accept="image/*"
                onChange={handleBannerFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Instagram Style Segmented Tab Navigation Bar */}
          <div className="px-6 pt-4 pb-2 border-b border-white/10 bg-zinc-950/80 sticky top-0 z-20 backdrop-blur-md flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="bg-zinc-900 border border-white/10 p-1 w-full grid grid-cols-3 rounded-2xl">
                <TabsTrigger
                  value="profile"
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs font-bold gap-1.5 rounded-xl transition-all"
                >
                  <User className="h-3.5 w-3.5" /> Profile Info
                </TabsTrigger>
                <TabsTrigger
                  value="appearance"
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs font-bold gap-1.5 rounded-xl transition-all"
                >
                  <Palette className="h-3.5 w-3.5" /> Banner & Theme
                </TabsTrigger>
                <TabsTrigger
                  value="links"
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs font-bold gap-1.5 rounded-xl transition-all"
                >
                  <LinkIcon className="h-3.5 w-3.5" /> Links & Social
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tab Content Panels */}
          <div className="p-6 space-y-6">
            {/* TAB 1: PROFILE INFO */}
            {activeTab === 'profile' && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* Display Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Name / Studio Handle"
                    className="bg-zinc-900/80 border-white/10 text-white text-sm h-11 focus-within:ring-2 focus-within:ring-purple-500 rounded-xl"
                  />
                </div>

                {/* Custom Portfolio Username Slug */}
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                    <span>Portfolio Username URL Slug</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      animationreference.org/{username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || 'username'}
                    </span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-zinc-500 font-mono text-xs select-none">/</span>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="username"
                      className="bg-zinc-900/80 border-white/10 text-white text-sm h-11 pl-7 focus-within:ring-2 focus-within:ring-purple-500 rounded-xl font-mono"
                    />
                  </div>
                </div>

                {/* Professional Headline */}
                <div className="space-y-1.5">
                  <Label htmlFor="headline" className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
                    <span>Professional Headline</span>
                    <span className="text-[10px] text-zinc-500 font-normal">e.g. Senior 3D Character Animator @ Studio</span>
                  </Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Senior 3D Animator | Creature Specialist"
                    className="bg-zinc-900/80 border-white/10 text-white text-sm h-11 focus-within:ring-2 focus-within:ring-purple-500 rounded-xl"
                  />
                </div>

                {/* Bio & Character Counter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bio" className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Bio & Recruiter Intro
                    </Label>
                    <span className={cn("text-[11px] font-mono", bio.length > 250 ? "text-amber-400" : "text-zinc-500")}>
                      {bio.length}/300
                    </span>
                  </div>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 300))}
                    placeholder="Tell recruiters and directors about your animation experience, software workflow, and availability for contract work..."
                    rows={4}
                    className="bg-zinc-900/80 border-white/10 text-white text-sm focus-within:ring-2 focus-within:ring-purple-500 rounded-xl resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: BANNER & THEME */}
            {activeTab === 'appearance' && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                {/* Banner Photo Section */}
                <div className="space-y-3 bg-zinc-900/60 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Camera className="h-4 w-4" /> Custom Cover Banner Photo
                    </Label>
                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => setBannerUrl('')}
                        className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
                      >
                        Reset to Default
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Label
                      htmlFor="tab-banner-file-input"
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <Upload className="h-4 w-4" /> Upload Cover Photo
                    </Label>
                    <Input
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="Or paste banner image URL (https://...)"
                      className="bg-zinc-950 border-white/10 text-white text-xs flex-1 h-9 rounded-xl"
                    />
                  </div>

                  <input
                    id="tab-banner-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileUpload}
                    className="hidden"
                  />

                  {/* 1-Tap Banner Presets */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-zinc-400">1-Tap Preset Studio Banners:</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_BANNERS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setBannerUrl(preset.url)}
                          className={cn(
                            "px-3 py-1 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer",
                            bannerUrl === preset.url
                              ? "bg-purple-950 border-purple-500 text-purple-200 font-bold ring-1 ring-purple-400"
                              : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Canva Background Color Palettes */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
                    <span>🎨 Background Color Palette</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={profileBgColor}
                        onChange={(e) => setProfileBgColor(e.target.value)}
                        className="h-6 w-8 p-0.5 bg-zinc-900 border-white/10 cursor-pointer rounded shrink-0"
                      />
                      <span className="text-[10px] text-zinc-400 font-mono">{profileBgColor}</span>
                    </div>
                  </Label>

                  <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-2xl border border-white/10">
                    {CANVA_COLOR_PALETTES.map((group) => (
                      <div key={group.category} className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-zinc-400 tracking-wide">{group.category}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {group.colors.map((c) => {
                            const isSelected = profileBgColor.toLowerCase() === c.hex.toLowerCase();
                            return (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => setProfileBgColor(c.hex)}
                                title={`${c.label} (${c.hex})`}
                                style={{ backgroundColor: c.hex }}
                                className={cn(
                                  "h-7 w-7 rounded-full border border-white/20 transition-all cursor-pointer shadow-sm relative group/swatch",
                                  isSelected ? "ring-2 ring-purple-400 scale-110 border-white" : "hover:scale-105 opacity-90 hover:opacity-100"
                                )}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Background Pattern Selector */}
                <div className="space-y-2 pt-1 border-t border-white/10">
                  <Label className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Background Mesh Pattern
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESET_PATTERNS.map((pattern) => {
                      const isSelected = profilePattern === pattern.id;
                      return (
                        <button
                          key={pattern.id}
                          type="button"
                          onClick={() => setProfilePattern(pattern.id)}
                          className={cn(
                            "p-2.5 rounded-xl text-left transition-all border text-xs flex items-center gap-2 cursor-pointer",
                            isSelected
                              ? "bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/40 text-white font-bold shadow-md"
                              : "bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          )}
                        >
                          <span className="text-base">{pattern.icon}</span>
                          <span className="truncate">{pattern.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Profile Picture Glow Color */}
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Profile Picture Glow Ring
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESET_AVATAR_GLOWS.map((glow) => {
                      const isSelected = avatarGlow === glow.id;
                      return (
                        <button
                          key={glow.id}
                          type="button"
                          onClick={() => setAvatarGlow(glow.id)}
                          className={cn(
                            "p-2 rounded-xl text-left transition-all border text-xs truncate cursor-pointer font-bold",
                            glow.color,
                            isSelected ? "ring-2 ring-white scale-105 shadow-lg" : "opacity-70 hover:opacity-100"
                          )}
                        >
                          {glow.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LINKS & SOCIAL */}
            {activeTab === 'links' && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="text-xs text-zinc-400 pb-1">
                  Add your portfolio channels and social profiles so studio recruiters can review your full demo reel catalog.
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="artstation" className="text-xs text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Globe className="h-4 w-4 text-blue-400" /> ArtStation Portfolio URL
                    </Label>
                    <Input
                      id="artstation"
                      value={artstationUrl}
                      onChange={(e) => setArtstationUrl(e.target.value)}
                      placeholder="https://artstation.com/username"
                      className="bg-zinc-900/80 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="youtube" className="text-xs text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Youtube className="h-4 w-4 text-red-500" /> YouTube Channel / Reel URL
                    </Label>
                    <Input
                      id="youtube"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/@channel"
                      className="bg-zinc-900/80 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="vimeo" className="text-xs text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Video className="h-4 w-4 text-sky-400" /> Vimeo Demo Reel URL
                    </Label>
                    <Input
                      id="vimeo"
                      value={vimeoUrl}
                      onChange={(e) => setVimeoUrl(e.target.value)}
                      placeholder="https://vimeo.com/username"
                      className="bg-zinc-900/80 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="twitter" className="text-xs text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Twitter className="h-4 w-4 text-sky-500" /> Twitter / X URL
                    </Label>
                    <Input
                      id="twitter"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://x.com/username"
                      className="bg-zinc-900/80 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="instagram" className="text-xs text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Instagram className="h-4 w-4 text-pink-500" /> Instagram URL
                    </Label>
                    <Input
                      id="instagram"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/username"
                      className="bg-zinc-900/80 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="website" className="text-xs text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Globe className="h-4 w-4 text-emerald-400" /> Personal Website / Custom Portfolio
                    </Label>
                    <Input
                      id="website"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://myportfolio.com"
                      className="bg-zinc-900/80 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instagram Style Sticky Footer Action Bar */}
          <DialogFooter className="p-4 border-t border-white/10 bg-zinc-950/90 flex items-center justify-between sm:justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSaving}
              className="px-6 h-11 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-600/30 gap-2 cursor-pointer transition-all hover:scale-105"
            >
              {isSaving ? (
                'Saving Profile...'
              ) : (
                <>
                  <Check className="h-4 w-4" /> Save Profile Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
