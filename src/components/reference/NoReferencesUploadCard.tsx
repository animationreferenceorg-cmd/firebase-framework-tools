'use client';

import React from 'react';
import { UploadCloud, Film, Sparkles, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DirectUploadDialog } from '@/components/reference/DirectUploadDialog';

interface NoReferencesUploadCardProps {
  query?: string;
  className?: string;
  onUploaded?: () => void;
  mediaType?: 'video' | 'image' | 'all';
}

function formatQueryTitle(q: string): string {
  return q
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function NoReferencesUploadCard({
  query = '',
  className = '',
  onUploaded,
  mediaType = 'all',
}: NoReferencesUploadCardProps) {
  const cleanQuery = query.trim();
  const formattedTitle = cleanQuery ? formatQueryTitle(cleanQuery) : 'New Animation Reference';
  const tagList = cleanQuery
    ? cleanQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(w => !['the', 'and', 'for', 'of', 'in', 'to', 'a', 'an'].includes(w))
        .join(', ')
    : 'animation, reference';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-dashed border-violet-500/30 bg-gradient-to-b from-violet-950/25 via-zinc-900/60 to-black/80 p-8 sm:p-12 text-center shadow-xl backdrop-blur-sm ${className}`}
    >
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-violet-600/15 blur-3xl" />

      <div className="relative z-10 max-w-lg mx-auto space-y-4">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300">
          <Sparkles className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
          <span>Community Reference Request</span>
        </div>

        {/* Catchy User Message */}
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {cleanQuery ? (
              <>Uh oh, we haven&apos;t added &ldquo;{cleanQuery}&rdquo; yet!</>
            ) : (
              <>Uh oh, no references found for these filters yet!</>
            )}
          </h3>
          <p className="text-sm font-medium text-violet-200/90">
            Feel free to upload references here!
          </p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto pt-1 leading-relaxed">
            {mediaType === 'video' || cleanQuery.toLowerCase().includes('animation') ? (
              <>
                Be the first animator to add video reference clips, acting takes, or movement breakdowns for{' '}
                <strong className="text-zinc-200">&ldquo;{cleanQuery || 'this movement'}&rdquo;</strong>.
              </>
            ) : (
              <>
                Be the first to share reference clips, studies, or turnaround sheets for{' '}
                <strong className="text-zinc-200">&ldquo;{cleanQuery || 'this reference'}&rdquo;</strong> with the animator community.
              </>
            )}
          </p>
        </div>

        {/* Upload Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <DirectUploadDialog
            initialTitle={formattedTitle}
            initialTags={tagList}
            onCreated={onUploaded}
            triggerLabel={cleanQuery ? `Upload "${cleanQuery}" reference` : 'Upload reference now'}
            triggerClassName="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 h-auto text-sm shadow-lg shadow-violet-600/25 border-0 transition-all hover:scale-[1.02] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

