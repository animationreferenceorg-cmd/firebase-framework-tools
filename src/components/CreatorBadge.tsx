'use client';

import React from 'react';
import { Instagram, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatorBadgeProps {
  uploader?: string;
  originalUrl?: string;
  videoUrl?: string;
  avatarUrl?: string;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Subtle creator badge — top left of video cards.
 * - Resting: small frosted circle showing the creator's avatar or initial
 * - Hover the VIDEO CARD (group/card): pill expands to show "@username [link icon]"
 * - Click anywhere on it to open the original post in a new tab
 */
export function CreatorBadge({
  uploader,
  originalUrl,
  videoUrl,
  avatarUrl,
  className,
  size = 'md',
}: CreatorBadgeProps) {
  const linkUrl = originalUrl || videoUrl;
  if (!linkUrl || !uploader) return null;

  const displayName = uploader.replace(/^@/, '');
  const isInstagram = linkUrl.toLowerCase().includes('instagram.com');
  const initial = displayName.charAt(0).toUpperCase();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(linkUrl, '_blank', 'noopener,noreferrer');
  };

  const circleSize = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div
      onClick={handleClick}
      title={`View @${displayName}'s original post`}
      className={cn(
        'absolute top-2.5 left-2.5 z-[110] cursor-pointer select-none',
        className
      )}
    >
      {/* Expanding pill — expands when the parent CARD or badge is hovered */}
      <div className={cn(
        'flex items-center overflow-hidden rounded-full group/badge',
        'bg-black/65 backdrop-blur-md border border-white/20 hover:border-purple-400/50 shadow-lg shadow-black/40',
        'transition-all duration-300 ease-in-out',
        // Collapsed to just the circle width; expands on card hover or badge hover
        'max-w-[32px] group-hover/card:max-w-[220px] hover:max-w-[220px]',
      )}>
        {/* Creator avatar image or initial */}
        <div className={cn(
          'flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white overflow-hidden',
          'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-inner',
          circleSize
        )}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>

        {/* Expanded content — fades in on card hover or badge hover */}
        <div className="flex items-center gap-1.5 pr-2.5 pl-1.5 opacity-0 group-hover/card:opacity-100 group-hover/badge:opacity-100 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          <span className={cn('text-white font-medium max-w-[120px] truncate', textSize)}>
            @{displayName}
          </span>
          <div className="w-px h-3 bg-white/25 flex-shrink-0" />
          {isInstagram ? (
            <Instagram className={cn(iconSize, 'text-pink-400 flex-shrink-0')} />
          ) : (
            <ExternalLink className={cn(iconSize, 'text-purple-300 flex-shrink-0')} />
          )}
        </div>
      </div>
    </div>
  );
}
