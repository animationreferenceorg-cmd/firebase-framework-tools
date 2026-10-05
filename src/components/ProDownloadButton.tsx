'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PricingDialog } from '@/components/PricingDialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { track } from '@/lib/analytics';
import { getEntitlements } from '@/lib/plans';
import { cn } from '@/lib/utils';

interface ProDownloadButtonProps {
  videoId: string;
  /** `icon` fits player toolbars; `labeled` fits headers and menus. */
  variant?: 'icon' | 'labeled';
  className?: string;
  stopPropagation?: boolean;
}

/**
 * One-click clean MP4 download. Free users see a PRO badge and the pricing
 * dialog; Pro users get the file. The server (/api/videos/[id]/download)
 * re-checks Pro, so this component is only presentation.
 */
export function ProDownloadButton({ videoId, variant = 'icon', className, stopPropagation = true }: ProDownloadButtonProps) {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const isPro = getEntitlements(userProfile).isPro;

  const handleClick = async (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    if (busy) return;
    if (!user || !isPro) {
      // The pricing dialog renders in a portal, which is invisible inside native fullscreen.
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      track('upgrade_prompt_viewed', { trigger: 'mp4_download', source: 'download_button' });
      setShowPricing(true);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/download`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        setShowPricing(true);
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.message || 'Could not start the download.');

      // Fetch as a blob so the browser saves the file instead of navigating to it.
      let href = data.url as string;
      let revoke = false;
      try {
        const file = await fetch(data.url);
        if (!file.ok) throw new Error('fetch failed');
        href = URL.createObjectURL(await file.blob());
        revoke = true;
      } catch {
        // Cross-origin host without CORS: fall back to a direct link.
      }
      const a = document.createElement('a');
      a.href = href;
      a.download = data.filename || 'reference.mp4';
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (revoke) setTimeout(() => URL.revokeObjectURL(href), 10_000);
      track('export_completed', { format: 'mp4', source: 'download_button' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Download unavailable', description: err.message || 'Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const Icon = busy ? Loader2 : Download;

  return (
    <>
      {variant === 'icon' ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClick}
          title={isPro ? 'Download MP4' : 'Download MP4 (Pro)'}
          className={cn('relative h-8 w-8 shrink-0 cursor-pointer rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:bg-transparent', className)}
        >
          <Icon className={cn('h-4 w-4', busy && 'animate-spin')} />
          {!isPro && <span className="absolute -right-1 -top-1 rounded bg-purple-600 px-1 text-[8px] font-black leading-3">PRO</span>}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={handleClick}
          title={isPro ? 'Download MP4' : 'Download MP4 (Pro)'}
          className={cn('h-10 shrink-0 cursor-pointer gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-zinc-200 hover:bg-white/10 hover:text-white', className)}
        >
          <Icon className={cn('h-4 w-4', busy && 'animate-spin')} />
          <span className="hidden text-xs font-semibold md:inline">Download MP4</span>
          {!isPro && <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[9px] font-black">PRO</span>}
        </Button>
      )}
      <PricingDialog open={showPricing} onOpenChange={setShowPricing} />
    </>
  );
}
