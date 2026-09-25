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

export interface PricingDialogProps {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    forceTimer?: boolean;
}

export function PricingDialog({ children, open, onOpenChange }: PricingDialogProps) {
    const offers = getProOffers();
    const [billingCycle, setBillingCycle] = useState<CheckoutPlanId>('pro_monthly');

    const { startCheckout, isCheckingOut } = useDonate();
    const { userProfile } = useUser();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPortalLoading, setIsPortalLoading] = useState(false);

    const entitlements = getEntitlements(userProfile);
    const current = describeAccess(userProfile);
    const isFree = entitlements.access === 'free';
    const isPro = entitlements.isPro;
    // Paying customers (any tier) manage or change plans in the Stripe portal.
    const hasStripePlan = !isFree && (entitlements.access === 'pro' || entitlements.access === 'tier1' || entitlements.access === 'tier2');

    const selected = offers[billingCycle].available ? offers[billingCycle] : offers.pro_monthly;
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
        startCheckout(selected.id);
    };

    const busy = isCheckingOut || isPortalLoading;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && (
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
            )}
            <DialogContent
                className="max-w-3xl w-[96vw] max-h-[92vh] p-0 bg-[#08070e] border border-purple-500/25 text-white flex flex-col z-[9999] shadow-[0_25px_90px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden backdrop-blur-2xl"
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

                    {/* Billing cycle toggle — annual only appears once a real annual price exists. */}
                    {offers.pro_annual.available && (
                        <div className="flex items-center justify-center gap-3 pt-1">
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
                                            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 rounded-full border border-emerald-500/30">
                                                Save {annualSavingsPct}%
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

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
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white">{formatUsd(monthlyEquivalent)}</span>
                                        <span className="text-xs text-zinc-400 font-medium">/ month</span>
                                    </div>
                                    <p className="text-xs text-purple-200/90 mt-1">
                                        {selected.interval === 'year'
                                            ? `Billed ${formatUsd(selected.amountCents)} per year`
                                            : 'Billed monthly · cancel anytime from the billing portal'}
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
                                        <><span>Upgrade to Pro</span><ArrowRight className="h-4 w-4" /></>
                                    )}
                                </Button>
                                <p className="text-[10px] text-center text-zinc-400 mt-2 flex items-center justify-center gap-1">
                                    <Lock className="h-3 w-3" /> Secure checkout by Stripe
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
