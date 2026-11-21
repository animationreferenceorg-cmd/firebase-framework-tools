'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Check, Film, ArrowRight, History, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PricingDialog } from '@/components/PricingDialog';
import { track } from '@/lib/analytics';
import { useIntroOffer } from '@/hooks/use-intro-offer';
import { useAuth } from '@/hooks/use-auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface VideoQuotaSlateProps {
  posterUrl?: string;
  unlockedCount?: number;
  todayCount?: number;
  limit?: number;
  isGuest?: boolean;
  onBrowseUnlocked?: () => void;
  className?: string;
}

export function VideoQuotaSlate({
  posterUrl,
  unlockedCount = 25,
  todayCount = 25,
  limit = 25,
  isGuest,
  onBrowseUnlocked,
  className = '',
}: VideoQuotaSlateProps) {
  const [showPricing, setShowPricing] = useState(false);
  const { shortPrice } = useIntroOffer();
  const { user, loading: authLoading } = useAuth();

  const isGuestMode = isGuest ?? (!authLoading && !user);

  useEffect(() => {
    track('upgrade_prompt_viewed', {
      trigger: isGuestMode ? 'guest_quota_limit' : 'daily_quota_limit',
      source: 'quota_slate',
      limit,
      count: isGuestMode ? unlockedCount : todayCount,
    });
  }, [isGuestMode, limit, unlockedCount, todayCount]);

  // Note the limit hit on the profile (once a day) so the next-day reminder
  // email can go to people who actually ran out.
  useEffect(() => {
    if (!user) return;
    const key = `animref:quota-hit-recorded:${user.uid}`;
    const today = new Date().toDateString();
    try {
      if (localStorage.getItem(key) === today) return;
      localStorage.setItem(key, today);
    } catch {
      // storage unavailable: still record, at worst more than once a day
    }
    updateDoc(doc(db, 'users', user.uid), { lastQuotaHitAt: serverTimestamp() }).catch(() => {});
  }, [user]);

  const signupHref = typeof window !== 'undefined'
    ? `/signup?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
    : '/signup';

  const openPricing = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    track('upgrade_prompt_clicked', {
      trigger: isGuestMode ? 'guest_quota_wall' : 'daily_quota_wall',
      source: 'quota_slate',
    });
    setShowPricing(true);
  };

  return (
    <div
      className={`relative w-full h-full min-h-[420px] flex items-center justify-center overflow-hidden bg-[#090713] text-white p-5 sm:p-8 select-none ${className}`}
    >
      {/* Warm blurred clip backdrop */}
      {posterUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-2xl scale-110 pointer-events-none"
          style={{ backgroundImage: `url(${posterUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090713]/85 via-[#0b0818]/92 to-[#090713] pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[320px] bg-violet-600/20 rounded-full blur-[110px] pointer-events-none" />

      {/* Warm Studio Upgrade Card */}
      <div className="relative z-10 max-w-2xl w-full rounded-3xl border border-violet-500/30 bg-[#110e1e]/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-violet-950/50 text-center flex flex-col items-center">
        {/* Progress Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/15 border border-violet-400/35 text-violet-200 text-[11px] font-extrabold tracking-wide uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>
            {isGuestMode
              ? `Great session! ${unlockedCount || 8}/8 free guest clips watched`
              : `You're on a roll! ${todayCount || limit}/${limit} daily studies complete`}
          </span>
        </div>

        {/* Warm, momentum-focused headline */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
          {isGuestMode
            ? 'Unlock 25 Free Daily Clips in 10 Seconds'
            : 'Keep Your Animation Momentum Going'}
        </h2>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-5 max-w-lg">
          {isGuestMode ? (
            <>
              Create a free animator account to unlock <strong className="text-emerald-300">25 fresh clips every day</strong>, save your watch history, and sync Moodboards straight into Maya &amp; Blender.
            </>
          ) : (
            <>
              Go Pro for unlimited reference studies, 24 FPS MP4 downloads, and <strong className="text-violet-200">unlimited Maya &amp; Blender Moodboard imports</strong>. Everything you&apos;ve watched today stays <span className="text-emerald-300 font-semibold">free to rewatch anytime</span>.
            </>
          )}
        </p>

        {/* Visual Plugin Preview Strip — Show, Don't Just Tell */}
        <div className="grid grid-cols-2 gap-3 w-full mb-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 aspect-[16/9]">
            <img
              src="/images/plugins/maya-studio-preview.jpg"
              alt="AnimRef Studio inside Autodesk Maya"
              className="h-full w-full object-cover opacity-90"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2.5 py-1.5 text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">Maya Studio Sync</span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 aspect-[16/9]">
            <img
              src="/images/plugins/blender-studio-preview.jpg"
              alt="AnimRef Studio inside Blender"
              className="h-full w-full object-cover opacity-90"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2.5 py-1.5 text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-300">Blender Studio Sync</span>
            </div>
          </div>
        </div>

        {/* Concise Perks Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left mb-6 bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 text-xs">
          <div className="flex items-center gap-2 text-zinc-200">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isGuestMode ? '25 free clips daily with free account' : 'Unlimited library studies & frame scrubbing'}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-200">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Unlimited Maya &amp; Blender Moodboard imports</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-200">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Clean 24 FPS MP4 downloads &amp; Contact Sheets</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-200">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Private NDA boards &amp; Playblast Compare</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          {isGuestMode ? (
            <>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Link
                  href={signupHref}
                  onClick={() => track('signup_prompt_clicked', { trigger: 'guest_quota_wall', source: 'quota_slate' })}
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={openPricing}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border-violet-400/40 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 text-xs font-bold cursor-pointer"
              >
                <span>Or Go Pro — {shortPrice}</span>
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              onClick={openPricing}
              className="w-full sm:w-auto h-11 px-7 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-[0_0_30px_rgba(139,92,246,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Unlock Unlimited Pro — {shortPrice}</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Button>
          )}

          {onBrowseUnlocked ? (
            <Button
              variant="outline"
              size="lg"
              onClick={onBrowseUnlocked}
              className="w-full sm:w-auto h-11 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
              <span>Rewatch Today&apos;s Clips</span>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-11 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              <Link href="/home">
                <History className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                <span>Rewatch Today&apos;s Clips</span>
              </Link>
            </Button>
          )}
        </div>

        {/* Trust / Reassurance Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Cancel anytime in 1 click
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-violet-400" />
            Free daily quota resets at midnight
          </span>
        </div>
      </div>

      <PricingDialog open={showPricing} onOpenChange={setShowPricing} />
    </div>
  );
}
