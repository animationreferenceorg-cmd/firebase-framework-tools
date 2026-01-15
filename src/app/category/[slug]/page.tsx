import { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { Category, Video } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Film, Sparkles, Search, Users, Clapperboard, Construction, Heart } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { BrowseHero } from '@/components/BrowseHero';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoCard } from '@/components/VideoCard';

export const revalidate = 3600;

type Props = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const serializeVideo = (data: any): Video => {
    const serialized = { ...data };
    if (serialized.createdAt && typeof serialized.createdAt.toMillis === 'function') {
        serialized.createdAt = serialized.createdAt.toMillis();
    }
    return serialized as Video;
};

async function getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
        const categoriesRef = collection(db, 'categories');
        const qSlug = query(categoriesRef, where('slug', '==', slug), limit(1));
        const snapshotSlug = await getDocs(qSlug);

        if (!snapshotSlug.empty) {
            const doc = snapshotSlug.docs[0];
            return { id: doc.id, ...doc.data() } as Category;
        }

        const qAll = query(categoriesRef, where('status', '==', 'published'));
        const snapshotAll = await getDocs(qAll);
        const targetSlug = slug.toLowerCase();

        const found = snapshotAll.docs.find(doc => {
            const data = doc.data();
            const titleSlug = (data.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return titleSlug === targetSlug;
        });

        if (found) {
            return { id: found.id, ...found.data() } as Category;
        }
    } catch (error) {
        console.error("Error fetching category by slug:", error);
    }
    return null;
}

async function getCategoryVideos(categoryId: string): Promise<Video[]> {
    try {
        const videosRef = collection(db, 'videos');
        const q = query(
            videosRef,
            where('categoryIds', 'array-contains', categoryId),
            limit(20)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(doc => {
                const data = doc.data();
                return serializeVideo({ id: doc.id, ...data });
            })
            .filter(v => v.status !== 'draft');
    } catch (error) {
        console.error("Error fetching category videos:", error);
        return [];
    }
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { slug } = await params;
    const category = await getCategoryBySlug(slug);

    if (!category) {
        return {
            title: 'Category Not Found',
        };
    }

    const title = `${category.title} Animation References | AnimationReference.org`;
    const description = category.description || `Browse the best curated ${category.title} animation references. High-quality clips for professional satisfaction.`;

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            images: category.imageUrl ? [category.imageUrl] : [],
        },
    };
}

