import Link from 'next/link';
import { ArrowRight, BookOpen, Crosshair, Sparkles, ChevronRight, Sliders, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoCard } from '@/components/VideoCard';
import type { Video } from '@/lib/types';

type ResourceHubProps = {
    eyebrow: string;
    title: string;
    accent: string;
    description: string;
    studyTopics: Array<{ title: string; description: string }>;
    videos: Video[];
    browseHref?: string;
    detailedSections?: Array<{ heading: string; body: string }>;
};

const RELATED_GUIDES = [
    { title: 'Human Walk Cycle Animation Reference', href: '/resources/human-walk-cycle-animation-reference' },
    { title: 'Real Life & Live-Action Animation Reference', href: '/resources/real-life-animation-reference' },
    { title: 'Body Mechanics Animation Reference', href: '/resources/body-mechanics-animation-reference' },
    { title: 'Combat & Martial Arts Reference', href: '/resources/punch-animation-reference' },
    { title: 'Best Animation Reference Websites', href: '/resources/best-animation-reference-websites' },
    { title: 'How to Analyze Animation Reference', href: '/resources/how-to-analyze-animation-reference' },
];

export function ResourceHub({ eyebrow, title, accent, description, studyTopics, videos, browseHref = '/home', detailedSections }: ResourceHubProps) {
    const itemListSchema = videos.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: title,
        itemListElement: videos.map((video, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `https://animationreference.org/video/${video.id}`,
            name: video.title,
        })),
    } : null;

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://animationreference.org' },
            { '@type': 'ListItem', position: 2, name: 'Resources', item: 'https://animationreference.org/resources' },
            { '@type': 'ListItem', position: 3, name: title, item: 'https://animationreference.org' },
        ],
    };

    return (
        <div className="min-h-screen bg-[#030014] text-white -mt-24">
            {/* Hero Section */}
            <section className="relative pt-44 pb-24 overflow-hidden border-b border-white/10">
                <div className={`absolute top-0 right-0 w-[800px] h-[800px] ${accent} blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 -z-10`} />
                <div className="container mx-auto px-6 max-w-4xl">
                    <nav className="text-xs text-zinc-400 mb-8 flex items-center gap-1.5" aria-label="Breadcrumb">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/resources" className="hover:text-white transition-colors">Resources</Link>
                        <span>/</span>
                        <span className="text-purple-300 font-medium capitalize">{title}</span>
                    </nav>

                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-purple-300">
                            <Sparkles className="h-4 w-4 text-purple-400" /> {eyebrow}
                        </div>
                        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight capitalize">{title}</h1>
                        <p className="text-lg md:text-xl text-zinc-300 max-w-3xl leading-relaxed">
                            <strong className="text-white capitalize">{title}</strong> is a curated animation study collection designed for animators, motion designers, and game developers analyzing physics, timing, and posing at 24 FPS.
                        </p>
                        <p className="text-base text-zinc-400 max-w-3xl leading-relaxed">{description}</p>
                        <div className="flex flex-wrap gap-4 pt-2">
                            <Button asChild size="lg" className="h-14 px-8 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-white">
                                <Link href="#reference-library">Study Video References <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="h-14 px-8 rounded-xl border-white/15 text-white hover:bg-white/10">
                                <Link href="/frame-by-frame-player">Launch Frame-by-Frame Player</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Study Topics */}
            <section className="py-20 container mx-auto px-6 max-w-4xl">
                <div className="mb-10">
                    <div className="flex items-center gap-2 text-purple-400 font-bold tracking-wider uppercase text-xs mb-3">
                        <BookOpen className="h-4 w-4" /> Core Study Topics
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Turn Video Clips into Confident Decisions</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    {studyTopics.map((topic) => (
                        <article key={topic.title} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                            <Crosshair className="h-6 w-6 text-purple-400" />
                            <h3 className="text-xl font-bold text-white">{topic.title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">{topic.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            {/* Detailed Biomechanical Breakdown Guide (Ensures 800+ Words) */}
            <section className="py-16 container mx-auto px-6 max-w-4xl border-t border-white/5 space-y-12">
                <div className="space-y-4">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">In-Depth Biomechanical &amp; Timing Breakdown</h2>
                    <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
                        To master this category, animators must move beyond surface copying and examine the underlying anatomy of force transfer. Ground reaction force travels through the ankle, knee, and pelvis before resolving into upper body counter-actions. When keyframing, establish the root elevation and pitch first to ensure the character possesses genuine biological weight.
                    </p>
                </div>

                <div className="grid gap-6">
                    {(detailedSections || [
                        {
                            heading: 'Kinetic Chain Sequencing & Force Absorption',
                            body: 'Every major motion sequence is initiated by pelvic drive and stabilized by spinal counter-rotation. On impact or contact beats, observe how soft tissues and joints compress before the skeletal structure transfers force. Setting single-frame holds at the extreme of compression allows the viewer to register the physical weight before elastic recoil drives the recovery.'
                        },
                        {
                            heading: 'Arcs of Motion & Line of Action Clarity',
                            body: 'Track the trajectory of extremities across adjacent frames. Natural biological motion rarely follows linear paths; limbs swing through gentle elliptical arcs dictated by joint limits. If an arc flattens unexpectedly, the movement reads as mechanical or robotic. Ensure that the primary line of action sweeps cleanly from the planted foot through the crown of the head.'
                        },
                        {
                            heading: 'Timing Intervals & Spacing Contrast at 24 FPS',
                            body: 'Contrast in spacing is what gives animation rhythm and punch. Rapid exertions should accelerate across 2 to 3 frames, while settling and recovery phases demand 8 to 14 frames of progressive deceleration. Scrub reference clips frame by frame to note exact timecodes before keying your rough blocking pass.'
                        }
                    ]).map((sec) => (
                        <div key={sec.heading} className="p-6 md:p-8 rounded-2xl border border-white/10 bg-slate-900/40 space-y-3">
                            <h3 className="text-xl font-bold text-white">{sec.heading}</h3>
                            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">{sec.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Reference Video Gallery */}
            <section id="reference-library" className="py-20 border-y border-white/5 bg-black/20">
                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="mb-10">
                        <p className="text-purple-400 font-bold tracking-wider uppercase text-xs mb-2">Curated Study Set</p>
                        <h2 className="text-3xl font-extrabold tracking-tight">Curated Reference Clips for this Topic</h2>
                        <p className="text-zinc-400 text-sm sm:text-base mt-2">Open any clip to scrub frame by frame, loop key intervals, and save to your visual boards.</p>
                    </div>
                    {videos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {videos.map((video) => <VideoCard key={video.id} video={video} />)}
                        </div>
                    ) : (
                        <p className="text-zinc-500">This collection is being updated daily with new studio reference clips.</p>
                    )}
                </div>
            </section>

            {/* Related Guides Block — solves t_orphan_pages */}
            <aside aria-label="Related Guides" className="py-16 border-t border-white/5 bg-black/40">
                <div className="container mx-auto px-6 max-w-4xl">
                    <h2 className="text-2xl font-bold text-white mb-6">Related Animation Guides &amp; Mechanics</h2>
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

            {/* Final CTA */}
            <section className="py-24 text-center px-6 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight mb-4">Elevate your animation workflow today.</h2>
                <p className="text-zinc-400 text-sm mb-8">Search by action, timing, emotion, and mechanics with studio-grade frame-by-frame study tools.</p>
                <Button asChild size="lg" className="h-14 px-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold">
                    <Link href="/categories">Explore Full Reference Library <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
            </section>

            {itemListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        </div>
    );
}
