import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Sparkles, 
  Film, 
  Search, 
  FolderHeart, 
  ArrowRight, 
  Layers, 
  Check, 
  Box, 
  ShieldCheck, 
  Star,
  Zap,
  Globe,
  Sliders,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroBackgroundVideo } from '@/components/landing/HeroBackgroundVideo';

export const metadata: Metadata = {
  title: 'Motion & 3D Reference Library',
  description: 'Explore curated animation references for 2D, 3D, and game artists. Search body mechanics, combat clips, and 3D models with frame-by-frame study tools.',
  keywords: [
    'animation reference library',
    'animation reference',
    '3d animation reference',
    'body mechanics reference',
    'combat animation reference',
    'creature locomotion reference',
    'character acting reference',
    'free animation reference database',
    'animation study clips',
    'game animation references'
  ],
  alternates: {
    canonical: 'https://animationreference.org/animation-reference-library',
  },
  openGraph: {
    title: 'The Ultimate Animation Reference Library for Animators',
    description: 'Millions of human motion clips, creature locomotion, martial arts, and 3D models integrated across ArtStation, Sketchfab, Pinterest, and Sakugabooru.',
    url: 'https://animationreference.org/animation-reference-library',
    type: 'website',
    images: [{ url: '/icon.png', width: 1024, height: 1024, alt: 'Animation Reference Library' }],
  },
};

const CATEGORIES = [
  {
    title: 'Body Mechanics & Locomotion',
    slug: 'body-mechanics',
    desc: 'Walk cycles, sprints, heavy weight lifts, parkour leaps, balance shifts, slips, and gravity recovery.',
    count: '150,000+ clips',
    tags: ['walk', 'run', 'jump', 'lift', 'balance'],
  },
  {
    title: 'Combat & Martial Arts',
    slug: 'combat-action',
    desc: 'Martial arts choreography, boxing combos, swordplay arcs, gun recoil, heavy impact reactions, and takedowns.',
    count: '220,000+ clips',
    tags: ['combat', 'sword', 'punch', 'martial-arts', 'impact'],
  },
  {
    title: 'Character Acting & Dialogue',
    slug: 'acting-dialogue',
    desc: 'Subtle facial nuances, eye darts, dialogue lip-sync, moving holds, postural subtext, and natural conversation gestures.',
    count: '180,000+ clips',
    tags: ['acting', 'facial', 'dialogue', 'gesture', 'emotion'],
  },
  {
    title: 'Creatures & Quadrupeds',
    slug: 'creatures-animals',
    desc: 'Canine trotting, feline stalks, horse gallops, bird wing aerodynamics, reptile crawling, and mythical dragon physics.',
    count: '95,000+ clips',
    tags: ['creature', 'quadruped', 'locomotion', 'flight', 'animal'],
  },
  {
    title: 'Interactive 3D Models',
    slug: '3d-models',
    desc: 'Integrated Sketchfab 3D models allowing 360° rotation, wireframe inspection, and angle perspective study.',
    count: '50,000+ models',
    tags: ['sketchfab', '3d-model', 'anatomy', 'props', 'turnaround'],
  },
  {
    title: 'FX, Cloth & Physics',
    slug: 'fx-physics',
    desc: 'Secondary hair motion, cloth drag, water splashes, explosive shockwaves, smoke dissipation, and debris scattering.',
    count: '75,000+ clips',
    tags: ['fx', 'cloth', 'hair', 'physics', 'debris'],
  },
];

const FAQS = [
  {
    q: 'How large is the Animation Reference library?',
    a: 'Animation Reference houses millions of references. It combines our curated studio database with real-time multi-platform integration across ArtStation, Sketchfab 3D models, Pinterest, and Sakugabooru—giving you instant access to the largest motion study vault on Earth.',
  },
  {
    q: 'Can I study references frame by frame directly in the browser?',
    a: 'Yes! Every clip loads in our dedicated 24/30/60 FPS video player with single-frame stepping (< & >), A–B sub-second beat looping, slow-motion playback, and onion skinning without needing to download large video files.',
  },
  {
    q: 'How do I organize references for my projects?',
    a: 'You can create unlimited custom moodboards and visual boards. Save clips, categorize references by character or shot, and export high-resolution contact sheets or layout files directly into PureRef.',
  },
  {
    q: 'Can I upload my own motion references?',
    a: 'Yes. You can upload your own live-action reference, rehearsal video, or 3D Maya/Blender playblast to your boards. You can keep them completely private with a Pro account or share them with the community.',
  },
  {
    q: 'Is access to the reference library free?',
    a: 'Yes. Unauthenticated visitors get 25 references to study, and free registered accounts get 35 daily references with unlimited boards. Upgrading to Pro gives unlimited library access, side-by-side playblast comparison, and 4K downloads for only $1 for your first month ($5/mo thereafter).',
  },
];

