'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Film, Construction, Heart } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BrowseHero } from '@/components/BrowseHero';
import { VideoGrid } from '@/components/VideoGrid';

export default function ComingSoonPage() {
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Data Fetching for Hero Video
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch just a few videos to find a hero
        const videosQuery = query(collection(db, "videos"), where("isShort", "!=", true));
        // Note: we filter drafts client-side below because multiple inequality filters require composite indexes
        const videoSnapshot = await getDocs(videosQuery);

        const videos = videoSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Video)).filter(v => v.status !== 'draft'); // Filter out drafts
        setAllVideos(videos);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const heroVideo = useMemo(() => {
    if (allVideos.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * allVideos.length);
    return allVideos[randomIndex];
  }, [allVideos]);

  const exampleVideos = useMemo(() => {
    if (allVideos.length === 0) return [];
    // Get 9 random videos for the 3x3 grid
    return [...allVideos].sort(() => 0.5 - Math.random()).slice(0, 9);
  }, [allVideos]);

  const libraryVideos = useMemo(() => {
    if (allVideos.length === 0) return [];
    // Get 4 distinct videos for the library showcase
    return [...allVideos].reverse().slice(0, 4);
  }, [allVideos]);

  // Select specific videos for the "Master Your Craft" section
  const craftVideos = useMemo(() => {
    if (allVideos.length === 0) return { mechanics: null, creature: null, acting: null };

    // In a real app, we would filter by tags. For now, we'll pick distinct random ones to ensure variety.
    // simplistic shuffle
    const shuffled = [...allVideos].sort(() => 0.5 - Math.random());

    return {
      mechanics: shuffled[0] || null,
      creature: shuffled[1] || null,
      acting: shuffled[2] || null
    };
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
                <Construction className="h-4 w-4 text-purple-400 animate-pulse" />
                <span className="text-sm font-medium text-purple-100/90">Work In Progress</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1] md:leading-[1.1] max-w-5xl mx-auto drop-shadow-2xl">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
                The Ultimate
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">
                Reference Library
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-zinc-100 mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
              We are building the definitive collection of animation references.
              <br className="hidden md:block" />
              Join the beta now to get early access to thousands of curated clips.
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button asChild className="h-16 px-10 rounded-2xl text-lg font-semibold bg-white text-black hover:bg-white/90 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] border border-white/20 transition-all duration-300 group hover:scale-105">
                  <Link href="/beta">
                    Try Beta Now
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </BrowseHero>
      ) : (
        // Fallback Skeleton
        <div className="h-[85vh] w-full bg-[#030014] flex items-center justify-center pt-20">
          <Skeleton className="h-full w-full bg-zinc-900/50" />
        </div>
      )}

      {/* Stats Bar (Glassmorphic) */}
      <section className="w-full border-y border-white/5 bg-white/[0.02] backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/5">
            {[
              { label: "Reference Clips", value: "10,000+" },
              { label: "Daily Updates", value: "25+" },
              { label: "Active Animators", value: "5k+" },
              { label: "Studios Represented", value: "120+" }
            ].map((stat, i) => (
              <div key={i} className="py-8 md:py-12 flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors cursor-default">
                <span className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight group-hover:scale-110 transition-transform duration-300">{stat.value}</span>
                <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider group-hover:text-zinc-400">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section Side-by-Side */}
      <section className="py-32 relative bg-black/20" id="benefits">
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

      {/* Feature 1: Frame by Frame (Precision) */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full -translate-y-1/2" />
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Visual (Mock Player) */}
            {/* Visual (Mock Player) */}
            <div className="w-full lg:w-1/2 relative order-2 lg:order-1">
              <div className="relative rounded-xl border border-white/10 bg-[#0f0c1d] shadow-2xl overflow-hidden group">
                {/* Real Video Area with Custom Player */}
                <div className="aspect-video relative overflow-hidden ring-1 ring-white/10 shadow-inner bg-black">
                  {heroVideo ? (
                    <VideoPlayer
                      video={heroVideo}
                      muted={true}
                      startsPaused={false}
                      hideFullscreenControl={true}
                      hidePlayControl={true}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Construction className="text-white/10 h-16 w-16" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="w-full lg:w-1/2 text-left space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                <Film className="h-3 w-3" />
                <span>Deep Analysis</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                Analyze Motion <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Frame by Frame</span>
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Don't miss a single smear or breakdown. Our custom-built player allows you to scrub through animations with frame-perfect precision. Slow things down to understand the mechanics behind the magic.
              </p>
              <ul className="space-y-4 pt-4">
                {[
                  "Keyboard shortcuts for stepping",
                  "Ghosting and loop regions",
                  "Playback speed control"
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-zinc-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Personal Library (Like/Save) */}
      <section className="py-24 relative overflow-hidden bg-white/[0.02]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Text */}
            <div className="w-full lg:w-1/2 text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-medium">
                <Sparkles className="h-3 w-3" />
                <span>Curated Collections</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                Build Your Personal <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">Reference Vault</span>
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Save references for your next shot. Organize clips by project, emotion, or mechanics. Never lose that perfect reference again.
              </p>
              <div className="pt-6">
                <Button asChild variant="outline" className="rounded-full border-white/10 hover:bg-white/10">
                  <Link href="/beta">
                    Start Building Collection
                  </Link>
                </Button>
              </div>
            </div>

            {/* Visual (Mock Cards) */}
            <div className="w-full lg:w-1/2 relative">
              <div className="relative z-10 grid grid-cols-2 gap-4">
                {libraryVideos.length > 0 ? libraryVideos.map((video, i) => (
                  <div key={video.id} className={`p-4 rounded-xl border border-white/5 bg-[#0f0c1d] shadow-xl ${i % 2 !== 0 ? 'translate-y-8' : ''} group`}>
                    <div className="aspect-[4/3] bg-black rounded-lg mb-3 relative overflow-hidden">
                      {/* Video Loop */}
                      <video
                        src={video.videoUrl}
                        muted
                        loop
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                      />

                      {/* Heart Overlay */}
                      <div className="absolute top-2 right-2 p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 cursor-pointer transition-colors z-10">
                        <Heart className={`h-4 w-4 ${i === 1 || i === 2 ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-white/80 truncate">{video.title}</h4>
                      <div className="h-1 lg:w-1/2 bg-white/5 rounded-full" />
                    </div>
                  </div>
                )) : (
                  /* Fallback if no videos loaded yet */
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className={`p-4 rounded-xl border border-white/5 bg-[#0f0c1d] shadow-xl ${i % 2 !== 0 ? 'translate-y-8' : ''}`}>
                      <div className="aspect-[4/3] bg-white/5 rounded-lg mb-3 relative overflow-hidden">
                        <Skeleton className="h-full w-full bg-white/5" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Decorative Elements */}
              <div className="absolute -inset-10 bg-gradient-to-tr from-pink-500/20 to-transparent blur-[100px] rounded-full pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Resources Grid (Reference Style) */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold">Master Your <span className="text-purple-400">Craft</span></h2>
              <p className="text-zinc-400 max-w-lg">Deep dive into specific animation principles with our curated breakdown series.</p>
            </div>
            <Button variant="ghost" className="text-white hover:bg-white/10 group">
              View All Resources <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Body Mechanics",
                desc: "Weight, balance, and force",
                gradient: "from-blue-500/20 to-purple-500/20",
                icon: <Film className="h-6 w-6 text-blue-400" />,
                video: craftVideos.mechanics
              },
              {
                title: "Creature Animation",
                desc: "Quadrupeds, flight, and behavior",
                gradient: "from-green-500/20 to-teal-500/20",
                icon: <Sparkles className="h-6 w-6 text-green-400" />,
                video: craftVideos.creature
              },
              {
                title: "Acting & Emotion",
                desc: "Subtext, brows, and lip sync",
                gradient: "from-orange-500/20 to-red-500/20",
                icon: <ArrowRight className="h-6 w-6 text-orange-400 rotate-45" />,
                video: craftVideos.acting
              }
            ].map((item, i) => (
              <div
                key={i}
                className="group relative h-[400px] rounded-3xl overflow-hidden border border-white/10 bg-[#0f0c1d] hover:border-white/20 transition-all duration-500"
                onMouseEnter={(e) => {
                  const video = e.currentTarget.querySelector('video');
                  if (video) video.play();
                }}
                onMouseLeave={(e) => {
                  const video = e.currentTarget.querySelector('video');
                  if (video) {
                    video.pause();
                    video.currentTime = 0;
                  }
                }}
              >
                {/* Background Video (if available) */}
                {item.video ? (
                  <div className="absolute inset-0">
                    <video
                      src={item.video.videoUrl}
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-opacity duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c1d] via-[#0f0c1d]/50 to-transparent pointer-events-none" />
                  </div>
                ) : (
                  <>
                    {/* Gradient BG Fallback */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-20 group-hover:opacity-30 transition-opacity`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c1d] via-transparent to-transparent" />
                  </>
                )}

                {/* Content */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </div>
                    <div className="p-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <ArrowRight className="h-4 w-4 text-white -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                    </div>
                  </div>

                  <div className="translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-zinc-400 leading-relaxed max-w-[80%]">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example 3x3 Grid */}
      <section className="py-24 relative">
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

    </div >
  );
}
