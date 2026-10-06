'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Sparkles, Check, Film, ArrowRight, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PricingDialog } from '@/components/PricingDialog';
import { track } from '@/lib/analytics';
import { formatUsd, getProOffers } from '@/lib/plans';

interface VideoQuotaSlateProps {
  posterUrl?: string;
  unlockedCount?: number;
  todayCount?: number;
  limit?: number;
  onBrowseUnlocked?: () => void;
  className?: string;
}

export function VideoQuotaSlate({
  posterUrl,
  unlockedCount = 25,
  todayCount = 25,
  limit = 25,
  onBrowseUnlocked,
  className = '',
}: VideoQuotaSlateProps) {
  const [showPricing, setShowPricing] = useState(false);
  const price = formatUsd(getProOffers().pro_monthly.amountCents);

  useEffect(() => {
    track('upgrade_prompt_viewed', { trigger: 'reference_quota', source: 'quota_slate' });
  }, []);

  const openPricing = () => {
    // The pricing dialog renders in a portal, which is invisible inside native fullscreen.
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setShowPricing(true);
  };

  return (
    <div
      className={`relative w-full h-full min-h-[360px] flex items-center justify-center overflow-hidden bg-[#090713] text-white p-6 sm:p-8 select-none ${className}`}
    >
      {/* Background Poster with heavy blur */}
      {posterUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 filter blur-xl scale-110 pointer-events-none"
          style={{ backgroundImage: `url(${posterUrl})` }}
        />
      )}

      {/* Radial gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#090713] via-[#090713]/90 to-transparent pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Content Box */}
      <div className="relative z-10 max-w-lg w-full text-center flex flex-col items-center">
        {/* Lock Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-bold tracking-wide uppercase mb-4 shadow-inner">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Daily Quota Reached ({todayCount || limit}/{limit} today)</span>
        </div>

        {/* Headline */}
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
          Come Back Tomorrow or Unlock Pro
        </h2>

        {/* Friendly explanation: Re-watching unlocked clips is always free */}
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6 max-w-md">
          You&apos;ve watched your <strong className="text-white">{limit} free reference clips today</strong>. Come back tomorrow for 25 more, or upgrade to Pro for unlimited instant access. Any video you&apos;ve already watched remains <span className="text-purple-300 font-semibold">100% free to rewatch anytime</span>!
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left mb-6 bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 sm:p-4 text-xs">
          <div className="flex items-center gap-2 text-zinc-200">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Unlimited reference studies</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-200">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>24 FPS MP4 video downloads</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-200">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>1-click PureRef contact sheets</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-200">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Unlimited visual boards</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          <Button
            size="lg"
            onClick={openPricing}
            className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(168,85,247,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Unlock Pro — {price}/month</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </Button>

          {onBrowseUnlocked ? (
            <Button
              variant="outline"
              size="lg"
              onClick={onBrowseUnlocked}
              className="w-full sm:w-auto h-11 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
              <span>Back to Watched Clips</span>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-11 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              <Link href="/home#recently-viewed">
                <History className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                <span>Recently Viewed Clips</span>
              </Link>
            </Button>
          )}
        </div>

        <p className="mt-4 text-[11px] text-zinc-500">
          Cancel anytime with 1 click in your Stripe customer portal.
        </p>
      </div>

      <PricingDialog open={showPricing} onOpenChange={setShowPricing} />
    </div>
  );
}
