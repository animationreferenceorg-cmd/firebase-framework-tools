import { Metadata } from 'next';
import Link from 'next/link';
import { VideoCard } from '@/components/VideoCard';
import { getAllSnapshotVideos } from '@/lib/videoSnapshot.server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://animationreference.org';

export const metadata: Metadata = {
    title: 'Referencias de Animación Gratis | Animation Reference',
    description: 'Explora miles de clips de referencia de animación organizados por etiqueta. Estudia mecánica corporal, actuación, combate y más, fotograma a fotograma.',
    keywords: ['referencia de animación', 'referencias de animación gratis', 'clips de animación', 'estudio de animación'],
    alternates: {
        canonical: `${BASE_URL}/es`,
        languages: {
            en: BASE_URL,
            es: `${BASE_URL}/es`,
        },
    },
    openGraph: {
        title: 'Referencias de Animación Gratis',
        description: 'Miles de clips de animación de referencia, organizados por etiqueta, listos para estudiar fotograma a fotograma.',
        url: `${BASE_URL}/es`,
        siteName: 'Animation Reference',
        type: 'website',
        locale: 'es_ES',
    },
};

export default async function SpanishHomePage() {
    const allVideos = getAllSnapshotVideos();
    const nonShorts = allVideos.filter(v => !v.isShort);
    const featured = [...nonShorts].sort(() => 0.5 - Math.random()).slice(0, 20);

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        inLanguage: 'es',
        name: 'Referencias de Animación Gratis',
        url: `${BASE_URL}/es`,
    };

    return (
        <div className="container mx-auto px-4 md:px-8 py-10">
            <header className="mb-10 max-w-3xl">
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-4">
                    Referencias de Animación Gratis
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    {nonShorts.length.toLocaleString('es')}+ clips de referencia de animación organizados por etiqueta. Estudia mecánica corporal, actuación, combate, locomoción y más — fotograma a fotograma, gratis para animadores y desarrolladores de juegos.
                </p>
                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/es/tags"
                        className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        Explorar Todas las Etiquetas
                    </Link>
                    <Link
                        href="/categories"
                        className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:border-primary/40 transition-colors"
                    >
                        Explorar Categorías
                    </Link>
                </div>
            </header>

            <section>
                <h2 className="text-lg font-bold text-foreground mb-4">Clips Destacados</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {featured.map(v => (
                        <VideoCard key={v.id} video={v} />
                    ))}
                </div>
            </section>

            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        </div>
    );
}
