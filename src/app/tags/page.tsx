import { Metadata } from 'next';
import Link from 'next/link';
import { getTagIndex } from '@/lib/videoSnapshot.server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://animationreference.org';

export const metadata: Metadata = {
    title: 'Browse Animation References by Tag',
    description:
        'Explore thousands of animation reference clips by tag — combat, locomotion, acting, weapons, hit reactions, cinematics and more. Free frame-by-frame study for animators.',
    alternates: { canonical: `${BASE_URL}/tags` },
    openGraph: {
        title: 'Browse Animation References by Tag | Animation Reference',
        description: 'Every animation reference tag in the library, from combat and locomotion to acting and VFX.',
        url: `${BASE_URL}/tags`,
        siteName: 'Animation Reference',
        type: 'website',
    },
};

export default async function TagsIndexPage() {
    const index = getTagIndex();
    const entries = [...index.bySlug.entries()]
        .map(([slug, { tag, videos }]) => ({ slug, tag, count: videos.length }))
        .sort((a, b) => b.count - a.count);

    const top = entries.slice(0, 30);
    const byLetter = new Map<string, typeof entries>();
    for (const e of [...entries].sort((a, b) => a.tag.localeCompare(b.tag))) {
        const letter = /^[a-z]/i.test(e.tag) ? e.tag[0].toUpperCase() : '#';
        let list = byLetter.get(letter);
        if (!list) byLetter.set(letter, (list = []));
        list.push(e);
    }

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
            { '@type': 'ListItem', position: 2, name: 'Tags', item: `${BASE_URL}/tags` },
        ],
    };

    return (
        <div className="container mx-auto px-4 md:px-8 py-10">
            <header className="mb-10 max-w-3xl">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4">
                    Browse Animation References by Tag
                </h1>
                <p className="text-muted-foreground leading-relaxed">
                    {entries.length} tags across the whole library. Every tag page collects clips you can scrub
                    frame by frame — pick a movement, weapon, emotion or game to start studying.
                </p>
            </header>

            <section className="mb-12">
                <h2 className="text-lg font-bold text-foreground mb-4">Most Popular Tags</h2>
                <div className="flex flex-wrap gap-2">
                    {top.map(t => (
                        <Link
                            key={t.slug}
                            href={`/tags/${t.slug}`}
                            className="px-3.5 py-2 rounded-full border border-border bg-card text-sm font-semibold text-foreground hover:border-primary/40 transition-colors"
                        >
                            #{t.tag} <span className="text-muted-foreground font-normal">({t.count})</span>
                        </Link>
                    ))}
                </div>
            </section>

            {[...byLetter.entries()].map(([letter, tags]) => (
                <section key={letter} className="mb-8">
                    <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">{letter}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {tags.map(t => (
                            <Link
                                key={t.slug}
                                href={`/tags/${t.slug}`}
                                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                            >
                                {t.tag} <span className="text-xs opacity-60">({t.count})</span>
                            </Link>
                        ))}
                    </div>
                </section>
            ))}

            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        </div>
    );
}
