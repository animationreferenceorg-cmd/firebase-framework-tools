'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player/lazy';
import type { Video } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface MoodboardItemCardProps {
    video: Video;
    className?: string;
    onMaximize?: () => void;
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
            {...props}
        />
    )
}

export function MoodboardItemCard({ video, className, onMaximize }: MoodboardItemCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(true);
        }, 1500); // 1.5s delay to prevent accidental playback
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(false);
    };

    const imageUrl = video.thumbnailUrl || video.posterUrl || '/placeholder.jpg';

    return (
        <div
            className={cn("relative w-full h-full bg-black rounded-lg overflow-hidden group border border-white/10", className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {!isImageLoaded && <Skeleton className="absolute inset-0 bg-zinc-800" />}

            {/* Thumbnail */}
            <Image
                src={imageUrl}
                alt={video.title}
                fill
                className={cn(
                    "object-cover transition-opacity duration-300",
                    !isImageLoaded && "opacity-0",
                    isHovered && "opacity-0" // Hide image when playing
                )}
                onLoad={() => setIsImageLoaded(true)}
            />

            {/* Video Player (Preview) */}
            {video.videoUrl && isHovered && (
                <div className="absolute inset-0 w-full h-full bg-black animate-in fade-in duration-300">
                    <Player
                        url={video.videoUrl}
                        playing={isHovered}
                        loop={true}
                        muted={true}
                        playsinline={true}
                        controls={false}
                    />
                </div>
            )}

            {/* Overlay Title */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="text-[10px] text-white font-medium truncate">{video.title}</p>
            </div>

            {/* Maximize Button */}
            {onMaximize && (
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onMaximize();
                    }}
                    className="absolute top-2 left-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm"
                    title="Fullscreen"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                </button>
            )}
        </div>
    );
}
