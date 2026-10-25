'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Sparkles, 
  Film, 
  Sliders, 
  Layers, 
  Activity, 
  ArrowRight, 
  Play, 
  Search, 
  Compass,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface GuideItem {
  slug: string;
  label: string;
  badge: string;
  category: 'Locomotion' | 'VisDev & 3D' | 'Combat & Action' | 'Acting & Dialogue' | 'Creatures & Principles';
  description: string;
  coverArt: string;
  clipCount: string;
  featured?: boolean;
}

export const GUIDES_DATA: GuideItem[] = [
  {
    slug: 'human-walk-cycle-animation-reference',
    label: 'Human Walk Cycle Animation Reference',
    badge: 'Popular • 24 FPS',
    category: 'Locomotion',
    description: 'Master the 4 contact beats, pelvic counter-rotation, and center of gravity in human walking.',
    coverArt: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop&q=80',
    clipCount: '385+ clips',
    featured: true,
  },
  {
    slug: 'real-life-animation-reference',
    label: 'Real Life Animation Reference & Footage',
    badge: 'Live Action',
    category: 'Locomotion',
    description: 'Frame-by-frame slow-motion human athletic movement, weight shifts, and authentic physical timing.',
    coverArt: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
    clipCount: '250+ clips',
    featured: true,
  },
  {
    slug: 'walk-cycle-animation-reference',
    label: 'Walk Cycle Animation Reference',
    badge: 'Mechanics',
    category: 'Locomotion',
    description: 'Compare contact, passing, down, and up poses across stylized 2D and 3D character walks.',
    coverArt: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
    clipCount: '360+ clips',
  },
  {
    slug: 'run-cycle-animation-reference',
    label: 'Run Cycle Animation Reference',
    badge: 'Velocity',
    category: 'Locomotion',
    description: 'Airborne suspension poses, forward torso drive, and high-velocity athletic leg cycles.',
    coverArt: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
    clipCount: '2.2k+ clips',
  },
  {
    slug: 'body-mechanics-animation-reference',
    label: 'Body Mechanics Animation Reference',
    badge: 'Foundations',
    category: 'Locomotion',
    description: 'Anatomical balance, center of mass over base of support, and lifting heavy loads.',
    coverArt: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=800&auto=format&fit=crop&q=80',
    clipCount: '1.4k+ clips',
    featured: true,
  },
  {
    slug: 'dance-and-parkour-animation-reference',
    label: 'Dance & Parkour Animation Reference',
    badge: 'Kinetic',
    category: 'Locomotion',
    description: 'Continuous momentum arcs, rotational spins, apex suspension, and ground rolls.',
    coverArt: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
    clipCount: '490+ clips',
  },
  {
    slug: 'character-turnaround-animation-reference',
    label: 'Character Turnaround & Model Sheets',
    badge: '3D & 2D',
    category: 'VisDev & 3D',
    description: '360-degree character turnarounds, 3D turntable models, and orthographic model sheets.',
    coverArt: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    clipCount: '490+ clips',
    featured: true,
  },
  {
    slug: 'storyboard-animation-reference',
    label: 'Storyboard & Cinematography Reference',
    badge: 'VisDev',
    category: 'VisDev & 3D',
    description: 'Staging, 180-degree line continuity, camera lensing, and narrative thumbnail beats.',
    coverArt: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
    clipCount: '180+ clips',
    featured: true,
  },
  {
    slug: 'transformers-mecha-animation-reference',
    label: 'Transformers & Mecha Animation Reference',
    badge: 'Hard-Surface',
    category: 'Combat & Action',
    description: 'Hydraulic physics, transformation choreography, and massive metal armor inertia.',
    coverArt: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    clipCount: '390+ clips',
  },
  {
    slug: 'spider-man-acrobatic-animation-reference',
    label: 'Spider-Man & Acrobatic Traversal',
    badge: 'Acrobatics',
    category: 'Combat & Action',
    description: 'Pendulum web arcs, rooftop parkour, momentum conservation, and superhero landings.',
    coverArt: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    clipCount: '210+ clips',
  },
  {
    slug: 'martial-arts-combat-animation-reference',
    label: 'Martial Arts & Combat Reference',
    badge: 'Choreography',
    category: 'Combat & Action',
    description: 'Strikes, reaction physics, sweeps, blocks, and hand-to-hand stunt choreography.',
    coverArt: 'https://images.unsplash.com/photo-1549476464-37392f717541?w=800&auto=format&fit=crop&q=80',
    clipCount: '3.8k+ clips',
    featured: true,
  },
  {
    slug: 'sword-swing-animation-reference',
    label: 'Sword Swing Animation Reference',
    badge: 'Weapons',
    category: 'Combat & Action',
    description: 'Weight transfer, blade arcs, two-handed grip dynamics, and clashing recoil.',
    coverArt: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=800&auto=format&fit=crop&q=80',
    clipCount: '1.2k+ clips',
  },
  {
    slug: 'punch-animation-reference',
    label: 'Punch Animation Reference',
    badge: 'Impact Force',
    category: 'Combat & Action',
    description: 'Hip rotation, shoulder drive, anticipation snap, and knockback hit-stop framing.',
    coverArt: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80',
    clipCount: '2.4k+ clips',
  },
  {
    slug: 'facial-acting-animation-reference',
    label: 'Facial Acting Animation Reference',
    badge: 'Expression',
    category: 'Acting & Dialogue',
    description: 'Micro-expressions, brow compression, eye darts, and subtextual performance.',
    coverArt: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
    clipCount: '1.1k+ clips',
  },
  {
    slug: 'speech-animation-reference',
    label: 'Speech & Lip Sync Reference',
    badge: 'Dialogue',
    category: 'Acting & Dialogue',
    description: 'Phoneme mouth shapes (A, E, I, O, U, M, B, F), jaw mechanics, and dialogue cadence.',
    coverArt: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80',
    clipCount: '450+ clips',
  },
  {
    slug: 'moving-hold-animation-reference',
    label: 'Moving Hold Animation Reference',
    badge: 'Organic Life',
    category: 'Acting & Dialogue',
    description: 'Breathing cycles, eye blinks, settling poses, and keeping poses organically alive.',
    coverArt: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
    clipCount: '320+ clips',
  },
  {
    slug: 'quadruped-animal-walk-cycle-reference',
    label: 'Quadruped & Animal Walk Cycles',
    badge: '4-Legged Gaits',
    category: 'Creatures & Principles',
    description: 'Lateral vs diagonal gaits, scapula slip, and tail counter-balance in dogs, cats, and horses.',
    coverArt: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=800&auto=format&fit=crop&q=80',
    clipCount: '2.5k+ clips',
  },
  {
    slug: 'creature-locomotion-animation-reference',
    label: 'Creature Locomotion Animation Reference',
    badge: 'Behemoths',
    category: 'Creatures & Principles',
    description: 'Heavy dinosaur footsteps, dragon tail whips, alien anatomy, and monstrous mass.',
    coverArt: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
    clipCount: '2.6k+ clips',
  },
  {
    slug: 'squash-and-stretch-animation-reference',
    label: 'Squash & Stretch Animation Reference',
    badge: 'Principle #1',
    category: 'Creatures & Principles',
    description: 'Volume preservation under extreme impact deformation and elastic kinetic recovery.',
    coverArt: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    clipCount: '780+ clips',
  },
  {
    slug: 'animation-timing-and-spacing-reference',
    label: 'Timing & Spacing Reference',
    badge: 'Cadence',
    category: 'Creatures & Principles',
    description: 'Slow-in, slow-out, moving over extremes, explosive anticipation, and frame charts.',
    coverArt: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=800&auto=format&fit=crop&q=80',
    clipCount: '890+ clips',
  },
  {
    slug: 'fx-animation-reference',
    label: 'FX Animation Reference',
    badge: 'VFX & Elements',
    category: 'Creatures & Principles',
    description: 'Smoke billows, fire dissipation, water splashes, and explosion shockwaves.',
    coverArt: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&auto=format&fit=crop&q=80',
    clipCount: '6.2k+ clips',
  },
  {
    slug: 'how-to-analyze-animation-reference',
    label: 'How to Analyze Animation Reference',
    badge: 'Workflow',
    category: 'Creatures & Principles',
    description: 'Frame-by-frame analysis techniques, center of mass tracing, and line of action breakdown.',
    coverArt: 'https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?w=800&auto=format&fit=crop&q=80',
    clipCount: 'Studio Guide',
  },
];

