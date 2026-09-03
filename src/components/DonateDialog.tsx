'use client';

import { useState } from 'react';
import { X, Check, Sparkles, Zap, ShieldCheck, GraduationCap, Video, HelpCircle, Layers, ArrowRight } from 'lucide-react';
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

interface DonateDialogProps {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    forceTimer?: boolean;
}

export function DonateDialog({ children, open, onOpenChange }: DonateDialogProps) {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [showOtherTiers, setShowOtherTiers] = useState(false);

    const { handleDonate, isCheckingOut } = useDonate();
    const { userProfile } = useUser();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPortalLoading, setIsPortalLoading] = useState(false);

    const isPremium = userProfile?.isPremium;
    const currentTier = isPremium ? (userProfile?.tier || 'tier1') : 'free';

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
                    toast({ title: 'Error', description: data.error || 'Failed to open portal', variant: 'destructive' });
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
                className="max-w-4xl w-[95vw] max-h-[90vh] p-0 bg-[#090714] border border-purple-500/20 text-white flex flex-col z-[9999] shadow-[0_25px_80px_rgba(0,0,0,0.85)] rounded-3xl overflow-hidden backdrop-blur-2xl"
            >
                {/* Background ambient lighting */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-48 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-10 w-48 h-48 bg-pink-600/10 rounded-full blur-[80px] pointer-events-none" />

                {/* Why Pro Info Button - Fixed Position */}
                <div className="absolute top-4 left-4 z-50">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 gap-1.5 px-2.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white transition-colors border border-purple-500/20 text-xs font-medium"
                            >
                                <HelpCircle className="h-3.5 w-3.5" />
                                <span>Why Pro?</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="right" className="w-[340px] bg-[#140f28] border-purple-500/30 text-white p-5 shadow-2xl backdrop-blur-2xl rounded-2xl">
                            <h4 className="font-bold text-base mb-2 text-purple-200 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-400" />
                                Built for Animator Workflows
                            </h4>
                            <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
                                Stop sifting through 10 messy browser tabs and low-res YouTube clips. We capture, tag, and organize high-framerate reference of world-class martial artists, parkour athletes, creature locomotion, and physical stunts so you can hit realistic weight and timing in your shots.
                            </p>
                            <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs text-zinc-300">
                                <div className="flex items-center gap-2 text-purple-300 font-medium">
                                    <Zap className="h-3.5 w-3.5 text-yellow-400" />
                                    Save 5+ hours every shot crunch
                                </div>
                                <div className="flex items-center gap-2 text-purple-300 font-medium">
                                    <Video className="h-3.5 w-3.5 text-pink-400" />
                                    Maya & Blender viewport ready
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Scrollable Content Wrapper */}
                <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-2 mt-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-semibold tracking-wider uppercase mb-1">
                            <Sparkles className="h-3 w-3 text-purple-400" />
                            Animation Pro Studio
                        </div>
                        <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-zinc-300">
                            Master Timing & Weight in Half the Time
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                            Curated body mechanics, frame analysis, video mirroring, and unlimited project boards built specifically for 3D, 2D, and game animators.
                        </DialogDescription>
                    </div>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-3 pt-1">
                        <div className="inline-flex items-center p-1 rounded-full bg-zinc-900/80 border border-white/10">
                            <button
                                type="button"
                                onClick={() => setBillingCycle('monthly')}
                                className={cn(
                                    "px-4 py-1 rounded-full text-xs font-semibold transition-all duration-200",
                                    billingCycle === 'monthly'
                                        ? "bg-purple-600 text-white shadow-md"
                                        : "text-zinc-400 hover:text-white"
                                )}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingCycle('annual')}
                                className={cn(
                                    "px-4 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5",
                                    billingCycle === 'annual'
                                        ? "bg-purple-600 text-white shadow-md"
                                        : "text-zinc-400 hover:text-white"
                                )}
                            >
                                <span>Annual</span>
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                                    Save 20%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Pricing Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto items-stretch">
                        {/* BASIC FREE PLAN */}
                        <div className="relative p-6 rounded-2xl bg-zinc-900/40 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-bold text-zinc-300">Basic</h3>
                                    {currentTier === 'free' && (
                                        <span className="text-[11px] font-medium text-zinc-400 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                                            Current Plan
                                        </span>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-white">Free</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">For casual browsing & student exploration</p>
                                </div>

                                <ul className="space-y-2.5 mb-6 text-xs text-zinc-300">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                                        <span>1 Active Project / Moodboard</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                                        <span>5 Liked Video Bookmarks</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                                        <span>Core Reference Library Search</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                                        <span>3 Public Portfolio Uploads</span>
                                    </li>
                                </ul>
                            </div>

                            <Button 
                                disabled={currentTier === 'free'} 
                                onClick={() => currentTier !== 'free' && onOpenChange?.(false)}
                                className={cn(
                                    "w-full h-10 text-xs font-semibold rounded-xl border transition-all",
                                    currentTier === 'free' 
                                        ? "bg-white/5 text-zinc-500 border-white/5 cursor-default" 
                                        : "bg-white/10 hover:bg-white/20 text-white border-white/10"
                                )}
                            >
                                {currentTier === 'free' ? 'Your Current Tier' : 'Downgrade to Free'}
                            </Button>
                        </div>

                        {/* PRO HERO PLAN */}
                        <div className="relative p-6 rounded-2xl bg-gradient-to-b from-purple-950/60 via-purple-900/30 to-black/60 border-2 border-purple-500/60 shadow-[0_0_40px_rgba(168,85,247,0.25)] flex flex-col justify-between transform transition-all hover:border-purple-400">
                            {/* Top Badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                <span>Most Popular • Animator Grade</span>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3 mt-1">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                                        <span>Pro Animator</span>
                                        <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded-full">
                                            Full Access
                                        </span>
                                    </h3>
                                    {currentTier === 'tier5' && (
                                        <span className="text-[11px] font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                            Active Pro
                                        </span>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white">
                                            {billingCycle === 'annual' ? '$4' : '$5'}
                                        </span>
                                        <span className="text-xs text-zinc-400 font-medium">/ month</span>
                                    </div>
                                    <p className="text-xs text-purple-200/80 mt-1">
                                        {billingCycle === 'annual' 
                                            ? 'Billed $48/year (2 months free)' 
                                            : 'Flexible monthly billing, cancel anytime'}
                                    </p>
                                </div>

                                <ul className="space-y-2.5 mb-6 text-xs text-zinc-200">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0 font-bold" />
                                        <span className="font-semibold text-white">Unlimited Project & Reference Boards</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Frame Stepping & Horizontal Video Mirror (M)</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>60FPS Video Downloads for Maya/Blender</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Unlimited Video Likes & Shot Bookmarks</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span>Recruiter Pro Badge & Portfolio Boost</span>
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
                                            : "bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/30"
                                    )}
                                >
                                    {isCheckingOut || isPortalLoading ? (
                                        'Connecting to Stripe...'
                                    ) : currentTier === 'tier5' ? (
                                        'Current Active Plan'
                                    ) : isPremium ? (
                                        'Switch to Pro Plan'
                                    ) : (
                                        <>
                                            <span>Upgrade to Pro — $5/mo</span>
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                                <p className="text-[11px] text-center text-zinc-400 mt-2">
                                    Instant setup • No contracts • Cancel anytime in 1 click
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Community Backer Tiers Toggle */}
                    <div className="pt-2 text-center">
                        <button
                            type="button"
                            onClick={() => setShowOtherTiers(!showOtherTiers)}
                            className="text-xs text-zinc-400 hover:text-purple-300 transition-colors underline decoration-zinc-600"
                        >
                            {showOtherTiers ? 'Hide other support options' : 'Looking to support with $1 or $2? Click here'}
                        </button>

                        {showOtherTiers && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mt-4 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/40 transition-colors flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-xs text-white">Supporter</span>
                                            <span className="text-xs font-semibold text-blue-300">$1/mo</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 mb-3">3 Boards, 10 Likes, Supporter Badge</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handlePlanAction('tier1', 'price_1SFgUc59QHehw05fROtqwkLN')}
                                        disabled={isCheckingOut || isPortalLoading || currentTier === 'tier1'}
                                        className="w-full text-xs h-8 border-white/10 hover:border-blue-500/50"
                                    >
                                        {currentTier === 'tier1' ? 'Current' : 'Select $1 Tier'}
                                    </Button>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-xs text-white">Super Fan</span>
                                            <span className="text-xs font-semibold text-purple-300">$2/mo</span>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 mb-3">6 Boards, 20 Likes, Priority Support</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handlePlanAction('tier2', 'price_1SFgiV59QHehw05fc0lPRRf7')}
                                        disabled={isCheckingOut || isPortalLoading || currentTier === 'tier2'}
                                        className="w-full text-xs h-8 border-white/10 hover:border-purple-500/50"
                                    >
                                        {currentTier === 'tier2' ? 'Current' : 'Select $2 Tier'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Trust & Friction Reducer Badges */}
                    <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-center gap-6 text-zinc-400 text-xs">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-purple-400" />
                            <span>100% Risk-Free Guarantee</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-yellow-400" />
                            <span>Instant Access to Pro Tools</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-4 w-4 text-emerald-400" />
                            <span>Student .edu VIP Available</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
