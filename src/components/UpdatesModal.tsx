
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
import { Sparkles, History, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FeedbackModal } from "./FeedbackModal";
import { MessageSquare } from "lucide-react";

const RECENT_UPDATES = [
  {
    date: 'May 6, 2026',
    title: 'Short Films Library Expansion',
    description: 'Added 30+ curated animated short films with dynamic carousels for Action, Creature, and Surreal animation.',
    type: 'Feature'
  },
  {
    date: 'May 5, 2026',
    title: 'AI Cover Art',
    description: 'Generated custom cinematic cover art for featured short films to provide a premium, consistent aesthetic.',
    type: 'UI/UX'
  },
  {
    date: 'May 4, 2026',
    title: 'Admin Panel Improvements',
    description: 'Fixed video metadata fetching and added instant YouTube thumbnail generation.',
    type: 'Fix'
  },
  {
    date: 'May 3, 2026',
    title: 'Personalized History',
    description: 'Recently viewed categories are now tracked and displayed on your home dashboard.',
    type: 'Feature'
  }
];

export function UpdatesModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors group">
          <History className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span>Recent Updates</span>
        </button>
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

        <div className="mt-4 pt-6 border-t border-white/10 space-y-4">
          <div className="flex flex-col items-center text-center space-y-1">
            <h4 className="text-sm font-medium text-zinc-200">Help us improve</h4>
            <p className="text-xs text-zinc-500">
              Have thoughts on these updates or suggestions for what's next?
            </p>
          </div>
          <div className="flex justify-center">
            <div className="w-48">
              <FeedbackModal />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
