'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Lock, Minus, RefreshCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CustomCheckoutModal } from '@/components/checkout/CustomCheckoutModal';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ACCESS_LIMITS,
  FREE_FEATURES,
  PRO_FEATURES,
  describeAccess,
  formatUsd,
  getEntitlements,
  getProOffers,
  type CheckoutPlanId,
} from '@/lib/plans';

type Cell = boolean | string;

const limitLabel = (n: number, unit: string) => (Number.isFinite(n) ? `${n} ${unit}${n === 1 ? '' : 's'}` : 'Unlimited');

// Rows mirror the entitlements in src/lib/plans.ts — only list what is gated today.
const COMPARISON: { group: string; rows: { label: string; free: Cell; pro: Cell }[] }[] = [
  {
    group: 'Motion study',
    rows: [
      { label: 'Public reference library', free: true, pro: true },
      { label: 'Frame-by-frame playback & speed controls', free: true, pro: true },
      { label: 'Side-by-side synchronized playblast compare', free: false, pro: true },
    ],
  },
  {
    group: 'Boards & storage',
    rows: [
      { label: 'Reference boards', free: limitLabel(ACCESS_LIMITS.free.maxBoards, 'board'), pro: 'Unlimited' },
      { label: 'Saved references', free: limitLabel(ACCESS_LIMITS.free.maxSavedReferences, 'reference'), pro: 'Unlimited' },
      { label: 'Private boards & private video uploads', free: false, pro: true },
    ],
  },
  {
    group: 'Export',
    rows: [
      { label: 'High-resolution contact sheets & PDF export', free: false, pro: true },
      { label: 'Watermark-free downloads & exports', free: 'Watermarked', pro: 'Clean' },
      { label: 'Pitch deck & director presentation exports', free: false, pro: true },
    ],
  },
  {
    group: 'Portfolio',
    rows: [
      { label: 'Portfolio posts & shot breakdowns', free: limitLabel(ACCESS_LIMITS.free.maxPortfolioPosts, 'post'), pro: 'Unlimited' },
    ],
  },
];

const FAQ = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Open Manage billing from this page or your profile and cancel in the Stripe customer portal. You keep Pro until the end of the period you paid for.',
  },
  {
    q: 'What happens to my boards if I cancel?',
    a: 'Nothing is deleted. Your boards and saved references stay in your account; you just can’t add past the free limits until you upgrade again.',
  },
  {
    q: 'Is the reference library still free?',
    a: 'Yes. Browsing, watching and frame-stepping through the public library is free for everyone. Pro is for organizing, comparing and exporting reference for your own shots.',
  },
  {
    q: 'How is payment handled?',
    a: 'Checkout runs on Stripe. We never see or store your card number.',
  },
  {
    q: 'I’m a student. Is there a discount?',
    a: 'Students at partner schools can get free unlimited access. San José State students can activate it with their @sjsu.edu email.',
    link: { href: '/sjsu', label: 'SJSU Student Pass' },
  },
];

function CellValue({ value, pro }: { value: Cell; pro?: boolean }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-emerald-400" aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-zinc-600" aria-label="Not included" />;
  return <span className={cn('text-xs', pro ? 'font-bold text-purple-300' : 'text-zinc-400')}>{value}</span>;
}

