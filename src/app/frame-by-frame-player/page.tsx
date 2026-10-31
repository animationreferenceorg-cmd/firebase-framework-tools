import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Check, 
  X, 
  Sparkles, 
  Film, 
  Play, 
  Repeat, 
  Layers, 
  ArrowRight, 
  Zap, 
  Sliders, 
  Download, 
  Maximize2,
  FolderHeart,
  ChevronRight,
  ShieldCheck,
  SplitSquareVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroBackgroundVideo } from '@/components/landing/HeroBackgroundVideo';
import { InteractivePlayerShowcase } from '@/components/landing/InteractivePlayerShowcase';

export const metadata: Metadata = {
  title: 'Frame by Frame Video Player Online',
  description: 'Precision frame-by-frame video player online for 2D, 3D, and game animators. Step frames at 24/30/60 FPS, set AB loops, and compare playblasts side-by-side.',
  keywords: [
    'frame by frame video player',
    'frame by frame video player online',
    'video player for animators',
    'frame stepper video player',
    'video scrubber online',
    'slow motion video player for animation',
    'step through video frame by frame',
    'online frame by frame scrubber',
    'maya playblast compare online',
    'onion skin video player'
  ],
  alternates: {
    canonical: 'https://animationreference.org/frame-by-frame-player',
  },
  openGraph: {
    title: 'Frame by Frame Video Player Online Built for Animators',
    description: 'Precision frame stepping at 24/30/60 FPS, A–B beat looping, onion skin overlays, and side-by-side playblast comparison in any browser.',
    url: 'https://animationreference.org/frame-by-frame-player',
    type: 'website',
    images: [{ url: '/icon.png', width: 1024, height: 1024, alt: 'Frame by Frame Animation Player' }],
  },
};

const COMPARISON_ROWS = [
  {
    feature: 'Frame Stepping Accuracy',
    generic: 'Clunky seeking; often skips 2–5 frames or drops keyframes',
    animref: 'Single-frame stepping (< & > or , & .) with zero frame skips',
    winner: true,
  },
  {
    feature: 'Animation Frame Rates (24 / 30 / 60 FPS)',
    generic: 'Locked to 30 or 60 FPS video stream timestamps',
    animref: 'True 24 FPS film standard, 30 FPS, and 60 FPS precision counters',
    winner: true,
  },
  {
    feature: 'A–B Beat Looping',
    generic: 'Whole-video loop only; impossible to isolate a 6-frame punch or step',
    animref: 'Instant sub-second in/out points with auto-looping for motion study',
    winner: true,
  },
  {
    feature: 'Slow Motion Playback',
    generic: 'Steps down to 0.25x or 0.5x with choppy audio noise',
    animref: 'Smooth 0.1x, 0.25x, 0.5x, 0.75x, 1x with mute audio lock',
    winner: true,
  },
  {
    feature: 'Side-by-Side Playblast Compare',
    generic: 'Not supported (requires two separate video windows)',
    animref: 'Synchronized dual-view compare of WIP Maya/Blender shot vs Reference',
    winner: true,
  },
  {
    feature: 'Onion Skinning & Silhouette Mode',
    generic: 'Not supported in any standard browser player',
    animref: 'Previous frame ghosting & high-contrast silhouette for checking arcs',
    winner: true,
  },
  {
    feature: 'Keyframe Contact Sheet Export',
    generic: 'Manual screenshotting and cropping frame by frame',
    animref: '1-click high-resolution contact sheet export with frame numbers',
    winner: true,
  },
  {
    feature: 'Cloud Reference Library & Boards',
    generic: 'Local media files only; no built-in reference vault',
    animref: 'Integrated millions of references across ArtStation, Sketchfab, Pinterest & Sakuga',
    winner: true,
  },
];

const FAQS = [
  {
    q: 'How do I step frame by frame in the video player?',
    a: 'Use the comma (,) or left arrow (<) key to step backward one frame, and the period (.) or right arrow (>) key to step forward one frame. You can also use the on-screen playback scrubber and step buttons on mobile or desktop.',
  },
  {
    q: 'Does this player support 24 FPS standard animation playback?',
    a: 'Yes! While standard web players force 30 or 60 FPS timestamps, Animation Reference natively tracks 24 FPS timecodes, enabling animators to read traditional film exposures, 1s and 2s, and exact frame counts.',
  },
  {
    q: 'Can I upload my own videos to analyze frame by frame?',
    a: 'Yes. You can upload your own motion reference, rehearsal videos, or 3D Maya/Blender playblasts to your private boards or community showcase to analyze them with full frame-stepping and looping tools.',
  },
  {
    q: 'Can I compare my animation playblast side-by-side with reference?',
    a: 'Yes! Pro members can load any 3D playblast or 2D animation pass side-by-side with any library reference clip. Both clips synchronize on scrub and play, making it effortless to identify timing and spacing discrepancies.',
  },
  {
    q: 'Is the frame-by-frame player free to use?',
    a: 'Yes! Free guest visitors get 8 references to study, and free registered accounts get 25 daily references with unlimited boards and frame stepping. Upgrading to Pro unlocks unlimited references, side-by-side playblast comparison, private boards, and high-res downloads starting at just $1 for your first month.',
  },
];

