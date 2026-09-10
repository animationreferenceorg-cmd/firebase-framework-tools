'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, UploadCloud, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadAnnouncementBannerProps {
  onUploadClick?: () => void;
  className?: string;
  source?: 'feed' | 'profile' | 'global';
}

const STORAGE_KEY = 'animref_upload_fix_announced_v1';

export const UploadAnnouncementBanner: React.FC<UploadAnnouncementBannerProps> = ({
  onUploadClick,
  className = '',
  source = 'global',
}) => {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const checkDismissed = () => {
      try {
        const dismissed = localStorage.getItem(STORAGE_KEY);
        setIsDismissed(dismissed === 'true');
      } catch {
        setIsDismissed(false);
      }
    };

    checkDismissed();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue === 'true') {
        setIsDismissed(true);
      }
    };
    const handleCustomDismiss = () => setIsDismissed(true);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('animref_upload_fix_dismissed', handleCustomDismiss);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('animref_upload_fix_dismissed', handleCustomDismiss);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      window.dispatchEvent(new Event('animref_upload_fix_dismissed'));
    } catch {
      // Ignore storage errors
    }
  };

  if (isDismissed) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-purple-950/60 via-zinc-950 to-emerald-950/40 p-4 sm:p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 ${className}`}
    >
      {/* Ambient background glow */}
      <div className="absolute -top-16 -right-16 w-52 h-52 bg-emerald-500/15 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-purple-600/15 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Upload Issues Resolved
            </span>
            <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Submissions are 100% Live
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Portfolio & Community Uploads Are Back!</span>
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0 hidden sm:inline" />
          </h3>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
            We fixed the storage permission errors. You can now publish your WIP animation passes, blocking reels, and finished portfolio pieces directly to your profile and community showcase.
            <span className="text-zinc-400 block sm:inline sm:ml-1">
              (Free accounts include 3 submissions; Pro accounts enjoy unlimited uploads!)
            </span>
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 pt-1 md:pt-0">
          {onUploadClick ? (
            <Button
              onClick={onUploadClick}
              className="flex-1 md:flex-initial h-10 sm:h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 gap-2 cursor-pointer transition-transform hover:scale-[1.02]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Submit Portfolio Piece</span>
            </Button>
          ) : (
            <Button
              asChild
              className="flex-1 md:flex-initial h-10 sm:h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-600 hover:from-emerald-400 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 gap-2 cursor-pointer transition-transform hover:scale-[1.02]"
            >
              <a href={source === 'feed' ? '#upload' : '/feed'}>
                <UploadCloud className="w-4 h-4" />
                <span>Submit Work Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}

          <button
            onClick={handleDismiss}
            aria-label="Dismiss announcement"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Dismiss announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
