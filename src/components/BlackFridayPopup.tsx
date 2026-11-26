'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, Check, Clock, Lock, Sparkles, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useIntroOffer } from '@/hooks/use-intro-offer';
import { formatUsd, getEntitlements } from '@/lib/plans';
import { CustomCheckoutModal } from '@/components/checkout/CustomCheckoutModal';
import { track } from '@/lib/analytics';

const POPUP_DISMISS_KEY = 'animref:bf-popup-2026-dismissed';
const POPUP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // Re-show at most once every 24h if dismissed
const POPUP_DELAY_MS = 1200;

// Black Friday / Cyber Week window end (rolling 4-day end-of-event target in local time if past Dec 3)
function getCountdownParts(nowMs: number) {
  const year = new Date(nowMs).getFullYear();
  // Cyber Tuesday midnight local time (Dec 2 23:59:59)
  const target = new Date(year, 11, 2, 23, 59, 59).getTime();
  let diff = target - nowMs;
  if (diff <= 0) {
    // Fallback rolling 24h cycle so countdown stays clean if promo stays active past Cyber Week
    const endOfDay = new Date(nowMs);
    endOfDay.setHours(23, 59, 59, 999);
    diff = Math.max(0, endOfDay.getTime() - nowMs);
  }
  const days = Math.floor(diff / (24 * 3600 * 1000));
  const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
  const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
  const secs = Math.floor((diff % (60 * 1000)) / 1000);
  return { days, hours, mins, secs };
}

const HIGHLIGHTS = [
  'Unlimited reference library & 24 FPS MP4 downloads',
  'Unlimited Maya & Blender Moodboard 3D sync',
  'Side-by-side playblast compare & private NDA boards',
  'Full AnimRef Drawover, Storyboard & 2D Animation Studio',
];

export function BlackFridayPopup() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { userProfile, loading } = useUser();
  const { intro, periodLabel, regularCents, regularPeriodTotalCents } = useIntroOffer();

  const [open, setOpen] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const isExcludedRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/sjsu') ||
    pathname.startsWith('/embed');

  const isAlreadyPaid = Boolean(user && userProfile && getEntitlements(userProfile).access !== 'free');

  useEffect(() => {
    if (loading || !intro || isExcludedRoute || isAlreadyPaid) return;

    try {
      const dismissedAt = localStorage.getItem(POPUP_DISMISS_KEY);
      if (dismissedAt) {
        const ts = parseInt(dismissedAt, 10);
        if (!Number.isNaN(ts) && Date.now() - ts < POPUP_COOLDOWN_MS) {
          return;
        }
      }
    } catch {
      // Allow popup if localStorage is blocked
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, POPUP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [loading, intro, isExcludedRoute, isAlreadyPaid, pathname]);

  // Live 1-second countdown ticker while popup is open
  useEffect(() => {
    if (!open) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  // Esc key closes popup
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(POPUP_DISMISS_KEY, Date.now().toString());
    } catch {}
  };

  const handleClaim = () => {
    track('upgrade_prompt_clicked', { trigger: 'black_friday_popup', source: 'global_modal' });
    handleDismiss();
    if (!user) {
      const target = '/pricing?checkout=pro_monthly';
      window.location.assign(`/login?redirect=${encodeURIComponent(target)}`);
      return;
    }
    setShowCheckoutModal(true);
  };

  const countdown = getCountdownParts(nowMs);
  const savingsPct = intro
    ? Math.round((1 - intro.amountCents / Math.max(1, regularPeriodTotalCents)) * 100)
    : 93;

  return (
    <>
      {open && intro && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bf-popup-title"
          onClick={handleDismiss}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-400/45 bg-gradient-to-b from-[#161026] via-[#0c0a14] to-[#08070d] p-6 sm:p-7 text-white shadow-[0_30px_110px_rgba(0,0,0,0.95),0_0_60px_rgba(245,158,11,0.18)] animate-in zoom-in-95 duration-200"
          >
            {/* Ambient studio glow */}
            <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-4/5 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500/25 via-fuchsia-500/20 to-violet-600/25 blur-3xl" />

            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close Black Friday offer"
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Event Pill + Savings Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-400/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300 shadow-sm">
                <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                <span>{intro.label} · Save {savingsPct}%</span>
              </div>

              <h2
                id="bf-popup-title"
                className="mt-3.5 text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight"
              >
                Unlock Full Pro Access for{' '}
                <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                  {formatUsd(intro.amountCents)} {periodLabel}
                </span>
              </h2>

              <p className="mt-2 text-xs sm:text-sm text-zinc-300 max-w-md">
                Our biggest deal of the year for all 19,000+ animators. Full unlimited Pro access worldwide.
              </p>

              {/* Big Price Callout Box */}
              <div className="mt-4 w-full rounded-2xl border border-amber-400/30 bg-black/45 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-amber-300 tracking-tight">
                    {formatUsd(intro.amountCents)}
                  </span>
                  <div className="text-left leading-tight">
                    <div className="text-xs font-extrabold text-white">{periodLabel} total</div>
                    <div className="text-[11px] text-zinc-400">
                      <span className="line-through mr-1">{formatUsd(regularPeriodTotalCents)}</span>
                      then {formatUsd(regularCents)}/mo
                    </div>
                  </div>
                </div>

                {/* Live Countdown */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] text-zinc-200">
                  <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="font-bold text-white">
                    {countdown.days > 0 ? `${countdown.days}d ` : ''}
                    {String(countdown.hours).padStart(2, '0')}h:{String(countdown.mins).padStart(2, '0')}m:{String(countdown.secs).padStart(2, '0')}s
                  </span>
                </div>
              </div>

              {/* Perks */}
              <ul className="mt-4 w-full space-y-2 text-left text-xs sm:text-[13px] text-zinc-200">
                {HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/35 text-emerald-300">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Primary CTA */}
              <Button
                onClick={handleClaim}
                className="mt-5 h-12 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black text-sm sm:text-base shadow-[0_12px_35px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.01] cursor-pointer gap-2"
              >
                <Sparkles className="h-4 w-4 fill-zinc-950" />
                <span>Claim {formatUsd(intro.amountCents)} {periodLabel} Now</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3 text-zinc-400" /> Secure Stripe checkout · Cancel anytime in 1 click
                </span>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 cursor-pointer"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CustomCheckoutModal
        open={showCheckoutModal}
        onOpenChange={setShowCheckoutModal}
        initialPlan="pro_monthly"
        source="black_friday_popup"
      />
    </>
  );
}
