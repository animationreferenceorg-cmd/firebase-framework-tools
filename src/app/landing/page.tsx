'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Play, Film, ArrowRight, Sparkles } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Category, Video } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { VideoRow } from '@/components/VideoRow';
import { VideoGrid } from '@/components/VideoGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { BrowseHero } from '@/components/BrowseHero';

export default function LandingPage() {
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    // Data Fetching
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const categoriesQuery = query(collection(db, "categories"), where("status", "==", "published"));
                const videosQuery = query(collection(db, "videos"), where("isShort", "!=", true));

                const [categorySnapshot, videoSnapshot] = await Promise.all([
                    getDocs(categoriesQuery),
                    getDocs(videosQuery)
                ]);

                const categories = categorySnapshot.docs.map(doc => ({
                    id: doc.id,
                    href: `/browse/${doc.id}`,
                    ...doc.data()
                } as Category));
                setAllCategories(categories);

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

    const videosByCategory = useMemo(() => {
        const map = new Map<string, Video[]>();
        allVideos.forEach(video => {
            video.categoryIds?.forEach(catId => {
                if (!map.has(catId)) {
                    map.set(catId, []);
                }
                map.get(catId)?.push(video);
            })
        });
        return map;
    }, [allVideos]);

    const sortedCategories = useMemo(() => {
        return [...allCategories].sort((a, b) => {
            const aCount = videosByCategory.get(a.id)?.length || 0;
            const bCount = videosByCategory.get(b.id)?.length || 0;
            return bCount - aCount;
        });
    }, [allCategories, videosByCategory]);

    const exampleVideos = useMemo(() => {
        // Get 9 random videos for the 3x3 grid
        return [...allVideos].sort(() => 0.5 - Math.random()).slice(0, 9);
    }, [allVideos]);

    const heroVideo = useMemo(() => {
        if (allVideos.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * allVideos.length);
        return allVideos[randomIndex];
    }, [allVideos]);


    return (
        <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans selection:bg-purple-500/30 -mt-24">

            {/* Hero Section */}
            {heroVideo ? (
                <BrowseHero video={heroVideo}>
                    <div className="w-full h-full flex flex-col justify-center items-center text-center pb-20 animate-fade-in-up">
                        {/* Badge */}
                        <div className="flex justify-center mb-8 animate-fade-in">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(109,40,217,0.3)] group hover:scale-105 transition-transform duration-300">
                                <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                                <span className="text-sm font-medium text-purple-100/90">Your Ultimate Animation Library</span>
                            </div>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1] md:leading-[1.1] max-w-5xl mx-auto drop-shadow-2xl">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
                                Master the Art of
                            </span>
                            <br />
                            <span className="text-purple-400">
                                Motion & Timing
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl text-zinc-100 mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
                            Highly customizable reference library for animators. Analyze frame-by-frame, build your collections, and discover inspiration from the world's best studios.
                        </p>

                        {/* CTA Button */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link href="/browse">
                                <Button className="h-16 px-10 rounded-2xl text-lg font-semibold bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] hover:scale-105 shadow-[0_10px_40px_-10px_rgba(124,58,237,0.5)] border border-purple-400/20 transition-all duration-300 group text-white">
                                    Start Your Free Trial
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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

            {/* Benefits Section Side-by-Side */}
            <section className="py-32 relative" id="benefits">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">

                        {/* Left: Text */}
                        <div className="text-left space-y-8">
                            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                                Why <span className="text-purple-400">AnimationReference?</span>
                            </h2>
                            <div className="space-y-6 text-xl text-zinc-400 leading-relaxed">
                                <p>
                                    Finding amazing animation references is hard—finding <span className="text-white font-medium">professional examples</span> is even harder.
                                </p>
                                <p>
                                    We built this platform to bridge the gap, uniting animators with the resources they need to succeed. Whether you're researching complex <span className="text-purple-400">3D body mechanics</span> or studying subtle <span className="text-purple-400">live-action scenes</span>, we make it effortless to discover, save, and return to your inspiration.
                                </p>
                            </div>
                            <div className="flex flex-col gap-4 pt-4">
                                {['Lightning Fast Servers', 'Frame-by-Frame Scrubbing', 'Daily Library Updates'].map(item => (
                                    <div key={item} className="flex items-center gap-3 text-white/90 font-medium">
                                        <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <div className="h-2 w-2 rounded-full bg-green-400" />
                                        </div>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Benefits Cards */}
                        <div className="grid gap-6">
                            {[
                                { title: "Smart Discovery", desc: "Find references by action, emotion, or camera angle instantly.", color: "bg-blue-500/5 hover:bg-blue-500/10" },
                                { title: "Frame Analysis", desc: "Deconstruct movement with ghosting, stepping, and loop controls.", color: "bg-purple-500/5 hover:bg-purple-500/10" },
                                { title: "Curated Library", desc: "Hand-picked clips from industry veterans and top studios.", color: "bg-pink-500/5 hover:bg-pink-500/10" },
                            ].map((feature, i) => (
                                <div key={i} className={`p-8 rounded-3xl border border-white/5 hover:border-white/20 transition-all duration-300 flex items-start gap-6 ${feature.color} backdrop-blur-sm group`}>
                                    <div className="mt-1 h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Sparkles className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                                        <p className="text-zinc-400 text-base leading-relaxed">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature 1: Discovery (Categories - Side by Side) */}
            <section className="py-24 relative" id="features">
                <div className="container mx-auto px-6 space-y-32">
                    {loading ? (
                        <Skeleton className="w-full h-96 rounded-3xl" />
                    ) : (
                        sortedCategories.slice(0, 3).map((category, idx) => {
                            const videos = videosByCategory.get(category.id)?.slice(0, 1) || [];
                            if (videos.length === 0) return null;

                            return (
                                <div key={category.id} className="grid lg:grid-cols-2 gap-16 items-center">
                                    {/* Text Side */}
                                    <div className={`space-y-8 text-left ${idx % 2 === 0 ? "lg:order-1" : "lg:order-2"}`}>
                                        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">{category.title}</h2>
                                        <p className="text-zinc-400 text-lg leading-relaxed">
                                            Explore our hand-picked collection of {category.title.toLowerCase()} references. Perfect for analyzing timing, spacing, and {idx % 2 === 0 ? 'mechanics' : 'acting'}.
                                        </p>
                                        <div className="pt-6">
                                            <Link href={`/browse/${category.id}`}>
                                                <Button variant="outline" className="rounded-full px-8 py-6 border-white/10 hover:bg-white/10 hover:text-white transition-all group text-base">
                                                    View Collection
                                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Videos Side */}
                                    <div className={`${idx % 2 === 0 ? "lg:order-2" : "lg:order-1"}`}>
                                        {videos.map(video => (
                                            <div key={video.id} className="w-full">
                                                <VideoCard video={video} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </section>

            {/* Example 3x3 Grid */}
            <section className="py-24 relative bg-black/20">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Featured <span className="text-purple-400">Examples</span></h2>
                        <p className="text-zinc-400">A selection of top-tier animation references available in our library.</p>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <Skeleton key={i} className="w-full aspect-video rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-8">
                            <VideoGrid title="" videos={exampleVideos} />
                        </div>
                    )}

                </div>
            </section>



            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-background to-background pointer-events-none" />
                <div className="container mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">Ready to level up your animation?</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                        Join thousands of professional animators building their personal reference libraries today.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/signup">
                            <Button size="lg" className="h-16 px-10 text-xl font-bold bg-white text-black hover:bg-white/90 shadow-xl transition-transform hover:scale-105">
                                Get Started for Free
                            </Button>
                        </Link>
                        <p className="text-sm text-muted-foreground mt-4 sm:mt-0">No credit card required</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 bg-black/20">
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
