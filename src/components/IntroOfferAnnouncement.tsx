'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useIntroOffer } from '@/hooks/use-intro-offer';
import { track } from '@/lib/analytics';

export function IntroOfferAnnouncement() {
  const pathname = usePathname();
  const { intro, terms } = useIntroOffer();

  if (!intro || (pathname !== '/' && pathname !== '/landing' && pathname !== '/home')) return null;

  const campaignKey = `animref:intro-announcement:${intro.label}:${intro.amountCents}:${intro.months}`;
  return <IntroOfferPopup key={campaignKey} campaignKey={campaignKey} label={intro.label} terms={terms} />;
}

function IntroOfferPopup({ campaignKey, label, terms }: { campaignKey: string; label: string; terms: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(campaignKey)) return;
      sessionStorage.setItem(campaignKey, '1');
    } catch {
      // The announcement can still open when session storage is unavailable.
    }
    setOpen(true);
  }, [campaignKey]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="z-[100] w-[calc(100%_-_2rem)] max-w-md gap-5 rounded-2xl border-amber-400/45 bg-gradient-to-br from-[#2b2016] via-[#17101f] to-[#0c0a12] p-6 text-white shadow-2xl sm:p-8">
        <Sparkles aria-hidden="true" className="h-8 w-8 text-amber-300" />
        <div className="space-y-2">
          <DialogTitle className="text-base font-bold text-amber-300">{label} on Pro</DialogTitle>
          <DialogDescription className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
            {terms}
          </DialogDescription>
          <p className="text-sm text-zinc-300">Available to new Pro monthly subscribers.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1 gap-2 bg-amber-300 font-bold text-zinc-950 hover:bg-amber-200">
            <Link href="/pricing" onClick={() => {
              setOpen(false);
              track('upgrade_prompt_clicked', { trigger: 'intro_announcement', source: 'popup' });
            }}>
              View Pro pricing <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
          <DialogClose asChild>
            <Button variant="ghost" className="text-zinc-300">Maybe later</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
