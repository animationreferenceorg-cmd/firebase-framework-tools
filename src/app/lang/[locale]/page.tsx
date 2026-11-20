import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Globe, ShieldCheck, Sparkles } from 'lucide-react';
import { VideoCard } from '@/components/VideoCard';
import { getAllSnapshotVideos } from '@/lib/videoSnapshot.server';
import { BASE_URL, HREFLANG_LANGUAGES, SEO_LOCALES, type SeoLocale } from '@/lib/i18n-seo';

export const revalidate = 3600;

export function generateStaticParams() {
  return (Object.keys(SEO_LOCALES) as SeoLocale[]).map((locale) => ({ locale }));
}

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const cfg = SEO_LOCALES[locale as SeoLocale];
  if (!cfg) {
    return { title: 'Animation Reference', robots: { index: false } };
  }

  const canonical = `${BASE_URL}/lang/${cfg.code}`;
  return {
    title: cfg.title,
    description: cfg.description,
    keywords: cfg.keywords,
    alternates: {
      canonical,
      languages: HREFLANG_LANGUAGES,
    },
    openGraph: {
      title: cfg.title,
      description: cfg.description,
      url: canonical,
      siteName: 'Animation Reference',
      type: 'website',
      locale: cfg.ogLocale,
    },
  };
}

export default async function LocalizedHomePage({ params }: Props) {
  const { locale } = await params;
  const cfg = SEO_LOCALES[locale as SeoLocale];
  if (!cfg) notFound();

  const allVideos = getAllSnapshotVideos();
  const nonShorts = allVideos.filter((v) => !v.isShort);
  const featured = nonShorts.slice(0, 20);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    inLanguage: cfg.code,
    name: cfg.h1,
    description: cfg.description,
    url: `${BASE_URL}/lang/${cfg.code}`,
  };

  return (
    <div className="container mx-auto px-4 md:px-8 py-10 text-white">
      {/* Language Switcher Bar */}
      <nav aria-label="Language switcher" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1 font-semibold text-zinc-300">
          <Globe className="h-3.5 w-3.5 text-purple-400" />
          Language:
        </span>
        <Link href="/" className="rounded-full border border-white/10 px-2.5 py-1 hover:border-purple-400 hover:text-white">
          English
        </Link>
        <Link href="/es" className="rounded-full border border-white/10 px-2.5 py-1 hover:border-purple-400 hover:text-white">
          Español
        </Link>
        {(Object.values(SEO_LOCALES) as typeof cfg[]).map((item) => (
          <Link
            key={item.code}
            href={`/lang/${item.code}`}
            className={
              item.code === cfg.code
                ? 'rounded-full border border-purple-400 bg-purple-500/20 px-2.5 py-1 font-bold text-white'
                : 'rounded-full border border-white/10 px-2.5 py-1 hover:border-purple-400 hover:text-white'
            }
          >
            {item.nativeName}
          </Link>
        ))}
      </nav>

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-4">
          {cfg.h1}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed mb-6">
          {nonShorts.length.toLocaleString()}+ — {cfg.subtitle}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tags"
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {cfg.browseCta}
          </Link>
          <Link
            href="/categories"
            className="px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:border-primary/40 transition-colors"
          >
            {cfg.categoriesCta}
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-200 text-sm font-bold hover:bg-purple-600/30 transition-colors"
          >
            <Sparkles className="h-4 w-4 text-purple-300" />
            {cfg.proCta}
          </Link>
        </div>
      </header>

      {/* Localized International Pro Trust Banner */}
      <section className="mb-10 rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-950/60 via-indigo-950/50 to-zinc-950/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-lg font-extrabold text-white">{cfg.proBannerTitle}</h2>
          <p className="text-sm text-zinc-300 max-w-2xl">{cfg.proBannerDesc}</p>
          <p className="inline-flex items-center gap-1.5 text-xs text-emerald-300 font-semibold pt-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            {cfg.trustBadge}
          </p>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-center text-sm font-extrabold text-zinc-950 hover:bg-zinc-200 transition-colors"
        >
          {cfg.proCta}
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-bold text-foreground mb-4">{cfg.featuredHeading}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {featured.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </div>
  );
}
