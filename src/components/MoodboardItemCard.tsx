'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player';
import type { Video, LocalImage } from '@/lib/types';
import { Film } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CreatorBadge } from '@/components/CreatorBadge';
import { isVideoSourceAvailable, sanitizeVideoUrl } from '@/lib/video-availability';
import { needsUnoptimized } from '@/components/BrowseDirectory';
import { useWatchTracker } from '@/hooks/use-watch-tracker';

interface MoodboardItemCardProps {
    video: Video | LocalImage;
    className?: string;
    onMaximize?: () => void;
    playbackSpeed?: number;
    hoverDelay?: number;
}

function getPreviewUrl(url?: string): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('playlist.m3u8')) {
        return trimmed.replace('playlist.m3u8', 'play_480p.mp4');
    }
    return trimmed;
}

// Client-side only player wrapper
function Player({ playerRef, ...props }: any) {
    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => setHasMounted(true), []);
    if (!hasMounted) return null;

    return (
        <ReactPlayer
            ref={playerRef}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            onError={(err: any) => console.warn("Moodboard player error:", err)}
            {...props}
        />
    );
}

export function MoodboardItemCard({ video, className, onMaximize, playbackSpeed = 1.0, hoverDelay = 180 }: MoodboardItemCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);
    const [isPreviewReady, setIsPreviewReady] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { beginWatch, endWatch } = useWatchTracker();

    const hoverKey = `hover:moodboard:${'id' in video ? video.id : (video as { url?: string }).url ?? 'item'}`;

    const isVideo = 'videoUrl' in video;
    const rawVideoUrl = isVideo ? (video as Video).videoUrl : undefined;
    const isAvailable = isVideo ? isVideoSourceAvailable(rawVideoUrl) : true;
    const cleanVideoUrl = isVideo && rawVideoUrl ? getPreviewUrl(sanitizeVideoUrl(rawVideoUrl)) : '';
    const rawImageUrl = isVideo
        ? (video as Video).thumbnailUrl || (video as Video).posterUrl || ''
        : (video as LocalImage).url || '';
    const isInstagramImage = rawImageUrl.includes('cdninstagram.com') || rawImageUrl.includes('fbcdn.net');
    const canUseImage = rawImageUrl && !hasImageError && !isInstagramImage;
    const title = isVideo ? (video as Video).title : '';

    useEffect(() => {
        if (isHovered && videoRef.current) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {});
            }
        } else if (!isHovered && videoRef.current) {
            videoRef.current.pause();
            try {
                videoRef.current.currentTime = 0;
            } catch {}
        }
    }, [isHovered]);

    useEffect(() => {
        setIsPreviewReady(false);
        setHasImageError(false);
    }, [video]);

    const handleMouseEnter = () => {
        beginWatch(hoverKey, 'hover');
        if (hoverDelay === 0) {
            setIsHovered(true);
            return;
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(true);
        }, hoverDelay);
    };

    const handleMouseLeave = () => {
        endWatch(hoverKey);
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(false);
    };

    if (!isAvailable) {
        return (
            <div className={cn("relative w-full h-full bg-zinc-950/80 rounded-lg overflow-hidden border border-white/10 p-3 flex flex-col items-center justify-center text-center", className)}>
                <Film className="h-6 w-6 text-zinc-600 mb-2" />
                <p className="text-[11px] font-semibold text-zinc-400 line-clamp-1">{title || 'Reference'}</p>
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1">Host Offline</span>
            </div>
        );
    }

    return (
        <div
            className={cn("moodboard-protected-media relative w-full h-full bg-black rounded-lg overflow-hidden group border border-white/10 select-none", className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onContextMenu={(e) => e.preventDefault()}
        >
            {!isImageLoaded && !hasImageError && canUseImage && <Skeleton className="absolute inset-0 bg-zinc-800" />}

            {/* Thumbnail */}
            {canUseImage ? (
                <Image
                    src={rawImageUrl}
                    alt={title || 'Moodboard Item'}
                    fill
                    draggable={false}
                    unoptimized={needsUnoptimized(rawImageUrl)}
                    style={{ userSelect: 'none' }}
                    className={cn(
                        "object-cover transition-opacity duration-300 pointer-events-none select-none",
                        !isImageLoaded && "opacity-0"
                    )}
                    onLoad={() => setIsImageLoaded(true)}
                    onError={() => setHasImageError(true)}
                />
            ) : cleanVideoUrl ? (
                <video
                    src={cleanVideoUrl + '#t=0.1'}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full h-full object-cover pointer-events-none select-none"
                />
            ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                    <Film className="h-6 w-6 text-zinc-700" />
                </div>
            )}

            {/* Video Player (Preview on hover) */}
            {isVideo && cleanVideoUrl && (
                <video
                    ref={videoRef}
                    src={cleanVideoUrl}
                    preload="metadata"
                    muted
                    loop
                    playsInline
                    draggable={false}
                    onCanPlay={() => setIsPreviewReady(true)}
                    style={{ userSelect: 'none' }}
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none z-10 select-none",
                        isHovered && isPreviewReady ? "opacity-100" : "opacity-0"
                    )}
                />
            )}

            {/* Transparent DRM Shield barrier preventing browser direct media grabs */}
            <div className="absolute inset-0 z-[12] pointer-events-none select-none" />

            {/* Overlay Title */}
            {title && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-[10px] text-white font-medium truncate">{title}</p>
                </div>
            )}

            {/* Maximize Button - Top Right */}
            {onMaximize && isVideo && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onMaximize();
                    }}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm cursor-pointer"
                    title="Maximize Video"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                </button>
            )}

            {/* Subtle creator badge — top-left */}
            {isVideo && (
                <CreatorBadge
                    uploader={(video as any).uploader}
                    originalUrl={(video as any).originalUrl}
                    videoUrl={(video as any).videoUrl}
                    size="sm"
                />
            )}
        </div>
    );
}
