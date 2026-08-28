
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, History, Clock, Megaphone, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const RECENT_UPDATES = [
  {
    date: 'August 27, 2026',
    title: 'Paint Beta, Reference Clips, Free Portfolios & Updated Boards',
    description: 'Try the new Paint workspace in beta, collect exact motion moments in Reference Clips, submit your animation portfolio for free, and organize saved inspiration with redesigned Boards.',
    type: 'New',
    href: '/references',
    cta: 'Explore the new tools',
  },
  {
    date: 'August 1, 2026',
    title: 'Profile UI & Username Enhancements',
    description: 'Added username display on profile and public pages, removed "Available for Hire" badge, enabled bio editing, fixed syntax errors, and improved username claim flow with welcome emails.',
    type: 'Feature',
  },
  {
    date: 'July 31, 2026',
    title: 'Donation Tiers & Community Promotion',
    description: 'Implemented $5 donation tier modal with 7‑day free trial, $2 lifetime founder deal, and added bento‑box style promotion in community tab. Enabled follow/subscribe for artists.',
    type: 'Feature',
  },
  {

    date: 'July 3, 2026',
    title: 'Frame Counter & Performance Fixes',
    description: 'We have introduced new features and resolved several bugs to improve your browsing experience. Thank you all for your continued support and feedback!\n\n• Added a precise frame counter and frame-by-frame scrubbing tools to all video players.\n• Fixed laggy or unresponsive hover-to-play video previews so they load instantly.\n• Fixed broken thumbnails on community-uploaded video posts.\n• Updated subscription billing flows to accurately reflect chosen plan tiers on upgrade.\n• Patched checkout issues to prevent duplicate plan subscriptions.',
    type: 'Update'
  },
  {
    date: 'July 1, 2026',
    title: 'Moodboard Toolkit',
    description: 'Build reference boards with sticky notes, text, shapes, freehand drawing, and connection lines — drag any video reference straight onto the canvas.',
    type: 'Feature'
  },
  {
    date: 'June 24, 2026',
    title: 'Articles & Learning Resources',
    description: 'Launched in-depth articles and resource guides covering the 12 principles, combat and locomotion reference, and how to analyze animation.',
    type: 'Feature'
  },
  {
    date: 'June 10, 2026',
    title: 'Recently Viewed Categories',
    description: 'Your home dashboard now remembers and surfaces the categories you have been browsing.',
    type: 'Feature'
  },
  {
    date: 'May 6, 2026',
    title: 'Short Films Library Expansion',
    description: 'Added 30+ curated animated short films with dynamic carousels for Action, Creature, and Surreal animation.',
    type: 'Feature'
  },
  {
    date: 'May 4, 2026',
    title: 'Admin Panel Improvements',
    description: 'Fixed video metadata fetching and added instant YouTube thumbnail generation.',
    type: 'Fix'
  }
];

interface UpdatesModalProps {
  /** 'sidebar' renders the full-width sidebar row; 'header' renders a compact icon button. */
  variant?: 'sidebar' | 'header';
}

export function UpdatesModal({ variant = 'sidebar' }: UpdatesModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {variant === 'header' ? (
          <button
            aria-label="Announcements"
            title="Announcements — what's new"
            className="relative flex items-center justify-center h-9 w-9 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors group"
          >
            <Megaphone className="h-[18px] w-[18px] transition-transform group-hover:scale-110" />
            {/* "New" indicator dot */}
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </button>
        ) : (
          <button className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors group">
            <History className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span>Recent Updates</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-white/10 text-white max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What's New
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Keep track of the latest features and improvements to Animation Reference.
          </DialogDescription>
        </DialogHeader>

        {/* Highlight stat */}
        <div className="rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4 mb-4">
          <p className="text-sm text-zinc-300">
            <span className="font-semibold text-primary">300+ references</span> added this month
          </p>
        </div>

        {/* Feedback CTA - prominent at top */}
        <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 mb-6 space-y-3">
          <div className="flex flex-col space-y-1">
            <h4 className="text-sm font-bold text-white">Share Your Feedback</h4>
            <p className="text-xs text-zinc-400">
              Have ideas for features or suggestions? Track your feedback threads and admin replies on your feedback page.
            </p>
          </div>
          <div className="flex justify-start">
            <Link href="/feedback">
              <Button size="sm" className="bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] hover:bg-purple-600 text-white font-bold rounded-xl text-xs gap-1.5 shadow-md">
                <MessageSquare className="h-3.5 w-3.5" />
                Go to Feedback Page
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-6 py-4">
          {RECENT_UPDATES.map((update, index) => (
            <div key={index} className="relative pl-6 border-l border-white/10 space-y-1">
              <div className="absolute left-[-5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {update.date}
                </span>
                <Badge variant="outline" className="text-[10px] h-4 border-white/10 bg-white/5">
                  {update.type}
                </Badge>
              </div>
              <h3 className="font-semibold text-zinc-100">{update.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {update.description}
              </p>
              {'href' in update && update.href && (
                <Link
                  href={update.href}
                  className="mt-2 inline-flex items-center text-xs font-bold text-purple-300 transition-colors hover:text-purple-200"
                >
                  {update.cta} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
