import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Play, MousePointer2, Keyboard, Layout, Maximize2, Layers, Sparkles, ArrowRight, ChevronRight, Sliders } from 'lucide-react';

export const metadata: Metadata = {
    title: 'How to Analyze Animation Reference Guide',
    description: 'Learn how to study and deconstruct animation reference frame by frame. Master keyframe timing, spacing arcs, and physical center of gravity.',
    keywords: 'how to analyze animation reference, study animation mechanics, frame-by-frame analysis, animation timing and spacing',
    alternates: { canonical: 'https://animationreference.org/resources/how-to-analyze-animation-reference' },
};

const RELATED_GUIDES = [
    { title: 'Best Animation Reference Websites', href: '/resources/best-animation-reference-websites' },
    { title: 'Personal Animation Vault Guide', href: '/resources/personal-animation-vault' },
    { title: 'Human Walk Cycle Animation Reference', href: '/resources/human-walk-cycle-animation-reference' },
    { title: 'Body Mechanics Animation Reference', href: '/resources/body-mechanics-animation-reference' },
    { title: 'Combat & Martial Arts Reference', href: '/resources/punch-animation-reference' },
    { title: 'Frame-by-Frame Player Online', href: '/frame-by-frame-player' },
];

export default function AnalysisGuide() {
    return (
        <div className="min-h-screen bg-[#030014] text-white selection:bg-purple-500/30 -mt-24">
            <section className="relative pt-44 pb-24 overflow-hidden">
                <div className="container mx-auto px-6 text-center max-w-4xl">
                    <nav className="text-xs text-zinc-400 mb-8 flex items-center justify-center gap-1.5" aria-label="Breadcrumb">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/resources" className="hover:text-white transition-colors">Resources</Link>
                        <span>/</span>
                        <span className="text-purple-300 font-medium">How to Analyze Animation Reference</span>
                    </nav>

                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
                        How to Analyze Animation Reference Frame by Frame
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                        <strong className="text-white">Animation reference analysis</strong> is the systematic breakdown of physical video footage into fundamental timing intervals, center of gravity vectors, and anatomical silhouette keys.
                    </p>
                </div>
            </section>

            <main className="py-12 px-6 max-w-4xl mx-auto space-y-16">
                <section className="space-y-6 text-zinc-300 leading-relaxed text-base sm:text-lg">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Watching vs. Actively Studying Motion</h2>
                    <p>
                        There is a profound distinction between casually viewing a reference video and deconstructing its kinetic anatomy. Novice animators frequently play a reference clip on repeat, attempt to memorize the overall impression, and then begin keyframing from visual memory. This invariably leads to floaty timing, missed contact beats, and rubbery limbs.
                    </p>
                    <p>
                        Professional animators treat reference as data. They step through footage frame by frame, measuring exact timecode intervals between anticipation, exertion, contact, and overshoot. By mapping the movement to mathematical frames at 24 FPS, you uncover subtle biomechanical realities that the human eye misses at full playback speed.
                    </p>
                </section>

                <section className="space-y-8">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">The 4-Step Reference Breakdown Methodology</h2>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 md:p-8 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-purple-400">Step 01</div>
                        <h3 className="text-xl font-bold text-white">Isolate the Root &amp; Center of Gravity</h3>
                        <p className="text-zinc-300 leading-relaxed">
                            Do not look at the limbs first. Track the character's pelvis and hips. Trace the vertical elevation curve (the up and down beats) and the horizontal progression. Notice where the center of mass hangs over the support base before every step, jump, or turn.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 md:p-8 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-purple-400">Step 02</div>
                        <h3 className="text-xl font-bold text-white">Identify Golden Key Poses</h3>
                        <p className="text-zinc-300 leading-relaxed">
                            Step through to identify the extreme points of motion: the maximum anticipation pose, the extreme force application pose, and the deepest settle pose. Capture these silhouettes as clear thumbnail sketches before touching your 3D digital rig or 2D canvas.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 md:p-8 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-purple-400">Step 03</div>
                        <h3 className="text-xl font-bold text-white">Measure Spacing Arcs &amp; Inbetweens</h3>
                        <p className="text-zinc-300 leading-relaxed">
                            Count the exact frame numbers. How many frames does the anticipation take? How many frames does the primary action last? Notice that real human actions often accelerate rapidly across 2 frames, then spend 8-12 frames settling into an overshoot arc.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 md:p-8 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-purple-400">Step 04</div>
                        <h3 className="text-xl font-bold text-white">Exaggerate and Stylize the Motion</h3>
                        <p className="text-zinc-300 leading-relaxed">
                            Never rotoscope reference 1:1. Live-action movement copied verbatim looks stiff and lifeless when applied to stylized rigs. Take the physical truth from the reference, push the silhouette clarity by 20%, sharpen the acceleration beats, and add dynamic squash and stretch.
                        </p>
                    </div>
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
