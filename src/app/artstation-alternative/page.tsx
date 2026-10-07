import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Check, 
  X, 
  Sparkles, 
  Film, 
  Eye, 
  ShieldCheck, 
  Layers, 
  ArrowRight, 
  Cpu, 
  Zap, 
  Sliders, 
  Download,
  FolderLock,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'The ArtStation Alternative for Animators | 100% Human Motion, Zero AI Noise',
  description: 'Frustrated with ArtStation? Animation Reference is the animator-first portfolio & reference platform with frame-by-frame scrubbing, playblast compare, and zero AI clutter.',
  keywords: [
    'artstation alternative',
    'artstation alternative for animators',
    'animation portfolio builder',
    'artstation animation',
    'frame by frame video player',
    'maya playblast compare',
    'animation reference platform',
    'pureref reference boards',
    '3d animator portfolio',
    '2d animator portfolio'
  ],
  alternates: {
    canonical: 'https://animationreference.org/artstation-alternative',
  },
  openGraph: {
    title: 'The ArtStation Alternative Built Strictly For Animators',
    description: '100% human-crafted animation library, frame-by-frame controls, playblast compare, and clean animator portfolios.',
    url: 'https://animationreference.org/artstation-alternative',
    type: 'website',
    images: [{ url: '/site-icon.png', width: 800, height: 800, alt: 'Animation Reference' }],
  },
};

const COMPARISON_ROWS = [
  {
    feature: 'AI Content Policy',
    artstation: 'Flooded with AI-generated images & video',
    animref: '100% Human Animation (Zero AI slop)',
    winner: true,
  },
  {
    feature: 'Video Quality & Compression',
    artstation: 'Crushed compression that blurs arcs and timing',
    animref: 'High-bitrate studio quality with direct seeking',
    winner: true,
  },
  {
    feature: 'Frame-by-Frame Playback',
    artstation: 'Basic HTML5 play/pause only',
    animref: 'Frame stepping ("," & "."), FPS control & loop regions',
    winner: true,
  },
  {
    feature: 'Playblast Comparison',
    artstation: 'Not supported',
    animref: 'Synchronized side-by-side WIP vs Reference compare',
    winner: true,
  },
  {
    feature: 'Curated Motion Library',
    artstation: 'Scattered user uploads with no motion tags',
    animref: '8,100+ tagged references (walks, combat, creatures, acting)',
    winner: true,
  },
  {
    feature: 'Pipeline & PureRef Export',
    artstation: 'Manual saving only',
    animref: 'Export contact sheets & boards directly to PureRef',
    winner: true,
  },
  {
    feature: 'Studio & NDA Work',
    artstation: 'Public posts or clumsy password hiding',
    animref: 'Private encrypted reference boards for studio teams',
    winner: true,
  },
  {
    feature: 'Pricing',
    artstation: '$11.95/month (ArtStation Plus)',
    animref: '$5.00/month or $45/year ($1 first month intro offer)',
    winner: true,
  },
];

const FAQS = [
  {
    q: 'Why are animators leaving ArtStation for Animation Reference?',
    a: 'ArtStation was built for static 2D concept art and 3D illustrations. Over recent years, it has suffered from uncurated AI generation flooding search results, while its video compression degrades frame timing, motion arcs, and key poses. Animation Reference is designed specifically for animators: zero AI noise, studio-grade frame scrubbing, synchronized playblast comparison, and dedicated motion tags.',
  },
  {
    q: 'Can I showcase both 2D and 3D animation in my portfolio?',
    a: 'Yes! Animation Reference supports 2D traditional hand-drawn animation, anime cuts (Sakuga), 3D character animation (Maya, Blender, 3ds Max), creature locomotion, and stop-motion. Visitors and recruiters can scrub your reels frame-by-frame with full keyboard control.',
  },
  {
    q: 'How does the side-by-side playblast comparison feature work?',
    a: 'Pro members can upload their work-in-progress Maya, Blender, or 2D playblast directly into the player alongside any reference video. Both clips sync up frame-for-frame so you can check weight, spacing, contact poses, and timing arcs simultaneously.',
  },
  {
    q: 'Can I keep studio and NDA work private?',
    a: 'Absolutely. Pro accounts include unlimited private reference boards and uploads. You can gather reference for unannounced games, films, or commercial client pitches with zero risk of public exposure.',
  },
  {
    q: 'What does the Free plan include vs Pro?',
    a: 'Free accounts get access to browse and study the 8,100+ reference library with frame-by-frame controls, create public boards, and build a public portfolio. Pro ($5/month or $45/year, with a $1 intro first month) unlocks unlimited references, side-by-side playblast compare, private boards, MP4 reference downloads, and PureRef exports.',
  },
];

