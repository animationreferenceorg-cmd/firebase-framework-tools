import { Metadata } from 'next';
import Link from 'next/link';
import { getAllTags, slugifyTag } from '@/lib/videoSnapshot.server';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://animationreference.org';

export const metadata: Metadata = {
    title: 'Todas las Etiquetas - Referencia de Animación | A-Z Index',
    description: 'Explora todas las etiquetas de animación (1,600+). Acceso rápido a referencias de movimiento, mecánica corporal, actuación y más. Gratuito para animadores.',
    keywords: ['etiquetas de animación', 'índice de animación', 'referencia de animación', 'tutorial animación'],
    alternates: {
        canonical: `${BASE_URL}/es/tags`,
        languages: {
            en: `${BASE_URL}/tags`,
            es: `${BASE_URL}/es/tags`,
        }
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
        },
    },
    openGraph: {
        title: 'Todas las Etiquetas de Animación - A-Z',
        description: 'Accede a 1,600+ etiquetas de animación. Movimiento, mecánica corporal, actuación y más.',
        url: `${BASE_URL}/es/tags`,
        type: 'website',
        locale: 'es_ES',
    },
};

export default function SpanishTagsPage() {
    const tags = getAllTags();
    const sortedTags = [...tags].sort((a, b) => a.tag.localeCompare(b.tag));

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        inLanguage: 'es',
        name: 'Todas las Etiquetas de Referencia de Animación',
        url: `${BASE_URL}/es/tags`,
        description: 'Directorio completo de etiquetas de animación con referencias para animadores profesionales.',
        numberOfItems: tags.length,
    };

    return (
        <div className="container mx-auto px-4 md:px-8 py-10">
            <nav className="text-xs text-muted-foreground mb-6 flex items-center gap-1.5" aria-label="Breadcrumb">
                <Link href="/es" className="hover:text-foreground">Inicio</Link>
                <span>/</span>
                <span className="text-foreground font-medium">Etiquetas</span>
            </nav>

            <header className="mb-10 max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
                    Todas las Etiquetas de Animación
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed">
                    {tags.length}+ etiquetas de referencias de animación organizadas alfabéticamente. Desde mecánica corporal hasta actuación, encuentra exactamente lo que necesitas estudiar.
                </p>
            </header>

            {/* Quick search could go here if client-side search needed */}

            {/* Tags organized by first letter */}
            <div className="space-y-8">
                {Array.from({ length: 26 }).map((_, i) => {
                    const letter = String.fromCharCode(65 + i); // A-Z
                    const tagsForLetter = sortedTags.filter(t => t.tag[0].toUpperCase() === letter);

                    if (tagsForLetter.length === 0) return null;

                    return (
                        <section key={letter} className="scroll-mt-20" id={letter}>
                            <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-border">
                                {letter}
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {tagsForLetter.map(t => (
                                    <Link
                                        key={t.slug}
                                        href={`/es/tags/${t.slug}`}
                                        className="p-3 rounded-lg border border-border bg-card hover:bg-accent text-sm font-semibold text-foreground transition-colors group"
                                    >
                                        <span className="group-hover:text-primary">{t.tag}</span>
                                        <span className="text-xs text-muted-foreground ml-1">({t.videos.length})</span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Quick jump letters */}
            <nav className="fixed bottom-8 right-8 bg-card border border-border rounded-full p-4 shadow-lg hidden lg:flex flex-col gap-1" aria-label="Jump to letter">
                {Array.from({ length: 26 }).map((_, i) => {
                    const letter = String.fromCharCode(65 + i);
                    return (
                        <Link
                            key={letter}
                            href={`#${letter}`}
                            className="w-8 h-8 flex items-center justify-center rounded text-xs font-bold hover:bg-primary hover:text-white transition-colors text-muted-foreground"
                        >
                            {letter}
                        </Link>
                    );
                })}
            </nav>

            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        </div>
    );
}
