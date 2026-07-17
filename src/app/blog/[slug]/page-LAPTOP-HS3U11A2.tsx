
import { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, documentId } from 'firebase/firestore';
import type { BlogPost, Video } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Film } from 'lucide-react';
import Link from 'next/link';

type Props = {
    params: Promise<{ slug: string }>;
};

async function getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
        const postsRef = collection(db, 'blogPosts');
        const q = query(postsRef, where('slug', '==', slug), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as BlogPost;
        }
    } catch (error) {
        console.error("Error fetching SEO page by slug:", error);
    }
    return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPostBySlug(slug);

    if (!post) return { title: 'Page Not Found' };

    return {
        title: post.seoTitle || post.title,
        description: post.seoDescription,
        keywords: post.keywords?.join(', '),
    };
}

export default async function SeoLandingPage({ params }: Props) {
    const { slug } = await params;
    const post = await getPostBySlug(slug);

    if (!post || post.status !== 'published') {
        notFound();
    }

    let videos: Video[] = [];
    if (post.videoIds && post.videoIds.length > 0) {
        try {
            const videosRef = collection(db, 'videos');
            const q = query(videosRef, where(documentId(), 'in', post.videoIds));
            const snapshot = await getDocs(q);
            videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Video);
        } catch (error) {
            console.error("Error fetching associated videos for blog post:", error);
        }
    }

    // Generate JSON-LD VideoObject schemas for search engines
    const videoSchemas = videos.map(video => ({
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": video.title,
        "description": video.description || `Animation reference video: ${video.title}`,
        "thumbnailUrl": video.thumbnailUrl || '/site-icon.png',
        "uploadDate": video.createdAt && (video.createdAt as any).seconds 
            ? new Date((video.createdAt as any).seconds * 1000).toISOString() 
            : new Date().toISOString(),
        "contentUrl": video.videoUrl,
        "embedUrl": video.videoUrl
    }));

    return (
        <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans -mt-24">
            {/* Hero Section */}
            <section className="relative pt-48 pb-32 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[#030014] -z-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent -z-10" />
                
                <div className="container mx-auto px-6 text-center">
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <span className="text-sm font-medium text-purple-100/90">Exclusive Animation Insights</span>
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            {post.title}
                        </span>
                    </h1>

                    <p className="text-xl text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                        {post.seoDescription}
                    </p>

                    <Button asChild className="h-16 px-10 rounded-2xl text-lg font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-500/20">
                        <Link href="/browse">
                            Explore the Library
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </section>

            {/* Content Section */}
            <section className="py-24 bg-white/[0.02]">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="prose prose-invert prose-purple max-w-none">
                        <div className="text-zinc-300 text-lg leading-relaxed space-y-8 whitespace-pre-wrap">
                            {post.content}
                        </div>
                    </div>
                </div>
            </section>

            {/* Associated Reference Videos Grid */}
            {videos.length > 0 && (
                <section className="py-20 border-t border-white/5 bg-black/10">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <h2 className="text-3xl font-extrabold text-white mb-10 tracking-tight flex items-center gap-3">
                            <Film className="h-7 w-7 text-purple-400" />
                            Reference Videos
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                            {videos.map(video => (
                                <VideoCard key={video.id} video={video} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Final CTA */}
            <section className="py-32 text-center border-t border-t-white/5">
                <div className="container mx-auto px-6">
                    <h2 className="text-4xl font-bold mb-8">Master your animation timing today.</h2>
                    <Button asChild size="lg" variant="outline" className="rounded-full px-12 py-8 text-xl">
                        <Link href="/signup">Get Started for Free</Link>
                    </Button>
                </div>
            </section>

            {/* VideoObject Structured Data Schema */}
            {videoSchemas.map((schema, idx) => (
                <script
                    key={idx}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            ))}
        </div>
    );
}
