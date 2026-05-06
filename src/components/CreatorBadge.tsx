'use client';

import React from 'react';
import { Instagram, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatorBadgeProps {
  uploader?: string;
  originalUrl?: string;
  videoUrl?: string;
  className?: string;
  size?: 'sm' | 'md';
  /** When true, uses group-hover/card to reveal. When false, always visible (for player overlay). */
  revealOnCardHover?: boolean;
}

/**
 * Subtle creator tag.
 * - Hidden at rest on the card
 * - Fades in on card hover showing "@username [link icon]"
 * - Clicking the icon opens the original post in a new tab
 */
export function CreatorBadge({
  uploader,
  originalUrl,
  videoUrl,
  className,
  size = 'md',
  revealOnCardHover = true,
}: CreatorBadgeProps) {
  const linkUrl = originalUrl || videoUrl;
  if (!linkUrl || !uploader) return null;

  const displayName = uploader.replace(/^@/, '');
  const isInstagram = linkUrl.toLowerCase().includes('instagram.com');

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(linkUrl, '_blank', 'noopener,noreferrer');
  };

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1.5';

  return (
    <div
      className={cn(
        'absolute bottom-10 left-2.5 z-[110] pointer-events-none',
        // Hidden by default, revealed on card hover
        revealOnCardHover
          ? 'opacity-0 translate-y-1 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-300'
          : 'opacity-100',
        className
      )}
    >
      <div className={cn(
        'flex items-center gap-1.5 rounded-full',
        'bg-black/60 backdrop-blur-md border border-white/15',
        'shadow-md',
        padding
      )}>
        {/* Creator name */}
        <span className={cn('text-white/90 font-medium whitespace-nowrap max-w-[140px] truncate', textSize)}>
          @{displayName}
        </span>

        {/* Divider */}
        <div className="w-px h-3 bg-white/20 flex-shrink-0" />

        {/* Link icon — this part IS clickable */}
        <button
          onClick={handleLinkClick}
          className={cn(
            'pointer-events-auto flex items-center justify-center rounded-full p-0.5',
            'text-white/70 hover:text-white transition-colors duration-150',
            'hover:bg-white/10'
          )}
          title={`View ${uploader}'s original post`}
        >
          {isInstagram ? (
            <Instagram className={iconSize} />
          ) : (
            <ExternalLink className={iconSize} />
          )}
        </button>
      </div>
    </div>
  );
}
