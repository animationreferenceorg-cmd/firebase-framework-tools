import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Check, 
  Sparkles, 
  Film, 
  Layers, 
  ArrowRight, 
  Zap, 
  Flame,
  Tv,
  BookmarkPlus,
  PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractivePlayerShowcase } from '@/components/landing/InteractivePlayerShowcase';

export const metadata: Metadata = {
  title: 'Sakugabooru Alternative for Anime Study',
  description: 'Study 2D anime animation cuts and sakuga with precision. Step frame-by-frame, set AB loops, analyze smears and FX timing, and save clips to visual boards.',
  keywords: [
    'sakugabooru alternative',
    'sakuga animation reference',
    'anime animation reference',
    'sakugabooru player',
    'anime frame by frame player',
    'sakuga cuts reference',
    '2d animation timing reference',
    'anime smears reference',
    'sakuga booru video download',
    'fight scene animation reference'
  ],
  alternates: {
    canonical: 'https://animationreference.org/sakugabooru-alternative',
  },
  openGraph: {
    title: 'The Sakugabooru Alternative with Frame-by-Frame Controls & Moodboards',
    description: 'Study 2D anime animation cuts and sakuga with precision. Frame-by-frame stepping (< >), A–B looping, onion skinning, and cloud moodboards.',
    url: 'https://animationreference.org/sakugabooru-alternative',
    type: 'website',
    images: [{ url: '/icon.png', width: 1024, height: 1024, alt: 'Animation Reference' }],
  },
};

const COMPARISON_ROWS = [
  {
    feature: 'Frame-by-Frame Stepping',
    sakugabooru: 'None (standard web video player only)',
    animref: 'Precise frame stepping (< and > keys) & sub-frame scrubbing',
    winner: true,
  },
  {
    feature: 'A–B Region Repeat Loop',
    sakugabooru: 'Not supported (repeats entire clip only)',
    animref: 'Custom loop markers to isolate specific impact frames or smears',
    winner: true,
  },
  {
    feature: 'Playback Speed Controls',
    sakugabooru: 'Standard browser speeds (or none)',
    animref: 'Smooth 0.1x to 2x speed adjustment for breaking down fast anime cuts',
    winner: true,
  },
  {
    feature: 'Onion Skin & Spacing Study',
    sakugabooru: 'Not available',
    animref: 'Multi-frame onion skin overlays to analyze keyframe spacing and breakdowns',
    winner: true,
  },
  {
    feature: 'Personal Moodboards & Collections',
    sakugabooru: 'Only browser bookmarks',
    animref: 'Unlimited cloud moodboards organized by animator, style, FX, or action',
    winner: true,
  },
  {
    feature: 'Stream Availability & Speed',
    sakugabooru: 'Frequent CDN throttling and blocked embeds',
    animref: 'Optimized high-speed CDN playback with instant video seek',
    winner: true,
  },
  {
    feature: '1-Click Contact Sheets',
    sakugabooru: 'Manual screenshotting required',
    animref: 'Export high-res contact sheets directly into PureRef or Photoshop',
    winner: true,
  },
];

const FAQ = [
  {
    q: 'How does Animation Reference improve on Sakugabooru for animators?',
    a: 'Sakugabooru is an incredible archive, but it was built as a media gallery, not a motion analysis studio. Animation Reference wraps clips in an animator-first player with frame stepping, A–B loop repeats, slow-motion scrubbing down to 0.1x, and personal moodboards so you can dissect smears, impact frames, and FX timing.',
  },
  {
    q: 'Can I study sakuga alongside 3D and live-action reference?',
    a: 'Yes! Animation Reference unifies 2D sakuga cuts with 3D model turnarounds, live-action martial arts, creature locomotion, and acting reference in one synchronized platform.',
  },
  {
    q: 'How much does it cost?',
    a: 'Animation Reference has a free plan providing 25 references a day (and 8 guest clips) with full frame-by-frame controls, unlimited public moodboards, and community sharing. Pro removes the daily limit and unlocks 24 FPS MP4 downloads and side-by-side comparison for $5/month ($1 for your first month).',
  },
  {
    q: 'Can I save clips to my moodboards?',
    a: 'Yes! You can organize clips into unlimited moodboards (e.g. "Impact Frames", "Debris FX", "Sword Choreography", "Character Smears") and access them on any device.',
  },
];

