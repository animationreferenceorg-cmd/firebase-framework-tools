'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useIntroOffer } from '@/hooks/use-intro-offer';
import { getEntitlements } from '@/lib/plans';
import { PricingDialog } from '@/components/PricingDialog';
import { track } from '@/lib/analytics';

const DISMISS_KEY = 'animref:black-friday-2026-dismissed';
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function MemberIntroPromoBanner() {
  const { user } = useAuth();
  const { userProfile, loading } = useUser();
  const { intro, shortPrice } = useIntroOffer();
  const [dismissed, setDismissed] = useState(true);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISS_KEY);
      if (!stored) {
        setDismissed(false);
      } else {
        const timestamp = parseInt(stored, 10);
        if (Number.isNaN(timestamp) || Date.now() - timestamp > DISMISS_DURATION_MS) {
          setDismissed(false);
        }
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  // Display for guests and signed-in free users when the intro offer is active
  if (loading || !intro || dismissed) {
    return null;
  }

  if (user && userProfile && getEntitlements(userProfile).access !== 'free') {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
  };

  const handleOpenDeal = () => {
    track('upgrade_prompt_clicked', {
      trigger: 'member_intro_banner',
      source: 'sticky_banner',
    });
    setShowPricing(true);
  };

  return (
    <>
      <div className="relative z-30 w-full bg-gradient-to-r from-[#09080f] via-[#1a102b] to-[#09080f] border-b border-amber-400/35 px-3 py-2 sm:py-2.5 text-white transition-all shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-black text-[10px] uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3 h-3 fill-zinc-950" />
              <span>Black Friday</span>
            </span>
            <p className="truncate text-zinc-200">
              <span className="hidden sm:inline">
                Global Pro Deal: Get <span className="text-amber-300 font-black">{shortPrice}</span>{' '}
                <span className="text-zinc-400 line-through mr-1">$15</span>
                (then <strong className="text-white">$5/mo</strong> · cancel anytime). Unlimited references, 24 FPS MP4 downloads &amp; Maya/Blender sync.
              </span>
              <span className="sm:hidden">
                Pro: <span className="text-amber-300 font-black">{shortPrice}</span>, then $5/mo.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleOpenDeal}
              size="sm"
              className="h-7 px-3 text-[11px] font-black rounded-lg bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-zinc-950 hover:from-amber-300 hover:to-yellow-200 shadow-sm cursor-pointer gap-1 transition-transform hover:scale-105"
            >
              <span>Claim $1 Deal</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
            <button
              onClick={handleDismiss}
              type="button"
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <PricingDialog open={showPricing} onOpenChange={setShowPricing} />
    </>
  );
}

