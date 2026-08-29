'use client';

import { useEffect, useState } from 'react';
import { Check, Clipboard, Download, Share2, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { isAppInstalled } from '@/lib/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function MobileInstallDialog({
  children,
  defaultOpen = false,
  onOpenChange,
}: {
  children?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed/running in standalone mode
    setIsStandalone(isAppInstalled());

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast({
        title: 'Save to Home Screen',
        description: 'On iPhone/iPad, tap Share -> Add to Home Screen in Safari.',
      });
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast({ title: 'App installed!', description: 'Animation Reference is now on your home screen.' });
      setDeferredPrompt(null);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.startsWith('http')) {
        window.location.href = `/vault?url=${encodeURIComponent(text)}`;
      } else {
        toast({ variant: 'destructive', title: 'No link in clipboard', description: 'Copy a video or Instagram link first.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Permission denied', description: 'Open Clip a Link to paste manually.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="border-white/10 bg-black/40 hover:bg-purple-950/40 text-purple-300">
            <Smartphone className="mr-2 h-4 w-4" />
            Mobile App
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border-white/10 bg-zinc-950 text-white sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-purple-500/10 text-purple-400">
            <Smartphone className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">Use Animation Reference on Mobile</DialogTitle>
          <DialogDescription className="text-center text-xs text-zinc-400">
            Install the web app to your Home Screen to unlock 1-click mobile clipping from Instagram, YouTube, and TikTok.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Native Install Button if supported */}
          {!isStandalone && (
            <Button onClick={handleInstallClick} className="w-full bg-purple-600 hover:bg-purple-500 py-5 font-bold shadow-lg shadow-purple-950/50">
              <Download className="mr-2 h-5 w-5" />
              {deferredPrompt ? 'Install Web App Now' : 'Add App to Home Screen'}
            </Button>
          )}

          {isStandalone && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400">
              <Check className="h-4 w-4" />
              App is installed on your Home Screen!
            </div>
          )}

          {/* Step-by-step instructions */}
          <div className="grid gap-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-black/50 p-3.5 flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-bold text-purple-300">1</div>
              <div>
                <strong className="text-white">iPhone / iPad (Safari):</strong>
                <p className="text-zinc-400 mt-0.5">
                  Tap the <Share2 className="inline h-3.5 w-3.5 text-purple-300" /> Share button in Safari → scroll down and tap <strong className="text-white">&quot;Add to Home Screen&quot;</strong>.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/50 p-3.5 flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-bold text-purple-300">2</div>
              <div>
                <strong className="text-white">Android (Chrome / Edge):</strong>
                <p className="text-zinc-400 mt-0.5">
                  Tap the <strong className="text-white">⋮ Menu</strong> at top right → tap <strong className="text-white">&quot;Install App&quot;</strong> or &quot;Add to Home Screen&quot;.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/50 p-3.5 flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-bold text-purple-300">3</div>
              <div>
                <strong className="text-white">1-Click Native Mobile Share:</strong>
                <p className="text-zinc-400 mt-0.5">
                  When watching any Reel, TikTok, or YouTube video, tap Share → select Animation Reference to clip it instantly!
                </p>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <Button onClick={handlePasteFromClipboard} variant="outline" className="w-full border-white/10 hover:bg-white/5 text-xs">
              <Clipboard className="mr-2 h-4 w-4 text-purple-300" />
              Paste Copied Link from Mobile Clipboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
