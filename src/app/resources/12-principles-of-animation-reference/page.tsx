import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Book, PenTool, Highlighter, GraduationCap, Sparkles, Film, ArrowRight, History, ChevronRight } from 'lucide-react';
import { VideoCard } from '@/components/VideoCard';

export const metadata: Metadata = {
    title: '12 Principles of Animation Reference Guide',
    description: 'Master the 12 principles of animation through real-world video references. Frame-by-frame analysis of squash and stretch, timing, arcs, and anticipation.',
    keywords: '12 principles of animation, animation principles reference, Disney principles, study animation reference, squash and stretch reference',
    alternates: { canonical: 'https://animationreference.org/resources/12-principles-of-animation-reference' },
};

const RELATED_GUIDES = [
    { title: 'Best Animation Reference Websites', href: '/resources/best-animation-reference-websites' },
    { title: 'How to Analyze Animation Reference', href: '/resources/how-to-analyze-animation-reference' },
    { title: 'Human Walk Cycle Animation Reference', href: '/resources/human-walk-cycle-animation-reference' },
    { title: 'Body Mechanics Animation Reference', href: '/resources/body-mechanics-animation-reference' },
    { title: 'Combat & Martial Arts Reference', href: '/resources/punch-animation-reference' },
    { title: 'Frame-by-Frame Player Online', href: '/frame-by-frame-player' },
];

const PRINCIPLES = [
    { num: '01', name: 'Squash and Stretch', desc: 'Squash and stretch conveys weight, material flexibility, and biological volume preservation. When a character or object collides with the floor, it compresses along the impact axis while expanding proportionally in width. In realistic human movement, subtle facial muscle squash during speech or knee compression on landing communicates muscle density.' },
    { num: '02', name: 'Anticipation', desc: 'Anticipation prepares the audience for a major action. Before a character leaps upward, they must squat downward. Before swinging a bat or weapon, the torso chambers in the opposite direction. Examining high-speed athletic footage frame by frame reveals how the human body pre-loads tendons like mechanical springs.' },
    { num: '03', name: 'Staging', desc: 'Staging directs the viewer\'s eye to what is paramount in the frame. Clear silhouettes, readable lines of action, and uncluttered composition ensure that complex fight choreography or emotional acting can be understood in a single glance.' },
    { num: '04', name: 'Straight Ahead Action & Pose to Pose', desc: 'Pose to pose delivers controlled structure, timing accuracy, and strong story keys, essential for 3D character blocking and complex dialogue. Straight ahead action provides organic fluidity and spontaneous unpredictability, ideal for water, fire, smoke, and cloth simulation.' },
    { num: '05', name: 'Follow Through & Overlapping Action', desc: 'When the primary body stops moving, appendages, hair, clothing, and trailing limbs continue forward due to inertia. Overlapping action occurs when different parts of the body move at different rates, preventing the character from moving like a rigid wooden mannequin.' },
    { num: '06', name: 'Slow In and Slow Out', desc: 'Physical objects require time to accelerate from rest and decelerate to a stop. Spacing frames closer together at the beginning and end of a pose change creates natural ease-in and ease-out curves, anchoring the movement in authentic physical laws.' },
    { num: '07', name: 'Arcs', desc: 'Biological joints rotate on skeletal pivots, meaning human limbs and heads invariably travel along curved arcs rather than straight mechanical vectors. Animators track hand and nose arcs frame by frame to ensure smooth parabolic pathways.' },
    { num: '08', name: 'Secondary Action', desc: 'Secondary actions enrich and validate the primary action. An angry character striding forward (primary) may clench their fists, wipe sweat from their brow, or stomp with irregular cadence (secondary), adding psychological depth to the physical performance.' },
    { num: '09', name: 'Timing', desc: 'Timing dictates speed, weight, and emotion. The number of frames between two key poses defines whether an object weighs ten ounces or ten tons. At 24 FPS, spacing a head turn across 4 frames reads as a startled reaction, while 16 frames reads as contemplative observation.' },
    { num: '10', name: 'Exaggeration', desc: 'Exaggeration pushes reality toward dramatic clarity without destroying physical believability. Animators push line of action tilt, extend anticipation holds by 2 frames, and heighten squash distortion to make performances register vividly on screen.' },
    { num: '11', name: 'Solid Drawing & Posing', desc: 'Understanding anatomical volume, center of gravity, foreshortening, and balance is essential in both 2D drafts and 3D digital puppet rigs. Poses must feel structurally sound and balanced over the support base.' },
    { num: '12', name: 'Appeal', desc: 'Appeal is the charismatic design quality that captivates viewers, whether animating a charismatic hero, an grotesque creature, or a whimsical cartoon animal. Dynamic variety in shapes and rhythmic timing fosters visual appeal.' }
];

export default function PrinciplesGuide() {
    return (
        <div className="min-h-screen bg-[#030014] text-white selection:bg-purple-500/30 -mt-24">
            <section className="relative pt-44 pb-24 overflow-hidden border-b border-white/10">
                <div className="container mx-auto px-6 text-center max-w-4xl">
                    <nav className="text-xs text-zinc-400 mb-8 flex items-center justify-center gap-1.5" aria-label="Breadcrumb">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/resources" className="hover:text-white transition-colors">Resources</Link>
                        <span>/</span>
                        <span className="text-purple-300 font-medium">12 Principles of Animation</span>
                    </nav>

                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
                        The 12 Principles of Animation
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                        <strong className="text-white">The 12 principles of animation</strong> are foundational physics and aesthetic guidelines formulated by Disney masters Ollie Johnston and Frank Thomas to give movement life, weight, and emotional clarity.
                    </p>
                </div>
            </section>

            <main className="py-16 px-6 max-w-4xl mx-auto space-y-16">
                <section className="space-y-6 text-zinc-300 leading-relaxed text-base sm:text-lg">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">How Real-World Video Reference Informs Each Principle</h2>
                    <p>
                        While originally formulated for traditional hand-drawn feature films, the 12 principles apply with equal rigor to 3D computer animation, real-time game rigs, and stop-motion fabrication. The most effective way to understand these principles is not merely reading theoretical definitions, but scrubbing actual video recordings frame by frame to observe how nature executes them.
                    </p>
                </section>

                <section className="space-y-8">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Detailed Breakdown of All 12 Principles</h2>
                    <div className="grid gap-6">
                        {PRINCIPLES.map((p) => (
                            <div key={p.num} className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 md:p-8 space-y-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-purple-400">Principle {p.num}</div>
                                <h3 className="text-xl sm:text-2xl font-bold text-white">{p.name}</h3>
                                <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">{p.desc}</p>
                            </div>
                        ))}
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
