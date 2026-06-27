
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Book, PenTool, Highlighter, GraduationCap, Sparkles, Film, ArrowRight, History } from 'lucide-react';
import { VideoCard } from '@/components/VideoCard';
import type { Video } from '@/lib/types';

export const metadata: Metadata = {
    title: 'Disney’s 12 Principles: How to Find Real-World Reference for Each One',
    description: 'Master the 12 principles of animation by studying real-world reference. Find high-quality examples of squash and stretch, anticipation, and more.',
    keywords: '12 principles of animation, animation principles reference, Disney principles, study animation reference, squash and stretch reference',
};

const PRINCIPLE_EXAMPLES: Video[] = [
    {
        id: 'arcs-example',
        title: 'Principle 07: Arcs',
        description: 'Analyzing natural paths of motion in character performance.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800',
        posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://vimeo.com/76979871',
        tags: ['arcs', 'path of motion'],
        status: 'published',
        type: 'video'
    },
    {
        id: 'secondary-example',
        title: 'Principle 08: Secondary Action',
        description: 'Study how smaller details support the main movement.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800',
        posterUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://vimeo.com/76979871',
        tags: ['secondary action', 'overlap'],
        status: 'published',
        type: 'video'
    },
    {
        id: 'exaggeration-example',
        title: 'Principle 10: Exaggeration',
        description: 'Pushing the boundaries of physics for clearer communication.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=800',
        posterUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://vimeo.com/76979871',
        tags: ['exaggeration', 'impact'],
        status: 'published',
        type: 'video'
    }
];

export default function PrinciplesGuide() {
    return (
        <div className="min-h-screen bg-[#fdfaf3] text-[#2d2a24] -mt-24 selection:bg-amber-100 font-serif">
            {/* Academic Hero */}
            <section className="relative pt-48 pb-32 border-b border-amber-900/10">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-40 -z-10" />
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/5 border border-amber-900/10 text-amber-900 text-sm font-medium italic mb-4">
                            Foundations of Motion
                        </div>
                        <h1 className="text-6xl md:text-8xl font-serif italic tracking-tight leading-tight text-zinc-900">
                            The Foundations <br />
                            <span className="text-amber-900/80">of Life</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-zinc-600 max-w-2xl leading-relaxed font-sans">
                            Disney's 12 Principles are the grammar of animation. But how do you find them in the real world? Learn how to spot Squash, Stretch, and Anticipation in everyday motion.
                        </p>
                    </div>
                </div>
            </section>

            {/* Evidence in Motion - New Section */}
            <section className="py-32 container mx-auto px-6 font-sans">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                    <div>
                        <h2 className="text-4xl font-serif italic text-zinc-900 mb-4">Evidence in Motion</h2>
                        <p className="text-zinc-500 max-w-xl">
                            We have curated thousands of clips specifically tagged by principle. Study these examples to see how academic concepts manifest in professional work.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="border-amber-900/20 text-amber-900 hover:bg-amber-900 hover:text-white">
                        <Link href="/browse">Explore Full Library</Link>
                    </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {PRINCIPLE_EXAMPLES.map((video) => (
                        <div key={video.id} className="space-y-4">
                            <VideoCard video={video} />
                            <div>
                                <h4 className="font-bold text-zinc-900">{video.title}</h4>
                                <p className="text-sm text-zinc-500">{video.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Principles Breakdown (Sample) */}
            <section className="py-32 container mx-auto px-6 font-sans bg-white/50 border-y border-amber-900/5">
                <div className="grid lg:grid-cols-2 gap-24 items-center">
                    <div className="space-y-12">
                        <h2 className="text-4xl md:text-5xl font-serif italic text-zinc-900">Studying <br />Squash & Stretch</h2>
                        <p className="text-lg text-zinc-600 leading-relaxed">
                            It’s the most famous principle, but also the most misunderstood. Real-world "Squash and Stretch" is found in the compression of muscle and the flexibility of the face. Our library curates these moments so you can see the physics behind the fun.
                        </p>
                        <div className="space-y-6">
                            {[
                                { title: 'Look for Compression', desc: 'Find the "impact" frame where a body absorbs force.' },
                                { title: 'Track the Volume', desc: 'Notice how a character never loses mass, only shifts it.' },
                                { title: 'Study the Smear', desc: 'Analyze high-speed transitions between poses.' }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="mt-1 text-amber-900"><PenTool className="h-5 w-5" /></div>
                                    <div>
                                        <h4 className="font-bold text-zinc-900">{item.title}</h4>
                                        <p className="text-zinc-500 text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="aspect-[3/4] bg-white p-8 border border-amber-900/10 shadow-2xl rotate-2 group">
                            <div className="h-full w-full bg-zinc-50 border border-zinc-200 flex items-center justify-center relative overflow-hidden">
                                <History className="h-24 w-24 text-amber-900/20" />
                                <div className="absolute bottom-4 left-4 right-4 text-[10px] text-zinc-400 font-mono uppercase tracking-widest text-center">
                                    Study Note #402: Facial Compression
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Full 12 Principles (List Style) */}
            <section className="py-32 bg-amber-900/5 border-b border-amber-900/10 font-sans">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl font-serif italic mb-4">Master Every Principle</h2>
                        <p className="text-zinc-600">We've categorized our entire library by the 12 Principles.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            'Squash and Stretch', 'Anticipation', 'Staging',
                            'Straight Ahead & Pose to Pose', 'Follow Through & Overlapping',
                            'Slow In and Slow Out', 'Arcs', 'Secondary Action',
                            'Timing', 'Exaggeration', 'Solid Drawing', 'Appeal'
                        ].map((principle, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 hover:bg-white transition-colors rounded-lg group border border-transparent hover:border-amber-900/10 shadow-sm hover:shadow-md transition-all">
                                <div className="h-10 w-10 rounded-full bg-amber-900/10 flex items-center justify-center text-amber-900 font-bold group-hover:bg-amber-900 group-hover:text-white transition-all">
                                    {i + 1}
                                </div>
                                <span className="font-medium text-zinc-800">{principle}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-48 text-center bg-white font-sans">
                <div className="max-w-3xl mx-auto space-y-12">
                    <h2 className="text-5xl md:text-7xl font-serif italic text-zinc-900 tracking-tight">Become a master <br />of the craft.</h2>
                    <p className="text-xl text-zinc-500 leading-relaxed">Join the world's best animators and start studying the foundations of motion with the highest quality reference available.</p>
                    <div className="pt-8">
                        <Button asChild size="lg" className="h-20 px-12 rounded-full bg-amber-900 text-white hover:bg-amber-950 transition-all text-xl font-bold shadow-2xl shadow-amber-200">
                            <Link href="/signup">Start Your Education <ArrowRight className="ml-3 h-6 w-6 inline" /></Link>
                        </Button>
                    </div>
                    <div className="flex justify-center gap-8 text-zinc-400 text-sm font-medium pt-8">
                        <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Academic Discount</div>
                        <div className="flex items-center gap-2"><History className="h-4 w-4" /> Trusted Resources</div>
                    </div>
                </div>
            </section>
        </div>
    );
}
