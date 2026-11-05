'use client';

import React, { useEffect, useState } from 'react';
import { Instagram, Sparkles, ExternalLink, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, INSTAGRAM_EVENT_NAME, type InstagramPromptReason } from '@/lib/social-links';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const FOLLOWED_KEY = 'animref:ig-followed-v1';
const DISMISSED_AT_KEY = 'animref:ig-prompt-dismissed-at';
const ACTION_COUNT_KEY = 'animref:ig-action-count';
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days cooldown if dismissed

/**
 * Header / Sidebar compact pill with an Instagram Story gradient ring.
 */
export function InstagramHeaderPill({ className, variant = 'header' }: { className?: string; variant?: 'header' | 'sidebar' }) {
  const handleClick = () => {
    try {
      localStorage.setItem(FOLLOWED_KEY, '1');
    } catch {}
    track('instagram_follow_clicked', { source: variant });
  };

  if (variant === 'sidebar') {
    return (
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={cn(
          'group relative flex items-center justify-between gap-2.5 rounded-xl border border-pink-500/25 bg-gradient-to-r from-purple-950/60 via-pink-950/40 to-amber-950/30 px-3 py-2.5 text-xs text-white transition-all hover:border-pink-400/50 hover:shadow-[0_8px_25px_-8px_rgba(236,72,153,0.45)]',
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[1.5px] shadow-sm">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-[#120f1d]">
              <Instagram className="h-3.5 w-3.5 text-pink-400 transition-transform group-hover:scale-110" />
            </span>
          </span>
          <div className="truncate text-left">
            <div className="font-bold text-white leading-tight flex items-center gap-1">
              <span>@{INSTAGRAM_HANDLE}</span>
            </div>
            <div className="text-[10px] text-pink-200/75 truncate">Daily animation reels &amp; breakdowns</div>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm group-hover:from-pink-400 group-hover:to-purple-500">
          Follow
        </span>
      </a>
    );
  }

  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title={`Follow @${INSTAGRAM_HANDLE} on Instagram for daily animation references`}
      className={cn(
        'squash group relative inline-flex items-center gap-1.5 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 shadow-[0_6px_20px_-6px_rgba(236,72,153,0.5)] transition-transform hover:scale-105',
        className
      )}
    >
      <span className="flex items-center gap-1.5 rounded-full bg-[#13101f]/95 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md transition-colors group-hover:bg-[#13101f]/80">
        <Instagram className="h-3.5 w-3.5 text-pink-400" />
        <span className="hidden lg:inline">@{INSTAGRAM_HANDLE}</span>
        <span className="lg:hidden">IG</span>
      </span>
    </a>
  );
}

/**
 * Full-width Spotlight Card for the Browse (/home) and Landing (/landing) pages
 * inviting the 12,000+ animator community to follow @animationreference on Instagram.
 */
export function InstagramCommunitySpotlight({ className }: { className?: string }) {
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(FOLLOWED_KEY) === '1') setFollowed(true);
    } catch {}
  }, []);

  const handleFollow = () => {
    try {
      localStorage.setItem(FOLLOWED_KEY, '1');
    } catch {}
    setFollowed(true);
    track('instagram_follow_clicked', { source: 'spotlight_card' });
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-pink-500/25 bg-gradient-to-r from-[#170f26] via-[#1f1129] to-[#191024] p-6 sm:p-8 shadow-[0_20px_60px_-20px_rgba(236,72,153,0.3)]',
        className
      )}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-amber-500/20 via-pink-500/25 to-purple-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          {/* Instagram Story Ring Avatar */}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleFollow}
            className="group relative shrink-0 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[2.5px] shadow-xl shadow-pink-950/50 transition-transform hover:scale-105"
          >
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-[14px] bg-[#0e0b16]">
              <Instagram className="h-7 w-7 sm:h-8 sm:w-8 text-pink-400 transition-transform group-hover:rotate-6 group-hover:scale-110" />
            </div>
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-500 to-amber-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow">
              Reels
            </span>
          </a>

          <div className="space-y-1.5 text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/30 bg-pink-500/10 px-2.5 py-0.5 text-[11px] font-bold text-pink-200">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span>Join 12,000+ Animators</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Get daily frame-by-frame reels on Instagram{' '}
              <span className="bg-gradient-to-r from-amber-300 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                @{INSTAGRAM_HANDLE}
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              We post daily curated sakuga, 3D acting takes, combat choreography, and timing breakdowns straight to your feed—with full creator credits and direct links back to study at 24 FPS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <Button
            asChild
            onClick={handleFollow}
            className="w-full md:w-auto h-11 px-6 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:from-amber-400 hover:via-pink-400 hover:to-purple-500 text-white shadow-lg shadow-pink-950/50 border border-white/15 cursor-pointer transition-transform hover:scale-105"
          >
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
              {followed ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Following @{INSTAGRAM_HANDLE}</span>
                </>
              ) : (
                <>
                  <Instagram className="h-4 w-4" />
                  <span>Follow @{INSTAGRAM_HANDLE}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </>
              )}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Smart Post-Action Toast/Card that slides in when a user saves a clip to a board,
 * likes a reference, or downloads an MP4 — converting engaged site users into IG followers.
 */
