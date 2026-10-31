import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Check, 
  X, 
  Sparkles, 
  Film, 
  LayoutGrid, 
  Layers, 
  ArrowRight, 
  Zap, 
  Sliders, 
  Download,
  FolderHeart,
  ChevronRight,
  Monitor,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroBackgroundVideo } from '@/components/landing/HeroBackgroundVideo';
import { InteractivePlayerShowcase } from '@/components/landing/InteractivePlayerShowcase';

export const metadata: Metadata = {
  title: 'PureRef Alternative for Video Boards',
  description: 'A cloud-based PureRef alternative for video reference. Organize animation clips into unlimited visual boards with native frame-by-frame controls.',
  keywords: [
    'pureref alternative',
    'pureref online',
    'pureref for video',
    'pureref web',
    'pureref contact sheet',
    'animation moodboard online',
    'frame by frame reference player',
    'pureref export',
    'video reference board',
    'animation reference library'
  ],
  alternates: {
    canonical: 'https://animationreference.org/pureref-alternative',
  },
  openGraph: {
    title: 'PureRef for Video & Online Moodboards | Animation Reference',
    description: 'Looking for PureRef for video clips? Cloud moodboards, frame-by-frame scrubbing, 1-click contact sheet generation, and direct PureRef layout export.',
    url: 'https://animationreference.org/pureref-alternative',
    type: 'website',
    images: [{ url: '/icon.png', width: 1024, height: 1024, alt: 'Animation Reference' }],
  },
};

const COMPARISON_ROWS = [
  {
    feature: 'Video & Clip Playback',
    pureref: 'Poor/unsupported (mostly static images & limited GIFs)',
    animref: 'High-bitrate MP4 video scrubbing, 24 FPS playback & audio',
    winner: true,
  },
  {
    feature: 'Frame-by-Frame Controls',
    pureref: 'None (no keyframe stepping or FPS control)',
    animref: 'Native frame-stepping (< and > keys), A–B loop regions & speed slider',
    winner: true,
  },
  {
    feature: 'Cloud Sync & Cross-Device',
    pureref: 'Local .pur files only (cumbersome to share across devices)',
    animref: 'Instant cloud moodboards accessible on Mac, PC, iPad, and browser',
    winner: true,
  },
  {
    feature: 'Built-in Reference Library',
    pureref: 'Empty canvas (you must source and download everything yourself)',
    animref: 'Millions of integrated references across ArtStation, Sketchfab, Pinterest & Sakugabooru',
    winner: true,
  },
  {
    feature: 'Contact Sheet Generation',
    pureref: 'Manual layout arrangement required',
    animref: '1-click high-res keyframe contact sheets ready for production',
    winner: true,
  },
  {
    feature: 'Side-by-Side Playblast Compare',
    pureref: 'Not supported',
    animref: 'Synchronized side-by-side WIP Maya/Blender playblast compare',
    winner: true,
  },
  {
    feature: 'Export Back to PureRef',
    pureref: 'N/A',
    animref: '1-click export of keyframes formatted directly for PureRef',
    winner: true,
  },
  {
    feature: 'Pricing',
    pureref: 'Desktop pay-what-you-want (local only)',
    animref: 'Free plan with 25 daily references & unlimited boards; Pro from $1 intro',
    winner: true,
  },
];

const FAQ = [
  {
    q: 'Can I use Animation Reference alongside PureRef?',
    a: 'Absolutely! Many animators use Animation Reference as their primary cloud reference library and video study tool, and use our 1-click Contact Sheet exporter to export clean keyframe grids into PureRef for their desktop viewports.',
  },
  {
    q: 'Does Animation Reference support video scrubbing like an animator needs?',
    a: 'Yes. Animation Reference was engineered specifically for motion study. You can step frame-by-frame using the comma (,) and period (.) keys, set precise A–B repeat loops for tricky arcs, change playback speed from 0.1x to 2x, and view silhouette/onion-skin spacing overlays.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. Free accounts get unlimited public moodboards, cloud saves, uploads, and 25 free reference clips every day (plus 8 guest clips before signup). Any video you have already watched remains 100% free to rewatch anytime without consuming quota.',
  },
  {
    q: 'What do I get with Pro?',
    a: 'Pro unlocks unlimited reference studies, private encrypted boards for NDA studio work, 24 FPS MP4 video downloads, synchronized side-by-side playblast comparison, and high-res contact sheet exports for $5/month (or $1 for your first month intro offer).',
  },
];

