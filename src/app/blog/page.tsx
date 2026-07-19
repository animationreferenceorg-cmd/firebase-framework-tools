import { Metadata } from 'next';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BlogPost } from '@/lib/types';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://animationreference.org';

export const metadata: Metadata = {
    title: 'Animation Study Guides & Articles',
    description:
        'Practical guides on studying animation reference: combat timing, hit reactions, locomotion cycles, acting and more — with frame-by-frame clips embedded in every article.',
    alternates: { canonical: `${BASE_URL}/blog` },
    openGraph: {
        title: 'Animation Study Guides & Articles | Animation Reference',
        description: 'Practical guides on studying animation reference, with clips embedded in every article.',
        url: `${BASE_URL}/blog`,
        siteName: 'Animation Reference',
        type: 'website',
    },
};

async function getPosts(): Promise<BlogPost[]> {
    try {
        const q = query(collection(db, 'blogPosts'), where('status', '==', 'published'));
        const snap = await getDocs(q);
        const posts = snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));
        return posts.sort((a, b) => {
            const ta = a.createdAt?.seconds || 0;
            const tb = b.createdAt?.seconds || 0;
            return tb - ta;
        });
    } catch (e) {
        console.error('Failed to load blog posts', e);
        return [];
    }
}

export default async function BlogIndexPage() {
    const posts = await getPosts();

    return (
        <div className="container mx-auto px-4 md:px-8 py-12">
            <header className="mb-12 max-w-3xl">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4">
                    Animation Study Guides
                </h1>
                <p className="text-muted-foreground leading-relaxed">
                    Practical, frame-by-frame guides to studying animation reference — combat, reactions,
                    locomotion and acting — with clips from the library embedded in every article.
                </p>
            </header>

            {posts.length === 0 ? (
                <p className="text-muted-foreground">No articles yet — check back soon.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map(post => (
                        <Link
                            key={post.id}
                            href={`/blog/${post.slug}`}
                            className="group rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-colors flex flex-col"
                        >
                            {post.coverImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={post.coverImage}
                                    alt={post.title}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="aspect-video w-full object-cover group-hover:scale-[1.02] transition-transform"
                                />
                            ) : (
                                <div className="aspect-video w-full bg-muted" />
                            )}
                            <div className="p-5 flex-1 flex flex-col">
                                <h2 className="text-lg font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
                                    {post.title}
                                </h2>
                                {post.excerpt && (
                                    <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                                )}
                                <span className="mt-4 text-xs font-semibold text-primary">Read the guide →</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