export default function FrameByFramePlayerPage() {
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

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Animation Reference Frame-by-Frame Video Player',
    operatingSystem: 'All (Web, Mac, Windows, iOS, Android)',
    applicationCategory: 'MultimediaApplication',
    url: 'https://animationreference.org/frame-by-frame-player',
    offers: [
      {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
        name: 'Free Plan',
      },
      {
        '@type': 'Offer',
        price: '1.00',
        priceCurrency: 'USD',
        name: 'Pro First Month Intro Offer',
      },
      {
        '@type': 'Offer',
        price: '5.00',
        priceCurrency: 'USD',
        name: 'Pro Monthly Membership',
      },
    ],
  };

  return (
    <div className="relative min-h-screen bg-[#07050e] text-white overflow-hidden">
      <HeroBackgroundVideo />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-400/30 bg-purple-500/15 text-xs font-bold uppercase tracking-wider text-purple-200 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          The Web’s Most Precise Video Scrubber for Animators
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] mb-6">
          Frame-by-Frame Video Player <br />
          <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            Built for Motion Study
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-zinc-300 max-w-3xl mx-auto mb-8 font-medium leading-relaxed">
          Stop struggling with generic media players that drop frames and skip beats. 
          Step through any reference at exact 24 FPS, loop sub-second beats, 
          and compare your Maya/Blender playblasts side-by-side in real time.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Button asChild size="lg" className="h-14 px-8 rounded-2xl text-base font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_35px_rgba(147,51,234,0.5)] border border-purple-400/30 transition-all hover:scale-105">
            <Link href="/home">
              Open Video Player Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-2xl text-base font-semibold border-white/15 bg-white/5 hover:bg-white/10 text-white">
            <Link href="/pricing">
              Get Pro for $1 Intro Offer
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> True 24/30/60 FPS step</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> A–B beat loop scrubbing</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> Side-by-side playblast sync</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> No software download required</span>
        </div>
      </section>

      {/* Interactive Showcase */}
      <section className="relative px-4 md:px-8 max-w-6xl mx-auto mb-20 z-10">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4 md:p-8 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs font-mono text-zinc-400 ml-2">player.animationreference.org · 24.00 FPS · Frame: 042</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="hidden sm:inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[10px]">&lt;</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[10px]">&gt;</kbd> Step Frame</span>
              <span className="hidden sm:inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[10px]">Space</kbd> Play/Pause</span>
            </div>
          </div>
          <InteractivePlayerShowcase />
        </div>
      </section>

      {/* Key Feature Pillars */}
      <section className="relative px-4 md:px-8 max-w-6xl mx-auto mb-24 z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Engineered Specifically for Animators
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base">
            Every feature is designed to reduce friction between observing motion and executing keyframes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center mb-4 text-purple-300">
              <Sliders className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Single-Frame Precision</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Step forward and backward frame-by-frame with zero dropped frames. Lock into exact contact poses, extremes, passing positions, and breakdowns.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mb-4 text-indigo-300">
              <Repeat className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">A–B Beat Looper</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Set start and end points with one click to loop a specific 8-frame punch, jump impact, or lip-sync accent on repeat while animating in Maya or Blender.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center mb-4 text-pink-300">
              <SplitSquareVertical className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Side-by-Side Playblast Sync</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Sync your WIP playblast directly alongside live-action or sakuga reference. Scrub together to instantly spot timing and arc discrepancies.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="relative px-4 md:px-8 max-w-5xl mx-auto mb-24 z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Animation Reference vs Standard Video Players
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm sm:text-base">
            See why animators switch from QuickTime, VLC, and YouTube to our purpose-built motion scrubber.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-4 px-6 font-bold">Feature</th>
                  <th className="py-4 px-6 font-medium text-zinc-400">Standard Players (VLC / YouTube)</th>
                  <th className="py-4 px-6 font-bold text-purple-300 bg-purple-500/10">Animation Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-medium text-white">{row.feature}</td>
                    <td className="py-4 px-6 text-zinc-400 flex items-center gap-2">
                      <X className="h-4 w-4 text-red-400/80 shrink-0" />
                      <span>{row.generic}</span>
                    </td>
                    <td className="py-4 px-6 text-zinc-200 font-semibold bg-purple-500/5">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{row.animref}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative px-4 md:px-8 max-w-4xl mx-auto mb-24 z-10">
        <h2 className="text-3xl font-black text-white text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 backdrop-blur-xl">
              <h3 className="text-base font-bold text-white mb-2">{faq.q}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="relative px-4 md:px-8 max-w-4xl mx-auto pb-24 text-center z-10">
        <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-900/30 via-zinc-950/90 to-zinc-950 p-8 sm:p-12 shadow-[0_0_50px_rgba(147,51,234,0.2)]">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Start Scrubbing Motion Like a Pro
          </h2>
          <p className="text-zinc-300 max-w-xl mx-auto mb-8 text-base">
            Join thousands of animators at Disney, Riot, Sony, and indie studios using Animation Reference every day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="h-14 px-8 rounded-2xl text-base font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xl cursor-pointer">
              <Link href="/home">
                Try Frame-by-Frame Player Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-2xl text-base font-semibold border-white/20 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
              <Link href="/pricing">
                Upgrade to Pro ($1 Intro)
              </Link>
            </Button>
          </div>
          <p className="text-xs text-zinc-500 mt-4">Free plan includes 25 daily references &amp; unlimited moodboards · No card required</p>
        </div>
      </section>

      {/* Structured Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
    </div>
  );
}
