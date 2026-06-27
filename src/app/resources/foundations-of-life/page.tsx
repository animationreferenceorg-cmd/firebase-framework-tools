
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { VideoCard } from '@/components/VideoCard';
import type { Video } from '@/lib/types';
import { 
    BookOpen, 
    FileText, 
    GraduationCap, 
    Search, 
    Zap, 
    ArrowRight, 
    CheckCircle2, 
    Info,
    Play,
    Shield
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'The Foundations of Life: A Report on Animation Principles',
    description: 'An authoritative report on the core principles that bring characters to life. Study the 12 principles of animation with real-world reference.',
    keywords: 'foundations of life animation, animation principles report, study animation reference, professional animation foundations',
};

const FOUNDATION_EXAMPLES: Video[] = [
    {
        id: 'squash-stretch-foundation',
        title: 'Principle 01: Squash & Stretch',
        description: 'Observation of volume conservation in high-impact landings.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800',
        posterUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://vimeo.com/76979871',
        categoryIds: ['principles'],
        status: 'published',
        type: 'video',
        tags: ['squash', 'stretch']
    },
    {
        id: 'anticipation-foundation',
        title: 'Principle 02: Anticipation',
        description: 'Analyzing the physical wind-up before explosive movement.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800',
        posterUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://vimeo.com/76979871',
        categoryIds: ['principles'],
        status: 'published',
        type: 'video',
        tags: ['anticipation']
    },
    {
        id: 'timing-spacing-foundation',
        title: 'Principle 03: Timing & Spacing',
        description: 'The mathematical distribution of frames across a distance.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=800',
        posterUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=800',
        videoUrl: 'https://vimeo.com/76979871',
        categoryIds: ['principles'],
        status: 'published',
        type: 'video',
        tags: ['timing', 'spacing']
    }
];

