'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { formatUsd, getEntitlements, getProOffers } from '@/lib/plans';

/** Compact, permanent Pro callout at the foot of the sidebar. Free accounts only. */
export function SidebarUpgradeCard() {
  const { userProfile, loading } = useUser();
  if (loading || getEntitlements(userProfile).access !== 'free') return null;

  const price = formatUsd(getProOffers().pro_monthly.amountCents);

  return (
    <Link
      href="/pricing"
      className="group/upgrade block rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-950/60 to-zinc-950/60 p-3 transition-colors hover:border-purple-400/50 group-data-[collapsible=icon]:hidden"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-300">
        <Sparkles className="h-3.5 w-3.5" /> Pro
      </div>
      <p className="mt-1 text-xs leading-snug text-zinc-300">
        Unlimited boards, MP4 downloads &amp; playblast compare.
      </p>
      <p className="mt-2 flex items-center gap-1 text-xs font-bold text-white">
        Upgrade for {price}/mo
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/upgrade:translate-x-0.5" />
      </p>
    </Link>
  );
}
