
import { Metadata } from 'next';
import Link from 'next/link';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { Button } from '@/components/ui/button';
import { Footprints, Zap, Wind, FastForward, Timer, Play, Layers, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Walk & Run Cycle Reference Library | Professional Locomotion Animation',
    description: 'Master locomotion with the world\'s best walk and run cycle reference library. From realistic human gates to animal locomotion and parkour traversal.',
    keywords: 'walk cycle reference, run cycle reference, animation locomotion, character movement reference, jumping animation reference, parkour animation',
    alternates: { canonical: 'https://animationreference.org/resources/locomotion-animation-reference' },
};

export const dynamic = 'force-dynamic';

async function getLocomotionVideos(): Promise<Video[]> {
    const tags = ['walk-cycle', 'run-cycle', 'locomotion', 'running'];
    const snapshots = await Promise.all(tags.map((tag) => getDocs(query(
        collection(db, 'videos'),
        where('tags', 'array-contains', tag),
        limit(12),
    ))));

    const videos = new Map<string, Video>();
    snapshots.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
        const data = doc.data();
        if (data.status !== 'draft') {
            videos.set(doc.id, { id: doc.id, ...data } as Video);
        }
    });

    return Array.from(videos.values()).slice(0, 12);
}

export default async function LocomotionResources() {
    const videos = await getLocomotionVideos();
    const itemListSchema = videos.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Walk and run cycle animation references',
        itemListElement: videos.map((video, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `https://animationreference.org/video/${video.id}`,
            name: video.title,
        })),
    } : null;

    return (
        <div className="min-h-screen bg-[#02040a] text-white -mt-24">
            {/* Dynamic Motion Hero Section */}
            <section className="relative pt-48 pb-32 overflow-hidden border-b border-blue-900/20">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 -z-10" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-600/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 -z-10" />
                
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl space-y-8">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-[0.3em] uppercase text-sm mb-4">
                            <Wind className="h-4 w-4" />
                            Motion & Momentum Series
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none mb-8">
                            FLOW <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400">STATE.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-400 max-w-2xl leading-relaxed">
                            Stop struggling with floaty walks and weightless runs. Access the definitive library of locomotion references designed to help you nail weight, physics, and personality in every step.
                        </p>
                        <div className="pt-8 flex flex-col sm:flex-row gap-4">
                            <Button asChild className="h-20 px-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-2xl transition-all hover:scale-105 shadow-[0_0_50px_-10px_rgba(37,99,235,0.5)]">
                            <Link href="#reference-library">EXPLORE CYCLES <ArrowRight className="ml-4 h-8 w-8 inline" /></Link>
                            </Button>
                            <Button asChild variant="outline" className="h-20 px-12 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-2xl">
                                <Link href="/categories?category=locomotion">VIEW GALLERY</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Curated references: the page should deliver the collection promised by its title. */}
            <section id="reference-library" className="py-24 border-y border-white/5 bg-black/20">
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl mb-12">
                        <p className="text-cyan-400 font-bold tracking-[0.2em] uppercase text-sm mb-4">Curated study set</p>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-5">Walk &amp; run cycle references</h2>
                        <p className="text-lg text-slate-400 leading-relaxed">Study contact, passing, compression, propulsion, and weight shift in a focused set of animation references. Open any clip for frame-by-frame playback and related tags.</p>
                    </div>
                    {videos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {videos.map((video) => <VideoCard key={video.id} video={video} />)}
                        </div>
                    ) : (
                        <p className="text-slate-500">New locomotion references are being curated now. Browse the full library to explore related movement clips.</p>
                    )}
                </div>
            </section>

            {/* Core Locomotion Pillars */}
            <section className="py-32 container mx-auto px-6">
                <div className="text-center mb-24">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6">Master the Mechanics</h2>
                    <p className="text-slate-500 text-xl max-w-2xl mx-auto">We break down locomotion into its essential components for frame-by-frame study.</p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { 
                            title: 'Walk Cycles', 
                            desc: 'From standard vanilla walks to emotional gaits and heavy-weight strolls.',
                            icon: <Footprints className="h-12 w-12" />,
                            color: 'text-blue-500'
                        },
                        { 
                            title: 'Sprints & Runs', 
                            desc: 'High-speed mechanics, including lean angles, propulsion, and foot-plant impact.',
                            icon: <FastForward className="h-12 w-12" />,
                            color: 'text-cyan-400'
                        },
                        { 
                            title: 'Verticality', 
                            desc: 'Jumps, leaps, landings, and climbing transitions with realistic momentum.',
                            icon: <Zap className="h-12 w-12" />,
                            color: 'text-teal-400'
                        }
                    ].map((item, i) => (
                        <div key={i} className="p-12 bg-slate-900/40 border border-white/5 rounded-3xl hover:bg-slate-900/60 transition-all hover:-translate-y-2 group">
                            <div className={`${item.color} mb-8 group-hover:scale-110 transition-transform duration-500`}>{item.icon}</div>
                            <h3 className="text-3xl font-black mb-6 uppercase tracking-tight">{item.title}</h3>
                            <p className="text-slate-400 text-lg leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Technical Precision Section */}
            <section className="py-32 bg-gradient-to-b from-blue-900/20 to-transparent relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <div className="relative order-2 lg:order-1">
                            <div className="aspect-square bg-blue-500/10 rounded-full blur-[120px] absolute inset-0 -z-10" />
                            <div className="bg-slate-900 p-8 rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden group">
                                <div className="aspect-video bg-black/40 rounded-2xl flex items-center justify-center border border-white/5">
                                    <div className="relative">
                                        <Play className="h-20 w-20 text-blue-500 fill-blue-500 animate-pulse" />
                                        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20" />
                                    </div>
                                </div>
                                <div className="mt-8 space-y-4">
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-[65%]" />
                                    </div>
                                    <div className="flex justify-between text-xs font-mono text-slate-500 uppercase tracking-widest">
                                        <span>Contact Phase</span>
                                        <span>0.42s</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-10 order-1 lg:order-2">
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">Anatomical <br /><span className="text-blue-500">Truth.</span></h2>
                            <p className="text-xl text-slate-400 leading-relaxed">
                                Locomotion is the foundation of character. Our library provides multiple angles—front, side, and 45-degree—to ensure you see exactly how the weight shifts and the hips rotate.
                            </p>
                            <div className="grid gap-6">
                                {[
                                    { title: 'Arc Tracking', desc: 'Visualized paths of motion for head, hips, and feet.', icon: <Timer className="h-6 w-6" /> },
                                    { title: 'Weight Analysis', desc: 'Highlighted frames showing peak compression and extension.', icon: <Layers className="h-6 w-6" /> }
                                ].map((feat, i) => (
                                    <div key={i} className="flex gap-6 items-start">
                                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">{feat.icon}</div>
                                        <div>
                                            <h4 className="text-xl font-bold uppercase mb-1">{feat.title}</h4>
                                            <p className="text-slate-500">{feat.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEO Keyword Lexicon */}
            <section className="py-24 border-y border-white/5 bg-black/20">
                <div className="container mx-auto px-6">
                    <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-slate-600 text-sm font-mono uppercase tracking-[0.2em]">
                        <span>Walking Cycles</span>
                        <span>Running Mechanics</span>
                        <span>Weight Shift</span>
                        <span>Hip Rotation</span>
                        <span>Contact Poses</span>
                        <span>Passing Poses</span>
                        <span>Crest Poses</span>
                        <span>Locomotion Physics</span>
                        <span>Biomechanical Reference</span>
                        <span>Quadruped Gaits</span>
                        <span>Animal Locomotion</span>
                        <span>Parkour Reference</span>
                    </div>
                </div>
            </section>

            {/* Final Momentum CTA */}
            <section className="py-48 text-center px-6 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/5 via-transparent to-transparent -z-10" />
                <div className="max-w-4xl mx-auto space-y-12">
                    <h2 className="text-6xl md:text-9xl font-black tracking-tighter uppercase leading-none">NEVER <br />MISS A <br /><span className="text-blue-500 text-glow-blue">STEP.</span></h2>
                    <p className="text-2xl text-slate-400 font-medium">Build stronger walks, runs, and character movement with focused reference you can study frame by frame.</p>
                    <div className="pt-8">
                        <Button asChild size="lg" className="h-24 px-16 rounded-full bg-white text-black hover:bg-slate-200 font-black text-3xl transition-transform hover:scale-110 shadow-2xl">
                            <Link href="/home">EXPLORE THE LIBRARY</Link>
                        </Button>
                    </div>
                </div>
            </section>
            {itemListSchema && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
            )}
        </div>
    );
}