export default function FoundationsOfLife() {
    return (
        <div className="min-h-screen bg-[#f8f9fa] text-slate-900 selection:bg-blue-100 -mt-24 font-sans">
            {/* Report Header */}
            <header className="pt-48 pb-20 bg-white border-b border-slate-200">
                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="flex items-center gap-3 text-blue-600 font-bold tracking-widest uppercase text-xs mb-6">
                        <FileText className="h-4 w-4" />
                        Internal Research Report No. 42
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-none mb-8">
                        The Foundations <br />
                        <span className="text-blue-600 italic">of Life.</span>
                    </h1>
                    <div className="flex flex-wrap gap-12 text-sm text-slate-500 font-medium border-t border-slate-100 pt-8 mt-12">
                        <div>
                            <span className="block uppercase tracking-widest text-[10px] text-slate-400 mb-1">Subject</span>
                            Biological Motion & Principles
                        </div>
                        <div>
                            <span className="block uppercase tracking-widest text-[10px] text-slate-400 mb-1">Status</span>
                            Essential Study Material
                        </div>
                        <div>
                            <span className="block uppercase tracking-widest text-[10px] text-slate-400 mb-1">Source</span>
                            AnimationReference.org
                        </div>
                    </div>
                </div>
            </header>

            {/* Abstract Section */}
            <section className="py-24 container mx-auto px-6 max-w-5xl">
                <div className="grid md:grid-cols-3 gap-16">
                    <div className="md:col-span-2 space-y-8">
                        <h2 className="text-3xl font-bold text-slate-800">Executive Summary</h2>
                        <p className="text-xl text-slate-600 leading-relaxed">
                            Animation is not just "moving drawings"—it is the scientific reconstruction of life. To create believable motion, an artist must master the <span className="font-bold text-slate-900 underline decoration-blue-500 underline-offset-4">Foundations of Life</span>: the 12 principles that govern how weight, force, and emotion manifest in the physical world.
                        </p>
                        <p className="text-lg text-slate-500 leading-relaxed">
                            Without these foundations, characters feel like empty puppets. With them, they possess soul, weight, and purpose. Our research indicates that the most successful animators are those who spend at least 40% of their workflow studying real-world mechanics.
                        </p>
                    </div>
                    <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 space-y-6 self-start">
                        <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Info className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-slate-900">Key Finding</h3>
                        <p className="text-sm text-blue-800 leading-relaxed">
                            Visual observation is the #1 predictor of animation quality. Mere imagination cannot substitute for the study of physical arcs and timing.
                        </p>
                    </div>
                </div>
            </section>

            {/* Evidence & Examples (Video Cards) */}
            <section className="py-24 bg-slate-100/50 border-y border-slate-200">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                        <div>
                            <h2 className="text-4xl font-black tracking-tight mb-4 uppercase">Case Studies</h2>
                            <p className="text-slate-500 max-w-xl">
                                We have isolated three primary examples of foundation principles being applied to professional shots. Analyze these using the frame-accurate player.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <div className="px-4 py-2 bg-white rounded-full text-xs font-bold border border-slate-200">2024 UPDATE</div>
                            <div className="px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-bold shadow-md">VERIFIED</div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {FOUNDATION_EXAMPLES.map((video: Video) => (
                            <div key={video.id} className="space-y-4">
                                <VideoCard video={video} />
                                <div className="px-2">
                                    <h4 className="font-bold text-slate-900">{video.title}</h4>
                                    <p className="text-sm text-slate-500">{video.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why This Matters */}
            <section className="py-32 container mx-auto px-6 max-w-4xl">
                <div className="space-y-16">
                    <div className="text-center">
                        <h2 className="text-4xl font-black mb-6">Why Study is Mandatory</h2>
                        <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full" />
                    </div>

                    <div className="grid gap-12">
                        {[
                            { 
                                title: 'The Illusion of Life', 
                                desc: 'Your eyes are trained to detect unnatural motion. Even slight deviations in timing or spacing will trigger a "reject" response in the viewer\'s brain.',
                                icon: <Zap />
                            },
                            { 
                                title: 'Efficiency in Production', 
                                desc: 'Using high-quality reference saves hours of guessing. It provides a roadmap for your keyframes, reducing the need for costly revisions.',
                                icon: <Search />
                            },
                            { 
                                title: 'Emotional Resonance', 
                                desc: 'Physical truth leads to emotional truth. When a character moves correctly, the audience stops seeing pixels and starts seeing a living being.',
                                icon: <CheckCircle2 />
                            }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-8 group">
                                <div className="h-16 w-16 shrink-0 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                    {item.icon}
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-2xl font-bold">{item.title}</h4>
                                    <p className="text-slate-500 leading-relaxed text-lg">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Call to Action: AnimationReference.org */}
            <section className="py-24 container mx-auto px-6 max-w-6xl">
                <div className="relative rounded-[40px] bg-[#030014] p-12 md:p-24 overflow-hidden text-white">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20" />
                    <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs font-bold tracking-widest uppercase">
                                <Shield className="h-3 w-3" /> Recommended Platform
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                                The Best Place <br />
                                to Study is <br />
                                <span className="text-blue-500">Here.</span>
                            </h2>
                            <p className="text-xl text-slate-400">
                                AnimationReference.org was built to host these foundations. Our frame-accurate player and curated library are the ultimate tools for anyone serious about mastering the motion of life.
                            </p>
                            <div className="pt-4">
                                <Button asChild size="lg" className="h-20 px-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-2xl shadow-2xl">
                                    <Link href="/browse">Start Studying <ArrowRight className="ml-4 h-8 w-8" /></Link>
                                </Button>
                            </div>
                        </div>
                        <div className="hidden lg:block relative">
                            <div className="aspect-square bg-blue-500/10 rounded-full blur-[100px] absolute inset-0 -z-10" />
                            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm space-y-6">
                                <div className="flex justify-between items-center text-sm font-mono text-slate-500 uppercase tracking-widest">
                                    <span>Observation Log</span>
                                    <span>V. 1.0.4</span>
                                </div>
                                <div className="h-px bg-white/10 w-full" />
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-3 text-slate-300">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        Frame-accurate scrubbing
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-300">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        Curated biological motion
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-300">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        Advanced timing overlays
                                    </li>
                                </ul>
                                <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 w-3/4 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Tag */}
            <footer className="py-24 text-center border-t border-slate-200 bg-white">
                <p className="text-slate-400 text-sm font-mono uppercase tracking-[0.3em]">
                    End of Report // AnimationReference.org Foundations Series
                </p>
            </footer>
        </div>
    );
}