const CATEGORIES = [
  'All Guides',
  'Locomotion',
  'VisDev & 3D',
  'Combat & Action',
  'Acting & Dialogue',
  'Creatures & Principles'
] as const;

export function ResourcesClient() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Guides');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredGuides = useMemo(() => {
    return GUIDES_DATA.filter((g) => g.featured);
  }, []);

  const filteredGuides = useMemo(() => {
    return GUIDES_DATA.filter((g) => {
      const matchesCategory = selectedCategory === 'All Guides' || g.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        g.label.toLowerCase().includes(q) || 
        g.description.toLowerCase().includes(q) ||
        g.badge.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans pb-24">
      {/* 1. Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[40vh] -left-40 w-[45vw] h-[45vh] bg-indigo-600/10 rounded-full blur-[130px]" />
        <div className="absolute top-[70vh] -right-40 w-[45vw] h-[45vh] bg-cyan-600/10 rounded-full blur-[130px]" />
      </div>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 md:pt-14 space-y-16">
        {/* 2. Hero Header Section */}
        <header className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-purple-500/30 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(147,51,234,0.4)]">
            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold text-purple-200 tracking-wider uppercase">
              Curated Masterclass Study Guides
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-white">
            Animation Reference{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400">
              Study Guides
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Master body mechanics, character turnarounds, combat stunts, and acting. Every guide pairs core movement principles with scrubbable reference clips from the world&apos;s leading animation studios.
          </p>

          {/* Search Discovery Bar */}
          <div className="pt-2 max-w-xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300" />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 group-focus-within:text-purple-400 transition-colors" />
              <Input
                placeholder="Search walk cycles, turnarounds, storyboards, mecha, combat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-13 sm:h-14 bg-black/80 backdrop-blur-xl border-white/15 rounded-2xl text-sm sm:text-base text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-purple-500/50 shadow-2xl"
              />
            </div>
          </div>

          {/* Quick Technical Specs Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl mx-auto">
            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-md text-center">
              <div className="flex items-center justify-center gap-1.5 text-purple-400 text-xs font-bold uppercase mb-0.5">
                <Film className="h-3.5 w-3.5" /> 24 FPS Cinema
              </div>
              <div className="text-sm font-extrabold text-white">Native Cadence</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-md text-center">
              <div className="flex items-center justify-center gap-1.5 text-cyan-400 text-xs font-bold uppercase mb-0.5">
                <Sliders className="h-3.5 w-3.5" /> Frame Stepper
              </div>
              <div className="text-sm font-extrabold text-white">Single-Frame Scrub</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-md text-center">
              <div className="flex items-center justify-center gap-1.5 text-indigo-400 text-xs font-bold uppercase mb-0.5">
                <Activity className="h-3.5 w-3.5" /> Vector Draw-Over
              </div>
              <div className="text-sm font-extrabold text-white">Arc &amp; Spine Tracing</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-md text-center">
              <div className="flex items-center justify-center gap-1.5 text-pink-400 text-xs font-bold uppercase mb-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> 100% Free
              </div>
              <div className="text-sm font-extrabold text-white">Open to All Artists</div>
            </div>
          </div>
        </header>

        {/* 3. Category Filter Tabs */}
        <div className="sticky top-4 z-30 bg-[#060312]/95 backdrop-blur-xl py-3 border-y border-white/10 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth max-w-7xl mx-auto">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 shadow-sm",
                    isSelected
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 scale-105 border border-purple-400/50"
                      : "bg-zinc-900/80 text-zinc-300 border border-white/10 hover:border-white/25 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  {cat === 'All Guides' ? <Compass className="h-3.5 w-3.5 text-purple-300" /> : <Layers className="h-3.5 w-3.5 text-indigo-300" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Featured Flagship Guides (Shown on All Guides tab when not searching) */}
        {selectedCategory === 'All Guides' && !searchQuery && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" /> Featured Flagship Studies
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Essential masterclass breakdowns used by character animators and game studios.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredGuides.slice(0, 3).map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/resources/${guide.slug}`}
                  className="group relative aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/80 hover:shadow-[0_0_35px_-5px_rgba(168,85,247,0.5)] flex flex-col justify-end p-6"
                >
                  <Image
                    src={guide.coverArt}
                    alt={guide.label}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent z-10" />

                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 z-20">
                    <span className="px-3 py-1 rounded-md bg-purple-950/80 backdrop-blur-md border border-purple-500/40 text-purple-200 font-mono text-[10px] font-extrabold tracking-wider shadow">
                      {guide.badge}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4 z-20">
                    <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-white font-mono text-[10px] font-bold">
                      {guide.clipCount}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="relative z-20 space-y-1.5 text-left">
                    <h3 className="text-xl font-black text-white leading-tight drop-shadow-md group-hover:text-purple-300 transition-colors">
                      {guide.label}
                    </h3>
                    <p className="text-xs text-zinc-300 line-clamp-2 font-medium">
                      {guide.description}
                    </p>
                    <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-purple-400 group-hover:text-purple-300">
                      <span>Study breakdown &amp; scrub clips</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 5. Complete Study Guides Catalog Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {selectedCategory === 'All Guides' ? 'All Study Guides' : `${selectedCategory} Guides`}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Found {filteredGuides.length} reference guides available for in-depth analysis.
              </p>
            </div>
          </div>

          {filteredGuides.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/resources/${guide.slug}`}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-zinc-950/70 overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/80 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)]"
                >
                  {/* Top Thumbnail Section */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
                    <Image
                      src={guide.coverArt}
                      alt={guide.label}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10" />

                    {/* Badge */}
                    <div className="absolute top-2.5 left-2.5 z-20">
                      <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/15 text-white font-mono text-[9px] font-bold">
                        {guide.badge}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 z-20">
                      <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-bold text-purple-300">
                        {guide.clipCount}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex flex-col justify-between flex-1 space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400">
                        {guide.category}
                      </span>
                      <h3 className="text-base font-extrabold text-white leading-tight group-hover:text-purple-300 transition-colors line-clamp-2">
                        {guide.label}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-normal">
                        {guide.description}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs font-bold text-purple-400 group-hover:text-purple-300 border-t border-white/5">
                      <span>Launch Guide</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-zinc-900/40 rounded-3xl border border-white/10 p-8 space-y-3">
              <p className="text-base font-bold text-white">No guides found matching &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs text-zinc-400">Try searching for <em>Walk Cycle</em>, <em>Turnaround</em>, <em>Mecha</em>, or <em>Combat</em>.</p>
              <Button
                onClick={() => setSearchQuery('')}
                className="mt-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                Reset Search
              </Button>
            </div>
          )}
        </section>

        {/* 6. Studio Masterclass Callout */}
        <section className="rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-zinc-950/60 p-8 md:p-12 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> Studio-Grade Motion Analysis
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Analyze Any Reference Frame by Frame
              </h2>
              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                Load any clip into our specialized video study player. Step single frames, set A/B loops for cycles, trace motion arcs with live draw-overs, and export your study notes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button asChild className="rounded-2xl h-12 px-6 font-bold bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl cursor-pointer">
                <Link href="/frame-by-frame-player">
                  <Sliders className="h-4 w-4 mr-2 text-purple-600" /> Open Frame Player
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl h-12 px-6 font-bold border-white/20 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
                <Link href="/categories">
                  Browse Channels <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
