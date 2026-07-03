'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from '@/lib/utils';
import { Heart, HelpCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useDonate } from '@/hooks/use-donate';
import { useUser } from '@/hooks/use-user';

import { useRouter } from 'next/navigation';

interface DonateDialogProps {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    forceTimer?: boolean;
}

export function DonateDialog({ children, open, onOpenChange, forceTimer = false }: DonateDialogProps) {
    const [selectedAmount, setSelectedAmount] = useState('1');
    const donationOptions = [
        { amount: '1', label: '$1 / month', priceId: 'price_1SFgUc59QHehw05fROtqwkLN' },
        { amount: '2', label: '$2 / month', priceId: 'price_1SFgiV59QHehw05fc0lPRRf7' },
        { amount: '5', label: '$5 / month', priceId: 'price_1SFgiq59QHehw05fy017h1gR' },
    ];

    const { handleDonate, isCheckingOut } = useDonate();
    const { userProfile } = useUser();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPortalLoading, setIsPortalLoading] = useState(false);

    // Timer Gating logic
    const [seconds, setSeconds] = useState(12);
    const [canClose, setCanClose] = useState(!forceTimer);

    useEffect(() => {
        if (!open || !forceTimer) {
            setSeconds(12);
            setCanClose(!forceTimer);
            return;
        }
        setCanClose(false);
        setSeconds(12);
        const interval = setInterval(() => {
            setSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setCanClose(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [open, forceTimer]);

    const isPremium = userProfile?.isPremium;
    const currentTier = isPremium ? (userProfile?.tier || 'tier1') : 'free';

    const handlePlanAction = async (targetTier: string, priceId: string) => {
        if (currentTier === targetTier) {
            onOpenChange?.(false);
            return;
        }

        if (isPremium) {
            // Already subscribed, send to portal to upgrade/downgrade
            if (isPortalLoading) return;
            setIsPortalLoading(true);
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('sync', 'true');
                
                const response = await fetch('/api/portal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user?.uid, returnUrl: url.toString() }),
                });
                const data = await response.json();
                if (data.url) {
                    window.location.assign(data.url);
                } else {
                    toast({ title: 'Error', description: data.error || 'Failed to open portal', variant: 'destructive' });
                }
            } catch (e: any) {
                toast({ title: 'Error', description: 'Failed to open billing portal', variant: 'destructive' });
            } finally {
                setIsPortalLoading(false);
            }
        } else {
            // New subscription
            handleDonate(priceId);
        }
    };

    const progress = ((12 - seconds) / 12) * 100;

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (forceTimer && !canClose) return;
            onOpenChange?.(val);
        }}>
            {children && (
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
            )}
            <DialogContent 
                onInteractOutside={(e) => {
                    if (forceTimer && !canClose) e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    if (forceTimer && !canClose) e.preventDefault();
                }}
                className={cn(
                    "max-w-5xl w-[95vw] max-h-[85vh] p-0 bg-[#050505] border-white/10 text-white flex flex-col",
                    forceTimer && !canClose && "[&>button]:hidden"
                )}
            >
                {forceTimer && !canClose && (
                    <div className="absolute top-4 right-4 flex items-center space-x-2 z-50 bg-[#050505]/80 py-1.5 px-3 rounded-full border border-white/10 backdrop-blur-md select-none pointer-events-none">
                        <svg className="w-4 h-4 text-purple-400 rotate-[-90deg]" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
                            <circle
                                cx="18"
                                cy="18"
                                r="16"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray="100"
                                strokeDashoffset={100 - progress}
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <span className="text-xs font-semibold text-zinc-400">{seconds}s</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-grid-white/5 mask-image-gradient-b pointer-events-none" />

                {/* Why Donate Info Button - Fixed Position */}
                <div className="absolute top-4 left-4 z-50">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/20">
                                <HelpCircle className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="right" className="w-[320px] bg-[#1a1528] border-purple-500/20 text-white p-5 shadow-xl backdrop-blur-xl">
                            <h4 className="font-bold text-lg mb-2 text-purple-300">Why Donate?</h4>
                            <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
                                Donating helps us develop more features. Running video through servers gets expensive and we want to be able to provide everyone with amazing animation resources.
                            </p>
                            <h5 className="font-semibold text-sm text-white mb-2">Upcoming Plans:</h5>
                            <ul className="text-sm text-zinc-400 space-y-1 list-disc pl-4 mb-4">
                                <li>More marketplace content</li>
                                <li>Short films section</li>
                                <li>Community spotlights</li>
                                <li>Animation challenges</li>
                                <li>And more!</li>
                            </ul>
                            <p className="text-sm font-medium text-purple-200 italic">
                                We can't do this without your help.
                            </p>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Scrollable Content Wrapper */}
                <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-2 mb-8 mt-8">
                        <DialogTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white">
                            Choose Your Plan
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 max-w-md mx-auto">
                            Support the platform and unlock more features.
                        </DialogDescription>
                    </div>

                    {/* Pricing Table Grid/Scroll */}
                    <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 py-4 pb-8 overflow-x-auto snap-x snap-mandatory md:overflow-visible px-1 -mx-6 md:mx-0 px-6 md:px-0 no-scrollbar">

                        {/* FREE TIER */}
                        <div className="min-w-[85vw] md:min-w-0 snap-center relative p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col hover:border-pink-500/50 hover:bg-gradient-to-br hover:from-pink-900/20 hover:to-transparent transition-all duration-300 group">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-zinc-400 group-hover:text-pink-300 transition-colors">Basic</h3>
                                <div className="mt-2 flex items-baseline">
                                    <span className="text-3xl font-bold text-white">Free</span>
                                </div>
                            </div>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center text-sm text-zinc-300">
                                    <span className="mr-2 text-zinc-500">✓</span> 1 Moodboard
                                </li>
                                <li className="flex items-center text-sm text-zinc-300">
                                    <span className="mr-2 text-zinc-500">✓</span> 5 Likes
                                </li>
                                <li className="flex items-center text-sm text-zinc-500">
                                    <span className="mr-2">•</span> Basic Access
                                </li>
                            </ul>
                            <div className="mt-auto">
                                <Button disabled={currentTier === 'free'} onClick={() => currentTier !== 'free' && onOpenChange?.(false)} className={cn(
                                    "w-full border transition-all",
                                    currentTier === 'free' 
                                        ? "bg-white/5 text-zinc-500 border-white/5 cursor-not-allowed" 
                                        : "bg-white/10 hover:bg-white/20 text-white border-white/10"
                                )}>
                                    {currentTier === 'free' ? 'Current Plan' : 'Basic Plan'}
                                </Button>
                            </div>
                        </div>

                        {/* $1 TIER */}
                        <div className="min-w-[85vw] md:min-w-0 snap-center relative p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/50 hover:bg-gradient-to-br hover:from-blue-900/20 hover:to-transparent transition-all duration-300 group flex flex-col">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-zinc-300 group-hover:text-blue-300 transition-colors">Supporter</h3>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-3xl font-bold text-white">$1</span>
                                    <span className="text-sm text-zinc-500">/mo</span>
                                </div>
                            </div>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center text-sm text-white">
                                    <span className="mr-2 text-blue-500">✓</span> 3 Moodboards
                                </li>
                                <li className="flex items-center text-sm text-white">
                                    <span className="mr-2 text-blue-500">✓</span> 10 Likes
                                </li>
                                <li className="flex items-center text-sm text-zinc-400">
                                    <span className="mr-2 text-blue-500">✓</span> Supporter Badge
                                </li>
                            </ul>
                            <div className="mt-auto">
                                <Button
                                    onClick={() => handlePlanAction('tier1', 'price_1SFgUc59QHehw05fROtqwkLN')}
                                    disabled={isCheckingOut || isPortalLoading || currentTier === 'tier1'}
                                    className={cn(
                                        "w-full border transition-all",
                                        currentTier === 'tier1' 
                                            ? "bg-blue-500/20 text-blue-300 border-blue-500/50 cursor-not-allowed" 
                                            : "bg-white/5 hover:bg-blue-500/20 text-white border-white/10 hover:border-blue-500/50"
                                    )}
                                >
                                    {isCheckingOut || isPortalLoading ? 'Loading...' : currentTier === 'tier1' ? 'Current Plan' : isPremium ? 'Change Plan' : 'Donate $1'}
                                </Button>
                            </div>
                        </div>

                        {/* $2 TIER */}
                        <div className="min-w-[85vw] md:min-w-0 snap-center relative p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/50 hover:bg-gradient-to-br hover:from-purple-900/20 hover:to-transparent transition-all duration-300 group flex flex-col">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-zinc-300 group-hover:text-purple-300 transition-colors">Super Fan</h3>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-3xl font-bold text-white">$2</span>
                                    <span className="text-sm text-zinc-500">/mo</span>
                                </div>
                            </div>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center text-sm text-white">
                                    <span className="mr-2 text-purple-500">✓</span> 6 Moodboards
                                </li>
                                <li className="flex items-center text-sm text-white">
                                    <span className="mr-2 text-purple-500">✓</span> 20 Likes
                                </li>
                                <li className="flex items-center text-sm text-zinc-400">
                                    <span className="mr-2 text-purple-500">✓</span> Priority Support
                                </li>
                            </ul>
                            <div className="mt-auto">
                                <Button
                                    onClick={() => handlePlanAction('tier2', 'price_1SFgiV59QHehw05fc0lPRRf7')}
                                    disabled={isCheckingOut || isPortalLoading || currentTier === 'tier2'}
                                    className={cn(
                                        "w-full border transition-all",
                                        currentTier === 'tier2'
                                            ? "bg-purple-500/20 text-purple-300 border-purple-500/50 cursor-not-allowed"
                                            : "bg-white/5 hover:bg-purple-500/20 text-white border-white/10 hover:border-purple-500/50"
                                    )}
                                >
                                    {isCheckingOut || isPortalLoading ? 'Loading...' : currentTier === 'tier2' ? 'Current Plan' : isPremium ? 'Change Plan' : 'Donate $2'}
                                </Button>
                            </div>
                        </div>

                        {/* $5 TIER (Highlighted) */}
                        <div className="min-w-[85vw] md:min-w-0 snap-center relative p-6 rounded-2xl bg-gradient-to-b from-purple-900/40 to-black/40 border border-purple-500/50 shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)] transform scale-105 z-10 flex flex-col">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                Most Popular
                            </div>
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-white">Pro</h3>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-white">$5</span>
                                    <span className="text-sm text-zinc-400">/mo</span>
                                </div>
                            </div>
                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center text-sm text-white font-medium">
                                    <span className="mr-2 text-green-400">✓</span> Unlimited Boards
                                </li>
                                <li className="flex items-center text-sm text-white font-medium">
                                    <span className="mr-2 text-green-400">✓</span> Unlimited Likes
                                </li>
                                <li className="flex items-center text-sm text-zinc-300">
                                    <span className="mr-2 text-green-400">✓</span> Early Access
                                </li>
                            </ul>
                            <div className="mt-auto">
                                <Button
                                    onClick={() => handlePlanAction('tier5', 'price_1SFgiq59QHehw05fy017h1gR')}
                                    disabled={isCheckingOut || isPortalLoading || currentTier === 'tier5'}
                                    className={cn(
                                        "w-full h-12 shadow-lg font-bold transition-all",
                                        currentTier === 'tier5'
                                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 cursor-not-allowed"
                                            : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
                                    )}
                                >
                                    {isCheckingOut || isPortalLoading ? 'Loading...' : currentTier === 'tier5' ? 'Current Plan' : isPremium ? 'Change Plan' : 'Donate $5'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
