
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Play, MousePointer2, Keyboard, Layout, Maximize2, Layers, Sparkles, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
    title: 'The Ultimate Guide to Analyzing Animation Reference (Frame-by-Frame)',
    description: 'Learn the professional workflow for studying animation reference. Deconstruct timing, spacing, and mechanics using frame-by-frame analysis.',
    keywords: 'how to analyze animation reference, study animation mechanics, frame-by-frame analysis, animation timing and spacing',
};

export default function AnalysisGuide() {
    return (
        <div className="min-h-screen bg-[#030014] text-white -mt-24">
            {/* Masterclass Hero */}
            <section className="relative pt-48 pb-32 border-b border-white/5">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 -z-10" />
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold tracking-widest uppercase mb-8">
                            Technical Deep-Dive
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[1.05]">
                            Animation <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Analysis</span>
                        </h1>
                        <p className="text-2xl text-zinc-400 leading-relaxed max-w-2xl">
                            Watching reference isn't the same as studying it. Learn the professional frame-by-frame workflow to deconstruct world-class motion.
                        </p>
                    </div>
                </div>
            </section>

            {/* The 3-Step Workflow */}
            <section className="py-32 container mx-auto px-6">
                <div className="grid lg:grid-cols-3 gap-12">
                    {[
                        { 
                            step: '01', 
                            title: 'Active Observation', 
                            desc: 'Before scrubbing, watch the clip at full speed. Look for the "Golden Pose" and the overall silhouette.',
                            icon: <Play className="h-8 w-8 text-blue-400" />
                        },
                        { 
                            step: '02', 
                            title: 'Mechanical Deconstruction', 
                            desc: 'Use frame-by-frame controls to find the exact frame where weight shifts and force is exerted.',
                            icon: <Keyboard className="h-8 w-8 text-purple-400" />
                        },
                        { 
                            step: '03', 
                            title: 'Abstracting Shapes', 
                            desc: 'Look past the character to see the arcs, smears, and lines of action that drive the motion.',
                            icon: <Layers className="h-8 w-8 text-pink-400" />
                        }
                    ].map((item, i) => (
                        <div key={i} className="space-y-6 group">
                            <div className="text-6xl font-black text-white/5 group-hover:text-white/10 transition-colors">{item.step}</div>
                            <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                {item.icon}
                            </div>
                            <h3 className="text-2xl font-bold">{item.title}</h3>
                            <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Feature Breakdown (Visual) */}
            <section className="py-32 bg-zinc-950 relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-24">
                        <div className="flex-1 space-y-12">
                            <h2 className="text-4xl md:text-6xl font-bold leading-tight">Built for <span className="text-blue-400">Deep Study</span></h2>
                            <div className="space-y-8">
                                {[
                                    { title: 'Frame Precision', desc: 'Use , and . keys to step through animation with zero lag.', icon: <Keyboard /> },
                                    { title: 'Loop Customization', desc: 'Select specific regions to analyze a single action repeatedly.', icon: <Layout /> },
                                    { title: 'Full-Screen Immersion', desc: 'Remove distractions and focus entirely on the motion arcs.', icon: <Maximize2 /> }
                                ].map((feat, i) => (
                                    <div key={i} className="flex gap-6">
                                        <div className="mt-1 text-blue-400">{feat.icon}</div>
                                        <div>
                                            <h4 className="text-xl font-bold mb-2">{feat.title}</h4>
                                            <p className="text-zinc-400">{feat.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 w-full">
                            <div className="relative aspect-video rounded-3xl border border-white/10 bg-black shadow-2xl overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center space-y-4">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                                            <Sparkles className="h-4 w-4 text-blue-400" />
                                            <span className="text-sm font-medium">Interactive Player Preview</span>
                                        </div>
                                        <p className="text-zinc-500 text-sm">Sign in to try the precision player</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-32 bg-gradient-to-t from-blue-900/20 to-transparent">
                <div className="container mx-auto px-6 text-center space-y-8">
                    <h2 className="text-4xl md:text-6xl font-bold">Start your first study today.</h2>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto">Access the world's most curated library and start analyzing motion like a professional.</p>
                    <div className="pt-8">
                        <Button asChild size="lg" className="h-16 px-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl group">
                            <Link href="/signup">
                                Get Started <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
