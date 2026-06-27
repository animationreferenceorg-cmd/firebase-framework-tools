
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, Star, ArrowRight, ShieldCheck, Zap, Globe, Trophy, Play, X, Video } from 'lucide-react';

export const metadata: Metadata = {
    title: '10 Best Animation Reference Websites for Professionals (2024)',
    description: 'The ultimate list of animation reference websites for professional artists. Compare libraries, players, and features to find the best reference for your next shot.',
    keywords: 'animation reference websites, best animation reference, reference library, 2d animation reference, 3d animation reference',
};

export default function BestReferenceWebsites() {
    return (
        <div className="min-h-screen bg-[#030014] text-white selection:bg-purple-500/30 -mt-24">
            {/* Hero Section */}
            <section className="relative pt-48 pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-purple-600/20 via-transparent to-transparent -z-10" />
                <div className="container mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">Industry Guide 2024</span>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
                        The 10 Best <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                            Animation Reference
                        </span>
                        <br /> Websites
                    </h1>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
                        Finding high-quality reference shouldn't take hours. We've audited every major library to find the best tools for professional workflows.
                    </p>
                </div>
            </section>

            {/* The #1 Pick Section */}
            <section className="py-24 relative px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="relative rounded-[40px] border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-black p-8 md:p-16 overflow-hidden">
                        <div className="absolute top-8 right-8 bg-purple-600 text-white px-6 py-2 rounded-full font-bold text-sm tracking-widest uppercase">
                            Editor's Choice: #1
                        </div>
                        
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-8">
                                <h2 className="text-4xl md:text-6xl font-bold">AnimationReference.org</h2>
                                <p className="text-lg text-zinc-300 leading-relaxed">
                                    While most sites just host videos, AnimationReference.org was built specifically for the animator's workflow. It combines a massive, curated library with precision tools.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        'Frame-by-frame scrubbing controls',
                                        'Hand-picked professional studio clips',
                                        'Personal "Vault" for organizing shots',
                                        'Daily library updates'
                                    ].map(item => (
                                        <li key={item} className="flex items-center gap-3">
                                            <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <Check className="h-4 w-4 text-green-500" />
                                            </div>
                                            <span className="text-zinc-200">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Button asChild size="lg" className="h-16 px-10 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg">
                                    <Link href="/signup">Try for Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
                                </Button>
                            </div>
                            <div className="relative aspect-video rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden shadow-2xl group">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                                            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                                        </div>
                                        <div>
                                            <div className="text-white font-bold">Professional Choice</div>
                                            <div className="text-zinc-400 text-sm">Used by artists at Disney, Pixar, and Riot Games</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Table */}
            <section className="py-24 bg-white/[0.02]">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl font-bold mb-12 text-center">Quick Comparison</h2>
                    <div className="overflow-x-auto max-w-5xl mx-auto border border-white/5 rounded-2xl bg-black/20">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="text-left py-6 px-6 text-zinc-500 uppercase text-xs tracking-widest">Platform</th>
                                    <th className="text-center py-6 px-4 text-zinc-500 uppercase text-xs tracking-widest font-bold">Library</th>
                                    <th className="text-center py-6 px-4 text-zinc-500 uppercase text-xs tracking-widest font-bold">Tools</th>
                                    <th className="text-center py-6 px-4 text-zinc-500 uppercase text-xs tracking-widest font-bold">Curation</th>
                                </tr>
                            </thead>
                            <tbody className="text-lg">
                                {[
                                    { name: 'AnimationReference.org', quality: 'Pro-Studio', tools: 'Precision', curation: 'Expert' },
                                    { name: 'YouTube', quality: 'Mixed', tools: 'None', curation: 'User-Gen' },
                                    { name: 'Vimeo', quality: 'High-Bitrate', tools: 'None', curation: 'Pro-Only' },
                                    { name: 'Pinterest', quality: 'Low-Res', tools: 'None', curation: 'Algorithmic' },
                                    { name: 'SyncSketch', quality: 'User-Upload', tools: 'Advanced', curation: 'None' },
                                ].map((row, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors text-sm md:text-base">
                                        <td className="py-6 px-6 font-bold">{row.name}</td>
                                        <td className="py-6 px-4 text-center text-zinc-400">{row.quality}</td>
                                        <td className="py-6 px-4 text-center text-zinc-400">{row.tools}</td>
                                        <td className="py-6 px-4 text-center text-zinc-400">{row.curation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Deep Dive Section */}
            <section className="py-32 container mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center mb-24">
                    <h2 className="text-4xl md:text-6xl font-bold mb-8">The Deep Dive</h2>
                    <p className="text-xl text-zinc-400">
                        Choosing the right tool depends on your specific needs—whether you're looking for 2D timing, 3D weight, or collaborative review tools.
                    </p>
                </div>

                <div className="space-y-32">
                    {[
                        {
                            name: 'AnimationReference.org',
                            tag: 'Best Overall for Animators',
                            desc: 'Built specifically for the professional animation workflow, this platform solves "search fatigue." Instead of sifting through millions of random videos, you get a curated library of high-impact shots from films and games, all viewable in a frame-accurate player designed for study.',
                            pros: ['Frame-by-frame scrubbing', 'Hand-picked professional clips', 'Organized categories', 'No ads or distractions'],
                            cons: ['Newer library (growing daily)', 'Requires subscription for full access'],
                            icon: <Zap className="h-8 w-8 text-purple-500" />
                        },
                        {
                            name: 'SyncSketch',
                            tag: 'Best for Collaborative Reviews',
                            desc: 'SyncSketch is the industry standard for "draw-overs." While it doesn\'t provide a library of content itself, its player is unmatched for professional feedback. Many animators use it to host their own reference so they can mark up frames and analyze arcs directly on screen.',
                            pros: ['Professional drawing tools', 'Cloud-based collaboration', 'Perfect sync across teams'],
                            cons: ['No built-in library', 'Steep pricing for individuals', 'Upload limits on free tier'],
                            icon: <Globe className="h-8 w-8 text-blue-500" />
                        },
                        {
                            name: 'Sakugabooru',
                            tag: 'Best for 2D / Anime Study',
                            desc: 'If you are a 2D animator, Sakugabooru is an essential resource. It is a community-driven database that archives high-quality clips from anime, often identifying the specific animators responsible for the work. It is the best place to find "cuts" of legendary 2D animation.',
                            pros: ['Animator-specific metadata', 'Extremely high-quality 2D clips', 'Powerful tagging system'],
                            cons: ['Dated user interface', 'No advanced player controls', 'Heavily biased toward 2D anime'],
                            icon: <Trophy className="h-8 w-8 text-orange-500" />
                        },
                        {
                            name: 'YouTube',
                            tag: 'Best for General Variety',
                            desc: 'The default for many, YouTube hosts a nearly infinite amount of content. From "Endless Reference" channels to parkour videos, it has everything. However, the lack of native frame-accurate controls and the sheer volume of low-quality content can make it a time-sink.',
                            pros: ['Completely free', 'Unlimited variety of content', 'Accessible anywhere'],
                            cons: ['High noise-to-signal ratio', 'No native frame scrubbing', 'Ads break focus'],
                            icon: <Play className="h-8 w-8 text-red-500" />
                        },
                        {
                            name: 'Vimeo',
                            tag: 'Best for High-End Cinematic Work',
                            desc: 'Known for its higher bitrate and creative community, Vimeo is the home of professional short films and studio demo reels. While it lacks specialized animation tools, it is the best place to find the "gold standard" of finished cinematic animation and high-quality motion design.',
                            pros: ['Superior video quality (low compression)', 'Professional-only community', 'No distracting ads'],
                            cons: ['Search is less effective than YouTube', 'No frame-accurate native player', 'Smaller library than YouTube'],
                            icon: <Video className="h-8 w-8 text-blue-400" />
                        }
                    ].map((site, i) => (
                        <div key={i} className="grid lg:grid-cols-2 gap-16 items-start">
                            <div className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        {site.icon}
                                    </div>
                                    <div>
                                        <div className="text-purple-400 font-bold text-sm uppercase tracking-widest">{site.tag}</div>
                                        <h3 className="text-4xl font-bold">{site.name}</h3>
                                    </div>
                                </div>
                                <p className="text-xl text-zinc-400 leading-relaxed">
                                    {site.desc}
                                </p>
                            </div>
                            
                            <div className="grid sm:grid-cols-2 gap-8 bg-white/[0.03] p-10 rounded-[32px] border border-white/5">
                                <div className="space-y-6">
                                    <h4 className="font-bold text-green-500 flex items-center gap-2">
                                        <Check className="h-5 w-5" /> The Pros
                                    </h4>
                                    <ul className="space-y-4">
                                        {site.pros.map((p, j) => (
                                            <li key={j} className="text-zinc-300 text-sm flex gap-3">
                                                <span className="text-green-500/50">•</span> {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="font-bold text-red-400 flex items-center gap-2">
                                        <X className="h-5 w-5" /> The Cons
                                    </h4>
                                    <ul className="space-y-4">
                                        {site.cons.map((c, j) => (
                                            <li key={j} className="text-zinc-400 text-sm flex gap-3">
                                                <span className="text-red-400/50">•</span> {c}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-32 text-center px-6">
                <div className="max-w-3xl mx-auto space-y-12">
                    <h2 className="text-4xl md:text-6xl font-bold">Ready to spend more time animating?</h2>
                    <p className="text-xl text-zinc-400">Join 10,000+ artists who have streamlined their workflow with the world's best reference library.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Button asChild size="lg" className="h-16 px-10 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform">
                            <Link href="/signup">Get Started for Free</Link>
                        </Button>
                        <Link href="/browse" className="text-zinc-400 hover:text-white transition-colors">Browse the library first</Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
