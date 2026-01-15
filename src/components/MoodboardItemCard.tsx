'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player/lazy';
import type { Video, LocalImage } from '@/lib/types';

import { Skeleton } from '@/components/ui/skeleton';

interface MoodboardItemCardProps {
    video: Video | LocalImage;
    className?: string;
    onMaximize?: () => void;
    playbackSpeed?: number;
    hoverDelay?: number;
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

export function MoodboardItemCard({ video, className, onMaximize, playbackSpeed = 1.0, hoverDelay = 0 }: MoodboardItemCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (hoverDelay === 0) {
            setIsHovered(true);
            return;
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(true);
        }, hoverDelay);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(false);
    };

    const isVideo = 'videoUrl' in video;
    const imageUrl = isVideo
        ? (video as Video).thumbnailUrl || (video as Video).posterUrl || '/placeholder.jpg'
        : (video as LocalImage).url || '/placeholder.jpg';
    const title = isVideo ? (video as Video).title : '';


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
                alt={title || 'Moodboard Item'}

                fill
                className={cn(
                    "object-cover transition-opacity duration-300",
                    !isImageLoaded && "opacity-0",
                    isHovered && "opacity-0" // Hide image when playing
                )}
                onLoad={() => setIsImageLoaded(true)}
            />

            {/* Video Player (Preview) */}
            {isVideo && (video as Video).videoUrl && isHovered && (

                <div className="absolute inset-0 w-full h-full bg-black animate-in fade-in duration-300">
                    <Player
                        url={(video as Video).videoUrl}

                        playing={isHovered}
                        loop={true}
                        muted={true}
                        playbackRate={playbackSpeed}
                        playsinline={true}
                        controls={false}
                    />
                </div>
            )}

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
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm"
                    title="Maximize Video"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                </button>
            )}
        </div>
    );
}
