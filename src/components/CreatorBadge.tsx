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
}

/**
 * A subtle, expandable creator badge.
 * - Resting: shows creator's initial in a small circle
 * - Hover: expands to show full creator name + link icon
 */
export function CreatorBadge({ uploader, originalUrl, videoUrl, className, size = 'md' }: CreatorBadgeProps) {
  // Determine the best URL to link to
  const linkUrl = originalUrl || videoUrl;
  if (!linkUrl || !uploader) return null;

  const initial = uploader.charAt(0).toUpperCase();
  const isInstagram = linkUrl.toLowerCase().includes('instagram.com');

  // Display name: strip leading @, truncate if too long
  const displayName = uploader.replace(/^@/, '');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(linkUrl, '_blank', 'noopener,noreferrer');
  };

  const circleSize = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs';

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group/badge absolute top-2.5 left-2.5 z-[110] flex items-center cursor-pointer select-none',
        className
      )}
      title={`View ${uploader}'s original post`}
    >
      {/* Expanding pill container */}
      <div className={cn(
        'flex items-center overflow-hidden rounded-full',
        'bg-black/60 backdrop-blur-md border border-white/20',
        'transition-all duration-300 ease-in-out',
        'max-w-[32px] group-hover/badge:max-w-[220px]',
        'shadow-md hover:shadow-lg'
      )}>
        {/* Creator initial avatar */}
        <div className={cn(
          'flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white bg-gradient-to-br from-purple-500 to-pink-500',
          circleSize
        )}>
          {initial}
        </div>

        {/* Expanded content - hidden until hover */}
        <div className="flex items-center gap-1.5 pr-2 pl-1.5 opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          <span className="text-white text-[11px] font-medium max-w-[120px] truncate">
            @{displayName}
          </span>
          <div className="w-px h-3 bg-white/20 flex-shrink-0" />
          {isInstagram ? (
            <Instagram className="w-3 h-3 text-pink-400 flex-shrink-0" />
          ) : (
            <ExternalLink className="w-3 h-3 text-blue-400 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