export default function ArtstationAlternativePage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4 sm:px-6 lg:px-8 border-b border-white/[0.08]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(147,51,234,0.18),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-950/40 text-purple-300 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            The Animator-First Alternative
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            The ArtStation Alternative <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-300">
              Built Strictly For Animators
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed">
            Tired of unmoderated AI noise and crushed video compression? Animation Reference gives 2D &amp; 3D animators studio-grade frame-by-frame scrubbing, synchronized playblast comparison, and clean professional portfolios.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 shadow-lg shadow-purple-900/30">
              <Link href="/home">
                Explore 8,000+ References Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 font-semibold px-6">
              <Link href="/pricing">
                Get Pro for $1 (Intro Offer)
              </Link>
            </Button>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> 100% Human Motion
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Frame-by-Frame Controls
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Zero AI Flood
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Maya &amp; Blender Friendly
            </span>
          </div>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Why Animators Choose Animation Reference Over ArtStation
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto">
            ArtStation was designed for static images in 2014. We built a platform specifically tailored to movement, timing, and animation production.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/70 shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="py-4 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-1/3">Feature</th>
                <th className="py-4 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-1/3">ArtStation</th>
                <th className="py-4 px-6 text-xs font-bold text-purple-300 uppercase tracking-wider w-1/3 bg-purple-950/20">Animation Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-medium text-white">{row.feature}</td>
                  <td className="py-4 px-6 text-zinc-400 flex items-center gap-2">
                    <X className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{row.artstation}</span>
                  </td>
                  <td className="py-4 px-6 text-white font-medium bg-purple-950/10">
                    <div className="flex items-center gap-2 text-purple-200">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{row.animref}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-white/[0.08]">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Built For The Animator's Workflow
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto">
            Tools engineered specifically for 2D, 3D, and stop-motion artists studying mechanics and showing off their best work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Frame-by-Frame Scrubbing</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Step forward and backward frame-by-frame with hotkeys (<kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">,</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">.</kbd>). Inspect timing, spacing, contact frames, and arcs with zero lag.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-900/40 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Side-by-Side Playblast Compare</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Import your Maya or Blender playblast and play it synchronized right beside the master live-action or anime reference. Find silhouette errors before review.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Zero AI Clutter</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              100% human-made motion references. Every walk cycle, martial arts fight, animal locomotion, and facial acting clip is created by verified human animators and directors.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">PureRef &amp; Contact Sheets</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Export entire boards directly into PureRef format or generate high-resolution PNG contact sheets with key poses for your desk or dual monitor.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-900/40 border border-blue-500/30 flex items-center justify-center text-blue-300">
              <FolderLock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Private Studio &amp; NDA Boards</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Working on an unannounced game or feature film? Pro accounts get private boards and private uploads so your production reference stays confidential.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-900/40 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Direct MP4 Downloads</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Download raw reference video files straight to your disk so you can drag them directly into Maya's image plane, Blender's background video, or syncsketch.
            </p>
          </div>
        </div>
      </section>

      {/* Pro Membership Callout */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/70 via-zinc-950 to-black p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-900/40 px-3 py-1 rounded-full border border-purple-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Join Pro Today
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Level Up Your Animation Craft
          </h2>

          <p className="text-zinc-300 text-sm sm:text-base max-w-xl mx-auto">
            Unlimited daily reference access, side-by-side playblast comparison, private NDA boards, and high-speed MP4 downloads for just $5/month.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button asChild size="lg" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold px-8">
              <Link href="/pricing">
                Start Pro for $1 (First Month)
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-zinc-400 hover:text-white">
              <Link href="/pricing">
                Compare Free vs Pro Plans
              </Link>
            </Button>
          </div>

          <p className="text-[11px] text-zinc-500">
            Cancel anytime in one click. No contracts. Powered by Stripe secure billing.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-white/[0.08]">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Everything you need to know about switching from ArtStation to Animation Reference.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-zinc-950/60 p-5 space-y-2">
              <h3 className="text-sm font-semibold text-white">{faq.q}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 text-center border-t border-white/[0.08] bg-zinc-950/80">
        <h2 className="text-2xl font-bold text-white mb-3">Ready for a better animation platform?</h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">
          Join thousands of 2D and 3D animators studying reference and sharing real human work.
        </p>
        <Button asChild size="default" className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6">
          <Link href="/home">
            Browse the Library Now
          </Link>
        </Button>
      </section>
    </div>
  );
}
