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

const DISMISS_KEY = 'animref:member-deal-dismissed';
const DISMISS_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export function MemberIntroPromoBanner() {
  const { user } = useAuth();
  const { userProfile, loading } = useUser();
  const { intro } = useIntroOffer();
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

  // Only display for returning signed-in free users when the intro offer is active
  if (loading || !user || !userProfile || !intro || dismissed) {
    return null;
  }

  const isFree = getEntitlements(userProfile).access === 'free';
  if (!isFree) {
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
      <div className="relative z-30 w-full bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-950 border-b border-purple-500/30 px-3 py-2 sm:py-2.5 text-white transition-all shadow-lg shadow-purple-950/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 p-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 fill-amber-300" />
            </span>
            <p className="truncate text-zinc-200">
              <strong className="text-white font-extrabold mr-1">Animator Special:</strong>
              <span className="hidden sm:inline">
                Unlock full Pro access for just <span className="text-emerald-400 font-bold">$1 for your first month</span> (normally $5/mo). Unlimited references, 24 FPS MP4 downloads, &amp; playblast compare.
              </span>
              <span className="sm:hidden">
                Get Pro for <span className="text-emerald-400 font-bold">$1 first month</span> (normally $5/mo).
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleOpenDeal}
              size="sm"
              className="h-7 px-3 text-[11px] font-black rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-zinc-950 hover:from-amber-300 hover:to-yellow-300 shadow-sm cursor-pointer gap-1 transition-transform hover:scale-105"
            >
              <span>Claim $1 Pass</span>
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
