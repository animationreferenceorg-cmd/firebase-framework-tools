'use client';

import React, { useEffect, useState } from 'react';
import {
    Check,
    Sparkles,
    Lock,
    ShieldCheck,
    RefreshCcw,
    X,
    ExternalLink,
    AlertCircle,
    Layers,
    Film,
    Camera,
    FolderSync
} from 'lucide-react';
import {
    EmbeddedCheckoutProvider,
    EmbeddedCheckout
} from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getStripeClient } from '@/lib/stripe-client';
import {
    getProOffers,
    formatUsd,
    type CheckoutPlanId,
} from '@/lib/plans';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { useIntroOffer } from '@/hooks/use-intro-offer';

export interface CustomCheckoutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialPlan?: CheckoutPlanId;
    source?: string;
}

export function CustomCheckoutModal({
    open,
    onOpenChange,
    initialPlan = 'pro_monthly',
    source = 'checkout_modal',
}: CustomCheckoutModalProps) {
    const offers = getProOffers();
    const { user } = useAuth();
    const { toast } = useToast();

    const [selectedPlan, setSelectedPlan] = useState<CheckoutPlanId>(initialPlan);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stripeAvailable, setStripeAvailable] = useState<boolean | null>(null);
    const [retryToken, setRetryToken] = useState(0);
    const keyConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());

    const activeOffer = offers[selectedPlan].available ? offers[selectedPlan] : offers.pro_monthly;
    const { intro } = useIntroOffer();
    const showIntro = Boolean(intro) && activeOffer.interval === 'month';
    const monthlyEquivalent = activeOffer.interval === 'year'
        ? Math.round(activeOffer.amountCents / 12)
        : activeOffer.amountCents;
    const annualSavingsPct = offers.pro_annual.available
        ? Math.round((1 - offers.pro_annual.amountCents / (offers.pro_monthly.amountCents * 12)) * 100)
        : 0;

    // Can the in-page Stripe form load? Re-checked each time the modal opens:
    // blockers or a bad network make Stripe.js unavailable, and then we use
    // Stripe's hosted checkout page instead of leaving the buyer stuck.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setStripeAvailable(null);
        getStripeClient()
            .then((stripe) => { if (!cancelled) setStripeAvailable(Boolean(stripe)); })
            .catch(() => { if (!cancelled) setStripeAvailable(false); });
        return () => { cancelled = true; };
    }, [open, retryToken]);

    // Keep plan in sync if initialPlan prop changes while closed
    useEffect(() => {
        if (!open) {
            setClientSecret(null);
            setError(null);
            return;
        }
        setSelectedPlan(initialPlan);
    }, [open, initialPlan]);

    // Create the checkout session once we know which kind we can show:
    // embedded (Stripe.js loaded) or hosted (a link to Stripe's checkout page).
    useEffect(() => {
        if (!open || stripeAvailable === null) return;
        let isCancelled = false;

        async function createSession() {
            if (!user) {
                setError('Please sign in to upgrade to Pro.');
                return;
            }

            setIsLoading(true);
            setError(null);
            setClientSecret(null);
            setFallbackUrl(null);

            try {
                const idToken = await user.getIdToken();
                track('checkout_started', { plan: selectedPlan, source });

                const res = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        plan: selectedPlan,
                        embedded: stripeAvailable,
                    }),
                });

                const data = await res.json().catch(() => ({}));
                if (isCancelled) return;

                if (!res.ok) {
                    throw new Error(data.message || 'Unable to initialize checkout session.');
                }

                if (data.clientSecret) {
                    setClientSecret(data.clientSecret);
                }
                if (data.url) {
                    setFallbackUrl(data.url);
                }
                if (!data.clientSecret && !data.url) {
                    throw new Error('Checkout could not be started. Please try again.');
                }
            } catch (err: any) {
                if (isCancelled) return;
                console.error('Checkout error:', err);
                setError(err.message || 'Failed to start checkout. Please try again.');
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }

        createSession();

        return () => {
            isCancelled = true;
        };
    }, [open, selectedPlan, user, source, stripeAvailable, retryToken]);

    const stripePromise = getStripeClient();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] p-0 bg-[#08070e] border border-purple-500/30 text-white flex flex-col z-[9999] shadow-[0_30px_100px_rgba(0,0,0,0.95)] rounded-3xl overflow-hidden backdrop-blur-2xl">
                <DialogTitle className="sr-only">AnimationReference Pro Checkout</DialogTitle>

                {/* Ambient glow decoration */}
                <div className="absolute top-0 left-1/4 w-96 h-48 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 flex-1 overflow-y-auto flex flex-col lg:flex-row">
                    {/* Left Column: Value Proposition & Plan Details */}
                    <div className="lg:w-[42%] p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 bg-white/[0.015]">
                        <div className="space-y-6">
                            {/* Product Header */}
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-pink-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold tracking-wider uppercase">
                                    <Sparkles className="h-3 w-3 text-purple-400" />
                                    AnimationReference Pro
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    Upgrade to Pro
                                </h2>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Turn your motion studies into high-end production shots with unlimited boards, side-by-side comparison, and 4K exports.
                                </p>
                            </div>

                            {/* Plan Toggle (Monthly / Annual) */}
                            {offers.pro_annual.available && (
                                <div className="p-1 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPlan('pro_monthly')}
                                        className={cn(
                                            'flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer',
                                            selectedPlan === 'pro_monthly'
                                                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                                                : 'text-zinc-400 hover:text-white'
                                        )}
                                    >
                                        <span>Monthly</span>
                                        <span className="text-[10px] text-zinc-400 font-normal">({formatUsd(offers.pro_monthly.amountCents)}/mo)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPlan('pro_annual')}
                                        className={cn(
                                            'flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer',
                                            selectedPlan === 'pro_annual'
                                                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                                                : 'text-zinc-400 hover:text-white'
                                        )}
                                    >
                                        <span>Annual</span>
                                        {annualSavingsPct > 0 && (
                                            <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                                                Save {annualSavingsPct}%
                                            </span>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Price Card */}
                            <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-950/40 to-black/60 border border-purple-500/40 space-y-1">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-white">
                                        {formatUsd(showIntro ? intro!.amountCents : monthlyEquivalent)}
                                    </span>
                                    <span className="text-xs text-zinc-400 font-medium">{showIntro ? 'first month' : '/ month'}</span>
                                </div>
                                <p className="text-[11px] text-purple-200/80">
                                    {selectedPlan === 'pro_annual'
                                        ? `Billed annually at ${formatUsd(offers.pro_annual.amountCents)}/year`
                                        : showIntro
                                            ? `Then ${formatUsd(activeOffer.amountCents)}/month. Cancel anytime.`
                                            : 'Billed monthly. Cancel anytime.'}
                                </p>
                            </div>

                            {/* Pro Features Checklist */}
                            <div className="space-y-3">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                                    What&apos;s included in Pro:
                                </div>
                                <ul className="space-y-2 text-xs text-zinc-300">
                                    <li className="flex items-start gap-2">
                                        <Layers className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                                        <span>Unlimited boards &amp; private moodboard workspaces</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Film className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                                        <span>Side-by-side synchronized playblast compare</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Camera className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                                        <span>High-resolution contact sheets &amp; PDF pitch-deck export</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <FolderSync className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                                        <span>Maya handoff bridge &amp; production camera tools</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Security Footer Note */}
                        <div className="pt-6 mt-6 border-t border-white/5 space-y-2 text-[11px] text-zinc-500">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                                <span>256-bit SSL encrypted • Powered by Stripe</span>
                            </div>
                            <p>
                                Subscriptions renew automatically. You can cancel with one click at any time from your profile page.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Stripe Embedded Checkout or Hosted Fallback */}
                    <div className="lg:w-[58%] p-6 sm:p-8 flex flex-col justify-center min-h-[460px]">
                        {(isLoading || (open && !error && stripeAvailable === null)) && (
                            <div className="flex flex-col items-center justify-center space-y-4 py-16">
                                <div className="relative w-12 h-12">
                                    <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
                                    <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                                </div>
                                <p className="text-xs text-zinc-400 animate-pulse">
                                    Preparing secure checkout…
                                </p>
                            </div>
                        )}

                        {error && !isLoading && (
                            <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 text-center space-y-4">
                                <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-white">Checkout Error</h4>
                                    <p className="text-xs text-zinc-400">{error}</p>
                                </div>
                                <Button
                                    onClick={() => setRetryToken((t) => t + 1)}
                                    className="bg-white/10 hover:bg-white/20 text-white text-xs h-9 rounded-xl"
                                >
                                    <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                                    Try Again
                                </Button>
                            </div>
                        )}

                        {/* Case 1: Stripe publishable key is present and clientSecret exists -> Render Embedded Checkout */}
                        {!isLoading && !error && stripeAvailable && clientSecret && (
                            <div className="w-full stripe-embedded-container rounded-2xl overflow-hidden">
                                <EmbeddedCheckoutProvider
                                    stripe={stripePromise}
                                    options={{ clientSecret }}
                                >
                                    <EmbeddedCheckout className="w-full min-h-[440px]" />
                                </EmbeddedCheckoutProvider>
                            </div>
                        )}

                        {/* Case 2: Stripe publishable key is not set in environment or clientSecret not available -> Fallback Card */}
                        {!isLoading && !error && stripeAvailable !== null && (!stripeAvailable || !clientSecret) && (
                            <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/60 border border-purple-500/30 text-center space-y-6">
                                <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center">
                                    <ShieldCheck className="h-7 w-7 text-purple-400" />
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-base font-bold text-white">
                                        Ready to Upgrade to Pro
                                    </h4>
                                    <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                                        Click below to complete your secure payment via Stripe. Your Pro access will activate immediately upon completion.
                                    </p>
                                </div>

                                {fallbackUrl ? (
                                    <Button
                                        asChild
                                        className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2"
                                    >
                                        <a href={fallbackUrl}>
                                            Complete Secure Checkout <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => setRetryToken((t) => t + 1)}
                                        className="w-full h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm"
                                    >
                                        <RefreshCcw className="h-4 w-4 mr-1.5" />
                                        Retry checkout
                                    </Button>
                                )}

                                {/* Developer hint only: never shown to buyers on the live site. */}
                                {process.env.NODE_ENV !== 'production' && !keyConfigured && (
                                    <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-left text-[11px] text-purple-300/80 space-y-1">
                                        <div className="font-semibold text-purple-200">
                                            💡 Inline Checkout Notice
                                        </div>
                                        <p>
                                            Add <code className="px-1 py-0.5 rounded bg-black/40 text-purple-200 font-mono text-[10px]">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...</code> to enable in-modal Stripe Elements.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
