'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Plus, Share } from 'lucide-react';
import { isAppInstalled } from '@/lib/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as desktop Safari
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  // Chrome and Firefox on iOS cannot add to the home screen at all.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOSDevice && isSafari;
}

/**
 * Slim drop-down install banner.
 *
 * Two very different jobs behind one bar:
 * - Android/Chrome fires `beforeinstallprompt`, so one tap installs.
 * - iOS has no programmatic install at all — Safari only offers it through the
 *   Share sheet — so there we show the exact gesture instead of a button that
 *   would do nothing.
 */
export function MobileInstallBanner({
  onDismiss,
}: {
  onDismiss?(): void;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setIos(isIosSafari());
    setInstalled(isAppInstalled());

    const handleBeforeInstall = (event: Event) => {
      // Suppress Chrome's own mini-infobar so this banner is the only prompt.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const close = () => {
    setLeaving(true);
    // Let the slide-up finish before unmounting.
    window.setTimeout(() => onDismiss?.(), 200);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setInstalled(true);
    close();
  };

  // Nothing useful to offer: already installed, or a browser that can neither
  // install programmatically nor add to the home screen (Chrome/Firefox on iOS).
  if (installed) return null;
  if (!deferredPrompt && !ios) return null;

  return (
    <div
      role="dialog"
      aria-label="Add Animation Reference to your home screen"
      className={[
        'fixed inset-x-3 top-3 z-[200] md:hidden',
        'rounded-2xl bg-white text-zinc-900',
        'shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-black/5',
        leaving
          ? 'animate-out fade-out slide-out-to-top-4 duration-200'
          : 'animate-in fade-in slide-in-from-top-4 duration-300',
        'motion-reduce:animate-none',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 p-3">
        <Image
          src="/icon.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl object-cover"
          unoptimized
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">Animation Reference</p>
          {ios ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs leading-snug text-zinc-600">
              Tap
              <Share className="inline h-3.5 w-3.5 shrink-0 text-[#007AFF]" aria-label="Share" />
              then <span className="font-medium text-zinc-900">Add to Home Screen</span>
            </p>
          ) : (
            <p className="mt-0.5 truncate text-xs leading-snug text-zinc-600">
              Add it to your home screen
            </p>
          )}
        </div>

        {!ios && (
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
          >
            <Plus className="mr-1 inline h-4 w-4 align-[-2px]" />
            Add
          </button>
        )}

        <button
          type="button"
          onClick={close}
          aria-label="Dismiss"
          className="-mr-1 shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
