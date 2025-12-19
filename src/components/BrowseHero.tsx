'use client';

import React, { useState, useEffect } from 'react';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Play, Info, Volume2, VolumeX } from 'lucide-react';
import ReactPlayer from 'react-player/lazy';
import Link from 'next/link';

interface BrowseHeroProps {
    video: Video;
    children?: React.ReactNode;
}

export function BrowseHero({ video, children }: BrowseHeroProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showVideo, setShowVideo] = useState(false);

    // Delay showing the video to prevent initial flicker or layout shift
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowVideo(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="relative h-[85vh] w-full overflow-hidden group/hero">
            {/* Background Layer */}
            <div className="absolute inset-0 bg-black">
                {/* Fallback Image / Poster */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
                    style={{
                        backgroundImage: `url(${video.thumbnailUrl || video.posterUrl})`,
                        opacity: showVideo ? 0 : 1
                    }}
                />

                {/* Video Player */}
                {video.videoUrl && (
                    <div className={`absolute inset-0 transition-opacity duration-1000 ${showVideo ? 'opacity-100' : 'opacity-0'}`}>
                        <ReactPlayer
                            url={video.videoUrl}
                            playing={isPlaying}
                            loop={true}
                            muted={isMuted}
                            playsinline={true}
                            width="100%"
                            height="100%"
                            style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
                            config={{
                                file: {
                                    attributes: {
                                        style: { objectFit: 'cover', width: '100%', height: '100%' }
                                    }
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Gradient Overlay - Left and Bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030014] via-transparent to-transparent z-10" />

            {/* Content Layer */}
            <div className="absolute inset-0 z-20 container mx-auto px-4 md:px-12 flex flex-col justify-center h-full pt-16">
                {children ? (
                    children
                ) : (
                    <div className="max-w-2xl space-y-6 animate-fade-in">
                        <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-2xl tracking-tight leading-tight">
                            {video.title}
                        </h1>

                        <p className="text-lg md:text-xl text-white/90 drop-shadow-md line-clamp-3 leading-relaxed">
                            {video.description}
                        </p>

                        <div className="flex items-center gap-4 pt-4">
                            <Link href={`/video/${video.id}`}>
                                <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-lg bg-white text-black hover:bg-white/90 transition-transform hover:scale-105 shadow-xl">
                                    <Play className="mr-2 h-6 w-6 fill-black" />
                                    Play
                                </Button>
                            </Link>
                            <Button
                                size="lg"
                                variant="secondary"
                                className="h-14 px-8 text-lg font-bold rounded-lg bg-white/20 text-white backdrop-blur-md hover:bg-white/30 border border-white/10 transition-transform hover:scale-105"
                            >
                                <Info className="mr-2 h-6 w-6" />
                                More Info
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Volume Toggle */}
            <div className="absolute right-12 bottom-32 z-30 opacity-0 group-hover/hero:opacity-100 transition-opacity duration-500">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-black/40 text-white border border-white/20 backdrop-blur-md hover:bg-white/20"
                    onClick={() => setIsMuted(!isMuted)}
                >
                    {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                </Button>
            </div>
        </div>
    );
}
