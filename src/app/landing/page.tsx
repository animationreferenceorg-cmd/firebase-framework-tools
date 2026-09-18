'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
    Play, 
    Film, 
    ArrowRight, 
    Sparkles, 
    Compass, 
    SlidersHorizontal, 
    ShieldCheck, 
    Check, 
    Layers, 
    ExternalLink,
    Camera,
    FolderHeart
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import type { Category, Video } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { VideoGrid } from '@/components/VideoGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { BrowseHero } from '@/components/BrowseHero';
import { DEFAULT_HERO_VIDEO, DEFAULT_LANDING_VIDEOS, DEFAULT_LANDING_CATEGORIES } from '@/lib/landing-data';

export default function LandingPage() {
    const [allCategories, setAllCategories] = useState<Category[]>(DEFAULT_LANDING_CATEGORIES);
    const [allVideos, setAllVideos] = useState<Video[]>(DEFAULT_LANDING_VIDEOS);
    const [loading, setLoading] = useState(false);

    // Non-blocking background data hydration
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const categoriesQuery = query(collection(db, "categories"), where("status", "==", "published"));

                const [categorySnapshot, videos] = await Promise.all([
                    getDocs(categoriesQuery).catch((err) => {
                        console.warn("Firestore categories query fallback:", err?.message || err);
                        return { docs: [] };
                    }),
                    getSnapshotVideos().catch(() => [])
                ]);

                if (!isMounted) return;

                const categories = (categorySnapshot.docs || []).map(doc => ({
                    id: doc.id,
                    href: `/browse?category=${doc.id}`,
                    ...doc.data()
                } as Category));

                if (categories && categories.length > 0) {
                    setAllCategories(categories);
                }
                if (videos && videos.length > 0) {
                    setAllVideos(videos);
                }

            } catch (error) {
                console.warn("Error fetching landing data:", error);
            }
        };
        fetchData();
        return () => { isMounted = false; };
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
        return allVideos.slice(0, 9);
    }, [allVideos]);

    const heroVideo = useMemo(() => {
        return allVideos[0] || DEFAULT_HERO_VIDEO;
    }, [allVideos]);

    return (
        <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans selection:bg-purple-500/30">

            {/* 1. Floating Landing Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-4 pointer-events-none">
                <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
                    {/* Brand Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 p-0.5 shadow-lg shadow-purple-950/40 group-hover:scale-105 transition-transform duration-300">
                            <div className="w-full h-full bg-[#0c0a17] rounded-[14px] flex items-center justify-center">
                                <Film className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                            </div>
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-base font-black tracking-tight text-white group-hover:text-purple-200 transition-colors leading-tight">
                                Animation<span className="text-purple-400">Reference</span>
                            </span>
                            <span className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">Motion Vault</span>
                        </div>
                    </Link>

                    {/* Navigation Pills */}
                    <nav className="hidden md:flex items-center gap-1 bg-[#13111c]/80 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-2xl">
                        <Link href="/home" className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors">
                            Discover
                        </Link>
                        <Link href="/categories" className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors">
                            Categories
                        </Link>
                        <Link href="/references" className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors">
                            Reference Clips
                        </Link>
                        <Link href="/shorts" className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors">
                            Short Films
                        </Link>
                        <Link href="/feed" className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors">
                            Community
                        </Link>
                    </nav>

                    {/* Right CTA Actions */}
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="hidden sm:inline-flex px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white transition-colors">
                            Sign In
                        </Link>
                        <Button asChild size="sm" className="rounded-full px-5 py-2 text-xs font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/40 border border-purple-400/30 hover:scale-105 transition-all cursor-pointer">
                            <Link href="/home">
                                Open App <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            {/* 2. Hero Section */}
            <BrowseHero video={heroVideo}>
                <div className="w-full h-full flex flex-col justify-center items-center text-center pt-24 pb-20 px-4">
                    {/* Badge */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 border border-purple-400/30 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(147,51,234,0.4)] group hover:scale-105 transition-transform duration-300">
                            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                            <span className="text-xs sm:text-sm font-semibold text-purple-100">The Modern Animation Library & Study Vault</span>
                        </div>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1] max-w-5xl mx-auto drop-shadow-2xl">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/75">
                            Master the Art of
                        </span>
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400">
                            Motion & Timing
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-base sm:text-lg md:text-xl text-zinc-200 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
                        Curated reference library for animators. Analyze frame-by-frame, build visual reference boards, and study movement from the world&apos;s leading studios.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-md mx-auto">
                        <Button asChild className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-10 rounded-2xl text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:scale-105 shadow-[0_10px_40px_-10px_rgba(124,58,237,0.6)] border border-purple-400/30 transition-all duration-300 group text-white cursor-pointer">
                            <Link href="/home">
                                Start Finding Animations
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full sm:w-auto h-14 sm:h-16 px-8 rounded-2xl text-base sm:text-lg font-semibold border-white/15 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 cursor-pointer">
                            <Link href="/categories">
                                Browse Categories
                            </Link>
                        </Button>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-16 max-w-3xl mx-auto w-full">
                        <div className="p-4 rounded-2xl glass-panel text-center">
                            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">7,600+</div>
                            <div className="text-xs text-zinc-400 font-medium mt-0.5">Curated Reference Clips</div>
                        </div>
                        <div className="p-4 rounded-2xl glass-panel text-center">
                            <div className="text-2xl sm:text-3xl font-black text-purple-400 tracking-tight">Frame 0</div>
                            <div className="text-xs text-zinc-400 font-medium mt-0.5">Instant Stepping & Ghosting</div>
                        </div>
                        <div className="p-4 rounded-2xl glass-panel text-center">
                            <div className="text-2xl sm:text-3xl font-black text-pink-400 tracking-tight">100% Free</div>
                            <div className="text-xs text-zinc-400 font-medium mt-0.5">For Artists & Students</div>
                        </div>
                    </div>
                </div>
            </BrowseHero>

            {/* 3. Benefits Section Side-by-Side */}
            <section className="py-28 relative" id="benefits">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">

                        {/* Left: Text & Pitch */}
                        <div className="text-left space-y-8">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-400/20 bg-purple-500/10 text-xs font-bold uppercase tracking-wider text-purple-300">
                                <Sparkles className="w-3.5 h-3.5" />
                                Built For Motion Artists
                            </div>
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
                                Why <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">AnimationReference?</span>
                            </h2>
                            <div className="space-y-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
                                <p>
                                    Finding quality animation references is tedious—finding <span className="text-white font-semibold">studio-grade motion breakdowns</span> without noise is even harder.
                                </p>
                                <p>
                                    We created this platform as an uncompromising workstation for animators. Whether you&apos;re refining delicate <span className="text-purple-300">facial dialogue</span>, dissecting explosive <span className="text-purple-300">combat locomotion</span>, or studying live-action body mechanics, everything is indexed and ready to scrub frame-by-frame.
                                </p>
                            </div>

                            {/* Feature list */}
                            <div className="grid sm:grid-cols-2 gap-4 pt-2">
                                {[
                                    'Ultra-Fast CDN Playback',
                                    'Accurate Frame Stepping',
                                    'Curated Studio Archives',
                                    'Visual Moodboards & Lists'
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-3 text-sm text-zinc-200 font-medium">
                                        <div className="h-6 w-6 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                                            <Check className="h-3.5 w-3.5 text-purple-300" />
                                        </div>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Highlight card */}
                            <div className="p-5 rounded-2xl glass-panel-elevated border border-purple-400/20 text-sm text-zinc-300 leading-relaxed">
                                <p className="italic text-zinc-300">
                                    &ldquo;The fastest way to deconstruct movement, weight, and spacing without sifting through algorithmic noise.&rdquo;
                                </p>
                            </div>
                        </div>

                        {/* Right: Benefits Cards */}
                        <div className="grid gap-5">
                            {[
                                { 
                                    title: "Smart Discovery", 
                                    desc: "Locate references by action, emotion, character type, or camera angle instantly.", 
                                    icon: Compass, 
                                    glow: "from-blue-500/20 to-purple-500/5",
                                    badge: "Fast Filter"
                                },
                                { 
                                    title: "Frame Analysis", 
                                    desc: "Deconstruct keyframes and spacing with precision stepping, looping, and slow motion.", 
                                    icon: SlidersHorizontal, 
                                    glow: "from-purple-500/20 to-pink-500/5",
                                    badge: "Studio Tools"
                                },
                                { 
                                    title: "Curated Studio Quality", 
                                    desc: "Every clip is handpicked for production relevance—from legendary feature films to top game reels.", 
                                    icon: ShieldCheck, 
                                    glow: "from-fuchsia-500/20 to-indigo-500/5",
                                    badge: "Verified"
                                },
                            ].map((feature, i) => {
                                const Icon = feature.icon;
                                return (
                                    <div 
                                        key={i} 
                                        className="p-6 sm:p-8 rounded-3xl glass-panel glass-panel-hover flex items-start gap-5 relative overflow-hidden group text-left"
                                    >
                                        <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-br ${feature.glow} blur-2xl pointer-events-none`} />
                                        <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-400/25 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-purple-400/50 transition-all duration-300">
                                            <Icon className="h-6 w-6 text-purple-300" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5">
                                                <h3 className="text-xl font-bold text-white tracking-tight">{feature.title}</h3>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-zinc-400">
                                                    {feature.badge}
                                                </span>
                                            </div>
                                            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">{feature.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Discovery Categories Section */}
            <section className="py-24 relative" id="features">
                <div className="container mx-auto px-6 space-y-28">
                    <div className="text-center max-w-3xl mx-auto space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300">
                            <Layers className="w-3.5 h-3.5 text-purple-400" />
                            Curated Specialties
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                            Explore Focused Collections
                        </h2>
                        <p className="text-zinc-400 text-base sm:text-lg">
                            Ditch random internet searches. Dive directly into the mechanical domain you need to animate today.
                        </p>
                    </div>

                    {loading ? (
                        <Skeleton className="w-full h-96 rounded-3xl" />
                    ) : (
                        sortedCategories.slice(0, 3).map((category, idx) => {
                            const videos = videosByCategory.get(category.id)?.slice(0, 1) || [];
                            if (videos.length === 0) return null;

                            return (
                                <div key={category.id} className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                                    {/* Text Side */}
                                    <div className={`space-y-6 text-left ${idx % 2 === 0 ? "lg:order-1" : "lg:order-2"}`}>
                                        <span className="text-xs font-black uppercase tracking-widest text-purple-400">Collection 0{idx + 1}</span>
                                        <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">{category.title}</h3>
                                        <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
                                            Explore our hand-picked collection of {category.title.toLowerCase()} references. Ideal for analyzing timing, weight, arcs, and emotional pacing.
                                        </p>
                                        <div className="pt-2">
                                            <Button asChild variant="outline" className="rounded-full px-7 py-5 border-white/15 bg-white/5 hover:bg-purple-600 hover:text-white hover:border-purple-500/50 transition-all group text-sm font-bold cursor-pointer">
                                                <Link href={`/browse?category=${category.id}`}>
                                                    View Collection
                                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Video Card Side */}
                                    <div className={`${idx % 2 === 0 ? "lg:order-2" : "lg:order-1"}`}>
                                        {videos.map(video => (
                                            <div key={video.id} className="w-full max-w-md mx-auto lg:max-w-none">
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

            {/* 5. Featured 3x3 Examples Grid */}
            <section className="py-24 relative bg-black/30 border-y border-white/5">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 text-left">
                        <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Hand-Picked Vault</span>
                            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Featured Reference Clips</h2>
                            <p className="text-zinc-400 text-sm sm:text-base">Top-tier animation references selected by animators for study and breakdown.</p>
                        </div>
                        <Button asChild variant="ghost" className="text-purple-300 hover:text-white hover:bg-white/5 w-fit font-semibold text-sm">
                            <Link href="/home" className="flex items-center gap-1.5">
                                Browse all 7,600+ clips <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <Skeleton key={i} className="w-full aspect-video rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-4">
                            <VideoGrid title="" videos={exampleVideos} />
                        </div>
                    )}
                </div>
            </section>

            {/* 6. Call to Action Banner */}
            <section className="py-28 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-[#0a0812] to-[#0a0812] pointer-events-none" />
                <div className="container mx-auto px-6 text-center relative z-10 max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-400/30 bg-purple-500/15 text-xs font-bold uppercase tracking-wider text-purple-200 mb-6">
                        <Sparkles className="w-3.5 h-3.5" />
                        Level Up Your Reel
                    </div>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mb-6 leading-tight">
                        Ready to level up your animation shots?
                    </h2>
                    <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                        Join thousands of student, indie, and studio animators building their personal reference library today.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button asChild size="lg" className="h-16 px-10 rounded-2xl text-lg font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_40px_rgba(147,51,234,0.5)] border border-purple-400/30 transition-all hover:scale-105 cursor-pointer">
                            <Link href="/home">
                                Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-4">100% Free · No credit card required</p>
                </div>
            </section>

            {/* 7. Comprehensive Modern Footer */}
            <footer className="border-t border-white/10 py-16 bg-[#08060f]/80 backdrop-blur-xl text-left">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/5">
                        {/* Brand Column */}
                        <div className="space-y-4 md:col-span-1">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center">
                                    <Film className="h-4 w-4 text-purple-300" />
                                </div>
                                <span className="text-base font-black text-white">AnimationReference</span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                The dedicated reference vault and study platform for 2D, 3D, and stop-motion artists worldwide.
                            </p>
                        </div>

                        {/* Column 2: Explore */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Explore</h4>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li><Link href="/home" className="hover:text-white transition-colors">Discover Library</Link></li>
                                <li><Link href="/categories" className="hover:text-white transition-colors">All Categories</Link></li>
                                <li><Link href="/references" className="hover:text-white transition-colors">Reference Clips</Link></li>
                                <li><Link href="/shorts" className="hover:text-white transition-colors">Short Films</Link></li>
                            </ul>
                        </div>

                        {/* Column 3: Creative Tools */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Creative Tools</h4>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li><Link href="/paint" className="hover:text-white transition-colors">Paint Studio (Beta)</Link></li>
                                <li><Link href="/moodboard" className="hover:text-white transition-colors">Visual Boards</Link></li>
                                <li><Link href="/feed" className="hover:text-white transition-colors">Community Feed</Link></li>
                                <li><Link href="/profile?tab=portfolio" className="hover:text-white transition-colors">Submit Portfolio</Link></li>
                            </ul>
                        </div>

                        {/* Column 4: Platform & Legal */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platform</h4>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li><Link href="/feedback" className="hover:text-white transition-colors">Send Feedback</Link></li>
                                <li><Link href="/dmca" className="hover:text-white transition-colors">DMCA Guidelines</Link></li>
                                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom copyright row */}
                    <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
                        <div>
                            © 2026 AnimationReference.org. Built for animators.
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            <span className="text-zinc-400 font-medium">All systems operational</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