export function PricingPageClient() {
  const offers = getProOffers();
  const [billingCycle, setBillingCycle] = useState<CheckoutPlanId>('pro_monthly');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const { user } = useAuth();
  const { userProfile } = useUser();
  const { toast } = useToast();

  const entitlements = getEntitlements(userProfile);
  const current = describeAccess(userProfile);
  const isFree = entitlements.access === 'free';
  const isPro = entitlements.isPro;
  // Paying customers (any tier) manage or change plans in the Stripe portal.
  const hasStripePlan = entitlements.access === 'pro' || entitlements.access === 'tier1' || entitlements.access === 'tier2';

  const selected = offers[billingCycle].available ? offers[billingCycle] : offers.pro_monthly;
  const monthlyEquivalent = selected.interval === 'year' ? Math.round(selected.amountCents / 12) : selected.amountCents;
  const annualSavingsPct = offers.pro_annual.available
    ? Math.round((1 - offers.pro_annual.amountCents / (offers.pro_monthly.amountCents * 12)) * 100)
    : 0;
  const priceLine = selected.interval === 'year'
    ? `Billed ${formatUsd(selected.amountCents)} yearly`
    : `Billed ${formatUsd(selected.amountCents)} monthly · cancel anytime`;

  const openPortal = async () => {
    if (isPortalLoading || !user) return;
    setIsPortalLoading(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/pricing?sync=true` }),
      });
      const data = await response.json();
      if (!data.url) throw new Error(data.error);
      window.location.assign(data.url);
    } catch {
      toast({ title: 'Error', description: 'Failed to open billing portal', variant: 'destructive' });
      setIsPortalLoading(false);
    }
  };

  const handleProAction = () => {
    if (hasStripePlan) return openPortal();
    if (isPro) return;
    if (!user) {
      window.location.assign('/login?redirect=/pricing');
      return;
    }
    setShowCheckoutModal(true);
  };

  const ctaLabel = isPortalLoading
    ? 'Opening Stripe…'
    : hasStripePlan
      ? 'Manage billing'
      : isPro
        ? 'Pro access active'
        : user
          ? `Upgrade for ${formatUsd(monthlyEquivalent)}/mo`
          : 'Sign in to upgrade';

  return (
    <main className="relative mx-auto max-w-5xl px-4 pb-32 pt-12 text-white md:px-8">
      <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-4/5 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600/15 via-indigo-600/15 to-pink-600/10 blur-[100px]" />

      <header className="relative space-y-3 text-center">
        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-purple-300">
          <Sparkles className="h-3 w-3" /> Pricing
        </div>
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">Study motion free. Build your shot library with Pro.</h1>
        <p className="mx-auto max-w-2xl text-sm text-zinc-400 md:text-base">
          The reference library is free for everyone. Pro is {formatUsd(offers.pro_monthly.amountCents)}/month for unlimited boards, private uploads, playblast compare and clean exports.
        </p>
      </header>

      {offers.pro_annual.available && (
        <div className="relative mt-8 flex justify-center">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-zinc-900/90 p-1">
            {(['pro_monthly', 'pro_annual'] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                aria-pressed={billingCycle === cycle}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                  billingCycle === cycle ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                )}
              >
                {cycle === 'pro_monthly' ? 'Monthly' : 'Annual'}
                {cycle === 'pro_annual' && annualSavingsPct > 0 && (
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Save {annualSavingsPct}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="relative mt-8 grid grid-cols-1 gap-5 md:grid-cols-2" aria-label="Plans">
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-300">Free</h2>
              {user && isFree && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">Current plan</span>}
            </div>
            <p className="text-4xl font-black">$0</p>
            <p className="mt-1 text-xs text-zinc-400">Discover motion and start your first study.</p>
            <ul className="mt-6 space-y-2.5 text-sm text-zinc-300">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-400" />{feature}</li>
              ))}
            </ul>
          </div>
          <Button asChild variant="outline" className="mt-8 h-11 rounded-xl border-white/10 bg-white/5 text-sm">
            <Link href="/home">Browse the library</Link>
          </Button>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border-2 border-purple-500/70 bg-gradient-to-b from-purple-950/70 via-purple-900/40 to-black/80 p-6 shadow-[0_0_50px_rgba(168,85,247,0.25)]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Pro</h2>
              {!isFree && <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">{current.title} · {current.price}</span>}
            </div>
            <p className="flex items-baseline gap-1">
              <span className="text-4xl font-black">{formatUsd(monthlyEquivalent)}</span>
              <span className="text-sm text-zinc-400">/ month</span>
            </p>
            <p className="mt-1 text-xs text-purple-200/90">{priceLine}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-purple-300">Everything in Free, plus</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-400" />{feature}</li>
              ))}
            </ul>
          </div>
          <div className="mt-8">
            <Button
              onClick={handleProAction}
              disabled={isPortalLoading || (isPro && !hasStripePlan)}
              className="h-11 w-full gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-sm font-bold hover:from-purple-500 hover:to-indigo-500"
            >
              {hasStripePlan && <RefreshCcw className="h-4 w-4" />}
              {ctaLabel}
              {!isPro && <ArrowRight className="h-4 w-4" />}
            </Button>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-zinc-400"><Lock className="h-3 w-3" /> Secure checkout by Stripe</p>
          </div>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="mb-4 text-xl font-black md:text-2xl">Compare plans</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/80">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-white/10 bg-zinc-900/95">
              <tr>
                <th className="p-3.5 font-bold text-zinc-200">Feature</th>
                <th className="w-32 p-3.5 text-center font-bold text-zinc-300">Free</th>
                <th className="w-36 border-l border-purple-500/20 bg-purple-950/40 p-3.5 text-center font-bold text-purple-300">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {COMPARISON.map(({ group, rows }) => (
                <FragmentRows key={group} group={group} rows={rows} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="mb-4 text-xl font-black md:text-2xl">Questions</h2>
        <Accordion type="single" collapsible className="rounded-2xl border border-white/10 bg-zinc-900/40 px-5">
          {FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q} className="border-white/10">
              <AccordionTrigger className="text-left text-sm font-semibold">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-zinc-400">
                {item.a}
                {item.link && <> <Link href={item.link.href} className="text-purple-300 hover:underline">{item.link.label} →</Link></>}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {!isPro && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-purple-500/30 bg-[#08070e]/95 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="hidden text-sm text-zinc-300 sm:block">
              <span className="font-bold text-white">Pro</span> · unlimited boards, private uploads, clean exports
            </p>
            <Button
              onClick={handleProAction}
              className="h-10 w-full gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-bold hover:from-purple-500 hover:to-indigo-500 sm:w-auto"
            >
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CustomCheckoutModal
        open={showCheckoutModal}
        onOpenChange={setShowCheckoutModal}
        initialPlan={selected.id}
        source="pricing_page"
      />
    </main>
  );
}

function FragmentRows({ group, rows }: { group: string; rows: { label: string; free: Cell; pro: Cell }[] }) {
  return (
    <>
      <tr className="bg-white/[0.03]">
        <td colSpan={3} className="p-2.5 text-[11px] font-bold uppercase tracking-wider text-purple-300">{group}</td>
      </tr>
      {rows.map((row) => (
        <tr key={row.label}>
          <td className="p-2.5 text-zinc-300">{row.label}</td>
          <td className="p-2.5 text-center"><CellValue value={row.free} /></td>
          <td className="border-l border-purple-500/10 bg-purple-950/20 p-2.5 text-center"><CellValue value={row.pro} pro /></td>
        </tr>
      ))}
    </>
  );
}
