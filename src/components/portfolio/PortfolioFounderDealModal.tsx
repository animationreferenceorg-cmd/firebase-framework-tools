"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle2, ShieldCheck, Heart, ArrowRight, Lock, Users, Film } from 'lucide-react';
import { useDonate } from '@/hooks/use-donate';

interface PortfolioFounderDealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceedFree?: () => void;
}

export const PortfolioFounderDealModal: React.FC<PortfolioFounderDealModalProps> = ({
  open,
  onOpenChange,
  onProceedFree,
}) => {
  const { handleDonate, isCheckingOut } = useDonate();

  const handleClaimDeal = () => {
    // Triggers $2/mo Stripe checkout
    handleDonate('2');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[94vw] bg-zinc-950/95 backdrop-blur-2xl border border-purple-500/40 text-white rounded-3xl p-6 md:p-8 shadow-[0_0_60px_-10px_rgba(168,85,247,0.4)]">
        <DialogHeader className="space-y-2 text-center pb-2">
          <div className="flex justify-center">
            <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white font-black text-xs shadow-lg flex items-center gap-1.5 border border-purple-400/40 animate-pulse">
              <Sparkles className="h-3.5 w-3.5 fill-white text-white" />
              🎁 FREE 7-DAY TRIAL • $2 / MONTH LIFETIME DEAL
            </span>
          </div>

          <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
            Build & Share Your <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-purple-400">
              Animator Portfolio with Recruiters
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-zinc-300 max-w-md mx-auto">
            Get your custom artist URL (<span className="text-purple-300 font-mono font-semibold">/yourname</span>), share blocking passes & WIPs, and get discovered by studio directors.
          </DialogDescription>
        </DialogHeader>

        {/* Feature Highlights Grid */}
        <div className="space-y-2.5 py-3">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-pink-500/40">
            <Sparkles className="h-5 w-5 text-pink-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-extrabold text-white flex items-center gap-2">
                <span>🎁 Free 7-Day Trial Included</span>
                <Badge variant="outline" className="bg-pink-950 text-pink-300 border-pink-500/50 text-[9px] py-0 font-mono font-bold">
                  $0 TODAY
                </Badge>
              </div>
              <div className="text-[11px] text-zinc-200">Try all Pro features 100% free for 7 days. Cancel anytime before trial ends with $0 charged!</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-purple-950/40 border border-purple-500/20">
            <Users className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">Share Directly with Studio Recruiters</div>
              <div className="text-[11px] text-zinc-300">Clean, professional portfolio page to send to hiring managers & studio directors.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-pink-950/40 border border-pink-500/20">
            <Film className="h-5 w-5 text-pink-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">Interactive Frame Scrubber & Keyframe Covers</div>
              <div className="text-[11px] text-zinc-300">Scrub video frames to pick precise thumbnail keyframes for your WIP passes.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20">
            <Lock className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Lock in $2 / month for life!</span>
                <Badge variant="outline" className="bg-emerald-950 text-emerald-300 border-emerald-500/40 text-[9px] py-0 font-mono">
                  NEVER UPCHARGED
                </Badge>
              </div>
              <div className="text-[11px] text-zinc-300">You will NEVER be upcharged as long as your subscription stays active. If prices increase later, your $2 price is locked forever.</div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2.5 pt-2">
          <Button
            type="button"
            onClick={handleClaimDeal}
            disabled={isCheckingOut}
            className="w-full h-12 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl shadow-purple-600/30 gap-2 cursor-pointer hover:scale-[1.02] transition-all"
          >
            <Sparkles className="h-4 w-4 fill-white animate-pulse" />
            {isCheckingOut ? 'Opening Checkout...' : '🎁 Start 7-Day Free Trial (Then $2/mo Locked)'}
          </Button>

          {onProceedFree && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onProceedFree();
              }}
              className="w-full text-center text-xs text-zinc-400 hover:text-white py-1 transition-colors underline font-medium"
            >
              Continue with Free Portfolio (5 slots limit)
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
