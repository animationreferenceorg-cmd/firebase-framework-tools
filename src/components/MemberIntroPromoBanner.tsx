'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIntroOffer } from '@/hooks/use-intro-offer';
import { PricingDialog } from '@/components/PricingDialog';
import { track } from '@/lib/analytics';

const DISMISS_KEY = 'animref:black-friday-2026-dismissed';
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function MemberIntroPromoBanner() {
  const { intro, terms } = useIntroOffer();
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
  if (!intro || dismissed) {
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
          <div className="flex min-w-0 items-start gap-2 sm:items-center">
            <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300 sm:mt-0" />
            <p className="text-zinc-200"><strong className="text-amber-300">{intro.label} on Pro.</strong> {terms}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleOpenDeal}
              size="sm"
              className="h-7 px-3 text-[11px] font-black rounded-lg bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-zinc-950 hover:from-amber-300 hover:to-yellow-200 shadow-sm cursor-pointer gap-1 transition-transform hover:scale-105"
            >
              <span>View deal</span>
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