export default function SakugabooruAlternativePage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="relative min-h-screen bg-[#07050d] text-white overflow-hidden selection:bg-rose-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-rose-900/20 via-purple-900/10 to-transparent pointer-events-none blur-3xl -z-10" />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold tracking-wide uppercase mb-6 shadow-inner animate-pulse">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>The Modern Studio Player for 2D Sakuga Study</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] mb-6">
          Study Sakuga Cuts. <br />
          <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
            Frame-by-Frame with Precision.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
          Love browsing Sakugabooru but frustrated by the lack of player controls?
          Animation Reference gives you frame-stepping (<kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs border border-zinc-700">,</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs border border-zinc-700">.</kbd>), A–B loop repeats, speed controls, and personal moodboards.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(244,63,94,0.4)] transition-all hover:scale-105"
          >
            <Link href="/login?redirect=/home&source=sakuga_alt">
              <span>Start Free Anime Study</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-12 px-6 rounded-2xl border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 text-sm font-semibold"
          >
            <Link href="/tags/anime">
              <span>Browse Anime References</span>
            </Link>
          </Button>
        </div>

        {/* Interactive Feature Demo Showcase */}
        <div className="relative mx-auto rounded-3xl border border-white/15 bg-zinc-950/70 p-3 shadow-2xl backdrop-blur-xl sm:p-5">
          <InteractivePlayerShowcase />
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 bg-zinc-950/50 border-y border-white/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
              Engineered Specifically for 2D &amp; 3D Animation Breakdown
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base">
              Dissect smears, impact frames, multiple limbs, and explosive FX in full fidelity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 flex flex-col justify-between hover:border-rose-500/40 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6">
                  <Film className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Step Every Single Frame</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Never miss an in-between or a 1-frame smear again. Use standard animation keyboard shortcuts to inspect timing on 1s, 2s, and 3s.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 flex flex-col justify-between hover:border-rose-500/40 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">A–B Beat Looping</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Isolate just the 12 frames of an impact or an antenna smear. Loop it seamlessly on repeat while you work in TVPaint, Maya, or Blender.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 flex flex-col justify-between hover:border-rose-500/40 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                  <BookmarkPlus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Organized Moodboards</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Build custom boards for specific animators (Yutaka Nakamura, Norio Matsumoto, etc.), FX styles, or action beats that sync across your devices.
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
            Sakugabooru vs. Animation Reference
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base">
            Why animators upgrade to a professional studio study platform.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-white/15 bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="py-5 px-6 font-bold text-zinc-400 w-1/3">Feature</th>
                <th className="py-5 px-6 font-bold text-zinc-400 w-1/3">Sakugabooru</th>
                <th className="py-5 px-6 font-bold text-rose-300 w-1/3 bg-rose-500/10">Animation Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-white/[0.01] transition-colors">
                  <td className="py-4 px-6 font-semibold text-white">{row.feature}</td>
                  <td className="py-4 px-6 text-zinc-400">{row.sakugabooru}</td>
                  <td className="py-4 px-6 text-rose-200 font-semibold bg-rose-500/5">{row.animref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
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
        <div className="rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/60 via-zinc-950 to-purple-950/40 p-8 sm:p-14 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
              Level Up Your Animation Craft
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Study the masters of hand-drawn timing and 3D action with professional frame-by-frame controls.
            </p>
            <Button
              asChild
              size="lg"
              className="h-12 px-8 rounded-2xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(244,63,94,0.5)] transition-all hover:scale-105"
            >
              <Link href="/login?redirect=/home&source=sakuga_cta">
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
    </div>
  );
}
