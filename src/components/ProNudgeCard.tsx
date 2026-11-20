'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useIntroOffer } from '@/hooks/use-intro-offer';
import { PricingDialog } from '@/components/PricingDialog';

/**
 * Small, non-blocking corner card shown once per session to free users who
 * are actively studying. It never takes focus or pauses playback.
 */
export function ProNudgeCard({ onDismiss }: { onDismiss: () => void }) {
  const { intro, shortPrice } = useIntroOffer();
  const [showPricing, setShowPricing] = useState(false);

  return (
    <>
      <aside
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 right-4 z-[60] rounded-2xl border border-purple-500/30 bg-[#0d0a18]/95 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 sm:left-auto sm:w-[340px]"
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-2.5 top-2.5 rounded-full p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
            <Sparkles className="h-4 w-4 text-purple-300" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold">Studying for a shot?</p>
            <p className="text-xs leading-relaxed text-zinc-400">
              Pro unlocks the full reference library, unlimited boards, clean MP4 downloads and playblast compare{intro ? ` — try it for ${shortPrice}.` : ` for ${shortPrice}.`}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2 pl-11">
          <button
            type="button"
            onClick={() => setShowPricing(true)}
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-purple-500 cursor-pointer"
          >
            {intro ? 'Claim $1 Pass' : 'See Pro'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
          >
            Not now
          </button>
        </div>
      </aside>
      <PricingDialog open={showPricing} onOpenChange={(open) => { setShowPricing(open); if (!open) onDismiss(); }} />
    </>
  );
}
