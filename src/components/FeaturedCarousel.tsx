'use client';

import React, { useState, useEffect } from 'react';
import type { Video } from '@/lib/types';
import { Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface FeaturedCarouselProps {
    featuredVideos: Video[];
}

export function FeaturedCarousel({ featuredVideos }: FeaturedCarouselProps) {
    // We only need the first 3 videos for the featured section logic
    const displayVideos = featuredVideos.slice(0, 3);

    if (displayVideos.length === 0) return null;

    return (
        <div className="w-full pt-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[400px] md:h-[280px]">
                {displayVideos.map((video, index) => (
                    <Link
                        key={video.id}
                        href={`/video/${video.id}`}
                        className="relative group overflow-hidden rounded-2xl block h-full w-full border border-white/5 bg-zinc-900 shadow-2xl"
                    >
                        {/* Background Image / Video */}
                        <div className="absolute inset-0">
                            {/* Use thumbnail or poster */}
                            <div className="w-full h-full relative">
                                <Image
                                    src={video.thumbnailUrl || video.posterUrl || '/placeholder.jpg'}
                                    alt={video.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-60"
                                />
                            </div>
                            {/* Gradient Overlay for Text Readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        </div>

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 p-6 w-full z-10 transition-transform duration-300 group-hover:-translate-y-1">
                            {/* Optional Icon/Logo placeholder like the reference's "Procreate" logo */}
                            <div className="w-8 h-8 rounded-md bg-white/20 backdrop-blur-md mb-3 flex items-center justify-center">
                                <Play className="h-4 w-4 text-white fill-white" />
                            </div>

                            <h3 className="text-xl font-bold text-white leading-tight mb-2 line-clamp-2">
                                {video.title}
                            </h3>
                            <p className="text-sm text-zinc-300 line-clamp-2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity delay-100 duration-300">
                                {video.description}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