export function InstagramSmartFollowPrompt() {
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<InstagramPromptReason>('save');

  useEffect(() => {
    const canShow = () => {
      try {
        if (localStorage.getItem(FOLLOWED_KEY) === '1') return false;
        const dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY) || 0);
        if (dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return false;
        return true;
      } catch {
        return true;
      }
    };

    const handleTrigger = (e: Event) => {
      if (!canShow()) return;
      const customEvent = e as CustomEvent<{ reason?: InstagramPromptReason }>;
      setReason(customEvent.detail?.reason || 'save');
      setTimeout(() => {
        setVisible(true);
        track('instagram_prompt_shown', { trigger: customEvent.detail?.reason || 'save' });
      }, 900);
    };

    window.addEventListener(INSTAGRAM_EVENT_NAME, handleTrigger);

    // Also show once after the user has browsed for 45 seconds if they haven't seen it yet
    let browseTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const count = Number(localStorage.getItem(ACTION_COUNT_KEY) || 0) + 1;
      localStorage.setItem(ACTION_COUNT_KEY, String(count));
      if (count >= 2 && canShow()) {
        browseTimer = setTimeout(() => {
          if (canShow()) {
            setReason('browse');
            setVisible(true);
            track('instagram_prompt_shown', { trigger: 'browse_session' });
          }
        }, 45000);
      }
    } catch {}

    return () => {
      window.removeEventListener(INSTAGRAM_EVENT_NAME, handleTrigger);
      if (browseTimer) clearTimeout(browseTimer);
    };
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {}
  };

  const handleFollow = () => {
    try {
      localStorage.setItem(FOLLOWED_KEY, '1');
    } catch {}
    track('instagram_follow_clicked', { source: `smart_prompt_${reason}` });
    setTimeout(() => setVisible(false), 400);
  };

  const headlineByReason: Record<InstagramPromptReason, string> = {
    save: 'Saved to your board! Want daily references on Instagram?',
    like: 'Great taste! Get daily animation clips on our Instagram',
    download: 'MP4 downloading! Follow us on Instagram for daily reels',
    browse: 'Join our 12,000+ animator community on Instagram',
  };

  return (
    <div className="fixed bottom-5 right-5 z-[180] max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-pink-500/35 bg-[#120d1d]/95 p-4 text-white shadow-[0_20px_50px_-12px_rgba(236,72,153,0.45)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-amber-400/25 via-pink-500/25 to-purple-600/25 blur-2xl" />

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2.5 top-2.5 rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          aria-label="Dismiss Instagram prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-start gap-3.5 pr-4">
          <div className="shrink-0 rounded-xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[2px] shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#120d1d]">
              <Instagram className="h-5 w-5 text-pink-400" />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <div className="text-xs font-extrabold text-white leading-snug">
              {headlineByReason[reason]}
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Follow <span className="font-bold text-pink-300">@{INSTAGRAM_HANDLE}</span> for daily sakuga, acting breakdowns &amp; body mechanics reels.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleFollow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 px-3 py-1.5 text-[11px] font-black text-white shadow hover:opacity-95 transition-opacity"
              >
                <Instagram className="h-3.5 w-3.5" />
                <span>Follow @{INSTAGRAM_HANDLE}</span>
              </a>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-2 py-1 text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

