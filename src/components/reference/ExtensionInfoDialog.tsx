'use client';

import { useState } from 'react';
import { Chrome, ExternalLink, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function ExtensionInfoDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="border-white/10 bg-black/40 hover:bg-purple-950/40 text-purple-300">
            <Chrome className="mr-2 h-4 w-4" />
            Extension
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-md text-center">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl border border-purple-500/30 bg-purple-950/40 text-purple-300">
            <Chrome className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl font-bold">Clip & Save Browser Extension</DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            One-click reference clipping directly inside YouTube, Instagram, Vimeo, and Twitter on your computer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs text-left">
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Sparkles className="h-4 w-4 text-amber-400" />
              What the extension does:
            </div>
            <ul className="space-y-1.5 text-zinc-400 pl-5 list-disc">
              <li>Scraps timestamp in/out points right over any web player</li>
              <li>Auto-attributes creator credit and channel info</li>
              <li>Saves directly to your Vault and project boards</li>
            </ul>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-xs text-amber-100">
            Chrome Web Store listing coming soon. Until then, download the plugin for manual installation.
          </div>
          <Button asChild variant="outline" className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10">
            <a href="/downloads/animation-reference-clip-save.zip" download>
              <Chrome className="mr-2 h-4 w-4" />
              Download Chrome Plugin
            </a>
          </Button>
          <Button asChild className="w-full bg-purple-600 hover:bg-purple-500 font-bold py-5">
            <Link href="/extension/connect">
              <Chrome className="mr-2 h-4 w-4" />
              Connect Extension to Vault
              <ExternalLink className="ml-auto h-4 w-4 opacity-70" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
