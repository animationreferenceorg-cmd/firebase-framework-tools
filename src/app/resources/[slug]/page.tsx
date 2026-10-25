import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getAllSnapshotVideos } from '@/lib/videoSnapshot.server';
import { VideoCard } from '@/components/VideoCard';
import type { Video } from '@/lib/types';
import {
  Play,
  Sparkles,
  Layers,
  Sliders,
  ArrowRight,
  Film,
  Activity,
  ChevronRight,
  Eye,
  Flame,
  CheckCircle2,
} from 'lucide-react';

const BASE_URL = 'https://animationreference.org';

import { TOPICS, TOPIC_SLUGS, type Topic } from '@/lib/resource-topics';

export function generateStaticParams() {
  return TOPIC_SLUGS.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const topic = TOPICS[(await params).slug];
  if (!topic) return { title: 'Resource Not Found | Animation Reference', robots: { index: false } };
  return {
    title: topic.title,
    description: topic.description,
    alternates: { canonical: `${BASE_URL}/resources/${topic.slug}` },
    openGraph: {
      title: topic.title,
      description: topic.description,
      url: `${BASE_URL}/resources/${topic.slug}`,
      type: 'article',
    },
  };
}

function getTopicVideos(topic: Topic, allVideos: Video[], count = 12): Video[] {
  const priorityIds = new Set(topic.priorityVideoIds || []);
  const priorityVideos: Video[] = [];
  for (const id of topic.priorityVideoIds || []) {
    const found = allVideos.find(v => v.id === id);
    if (found) priorityVideos.push(found);
  }

  const searchTerms = [
    ...(topic.queryKeywords || []),
    ...topic.tags.map(t => t.slug),
    ...topic.tags.map(t => t.label.toLowerCase()),
  ];

  const scored: { v: Video; score: number }[] = [];
  for (const v of allVideos) {
    if (priorityIds.has(v.id)) continue;
    const title = (v.title || '').toLowerCase();
    const desc = (v.description || '').toLowerCase();
    const tags = (v.tags || []).map(t => t.toLowerCase());

    let score = 0;
    for (const term of searchTerms) {
      const lower = term.toLowerCase();
      if (tags.includes(lower)) score += 4;
      else if (tags.some(t => t.includes(lower))) score += 2;
      if (title.includes(lower)) score += 3;
      if (desc.includes(lower)) score += 1;
    }
    if (score > 0) scored.push({ v, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return [...priorityVideos, ...scored.slice(0, count - priorityVideos.length).map(s => s.v)];
}

export default async function TopicResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const topic = TOPICS[(await params).slug];
  if (!topic) notFound();

  const allVideos = getAllSnapshotVideos();
  const matchingVideos = getTopicVideos(topic, allVideos, 12);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: topic.faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: topic.title,
    description: topic.description,
    url: `${BASE_URL}/resources/${topic.slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Animation Reference',
      url: BASE_URL,
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Resources', item: `${BASE_URL}/resources` },
      { '@type': 'ListItem', position: 3, name: topic.title, item: `${BASE_URL}/resources/${topic.slug}` },
    ],
  };

  const itemListSchema = matchingVideos.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${topic.title} References`,
    numberOfItems: matchingVideos.length,
    itemListElement: matchingVideos.map((video, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${BASE_URL}/video/${video.id}`,
      name: video.title || topic.title,
      description: video.description || topic.description,
      image: video.thumbnailUrl || video.posterUrl,
    })),
  } : null;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 relative overflow-hidden -mt-24 pt-28">
      {/* Dynamic Ambient Glow Backdrops */}
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-purple-600/15 blur-[160px] rounded-full pointer-events-none -z-0" />
      <div className="absolute top-48 left-[-100px] w-[600px] h-[600px] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none -z-0" />
      <div className="absolute bottom-1/3 right-[-100px] w-[500px] h-[500px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none -z-0" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-0" />

      <main className="container relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-16">
        {/* Sleek Breadcrumb Pill */}
        <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span className="text-slate-600">/</span>
          <Link href="/resources" className="hover:text-white transition-colors">Resources</Link>
          <span className="text-slate-600">/</span>
          <span className="text-purple-300 font-semibold truncate max-w-[200px] sm:max-w-none">{topic.title}</span>
        </nav>

        {/* Hero Discovery Section: 2-Column Split Showcase */}
        <header className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headline, Pitch & Specs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-3.5 py-1 text-xs font-semibold text-purple-300 shadow-[0_0_20px_-3px_rgba(168,85,247,0.4)] backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="tracking-wider uppercase">STUDIO STUDY REEL • 24 FPS SCRUBBABLE</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-white">
              {topic.title}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed font-normal">
              {topic.intro}
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <a
                href="#reference-gallery"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_35px_-5px_rgba(147,51,234,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_45px_-3px_rgba(147,51,234,0.6)] cursor-pointer"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>EXPLORE {matchingVideos.length} REFERENCE CLIPS</span>
              </a>

              <Link
                href="/frame-by-frame-player"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-5 py-3.5 text-sm font-bold text-slate-200 backdrop-blur-md transition-all hover:border-purple-400/40 hover:bg-slate-800/80 hover:text-white cursor-pointer"
              >
                <Sliders className="h-4 w-4 text-purple-400" />
                <span>FRAME-BY-FRAME PLAYER</span>
              </Link>
            </div>

            {/* Quick Technical Specs Bar */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md p-3.5 text-left">
                <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold uppercase mb-0.5">
                  <Film className="h-3.5 w-3.5" /> 24 FPS Native
                </div>
                <div className="text-sm font-bold text-white">Cinema Cadence</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md p-3.5 text-left">
                <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold uppercase mb-0.5">
                  <Sliders className="h-3.5 w-3.5" /> Frame Stepper
                </div>
                <div className="text-sm font-bold text-white">Step &amp; Loop</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md p-3.5 text-left">
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold uppercase mb-0.5">
                  <Layers className="h-3.5 w-3.5" /> Modality
                </div>
                <div className="text-sm font-bold text-white">Real + 2D &amp; 3D</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md p-3.5 text-left">
                <div className="flex items-center gap-1.5 text-pink-400 text-xs font-bold uppercase mb-0.5">
                  <Activity className="h-3.5 w-3.5" /> Tooling
                </div>
                <div className="text-sm font-bold text-white">Draw-Over Ready</div>
              </div>
            </div>
          </div>

          {/* Right Column: Featured Reference Clip Showcase */}
          <div className="lg:col-span-5">
            {matchingVideos[0] ? (
              <div className="relative group rounded-3xl border border-purple-500/30 bg-zinc-950/80 p-3.5 backdrop-blur-2xl shadow-[0_0_50px_-10px_rgba(168,85,247,0.35)] transition-all hover:border-purple-400/60 hover:shadow-[0_0_60px_-5px_rgba(168,85,247,0.5)]">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black">
                  {matchingVideos[0].thumbnailUrl || matchingVideos[0].posterUrl ? (
                    <Image
                      src={matchingVideos[0].thumbnailUrl || matchingVideos[0].posterUrl}
                      alt={matchingVideos[0].title || topic.title}
                      fill
                      unoptimized
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-950 via-zinc-900 to-black flex items-center justify-center">
                      <Film className="h-10 w-10 text-purple-400" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />

                  {/* Top Badge */}
                  <div className="absolute top-3 left-3 z-20">
                    <span className="px-3 py-1 rounded-md bg-purple-950/85 backdrop-blur-md border border-purple-400/40 text-purple-200 font-mono text-[10px] font-extrabold tracking-wider shadow">
                      FEATURED STUDY REEL
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 z-20">
                    <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-white font-mono text-[10px] font-bold">
                      24 FPS
                    </span>
                  </div>

                  {/* Play Button Overlay */}
                  <Link
                    href={`/video/${matchingVideos[0].id}`}
                    className="absolute inset-0 z-20 flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer"
                  >
                    <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-2xl border border-purple-400/50">
                      <Play className="h-7 w-7 fill-white ml-1" />
                    </div>
                  </Link>

                  {/* Bottom Video Meta */}
                  <div className="absolute bottom-3 left-3 right-3 z-20 text-left">
                    <h3 className="text-sm font-extrabold text-white truncate drop-shadow-md">
                      {matchingVideos[0].title || topic.title}
                    </h3>
                    <p className="text-[11px] text-zinc-300 font-medium">
                      By {matchingVideos[0].author_name || 'Studio Reference'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 px-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Frame 0 • Instant Stepping</span>
                  <Link
                    href={`/video/${matchingVideos[0].id}`}
                    className="font-bold text-purple-300 hover:text-purple-200 flex items-center gap-1 hover:underline"
                  >
                    Inspect in Player <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-8 text-center space-y-3">
                <Sparkles className="h-8 w-8 text-purple-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Motion Breakdown Vault</h3>
                <p className="text-xs text-zinc-400">Curated studio reference clips updated daily.</p>
              </div>
            )}
          </div>
        </header>

        {/* Curated Interactive Video Gallery Section */}
        <section id="reference-gallery" className="mt-8 pt-10 border-t border-white/10">
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-xs font-semibold text-cyan-300 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>INTERACTIVE STUDY VAULT</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight md:text-5xl text-white">
                Study {topic.title} Clips
              </h2>
              <p className="mt-2 text-slate-400 max-w-2xl text-base">
                Click any clip to scrub frame by frame, loop contact phases, inspect balance arcs, and analyze organic timing.
              </p>
            </div>

            {topic.tags[0] && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/tags/${topic.tags[0].slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-900/20 px-3.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-900/40 hover:text-white transition-colors"
                >
                  <span>Explore full {topic.tags[0].label} archive</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          {matchingVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {matchingVideos.map(video => (
                <div key={video.id} className="group relative rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent hover:from-purple-500/40 transition-all duration-300">
                  <VideoCard video={video} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center bg-slate-900/30">
              <p className="text-slate-400">More references for this study guide are currently being tagged.</p>
            </div>
          )}
        </section>

        {/* Core Principles & Breakdown Section */}
        <section className="mt-20 pt-12 border-t border-white/10">
          <div className="max-w-3xl mb-10">
            <p className="text-purple-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Anatomical &amp; Kinetic Breakdown</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Master the Core Mechanics
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {topic.sections.map((section, idx) => (
              <section
                key={section.heading}
                className="group relative rounded-3xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl transition-all duration-300 hover:border-purple-500/40 hover:bg-slate-900/70 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.25)]"
              >
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-black text-white shadow-md">
                  0{idx + 1}
                </div>
                <h3 className="mb-3 text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                  {section.heading}
                </h3>
                <p className="leading-relaxed text-slate-300 text-base">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </section>

        {/* Pro Animator Tip Callout */}
        <section className="mt-16 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/60 p-8 md:p-10 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-4 w-4" /> Professional Animator Workflow
              </div>
              <h3 className="text-2xl font-bold text-white">
                How to Study This Reference Like a Pro
              </h3>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                Step frame by frame and pinpoint the exact contact and reversal frames. Trace the pelvis and spine line of action first before keying the limbs. Exaggerate the arcs and preserve volume.
              </p>
            </div>
            <Link
              href="/frame-by-frame-player"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-200 transition-colors shadow-lg"
            >
              <span>Launch Frame Tool</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Related Tags */}
        <section className="mt-16 rounded-3xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-md">
          <h2 className="mb-3 text-2xl font-bold text-white">Study Related Reference Tags</h2>
          <p className="mb-6 text-slate-400 text-sm">
            Jump into dedicated tag feeds with thousands of community, studio, and production references.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {topic.tags.map(tag => (
              <Link
                key={tag.slug}
                href={`/tags/${tag.slug}`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur-md transition-all hover:border-purple-400/50 hover:bg-purple-950/40 hover:text-white"
              >
                <span>{tag.label}</span>
                <span className="text-slate-500 group-hover:text-purple-300">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Related Guides Grid */}
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-white">Related Animation Guides</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {topic.related.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 p-5 font-semibold text-slate-200 backdrop-blur-md transition-all hover:border-purple-500/40 hover:bg-slate-900/80 hover:text-white"
              >
                <span>{link.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="mt-16 mb-12">
          <h2 className="mb-6 text-2xl font-bold text-white">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {topic.faqs.map(faq => (
              <div
                key={faq.question}
                className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-md transition-colors hover:border-white/20"
              >
                <h3 className="mb-2 text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-purple-400 font-black">Q.</span>
                  {faq.question}
                </h3>
                <p className="leading-relaxed text-slate-300 text-sm md:text-base pl-6">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Structured SEO Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
    </div>
  );
}