export default function AnimationReferenceLibraryPage() {
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

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Animation Reference Library',
    description: 'Millions of curated 2D, 3D, and live-action animation reference clips and 3D models.',
    url: 'https://animationreference.org/animation-reference-library',
    publisher: {
      '@type': 'Organization',
      name: 'Animation Reference',
      url: 'https://animationreference.org',
      logo: 'https://animationreference.org/icon.png',
    },
  };

  return (
    <div className="relative min-h-screen bg-[#07050e] text-white overflow-hidden">
      <HeroBackgroundVideo />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-400/30 bg-purple-500/15 text-xs font-bold uppercase tracking-wider text-purple-200 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          The Web’s Most Comprehensive Motion Vault
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] mb-6">
          The Ultimate <br />
          <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            Animation Reference Library
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-zinc-300 max-w-3xl mx-auto mb-8 font-medium leading-relaxed">
          Search millions of body mechanics, combat stunts, quadruped locomotion, and rotatable 3D models. 
          Step frame-by-frame, organize into visual moodboards, and level up your shots faster.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Button asChild size="lg" className="h-14 px-8 rounded-2xl text-base font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_35px_rgba(147,51,234,0.5)] border border-purple-400/30 transition-all hover:scale-105">
            <Link href="/home">
              Explore Reference Library Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-2xl text-base font-semibold border-white/15 bg-white/5 hover:bg-white/10 text-white">
            <Link href="/pricing">
              Get Pro for $1 Intro Offer
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> 100% Human motion reference</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> Integrated ArtStation, Sketchfab &amp; Sakugabooru</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> Built-in 24 FPS frame stepper</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> Unlimited moodboards</span>
        </div>
      </section>

      {/* Curated Library Categories */}
      <section className="relative px-4 md:px-8 max-w-6xl mx-auto mb-24 z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Curated Motion Categories for Every Production Need
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base">
            Quickly navigate specialized reference collections designed for feature film, AAA games, and indie animators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat, idx) => (
            <div key={idx} className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur-xl flex flex-col justify-between hover:border-purple-400/40 transition-all group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-semibold text-purple-300 uppercase tracking-wider">{cat.count}</span>
                  <Film className="h-4 w-4 text-zinc-500 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-200 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  {cat.desc}
                </p>
              </div>

              <div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {cat.tags.map((tag) => (
                    <Link 
                      key={tag} 
                      href={`/tags/${tag}`}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full rounded-xl border-white/15 bg-white/5 hover:bg-purple-600 hover:border-purple-500 text-white font-semibold text-xs transition-colors">
                  <Link href="/home">
                    Browse Category <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-Platform Integration Pillar */}
      <section className="relative px-4 md:px-8 max-w-5xl mx-auto mb-24 z-10">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950/90 via-purple-950/20 to-zinc-950/90 p-8 md:p-12 backdrop-blur-2xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-400/30 bg-purple-500/10 text-xs font-semibold text-purple-200 mb-4">
              <Globe className="h-3.5 w-3.5" />
              Unified Web Search Integration
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Search Once. Access the Entire Animation Universe.
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-6 text-sm sm:text-base">
              You no longer need 15 browser tabs open. One single search query scours our verified library alongside ArtStation reels, Sketchfab 3D turnarounds, Pinterest boards, and Sakugabooru hand-drawn keyframes.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center">
                <span className="text-xs font-bold text-white block">ArtStation</span>
                <span className="text-[10px] text-zinc-400">Industry Portfolios</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center">
                <span className="text-xs font-bold text-white block">Sketchfab</span>
                <span className="text-[10px] text-zinc-400">3D Rotatable Meshes</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center">
                <span className="text-xs font-bold text-white block">Sakugabooru</span>
                <span className="text-[10px] text-zinc-400">Hand-Drawn 2D Cuts</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center">
                <span className="text-xs font-bold text-white block">Pinterest</span>
                <span className="text-[10px] text-zinc-400">Visual Aesthetic Moods</span>
              </div>
            </div>
            <Button asChild size="lg" className="rounded-2xl font-bold bg-purple-600 hover:bg-purple-500 text-white">
              <Link href="/home">
                Try Unified Search Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
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
            Accelerate Your Animation Shots Today
          </h2>
          <p className="text-zinc-300 max-w-xl mx-auto mb-8 text-base">
            Find the exact pose, timing, and mechanics you need in seconds instead of hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="h-14 px-8 rounded-2xl text-base font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xl cursor-pointer">
              <Link href="/home">
                Start Searching Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-2xl text-base font-semibold border-white/20 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
              <Link href="/pricing">
                Upgrade to Pro ($1 Intro)
              </Link>
            </Button>
          </div>
          <p className="text-xs text-zinc-500 mt-4">Free plan includes 35 daily references &amp; unlimited moodboards · No card required</p>
        </div>
      </section>

      {/* Structured Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
    </div>
  );
}
