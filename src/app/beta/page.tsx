'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Play, Film, ArrowRight, Sparkles, Heart } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types'; // Removed Category type locally as it's not used for rows
import { VideoRow } from '@/components/VideoRow';
import { VideoGrid } from '@/components/VideoGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { BrowseHero } from '@/components/BrowseHero';

// Helper to shuffle array
const shuffleArray = (array: any[]) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

export default function BetaPage() {
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    // Data Fetching
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const videosQuery = query(collection(db, "videos"), where("isShort", "!=", true));
                const videoSnapshot = await getDocs(videosQuery);

                const videos = videoSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Video));
                setAllVideos(videos);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Derived Lists for Rows
    const popularVideos: Video[] = useMemo(() => allVideos.slice(0, 5), [allVideos]);
    const nowPlayingVideos: Video[] = useMemo(() => allVideos.slice(2, 7), [allVideos]);
    const topRatedVideos: Video[] = useMemo(() => [...allVideos].reverse().slice(0, 5), [allVideos]);
    const randomizedVideos = useMemo(() => shuffleArray([...allVideos]), [allVideos]);

    // Random Video for Hero
    const heroVideo = useMemo(() => {
        if (allVideos.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * allVideos.length);
        return allVideos[randomIndex];
    }, [allVideos]);


    return (
        <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans selection:bg-purple-500/30 -mt-24">

            {/* Hero Section (Landing Page Style) */}
            {heroVideo ? (
                <BrowseHero video={heroVideo}>
                    <div className="w-full h-full flex flex-col justify-center items-center text-center pb-20 animate-fade-in-up">
                        {/* Badge */}
                        <div className="flex justify-center mb-8 animate-fade-in">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(109,40,217,0.3)] group hover:scale-105 transition-transform duration-300">
                                <Heart className="h-4 w-4 text-purple-400 fill-purple-400 animate-pulse" />
                                <span className="text-sm font-medium text-purple-100/90">Community Supported</span>
                            </div>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1] md:leading-[1.1] max-w-5xl mx-auto drop-shadow-2xl">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
                                Help Us Keep
                            </span>
                            <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">
                                Growing & Expanding
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl text-zinc-100 mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
                            Consider donating to keep the site growing and expanding features for the entire animation community.
                        </p>

                        {/* CTA Button */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link href="/donate">
                                <Button className="h-16 px-10 rounded-2xl text-lg font-semibold bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] hover:scale-105 shadow-[0_10px_40px_-10px_rgba(124,58,237,0.5)] border border-purple-400/20 transition-all duration-300 group text-white">
                                    Donate Now
                                    <Heart className="ml-2 h-5 w-5 fill-white group-hover:scale-110 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </BrowseHero>
            ) : (
                // Fallback Skeleton
                <div className="h-[85vh] w-full bg-[#030014] flex items-center justify-center pt-20">
                    <Skeleton className="h-full w-full bg-zinc-900/50" />
                </div>
            )}

            {/* Main Content Area - Video Rows (Home Page Body) */}
            <div className="w-full px-4 md:px-6 space-y-12 pb-16 relative z-10 -mt-20">
                {/* Popular Row */}
                <div className="bg-transparent">
                    <VideoRow title="Popular Now" videos={popularVideos.slice(1)} />
                </div>

                {/* Now Playing Row */}
                <div className="bg-transparent">
                    <VideoRow title="Now Playing" videos={nowPlayingVideos} />
                </div>

                {/* Top Rated Row */}
                <div className="bg-transparent">
                    <VideoRow title="Top Rated" videos={topRatedVideos} />
                </div>

                {/* All Videos Grid */}
                <div className="pt-8">
                    <VideoGrid title="All Videos" videos={randomizedVideos} />
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 bg-black/20 mt-12">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/5 p-1 rounded-md">
                            <Film className="h-4 w-4 text-zinc-400" />
                        </div>
                        <span className="text-md font-semibold text-zinc-400">AnimationReference</span>
                    </div>
                    <div className="text-sm text-zinc-600">
                        © 2025 AnimationReference.org
                    </div>
                </div>
            </footer>
        </div>
    );
}
