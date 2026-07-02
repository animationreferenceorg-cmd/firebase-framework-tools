
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, History, Clock, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FeedbackModal } from "./FeedbackModal";

const RECENT_UPDATES = [
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
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4 mb-6 space-y-3">
          <div className="flex flex-col space-y-1">
            <h4 className="text-sm font-semibold text-white">Share Your Feedback</h4>
            <p className="text-xs text-zinc-400">
              Have ideas for features or suggestions? We'd love to hear from you.
            </p>
          </div>
          <div className="flex justify-start">
            <div className="w-32">
              <FeedbackModal />
            </div>
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
              <p className="text-sm text-zinc-400 leading-relaxed">
                {update.description}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
