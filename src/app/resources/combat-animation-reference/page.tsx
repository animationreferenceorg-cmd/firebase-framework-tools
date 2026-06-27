
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sword, Shield, Zap, Target, Flame, Box, Skull, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
    title: '50+ Essential Combat & Fighting Animation References for Game Devs',
    description: 'The definitive collection of combat animation references for game developers and professional animators. High-impact attacks, blocks, and reactions.',
    keywords: 'fighting animation reference, combat animation reference, game animation, attack animations, impact frames reference',
};

export default function CombatResources() {
    return (
        <div className="min-h-screen bg-[#050505] text-white -mt-24">
            {/* Action Hero Section */}
            <section className="relative pt-48 pb-32 overflow-hidden border-b border-red-900/20">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-600/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 -z-10" />
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl space-y-6">
                        <div className="flex items-center gap-2 text-red-500 font-bold tracking-[0.2em] uppercase text-sm mb-4">
                            <Flame className="h-4 w-4" />
                            Combat Mastery Series
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter leading-none mb-8">
                            STRIKE <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">HARDER.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl leading-relaxed">
                            Stop making floaty combat. Access 50+ hand-picked professional fighting references specifically curated for game developers and action animators.
                        </p>
                        <div className="pt-8">
                            <Button asChild className="h-20 px-12 rounded-none bg-red-600 hover:bg-red-700 text-white font-black text-2xl skew-x-[-10deg] transition-all hover:scale-105 shadow-[0_0_50px_-10px_rgba(220,38,38,0.5)]">
                                <Link href="/signup" className="skew-x-[10deg]">GET THE PACK <ArrowRight className="ml-4 h-8 w-8 inline" /></Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Combat Categories Grid */}
            <section className="py-32 container mx-auto px-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: 'Heavy Attacks', desc: 'Weighty strikes with massive anticipation and settle.', icon: <Sword /> },
                        { title: 'Hit Reactions', desc: 'Physics-based reactions to simulate impact and pain.', icon: <Skull /> },
                        { title: 'Blocks & Parries', desc: 'Defensive motion with perfect contact points.', icon: <Shield /> },
                        { title: 'Execution Moves', desc: 'Complex, multi-character cinematic combat.', icon: <Target /> }
                    ].map((item, i) => (
                        <div key={i} className="p-10 bg-zinc-900/50 border border-white/5 hover:border-red-500/30 transition-all group">
                            <div className="mb-8 text-red-500 group-hover:scale-110 transition-transform duration-500">{item.icon}</div>
                            <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter italic">{item.title}</h3>
                            <p className="text-zinc-500 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Why Game Devs Choose Us */}
            <section className="py-32 bg-red-600 text-white skew-y-[-2deg] relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 -skew-y-[2deg]" />
                <div className="container mx-auto px-6 skew-y-[2deg]">
                    <div className="grid lg:grid-cols-2 gap-24 items-center">
                        <div className="space-y-10">
                            <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">Built for <br />The Pipeline</h2>
                            <div className="grid gap-8">
                                {[
                                    { title: 'Consistent Framerate', desc: 'Every clip is verified for clear frame-by-frame study.' },
                                    { title: 'Action Tagging', desc: 'Find "High-Kick" or "Impact" in seconds, not hours.' },
                                    { title: 'Vault Access', desc: 'Save references directly to your project folders.' }
                                ].map((feat, i) => (
                                    <div key={i} className="border-l-4 border-black pl-6">
                                        <h4 className="text-2xl font-black uppercase mb-2">{feat.title}</h4>
                                        <p className="text-red-100 text-lg opacity-80">{feat.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="aspect-square bg-black/20 rounded-full blur-[100px] absolute inset-0 -z-10" />
                            <div className="bg-black p-4 rotate-3 shadow-2xl">
                                <div className="aspect-video bg-zinc-900 border border-white/10 flex items-center justify-center">
                                    <Zap className="h-24 w-24 text-red-600 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEO Keyword Cloud (Subtle) */}
            <section className="py-24 container mx-auto px-6 text-center">
                <p className="text-zinc-600 text-sm font-mono max-w-4xl mx-auto uppercase tracking-widest leading-loose">
                    Impact frames / contact poses / weight shift / follow-through / anticipation / overlap / smear frames / arcs of motion / fight choreography reference / martial arts animation / sword fighting reference / boxing animation reference / hitstop / screenshake / frame data
                </p>
            </section>

            {/* Final Heavy CTA */}
            <section className="py-48 text-center px-6">
                <div className="max-w-4xl mx-auto space-y-12">
                    <h2 className="text-6xl md:text-9xl font-black italic tracking-tighter uppercase leading-none">STOP <br />SEARCHING. <br /><span className="text-red-600">ANIMATE.</span></h2>
                    <p className="text-2xl text-zinc-400 font-medium">Get the industry's most powerful combat reference library today.</p>
                    <div className="pt-8">
                        <Button asChild size="lg" className="h-24 px-16 bg-white text-black hover:bg-zinc-200 font-black text-3xl skew-x-[-10deg]">
                            <Link href="/signup" className="skew-x-[10deg]">JOIN THE VAULT</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
