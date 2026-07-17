import Link from 'next/link';
import { ArrowRight, BookOpen, Crosshair, Sparkles } from 'lucide-react';
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
};

export function ResourceHub({ eyebrow, title, accent, description, studyTopics, videos, browseHref = '/home' }: ResourceHubProps) {
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

    return (
        <div className="min-h-screen bg-[#030014] text-white -mt-24">
            <section className="relative pt-48 pb-28 overflow-hidden border-b border-white/10">
                <div className={`absolute top-0 right-0 w-[800px] h-[800px] ${accent} blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 -z-10`} />
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl space-y-8">
                        <div className="flex items-center gap-3 text-white/60 font-bold tracking-[0.25em] uppercase text-sm">
                            <Sparkles className="h-4 w-4 text-purple-400" /> {eyebrow}
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.95]">{title}</h1>
                        <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl leading-relaxed">{description}</p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <Button asChild size="lg" className="h-14 px-7 rounded-xl bg-white text-black hover:bg-zinc-200">
                                <Link href="#reference-library">Study the references <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="h-14 px-7 rounded-xl border-white/15 text-white hover:bg-white/10">
                                <Link href={browseHref}>Browse the full library</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 container mx-auto px-6">
                <div className="max-w-3xl mb-12">
                    <div className="flex items-center gap-3 text-purple-400 font-bold tracking-[0.2em] uppercase text-sm mb-4"><BookOpen className="h-4 w-4" /> What to study</div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tight">Turn clips into decisions.</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    {studyTopics.map((topic) => (
                        <article key={topic.title} className="p-8 rounded-2xl bg-white/[0.04] border border-white/10">
                            <Crosshair className="h-7 w-7 text-purple-400 mb-6" />
                            <h3 className="text-2xl font-bold mb-3">{topic.title}</h3>
                            <p className="text-zinc-400 leading-relaxed">{topic.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section id="reference-library" className="py-24 border-y border-white/5 bg-black/20">
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl mb-12">
                        <p className="text-purple-400 font-bold tracking-[0.2em] uppercase text-sm mb-4">Curated study set</p>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tight">References selected for this problem</h2>
                        <p className="text-lg text-zinc-400 leading-relaxed mt-5">Open a clip to scrub frame by frame, save it to a moodboard, and follow related tags into the rest of the library.</p>
                    </div>
                    {videos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {videos.map((video) => <VideoCard key={video.id} video={video} />)}
                        </div>
                    ) : (
                        <p className="text-zinc-500">This collection is being curated. Browse the full library for related references.</p>
                    )}
                </div>
            </section>

            <section className="py-32 text-center px-6">
                <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">Find the next useful reference.</h2>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">Search by action, timing, emotion, and mechanics instead of scrolling through unrelated clips.</p>
                <Button asChild size="lg" className="h-14 px-8 rounded-xl bg-purple-600 hover:bg-purple-500"><Link href={browseHref}>Explore Animation Reference <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
            </section>

            {itemListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />}
        </div>
    );
}
