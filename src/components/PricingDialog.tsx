'use client';

import React, { useState } from 'react';
import { 
    Check, Sparkles, Zap, ShieldCheck, Video, HelpCircle, 
    Layers, ArrowRight, Film, Sliders, Presentation, MonitorPlay, Users 
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useDonate } from '@/hooks/use-donate';
import { useUser } from '@/hooks/use-user';

export interface PricingDialogProps {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    forceTimer?: boolean;
}

export function PricingDialog({ children, open, onOpenChange }: PricingDialogProps) {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

    const { handleDonate, isCheckingOut } = useDonate();
    const { userProfile } = useUser();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPortalLoading, setIsPortalLoading] = useState(false);

    const isPremium = userProfile?.isPremium;
    const currentTier = isPremium ? (userProfile?.tier || 'tier5') : 'free';

    // Stripe price map:
    // tier5 corresponds to the Pro tier in backend
    // tier2/tier1 correspond to legacy supporter tiers
    const handlePlanAction = async (targetTier: string, priceId: string) => {
        if (currentTier === targetTier) {
            onOpenChange?.(false);
            return;
        }

        if (isPremium) {
            if (isPortalLoading) return;
            setIsPortalLoading(true);
            try {
                const idToken = await user?.getIdToken();
                const url = new URL(window.location.href);
                url.searchParams.set('sync', 'true');

                const response = await fetch('/api/portal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify({ userId: user?.uid, returnUrl: url.toString() }),
                });
                const data = await response.json();
                if (data.url) {
                    window.location.assign(data.url);
                } else {
                    toast({ title: 'Error', description: data.error || 'Failed to open billing portal', variant: 'destructive' });
                }
            } catch {
                toast({ title: 'Error', description: 'Failed to open billing portal', variant: 'destructive' });
            } finally {
                setIsPortalLoading(false);
            }
        } else {
            handleDonate(priceId);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && (
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
            )}
            <DialogContent 
                className="max-w-5xl w-[96vw] max-h-[92vh] p-0 bg-[#08070e] border border-purple-500/25 text-white flex flex-col z-[9999] shadow-[0_25px_90px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden backdrop-blur-2xl"
            >
                {/* Background glow effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-48 bg-gradient-to-r from-purple-600/15 via-indigo-600/15 to-pink-600/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-10 w-64 h-64 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

                {/* Why Pro Info Popover */}
                <div className="absolute top-4 left-4 z-50">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 gap-1.5 px-3 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white transition-colors border border-purple-500/20 text-xs font-medium"
                            >
                                <HelpCircle className="h-3.5 w-3.5" />
                                <span>Why upgrade?</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="right" className="w-[340px] bg-[#120e24] border-purple-500/30 text-white p-5 shadow-2xl backdrop-blur-2xl rounded-2xl">
                            <h4 className="font-bold text-sm mb-2 text-purple-200 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-400" />
                                Built for Professional Animators
                            </h4>
                            <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
                                Sifting through YouTube, downloading bloated 10-minute clips, and eyeballing timing in VLC wastes 5+ hours every shot crunch.
                            </p>
                            <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-zinc-300">
                                <div className="flex items-center gap-2 text-purple-300">
                                    <Video className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                                    <span>Direct Maya & Blender image plane bridge</span>
                                </div>
                                <div className="flex items-center gap-2 text-purple-300">
                                    <Sliders className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                                    <span>Sync player compares your playblast to reference</span>
                                </div>
                                <div className="flex items-center gap-2 text-purple-300">
                                    <Presentation className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                    <span>1-Click contact sheet strips for PureRef & PDF pitch decks</span>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Scrollable Content Container */}
                <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    {/* Header Banner */}
                    <div className="text-center space-y-2 mt-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-pink-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-semibold tracking-wider uppercase mb-1">
                            <Sparkles className="h-3 w-3 text-purple-400" />
                            Studio-Grade Animation Workflow
                        </div>
                        <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-zinc-300">
                            Upgrade to AnimationReference Pro
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                            Unlock unlimited project moodboards, spatial canvas, unlimited reference bookmarks, and high-resolution exports.
                        </DialogDescription>
                    </div>

                    {/* Billing Cycle Toggle */}
                    <div className="flex items-center justify-center gap-3 pt-1">
                        <div className="inline-flex items-center p-1 rounded-full bg-zinc-900/90 border border-white/10 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setBillingCycle('monthly')}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer",
                                    billingCycle === 'monthly'
                                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                                        : "text-zinc-400 hover:text-white"
                                )}
                            >
                                Monthly Billing
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingCycle('annual')}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
                                    billingCycle === 'annual'
                                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                                        : "text-zinc-400 hover:text-white"
                                )}
                            >
                                <span>Annual Billing</span>
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.2 rounded-full border border-emerald-500/30">
                                    Save 27%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* 3-Tier Pricing Grid (Free vs Pro vs Studio) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl mx-auto items-stretch">
                        
                        {/* 1. FREE FOREVER PLAN */}
                        <div className="relative p-6 rounded-2xl bg-zinc-900/40 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-bold text-zinc-300">Free</h3>
                                    {currentTier === 'free' && (
                                        <span className="text-[10px] font-medium text-zinc-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                            Current Plan
                                        </span>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-white">$0</span>
                                        <span className="text-xs text-zinc-500 font-medium">/ forever</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1">For student exploration and casual reference search</p>
                                </div>

                                <ul className="space-y-2.5 mb-6 text-xs text-zinc-300">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>7,600+ Curated Animation Clips</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>24 FPS Frame-by-Frame Player</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                                        <span>1 Active Project Moodboard</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                                        <span>5 Saved Video Bookmarks</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-zinc-500">
                                        <span className="h-4 w-4 flex items-center justify-center">✕</span>
                                        <span>No Maya / Blender 1-Click Bridge</span>
                                    </li>
                                    <li className="flex items-center gap-2 text-zinc-500">
                                        <span className="h-4 w-4 flex items-center justify-center">✕</span>
                                        <span>No Playblast Sync Player</span>
                                    </li>
                                </ul>
                            </div>

                            <Button 
                                disabled={currentTier === 'free'} 
                                onClick={() => currentTier !== 'free' && onOpenChange?.(false)}
                                className={cn(
                                    "w-full h-10 text-xs font-semibold rounded-xl border transition-all",
                                    currentTier === 'free' 
                                        ? "bg-white/5 text-zinc-400 border-white/5 cursor-default" 
                                        : "bg-white/10 hover:bg-white/20 text-white border-white/10"
                                )}
                            >
                                {currentTier === 'free' ? 'Your Current Plan' : 'Free Tier'}
                            </Button>
                        </div>

                        {/* 2. PRO ANIMATOR HERO PLAN (Most Popular) */}
                        <div className="relative p-6 rounded-2xl bg-gradient-to-b from-purple-950/70 via-purple-900/40 to-black/80 border-2 border-purple-500/70 shadow-[0_0_50px_rgba(168,85,247,0.3)] flex flex-col justify-between transform transition-all hover:border-purple-400">
                            {/* Top Badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white text-[10px] font-black px-3.5 py-0.5 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3" />
                                <span>Most Popular • Animator Pro</span>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3 mt-1">
                                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                                        <span>Pro Animator</span>
                                        <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded-full">
                                            Full Suite
                                        </span>
                                    </h3>
                                    {currentTier === 'tier5' && (
                                        <span className="text-[10px] font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                            Active Plan
                                        </span>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white">
                                            {billingCycle === 'annual' ? '$7' : '$9'}
                                        </span>
                                        <span className="text-xs text-zinc-400 font-medium">/ month</span>
                                    </div>
                                    <p className="text-xs text-purple-200/90 mt-1">
                                        {billingCycle === 'annual' 
                                            ? 'Billed $79/year (Save $29 — 3 months free)' 
                                            : 'Billed monthly, cancel anytime in 1 click'}
                                    </p>
                                </div>

                                <ul className="space-y-2 mb-6 text-xs text-zinc-200">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                                        <span className="font-semibold text-white">Unlimited Project Moodboards & Spatial Canvas</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                                        <span className="font-semibold text-white">Unlimited Reference Bookmarks & Saves</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>High-Resolution Moodboard & PDF Exporter</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Unlimited Portfolio Showcase Posts</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Ad-Free High-Definition Reference Playback</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Priority Community Feed Placement</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Pro Animator Profile Badge & Verification</span>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <Button
                                    onClick={() => handlePlanAction('tier5', 'price_1SFgiq59QHehw05fy017h1gR')}
                                    disabled={isCheckingOut || isPortalLoading || currentTier === 'tier5'}
                                    className={cn(
                                        "w-full h-11 text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2",
                                        currentTier === 'tier5'
                                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-default"
                                            : "bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/30 hover:scale-[1.01]"
                                    )}
                                >
                                    {isCheckingOut || isPortalLoading ? (
                                        'Connecting to Stripe...'
                                    ) : currentTier === 'tier5' ? (
                                        'Current Active Plan'
                                    ) : isPremium ? (
                                        'Switch to Pro'
                                    ) : (
                                        <>
                                            <span>Upgrade to Pro — Instant Access</span>
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                                <p className="text-[10px] text-center text-zinc-400 mt-2">
                                    7-day money back guarantee • Cancel anytime
                                </p>
                            </div>
                        </div>

                        {/* 3. STUDIO / TEAM PLAN */}
                        <div className="relative p-6 rounded-2xl bg-zinc-900/40 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-bold text-zinc-200 flex items-center gap-1.5">
                                        <Users className="h-4 w-4 text-indigo-400" />
                                        <span>Studio & Teams</span>
                                    </h3>
                                    <span className="text-[10px] font-semibold text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                        5 Seats
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-white">
                                            {billingCycle === 'annual' ? '$24' : '$29'}
                                        </span>
                                        <span className="text-xs text-zinc-400 font-medium">/ month</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1">For game studios, VFX houses & creative teams</p>
                                </div>

                                <ul className="space-y-2.5 mb-6 text-xs text-zinc-300">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Everything in Pro for up to 5 team members</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Shared Studio Reference Decks & Boards</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Custom Studio Watermark & PDF Pitch Decks</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Centralized Team Billing & Invoice Receipts</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Priority Animation Reference Requests</span>
                                    </li>
                                </ul>
                            </div>

                            <Button 
                                onClick={() => handlePlanAction('tier5', 'price_1SFgiq59QHehw05fy017h1gR')}
                                disabled={isCheckingOut || isPortalLoading}
                                className="w-full h-10 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer"
                            >
                                Get Studio Plan
                            </Button>
                        </div>

                    </div>

                    {/* Trust & Guarantee Badges */}
                    <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-center gap-6 text-zinc-400 text-xs">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-purple-400" />
                            <span>100% Risk-Free Guarantee</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-yellow-400" />
                            <span>Instant Access to Pro Workflow Tools</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MonitorPlay className="h-4 w-4 text-emerald-400" />
                            <span>Works with Maya, Blender & PureRef</span>
                        </div>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
