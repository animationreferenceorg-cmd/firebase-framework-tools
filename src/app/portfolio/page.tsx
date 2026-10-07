import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Check, 
  Sparkles, 
  Film, 
  Share2, 
  Eye, 
  Layout, 
  ArrowRight, 
  Play, 
  Sliders, 
  Compass,
  UserCheck,
  ShieldAlert,
  Tv
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroBackgroundVideo } from '@/components/landing/HeroBackgroundVideo';
import { InteractivePlayerShowcase } from '@/components/landing/InteractivePlayerShowcase';

export const metadata: Metadata = {
  title: 'Animation Portfolio Builder | Showcase Reels & Frame-by-Frame Breakdowns',
  description: 'Build a stunning animation portfolio that directors and recruiters love. Host your 2D and 3D shots with frame-scrubbable video players, timing notes, and zero video compression.',
  keywords: [
    'animation portfolio builder',
    'animator portfolio',
    '3d animation portfolio',
    '2d animator portfolio',
    'animation demo reel showcase',
    'shot breakdown portfolio',
    'animation portfolio website',
    'frame by frame portfolio player'
  ],
  alternates: {
    canonical: 'https://animationreference.org/portfolio',
  },
  openGraph: {
    title: 'The Animation Portfolio Builder Made For Animators',
    description: 'Host your demo reel and animation shot breakdowns with frame-by-frame controls, timing charts, and recruiter-friendly presentation.',
    url: 'https://animationreference.org/portfolio',
    type: 'website',
    images: [{ url: '/site-icon.png', width: 800, height: 800, alt: 'Animation Reference Portfolio' }],
  },
};

export default function PortfolioLandingPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Animation Portfolio Builder',
    description: 'Portfolio builder for character animators, 2D artists, and 3D motion designers.',
    url: 'https://animationreference.org/portfolio',
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4 sm:px-6 lg:px-8 border-b border-white/[0.08]">
        {/* Ambient Animation Playing in Background */}
        <HeroBackgroundVideo />
        
        <div className="relative max-w-5xl mx-auto text-center space-y-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-950/60 text-purple-300 text-xs font-semibold tracking-wide uppercase backdrop-blur-md">
            <Film className="w-3.5 h-3.5 text-purple-400" />
            Designed For Animation Recruiters &amp; Supervisors
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none drop-shadow-lg">
            The Animation Portfolio <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-300">
              Directors Actually Want to Review
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-300 leading-relaxed drop-shadow">
            Stop sending recruiters compressed YouTube links or image-heavy ArtStation posts. Showcase your shots with frame-by-frame scrubbing, timing breakdowns, and uncompressed playback.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 shadow-xl shadow-purple-900/40">
              <Link href="/profile">
                Create Your Animator Profile
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-white/20 bg-black/40 backdrop-blur-md text-white hover:bg-white/10 font-semibold px-6">
              <Link href="/home">
                Browse Community Work
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Live Video Player Showcase */}
      <InteractivePlayerShowcase />

      {/* Why Recruiter Love It */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Why Animation Supervisors Love This Format
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto">
            Recruiters don't have time to scrub tiny video progress bars. Give them the controls they use in Maya and RV.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Frame-by-Frame Scrubbing</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Supervisors can use the keyboard (<kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">,</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">.</kbd>) to evaluate your spacing, breakdowns, anticipation, and arcs frame-by-frame.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-900/40 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300">
              <Layout className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Shot Breakdowns &amp; Notes</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Detail your contributions: rig used, software, blocking vs polish pass, and reference inspiration right beneath each clip. No guessing for the hiring lead.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <Share2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Clean Custom Share URL</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Share a distraction-free portfolio link (<code className="text-purple-300 text-xs">animationreference.org/u/yourname</code>) with zero ads, zero uncurated feeds, and lightning fast load times.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center border-t border-white/[0.08]">
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to stand out in the animation hiring pool?
          </h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Join animators working at Sony, Pixar, Blizzard, Riot, and indie studios using Animation Reference.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8">
              <Link href="/profile">
                Build Your Portfolio Now
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