export default async function Page({ params }: Props) {
    const { slug } = await params;
    const category = await getCategoryBySlug(slug);

    if (!category) {
        notFound();
    }

    const videos = await getCategoryVideos(category.id);

    // Hero Logic
    let heroVideo = null;
    if (category.videoUrl) {
        heroVideo = {
            id: 'category-hero',
            title: category.title,
            description: category.description,
            thumbnailUrl: category.imageUrl,
            posterUrl: category.imageUrl,
            videoUrl: category.videoUrl,
            tags: category.tags,
            status: 'published'
        } as Video;
    } else if (videos.length > 0) {
        // Pick random from videos
        heroVideo = videos[Math.floor(Math.random() * videos.length)];
    }

    // Random 6 Examples Logic
    const exampleVideos = videos
        .filter(v => v.id !== heroVideo?.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 6);

    // Vault Preview Videos (take 4 for density)
    const vaultPreviewVideos = videos
        .filter(v => v.id !== heroVideo?.id)
        .slice(0, 4);

    // Keywords removed as requested


    return (
        <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans selection:bg-purple-500/30 -mt-24">

            {/* 1. HERO SECTION */}
            {heroVideo ? (
                <BrowseHero video={heroVideo}>
                    <div className="w-full h-full flex flex-col justify-center items-center text-center pb-20 animate-fade-in-up">
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1] md:leading-[1.1] max-w-5xl mx-auto drop-shadow-2xl">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
                                The Ultimate
                            </span>
                            <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">
                                {category.title} Library
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-zinc-100 mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
                            {category.description || `Discover thousands of curated ${category.title.toLowerCase()} clips for your next shot.`}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Button asChild className="h-16 px-10 rounded-2xl text-lg font-semibold bg-white text-black hover:bg-white/90 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] border border-white/20 transition-all duration-300 group hover:scale-105">
                                <Link href={`/browse?category=${category.id}`}>
                                    Browse Collection
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </BrowseHero>
            ) : (
                <div className="h-[80vh] w-full bg-[#030014] flex flex-col items-center justify-center text-center px-4">
                    <h1 className="text-6xl font-black text-white mb-6">{category.title} References</h1>
                    <Button asChild size="lg"><Link href={`/browse?category=${category.id}`}>View Collection</Link></Button>
                </div>
            )}

            {/* 2. WHY THIS CATEGORY? (Features) */}
            <section className="py-24 relative bg-black/20">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Why use our <span className="text-purple-400">{category.title}</span> References?</h2>
                        <p className="text-zinc-400 max-w-2xl mx-auto">Specific tools and curation designed for this animation style.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "Professional Curation",
                                desc: `Hand-picked ${category.title} examples from top industry studios.`,
                                icon: <Sparkles className="h-6 w-6 text-purple-400" />
                            },
                            {
                                title: "Frame-by-Frame Analysis",
                                desc: "Study the spacing and timing with our precision player.",
                                icon: <Film className="h-6 w-6 text-pink-400" />
                            },
                            {
                                title: "Artist Discovery",
                                desc: "Find the animators behind your favorite shots.",
                                icon: <Users className="h-6 w-6 text-blue-400" />
                            }
                        ].map((feat, i) => (
                            <div key={i} className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                                <div className="mb-6 h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                    {feat.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
                                <p className="text-zinc-400 leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3. FRAME BY FRAME DEMO */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full -translate-y-1/2" />
                <div className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        {/* Visual (Mock Player) */}
                        <div className="w-full lg:w-1/2 relative order-2 lg:order-1">
                            <div className="relative rounded-xl border border-white/10 bg-[#0f0c1d] shadow-2xl overflow-hidden group">
                                <div className="aspect-video relative overflow-hidden ring-1 ring-white/10 shadow-inner bg-black">
                                    {heroVideo ? (
                                        <VideoPlayer
                                            video={heroVideo}
                                            muted={true}
                                            startsPaused={false}
                                            hideFullscreenControl={true}
                                            hidePlayControl={true}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Construction className="text-white/10 h-16 w-16" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Text */}
                        <div className="w-full lg:w-1/2 text-left space-y-6 order-1 lg:order-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                                <Film className="h-3 w-3" />
                                <span>Deep Analysis</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                                Analyze <span className="text-purple-400">{category.title}</span> <br />
                                Frame by Frame
                            </h2>
                            <p className="text-lg text-zinc-400 leading-relaxed">
                                Don&apos;t miss a single smear or breakdown. Our custom-built player allows you to scrub through animations with frame-perfect precision.
                            </p>
                            <ul className="space-y-4 pt-4">
                                {[
                                    "Keyboard shortcuts for stepping (< >)",
                                    "Ghosting and loop regions",
                                    "Playback speed control"
                                ].map(item => (
                                    <li key={item} className="flex items-center gap-3 text-zinc-300">
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. PERSONAL VAULT */}
            <section className="py-24 relative overflow-hidden bg-white/[0.02]">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        {/* Text */}
                        <div className="w-full lg:w-1/2 text-left space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-medium">
                                <Sparkles className="h-3 w-3" />
                                <span>Curated Collections</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                                Build Your Personal <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">{category.title} Vault</span>
                            </h2>
                            <p className="text-lg text-zinc-400 leading-relaxed">
                                Save references for your next shot. Organize clips by project, emotion, or mechanics. Never lose that perfect reference again.
                            </p>
                            <div className="pt-6">
                                <Button asChild variant="outline" className="rounded-full border-white/10 hover:bg-white/10">
                                    <Link href="/">
                                        Start Building Collection
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Visual (Mock Cards) */}
                        <div className="w-full lg:w-1/2 relative">
                            <div className="relative z-10 grid grid-cols-2 gap-4">
                                {vaultPreviewVideos.length > 0 ? vaultPreviewVideos.map((video, i) => (
                                    <div key={video.id + '_vault'} className={`p-4 rounded-xl border border-white/5 bg-[#0f0c1d] shadow-xl ${i % 2 !== 0 ? 'translate-y-8' : ''} group`}>
                                        <div className="aspect-[4/3] bg-black rounded-lg mb-3 relative overflow-hidden">
                                            {/* Video Loop */}
                                            <video
                                                src={video.videoUrl}
                                                muted
                                                loop
                                                autoPlay
                                                playsInline
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                                            />
                                            {/* Heart Overlay */}
                                            <div className="absolute top-2 right-2 p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 cursor-pointer transition-colors z-10">
                                                <Heart className={`h-4 w-4 ${i === 1 || i === 2 ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-white/80 truncate">{video.title}</h4>
                                            <div className="h-1 lg:w-1/2 bg-white/5 rounded-full" />
                                        </div>
                                    </div>
                                )) : (
                                    [1, 2, 3, 4].map((i) => (
                                        <div key={i} className={`p-4 rounded-xl border border-white/5 bg-[#0f0c1d] shadow-xl ${i % 2 !== 0 ? 'translate-y-8' : ''}`}>
                                            <div className="aspect-[4/3] bg-white/5 rounded-lg mb-3 relative overflow-hidden">
                                                <Skeleton className="h-full w-full bg-white/5" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {/* Decorative Elements */}
                            <div className="absolute -inset-10 bg-gradient-to-tr from-pink-500/20 to-transparent blur-[100px] rounded-full pointer-events-none" />
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. SEO KEYWORDS SECTION */}


            {/* 6. 3 EXAMPLES + CTA */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Featured Examples</h2>
                        <p className="text-zinc-400">A sneak peek at what's inside the collection.</p>
                    </div>

                    {/* The 3 Videos */}
                    {/* The 3 Videos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        {exampleVideos.length > 0 ? exampleVideos.map(video => (
                            <VideoCard key={video.id} video={video} />
                        )) : (
                            <div className="col-span-3 text-center py-12 text-zinc-500">
                                <p>Adding examples soon...</p>
                            </div>
                        )}
                    </div>

                    {/* Final CTA */}
                    <div className="text-center">
                        <div className="inline-block p-[2px] rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500">
                            <Button asChild className="h-16 px-12 rounded-2xl text-xl font-bold bg-[#030014] text-white hover:bg-[#0a081f] border-0">
                                <Link href={`/categories?category=${category.id}`}>
                                    View All {videos.length > 0 ? videos.length : ''} {category.title} References
                                    <ArrowRight className="ml-3 h-6 w-6" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
