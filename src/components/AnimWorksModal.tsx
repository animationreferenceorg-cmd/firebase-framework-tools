'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, PenTool, SplitSquareVertical, Sliders, ExternalLink, Play, Check } from 'lucide-react';

interface AnimWorksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl?: string;
  videoTitle?: string;
}

export function AnimWorksModal({
  open,
  onOpenChange,
  videoUrl,
  videoTitle,
}: AnimWorksModalProps) {
  const handleLaunchReview = () => {
    const baseUrl = 'https://anim.works/review/new';
    const params = new URLSearchParams();
    if (videoUrl) params.set('video_url', videoUrl);
    if (videoTitle) params.set('title', videoTitle);
    params.set('source', 'animationreference.org');

    const targetUrl = videoUrl ? `${baseUrl}?${params.toString()}` : 'https://anim.works';
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#0e0a1a] border-purple-500/20 text-white p-6 md:p-8 rounded-2xl shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Community Partner Tool
            </span>
          </div>
          <DialogTitle className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-pink-200">
            Study & Review in Anim.works
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm leading-relaxed">
            Take any animation reference directly into Anim.works' precision animation review and critique studio.
          </DialogDescription>
        </DialogHeader>

        {/* Features List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-6">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <PenTool className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Frame Draw-Overs</h4>
            </div>
            <p className="text-xs text-zinc-400">Draw key poses, arcs of motion, and silhouette corrections directly over frames.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400">
                <SplitSquareVertical className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Side-by-Side Compare</h4>
            </div>
            <p className="text-xs text-zinc-400">Lock reference timing against your shot to check spacing, overlap, and weight.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Sliders className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Frame-by-Frame Scrub</h4>
            </div>
            <p className="text-xs text-zinc-400">Precision 24/30/60 FPS step playback with looping and custom breakdown markers.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Check className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Instant Export</h4>
            </div>
            <p className="text-xs text-zinc-400">Share critiques with fellow animators or your team in a single click.</p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            onClick={handleLaunchReview}
            className="w-full sm:flex-1 h-12 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            {videoUrl ? 'Open Reference in Review Tool' : 'Launch Anim.works Studio'}
            <ExternalLink className="w-4 h-4 ml-1" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-12 text-zinc-400 hover:text-white rounded-xl"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
