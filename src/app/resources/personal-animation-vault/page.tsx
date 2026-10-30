import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LayoutGrid, FolderHeart, Share2, Cloud, Sparkles, Clock, CheckCircle2, ArrowRight, ChevronRight, Sliders } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Personal Animation Reference Vault Guide',
    description: 'Learn how to build a personal animation reference vault. Organize, categorize, and scrub your motion clips instantly across any device.',
    keywords: 'organize animation reference, reference moodboard, animation workflow, reference manager, animation productivity tools',
    alternates: { canonical: 'https://animationreference.org/resources/personal-animation-vault' },
};

const RELATED_GUIDES = [
    { title: 'Best Animation Reference Websites', href: '/resources/best-animation-reference-websites' },
    { title: 'How to Analyze Animation Reference', href: '/resources/how-to-analyze-animation-reference' },
    { title: 'Human Walk Cycle Animation Reference', href: '/resources/human-walk-cycle-animation-reference' },
    { title: 'Body Mechanics Animation Reference', href: '/resources/body-mechanics-animation-reference' },
    { title: 'Combat & Martial Arts Reference', href: '/resources/punch-animation-reference' },
    { title: 'Frame-by-Frame Player Online', href: '/frame-by-frame-player' },
];

export default function VaultResource() {
    return (
        <div className="min-h-screen bg-[#030014] text-white selection:bg-purple-500/30 -mt-24">
            <section className="relative pt-44 pb-24 overflow-hidden">
                <div className="container mx-auto px-6 text-center max-w-4xl">
                    <nav className="text-xs text-zinc-400 mb-8 flex items-center justify-center gap-1.5" aria-label="Breadcrumb">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/resources" className="hover:text-white transition-colors">Resources</Link>
                        <span>/</span>
                        <span className="text-purple-300 font-medium">Personal Animation Vault</span>
                    </nav>

                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
                        Building Your Personal Animation Reference Vault
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                        <strong className="text-white">A personal animation vault</strong> is a structured reference curation system that stores, categorizes, and organizes video motion clips for instant access during production blocking and polish.
                    </p>
                </div>
            </section>

            <main className="py-12 px-6 max-w-4xl mx-auto space-y-16">
                <section className="space-y-6 text-zinc-300 leading-relaxed text-base sm:text-lg">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">The Problem with Scattered Reference Collections</h2>
                    <p>
                        Professional animators frequently encounter a frustrating bottleneck: you recall seeing an exceptional sword parry, a subtle facial twitch, or an animal gait turnaround six months ago, but the clip is lost across browser bookmarks, hard drive folders, or expired social media links. When reference is disorganized, animators settle for sub-par clips or attempt to animate complex physical mechanics from faulty memory.
                    </p>
                    <p>
                        A dedicated cloud reference vault eliminates this friction. By curating video clips into categorized boards sorted by motion archetype — such as heavy locomotion, facial micro-expressions, combat impacts, and stylized smears — you establish an enduring asset library that accelerates blocking speed throughout your career.
                    </p>
                </section>

                <section className="grid sm:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 space-y-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">01</div>
                        <h3 className="text-xl font-bold text-white">Tag by Biomechanical Action</h3>
                        <p className="text-zinc-300 text-sm leading-relaxed">
                            Organize boards by anatomical mechanics rather than show titles. Group clips into 'Cervical Whiplash', 'Double Bounce Locomotion', and 'Weight Shifts' so you can locate relevant mechanics instantly when shot assignments change.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 space-y-3">
                        <div className="h-10 w-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold">02</div>
                        <h3 className="text-xl font-bold text-white">Preserve Frame-Accurate Scrubbing</h3>
                        <p className="text-zinc-300 text-sm leading-relaxed">
                            A reference clip without single-frame stepping is only half useful. Storing clips in Animation Reference ensures you can always step frame by frame at 24 FPS, inspect spacing arcs, and set A-B loops.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 space-y-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">03</div>
                        <h3 className="text-xl font-bold text-white">Private Studio &amp; NDA Folders</h3>
                        <p className="text-zinc-300 text-sm leading-relaxed">
                            Commercial studio projects often require strict confidentiality. Use private board permissions to organize internal references, supervisor playblasts, and proprietary client motion studies securely.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 space-y-3">
                        <div className="h-10 w-10 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center font-bold">04</div>
                        <h3 className="text-xl font-bold text-white">Synchronized Playblast Comparison</h3>
                        <p className="text-zinc-300 text-sm leading-relaxed">
                            Load your work-in-progress Maya or Blender shot alongside your saved vault reference. Compare key poses, contact frames, and momentum arcs side by side in the web player.
                        </p>
                    </div>
                </section>

                <section className="space-y-6 text-zinc-300 leading-relaxed text-base sm:text-lg">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Best Practices for Maintaining Your Reference Vault</h2>
                    <p>
                        Audit your vault at the conclusion of every production sprint. Remove redundant clips that duplicate motion you have already mastered. Add technical tags for frame cadence (e.g., #on-twos, #24fps, #slow-motion) and keep notes on specific timing tricks observed in each shot.
                    </p>
                </section>
            </main>

            <aside aria-label="Related Guides" className="py-16 border-t border-white/5 bg-black/40">
                <div className="container mx-auto px-6 max-w-4xl">
                    <h2 className="text-2xl font-bold text-white mb-6">Related Animation Guides &amp; Resources</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {RELATED_GUIDES.map((g) => (
                            <Link
                                key={g.href}
                                href={g.href}
                                className="p-4 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/80 hover:border-purple-500/40 transition-colors flex items-center justify-between group"
                            >
                                <span className="font-semibold text-zinc-200 group-hover:text-white text-sm">{g.title}</span>
                                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        ))}
                    </div>
                </div>
            </aside>
        </div>
    );
}
