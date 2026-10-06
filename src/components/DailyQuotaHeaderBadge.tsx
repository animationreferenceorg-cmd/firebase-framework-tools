'use client';

import React from 'react';
import { Film, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewingQuota } from '@/hooks/use-viewing-quota';
import { PricingDialog } from '@/components/PricingDialog';

export function DailyQuotaHeaderBadge() {
  const quota = useViewingQuota();

  if (!quota.ready) {
    return (
      <div className="h-8 w-20 rounded-full bg-white/5 animate-pulse hidden sm:block shrink-0" />
    );
  }

  if (quota.unlimited) {
    return (
      <div
        className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/25 shrink-0 select-none"
        title="Pro Membership: Unlimited daily reference video playback"
      >
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>Pro · Unlimited</span>
      </div>
    );
  }

  const isExhausted = quota.hasReachedLimit;

  return (
    <PricingDialog>
      <button
        type="button"
        className={cn(
          "squash flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 border select-none",
          isExhausted
            ? "bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-purple-500/20 text-amber-300 border-amber-500/40 hover:border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.25)] animate-pulse"
            : "bg-white/5 hover:bg-white/10 text-zinc-200 border-white/10 hover:border-purple-400/40"
        )}
        title={
          isExhausted
            ? `Daily quota reached (0/${quota.limit} left today). Resets tomorrow, or upgrade to Pro for unlimited references!`
            : `${quota.todayRemaining} of ${quota.limit} daily reference videos remaining today. Resets tomorrow. Already watched clips stay free forever!`
        }
      >
        <Film className={cn("w-3.5 h-3.5", isExhausted ? "text-amber-400" : "text-purple-400")} />
        <span className="font-mono text-[11px] font-black text-white">
          {quota.todayRemaining}/{quota.limit}
        </span>
        <span className="hidden sm:inline text-zinc-400 font-medium text-[11px]">
          {isExhausted ? 'today · Get Pro' : 'left today'}
        </span>
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            isExhausted
              ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
              : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
          )}
        />
      </button>
    </PricingDialog>
  );
}