export default function PureRefAlternativePage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Animation Reference',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'All (Web, macOS, Windows, Linux, iOS, Android)',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
    },
    description: 'Cloud moodboard and frame-by-frame animation reference platform for 2D and 3D animators.',
  };

  return (
    <div className="relative min-h-screen bg-[#07050d] text-white overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-purple-900/20 via-pink-900/10 to-transparent pointer-events-none blur-3xl -z-10" />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-bold tracking-wide uppercase mb-6 shadow-inner animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>The Cloud &amp; Video Upgrade for Visual Boards</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] mb-6">
          Love PureRef? <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
            Meet PureRef Built for Video.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
          PureRef is great for static images, but animators study <strong className="text-white">motion</strong>.
          Animation Reference gives you cloud moodboards, frame-by-frame video playback, 1-click contact sheets, and a built-in library of millions of references.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all hover:scale-105"
          >
            <Link href="/login?redirect=/home&source=pureref_alt">
              <span>Start Free — No Credit Card Needed</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-12 px-6 rounded-2xl border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 text-sm font-semibold"
          >
            <Link href="/categories">
              <span>Explore Motion Library</span>
            </Link>
          </Button>
        </div>

        {/* Interactive Feature Demo Showcase */}
        <div className="relative mx-auto rounded-3xl border border-white/15 bg-zinc-950/70 p-3 shadow-2xl backdrop-blur-xl sm:p-5">
          <InteractivePlayerShowcase />
        </div>
      </section>

      {/* Feature Pillars Grid */}
      <section className="py-20 bg-zinc-950/50 border-y border-white/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
              Why Animators Switch from Desktop Boards to Cloud Reference
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base">
              Say goodbye to missing file paths, huge .pur archives, and choppy GIFs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 flex flex-col justify-between hover:border-purple-500/40 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                  <Film className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Native 24 FPS Video Playback</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Scrub frame-by-frame with standard hotkeys (<kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs border border-zinc-700">,</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs border border-zinc-700">.</kbd>), set A–B loops, and adjust speed from 0.1x to 2x to study spacing and arcs.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 flex flex-col justify-between hover:border-purple-500/40 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-6">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">1-Click PureRef Contact Sheets</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Export high-resolution keyframe contact sheets with timecodes and frame numbers directly into image grids formatted for instant copy-paste into PureRef or Photoshop.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 flex flex-col justify-between hover:border-purple-500/40 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                  <Monitor className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Cloud Sync Across All Screens</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Access your shot moodboards, acting libraries, and body mechanics clips on any device — from studio workstations to laptops and iPads without transferring gigabytes of files.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            PureRef vs. Animation Reference
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base">
            See how the purpose-built motion platform compares with standard reference boards.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-white/15 bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="py-5 px-6 font-bold text-zinc-400 w-1/3">Capability</th>
                <th className="py-5 px-6 font-bold text-zinc-400 w-1/3">PureRef Desktop</th>
                <th className="py-5 px-6 font-bold text-purple-300 w-1/3 bg-purple-500/10">Animation Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-4 px-6 font-semibold text-white">{row.feature}</td>
                  <td className="py-4 px-6 text-zinc-400">{row.pureref}</td>
                  <td className="py-4 px-6 text-purple-200 font-semibold bg-purple-500/5">{row.animref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section with Rich Schema */}
      <section className="py-20 bg-zinc-950/40 border-t border-white/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-white text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <details key={item.q} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 [&_summary]:cursor-pointer">
                <summary className="font-bold text-white text-base">{item.q}</summary>
                <p className="mt-3 text-sm text-zinc-300 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final Conversion CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-950/60 via-zinc-950 to-pink-950/40 p-8 sm:p-14 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
              Upgrade Your Reference Workflow Today
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Join thousands of animators at Sony, Disney, Riot, and indie studios studying motion with frame-by-frame precision.
            </p>
            <Button
              asChild
              size="lg"
              className="h-12 px-8 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all hover:scale-105"
            >
              <Link href="/login?redirect=/home&source=pureref_cta">
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <p className="mt-4 text-xs text-zinc-500">Free forever tier included · No credit card required to start</p>
          </div>
        </div>
      </section>

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
    </div>
  );
}
