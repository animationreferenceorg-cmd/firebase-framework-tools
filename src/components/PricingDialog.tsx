'use client';

import React, { useState } from 'react';
import { Check, Sparkles, ArrowRight, Lock, RefreshCcw } from 'lucide-react';
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
import { useDonate } from '@/hooks/use-donate';
import { useUser } from '@/hooks/use-user';
import {
    FREE_FEATURES,
    PRO_FEATURES,
    describeAccess,
    formatUsd,
    getEntitlements,
    getProOffers,
    type CheckoutPlanId,
} from '@/lib/plans';
import { CustomCheckoutModal } from '@/components/checkout/CustomCheckoutModal';
import { useIntroOffer } from '@/hooks/use-intro-offer';

export interface PricingDialogProps {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    forceTimer?: boolean;
}

export function PricingDialog({ children, open: openProp, onOpenChange: onOpenChangeProp }: PricingDialogProps) {
    // Works both controlled (open/onOpenChange) and uncontrolled (trigger child):
    // "Upgrade" must be able to close this dialog either way before checkout opens.
    const [internalOpen, setInternalOpen] = useState(false);
    const open = openProp ?? internalOpen;
    const onOpenChange = (next: boolean) => {
        if (openProp === undefined) setInternalOpen(next);
        onOpenChangeProp?.(next);
    };
    const offers = getProOffers();
    const [billingCycle, setBillingCycle] = useState<CheckoutPlanId>('pro_monthly');
    const [activeView, setActiveView] = useState<'cards' | 'comparison'>('cards');

    const { isCheckingOut } = useDonate();
    const { userProfile } = useUser();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPortalLoading, setIsPortalLoading] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);

    const entitlements = getEntitlements(userProfile);
    const current = describeAccess(userProfile);
    const isFree = entitlements.access === 'free';
    const isPro = entitlements.isPro;
    // Paying customers (any tier) manage or change plans in the Stripe portal.
    const hasStripePlan = !isFree && (entitlements.access === 'pro' || entitlements.access === 'tier1' || entitlements.access === 'tier2');

    const selected = offers[billingCycle].available ? offers[billingCycle] : offers.pro_monthly;
    const { intro } = useIntroOffer();
    const showIntro = Boolean(intro) && selected.interval === 'month';
    const monthlyEquivalent = selected.interval === 'year' ? Math.round(selected.amountCents / 12) : selected.amountCents;
    const annualSavingsPct = offers.pro_annual.available
        ? Math.round((1 - offers.pro_annual.amountCents / (offers.pro_monthly.amountCents * 12)) * 100)
        : 0;

    const openPortal = async () => {
        if (isPortalLoading) return;
        setIsPortalLoading(true);
        try {
            const idToken = await user?.getIdToken();
            const url = new URL(window.location.href);
            url.searchParams.set('sync', 'true');

            const response = await fetch('/api/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ returnUrl: url.toString() }),
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
    };

    const handleProAction = () => {
        if (isPro && !hasStripePlan) {
            onOpenChange?.(false);
            return;
        }
        if (hasStripePlan) {
            openPortal();
            return;
        }
        if (!user) {
            toast({
                variant: 'destructive',
                title: 'Sign in first',
                description: 'Sign in to your account to upgrade to Pro.',
            });
            return;
        }
        onOpenChange?.(false);
        setShowCheckoutModal(true);
    };

    const busy = isCheckingOut || isPortalLoading;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
            {children && (
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
            )}
            <DialogContent
                className="max-w-4xl w-[96vw] max-h-[92vh] p-0 bg-[#08070e] border border-purple-500/25 text-white flex flex-col z-[9999] shadow-[0_25px_90px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden backdrop-blur-2xl"
            >
                {/* Background glow effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-48 bg-gradient-to-r from-purple-600/15 via-indigo-600/15 to-pink-600/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-10 w-64 h-64 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    <DialogHeader className="text-center space-y-2 mt-3 sm:text-center">
                        <div className="mx-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-pink-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-semibold tracking-wider uppercase mb-1">
                            <Sparkles className="h-3 w-3 text-purple-400" />
                            Your reference workspace
                        </div>
                        <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-zinc-300">
                            Upgrade to AnimationReference Pro
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                            Keep every reference for every shot: unlimited boards, unlimited saved references, and private workspaces.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Controls row: Billing cycle & View switcher */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                        {/* Billing cycle toggle */}
                        {offers.pro_annual.available && (
                            <div className="inline-flex items-center p-1 rounded-full bg-zinc-900/90 border border-white/10 shadow-inner">
                                {(['pro_monthly', 'pro_annual'] as const).map((cycle) => (
                                    <button
                                        key={cycle}
                                        type="button"
                                        onClick={() => setBillingCycle(cycle)}
                                        aria-pressed={billingCycle === cycle}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
                                            billingCycle === cycle
                                                ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                                                : "text-zinc-400 hover:text-white"
                                        )}
                                    >
                                        <span>{cycle === 'pro_monthly' ? 'Monthly' : 'Annual'}</span>
                                        {cycle === 'pro_annual' && annualSavingsPct > 0 && (
                                            <span className="bg-emerald-500/25 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/40">
                                                Save {annualSavingsPct}%
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* View toggle */}
                        <div className="inline-flex items-center p-1 rounded-full bg-zinc-900/90 border border-white/10 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setActiveView('cards')}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer",
                                    activeView === 'cards'
                                        ? "bg-white/15 text-white shadow-sm"
                                        : "text-zinc-400 hover:text-white"
                                )}
                            >
                                Plans Overview
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveView('comparison')}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                                    activeView === 'comparison'
                                        ? "bg-white/15 text-white shadow-sm"
                                        : "text-zinc-400 hover:text-white"
                                )}
                            >
                                Detailed Comparison
                            </button>
                        </div>
                    </div>

                    {activeView === 'cards' ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                                {/* Free */}
                                <div className="relative p-6 rounded-2xl bg-zinc-900/40 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-base font-bold text-zinc-300">Free</h3>
                                            {isFree && (
                                                <span className="text-[10px] font-medium text-zinc-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                                                    Current plan
                                                </span>
                                            )}
                                        </div>
                                        <div className="mb-4">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-white">$0</span>
                                                <span className="text-xs text-zinc-500 font-medium">/ forever</span>
                                            </div>
                                            <p className="text-xs text-zinc-400 mt-1">Discover motion and start your first study.</p>
                                        </div>
                                        <ul className="space-y-2.5 mb-6 text-xs text-zinc-300">
                                            {FREE_FEATURES.map((feature) => (
                                                <li key={feature} className="flex items-center gap-2">
                                                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <Button
                                        disabled
                                        className="w-full h-10 text-xs font-semibold rounded-xl border bg-white/5 text-zinc-400 border-white/5 cursor-default"
                                    >
                                        {isFree ? 'Your current plan' : 'Included'}
                                    </Button>
                                </div>

                                {/* Pro */}
                                <div className="relative p-6 rounded-2xl bg-gradient-to-b from-purple-950/70 via-purple-900/40 to-black/80 border-2 border-purple-500/70 shadow-[0_0_50px_rgba(168,85,247,0.3)] flex flex-col justify-between transition-all hover:border-purple-400">
                                    <div>
                                        <div className="flex items-center justify-between mb-3 mt-1">
                                            <h3 className="text-base font-bold text-white">Pro</h3>
                                            {!isFree && (
                                                <span className="text-[10px] font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                                    {current.title} · {current.price}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <span className="text-4xl font-black text-white">
                                                    {selected.interval === 'year'
                                                        ? formatUsd(monthlyEquivalent)
                                                        : formatUsd(showIntro ? intro!.amountCents : selected.amountCents)}
                                                </span>
                                                <span className="text-xs text-zinc-400 font-medium">
                                                    {showIntro ? 'first month' : '/ month'}
                                                </span>
                                                {selected.interval === 'year' && (
                                                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                                        Save {annualSavingsPct}%
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-purple-200/90 mt-1">
                                                {selected.interval === 'year'
                                                    ? `Billed annually at ${formatUsd(selected.amountCents)}/year (${formatUsd(monthlyEquivalent)}/mo)`
                                                    : showIntro
                                                        ? `First month ${formatUsd(intro!.amountCents)}, then ${formatUsd(selected.amountCents)}/mo · Cancel anytime in 1 click`
                                                        : `Billed monthly at ${formatUsd(selected.amountCents)}/mo · Cancel anytime in 1 click`}
                                            </p>
                                        </div>

                                        <ul className="space-y-2 mb-6 text-xs text-zinc-200">
                                            {PRO_FEATURES.map((feature) => (
                                                <li key={feature} className="flex items-center gap-2">
                                                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                                    <span className="text-white">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <Button
                                            onClick={handleProAction}
                                            disabled={busy}
                                            className="w-full h-11 text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/30"
                                        >
                                            {busy ? (
                                                'Connecting to Stripe…'
                                            ) : hasStripePlan ? (
                                                <><RefreshCcw className="h-4 w-4" /><span>Manage billing</span></>
                                            ) : isPro ? (
                                                'Pro access active'
                                            ) : (
                                                <><span>{showIntro ? `Start Pro for ${formatUsd(intro!.amountCents)}` : 'Upgrade to Pro'}</span><ArrowRight className="h-4 w-4" /></>
                                            )}
                                        </Button>
                                        <p className="text-[10px] text-center text-zinc-400 mt-2 flex items-center justify-center gap-1">
                                            <Lock className="h-3 w-3" /> Secure checkout by Stripe
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Switch to detailed table link */}
                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveView('comparison')}
                                    className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 font-semibold underline underline-offset-4 decoration-purple-500/40 hover:decoration-purple-300 cursor-pointer transition-colors"
                                >
                                    <span>Compare all 11 features & limits side-by-side</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Full Feature Comparison Table View */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setActiveView('cards')}
                                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                    <span>← Back to plan cards</span>
                                </button>
                                <span className="text-xs text-purple-300 font-medium">
                                    {selected.interval === 'year'
                                        ? `Billed annually: ${formatUsd(selected.amountCents)}/yr (${formatUsd(monthlyEquivalent)}/mo)`
                                        : `Billed monthly: ${formatUsd(selected.amountCents)}/mo`}
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl">
                                <table className="w-full text-xs text-left">
                                    <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-white/10">
                                        <tr className="text-zinc-300">
                                            <th className="p-3.5 font-bold text-zinc-200">Capability & Tool</th>
                                            <th className="p-3.5 font-bold text-center w-32 sm:w-40 text-zinc-300 bg-white/[0.02]">
                                                <div>Free</div>
                                                <div className="text-[11px] font-normal text-zinc-400">$0 / forever</div>
                                            </th>
                                            <th className="p-3.5 font-bold text-center w-36 sm:w-48 text-purple-300 bg-purple-950/40 border-l border-purple-500/20">
                                                <div>Pro</div>
                                                <div className="text-[11px] font-normal text-purple-200/90">
                                                    {selected.interval === 'year'
                                                        ? `${formatUsd(monthlyEquivalent)}/mo · ${formatUsd(selected.amountCents)}/yr`
                                                        : `${formatUsd(selected.amountCents)}/mo`}
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {/* Category: Motion Study & Playback */}
                                        <tr className="bg-white/[0.03]">
                                            <td colSpan={3} className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                                                Motion Study & Playback
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">Public Reference Library Access</td>
                                            <td className="p-2.5 text-center text-emerald-400 bg-white/[0.01]"><Check className="h-4 w-4 mx-auto" /></td>
                                            <td className="p-2.5 text-center text-emerald-400 bg-purple-950/20 border-l border-purple-500/10"><Check className="h-4 w-4 mx-auto" /></td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">Frame-by-Frame Scrub & Speed Controls</td>
                                            <td className="p-2.5 text-center text-emerald-400 bg-white/[0.01]"><Check className="h-4 w-4 mx-auto" /></td>
                                            <td className="p-2.5 text-center text-emerald-400 bg-purple-950/20 border-l border-purple-500/10"><Check className="h-4 w-4 mx-auto" /></td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">Side-by-Side Synchronized Playblast Compare</td>
                                            <td className="p-2.5 text-center text-zinc-600 bg-white/[0.01]">—</td>
                                            <td className="p-2.5 text-center font-bold text-emerald-400 bg-purple-950/20 border-l border-purple-500/10"><Check className="h-4 w-4 mx-auto" /></td>
                                        </tr>

                                        {/* Category: Shot Boards & Cloud Storage */}
                                        <tr className="bg-white/[0.03]">
                                            <td colSpan={3} className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                                                Shot Boards & Storage
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">New Library References</td>
                                            <td className="p-2.5 text-center text-zinc-400 bg-white/[0.01]">25/day (+ bonus for sharing)</td>
                                            <td className="p-2.5 text-center font-bold text-purple-300 bg-purple-950/20 border-l border-purple-500/10">Unlimited</td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">Boards, Saves & Uploads</td>
                                            <td className="p-2.5 text-center text-zinc-400 bg-white/[0.01]">Unlimited (public)</td>
                                            <td className="p-2.5 text-center font-bold text-purple-300 bg-purple-950/20 border-l border-purple-500/10">Unlimited</td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">Private Boards & Private Video Uploads</td>
                                            <td className="p-2.5 text-center text-zinc-600 bg-white/[0.01]">—</td>
                                            <td className="p-2.5 text-center font-bold text-emerald-400 bg-purple-950/20 border-l border-purple-500/10"><Check className="h-4 w-4 mx-auto" /></td>
                                        </tr>

                                        {/* Category: Export & Production Tools */}
                                        <tr className="bg-white/[0.03]">
                                            <td colSpan={3} className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                                                Export & Production Tools
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">High-Resolution Contact Sheets & PDF Export</td>
                                            <td className="p-2.5 text-center text-zinc-600 bg-white/[0.01]">—</td>
                                            <td className="p-2.5 text-center font-bold text-emerald-400 bg-purple-950/20 border-l border-purple-500/10"><Check className="h-4 w-4 mx-auto" /></td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">Watermark-Free Downloads & Exports</td>
                                            <td className="p-2.5 text-center text-zinc-500 bg-white/[0.01]">Watermarked</td>
                                            <td className="p-2.5 text-center font-bold text-purple-300 bg-purple-950/20 border-l border-purple-500/10">Clean Exports</td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">Pitch Deck & Storyboard PDF Export</td>
                                            <td className="p-2.5 text-center text-zinc-600 bg-white/[0.01]">—</td>
                                            <td className="p-2.5 text-center font-bold text-emerald-400 bg-purple-950/20 border-l border-purple-500/10"><Check className="h-4 w-4 mx-auto" /></td>
                                        </tr>

                                        {/* Category: Portfolio & Community */}
                                        <tr className="bg-white/[0.03]">
                                            <td colSpan={3} className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                                                Portfolio & Community
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">Portfolio Posts & Shot Breakdowns</td>
                                            <td className="p-2.5 text-center text-zinc-400 bg-white/[0.01]">3 posts</td>
                                            <td className="p-2.5 text-center font-bold text-purple-300 bg-purple-950/20 border-l border-purple-500/10">Unlimited</td>
                                        </tr>
                                        <tr className="hover:bg-white/[0.02]">
                                            <td className="p-2.5 text-zinc-300 font-medium">Custom Artist Vanity URL (/yourname)</td>
                                            <td className="p-2.5 text-center text-zinc-600 bg-white/[0.01]">—</td>
                                            <td className="p-2.5 text-center font-bold text-emerald-400 bg-purple-950/20 border-l border-purple-500/10"><Check className="h-4 w-4 mx-auto" /></td>
                                        </tr>
                                    </tbody>
                                    <tfoot className="border-t border-white/10 bg-zinc-900/60">
                                        <tr>
                                            <td className="p-3 text-zinc-400 font-medium">Ready to get started?</td>
                                            <td className="p-3 text-center bg-white/[0.01]">
                                                <span className="text-[11px] text-zinc-400 font-medium">
                                                    {isFree ? 'Current Plan' : 'Included'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center bg-purple-950/20 border-l border-purple-500/20">
                                                <Button
                                                    onClick={handleProAction}
                                                    disabled={busy}
                                                    size="sm"
                                                    className="w-full text-xs font-bold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-500/25"
                                                >
                                                    {busy ? 'Connecting…' : hasStripePlan ? 'Manage billing' : isPro ? 'Pro Active' : 'Upgrade to Pro'}
                                                </Button>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>

        <CustomCheckoutModal
            open={showCheckoutModal}
            onOpenChange={setShowCheckoutModal}
            initialPlan={selected.id}
            source="pricing_dialog"
        />
        </>
    );
}
