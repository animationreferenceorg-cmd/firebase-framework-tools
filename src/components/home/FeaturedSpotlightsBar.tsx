'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PopOutFeature {
  id: 'plugins' | 'moodboards' | 'portfolio';
  href: string;
  badges: Array<{ label: string; tone: string }>;
  statBadge: string;
  title: string;
  subtitle: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
  orbClass: string;
  pattern: 'grid' | 'arcs' | 'film';
}

const POP_OUT_FEATURES: PopOutFeature[] = [
  {
    id: 'plugins',
    href: '/tools',
    badges: [
      { label: 'FREE PLUGIN', tone: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/35' },
      { label: 'MAYA & BLENDER', tone: 'bg-white/10 text-zinc-100 border-white/15' },
    ],
    statBadge: '⚡ 60 FPS',
    title: 'Maya & Blender Studio Plugins',
    subtitle: 'Drop synced references straight to (0,0,0)',
    bgClass: 'from-[#101933] via-[#13122b] to-[#0b0916]',
    borderClass: 'border-cyan-400/25 group-hover:border-cyan-400/70',
    glowClass: 'hover:shadow-[0_22px_50px_-14px_rgba(56,189,248,0.42)]',
    orbClass: 'bg-cyan-500/25',
    pattern: 'grid',
  },
  {
    id: 'moodboards',
    href: '/moodboard',
    badges: [
      { label: 'PRO SYNC', tone: 'bg-violet-500/25 text-violet-200 border-violet-400/40' },
      { label: 'MOODBOARDS', tone: 'bg-white/10 text-zinc-100 border-white/15' },
    ],
    statBadge: '🎬 Unlimited',
    title: 'Visual Moodboards & Frame Study',
    subtitle: 'Organize shots & sync live to your 3D scene',
    bgClass: 'from-[#20123a] via-[#16102c] to-[#0b0916]',
    borderClass: 'border-violet-400/30 group-hover:border-violet-400/75',
    glowClass: 'hover:shadow-[0_22px_50px_-14px_rgba(139,92,246,0.5)]',
    orbClass: 'bg-fuchsia-500/25',
    pattern: 'arcs',
  },
  {
    id: 'portfolio',
    href: '/feed',
    badges: [
      { label: 'COMMUNITY', tone: 'bg-amber-400/20 text-amber-200 border-amber-400/35' },
      { label: 'PORTFOLIOS', tone: 'bg-white/10 text-zinc-100 border-white/15' },
    ],
    statBadge: '🔥 Reels',
    title: 'Animator Portfolios & Shot Feed',
    subtitle: 'Share playblast drafts & get discovered',
    bgClass: 'from-[#241333] via-[#191029] to-[#0b0916]',
    borderClass: 'border-amber-400/25 group-hover:border-amber-400/65',
    glowClass: 'hover:shadow-[0_22px_50px_-14px_rgba(245,158,11,0.38)]',
    orbClass: 'bg-amber-500/20',
    pattern: 'film',
  },
];

function CardBackdropPattern({ pattern }: { pattern: PopOutFeature['pattern'] }) {
  if (pattern === 'grid') {
    return (
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
        viewBox="0 0 400 180"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="ar-viewport-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M 26 0 L 0 0 0 26" fill="none" stroke="rgba(125,211,252,0.55)" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect width="400" height="180" fill="url(#ar-viewport-grid)" />
      </svg>
    );
  }
  if (pattern === 'arcs') {
    return (
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.24]"
        viewBox="0 0 400 180"
        preserveAspectRatio="none"
      >
        <path d="M -20 155 Q 140 20 390 120" fill="none" stroke="rgba(192,132,252,0.75)" strokeWidth="1.5" strokeDasharray="5 5" />
        <path d="M 20 175 Q 190 55 410 75" fill="none" stroke="rgba(232,121,249,0.55)" strokeWidth="1.2" />
        <circle cx="145" cy="72" r="3.5" fill="#e879f9" />
        <circle cx="235" cy="95" r="3" fill="#a78bfa" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
      viewBox="0 0 400 180"
      preserveAspectRatio="none"
    >
      <line x1="0" y1="150" x2="400" y2="150" stroke="rgba(251,191,36,0.55)" strokeWidth="1" />
      {Array.from({ length: 16 }).map((_, i) => (
        <line
          key={i}
          x1={i * 26 + 10}
          y1={i % 4 === 0 ? 136 : 143}
          x2={i * 26 + 10}
          y2="150"
          stroke="rgba(251,191,36,0.6)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

/**
 * Bespoke sculptural 3D-shaded vector emblem icons matched to AnimationReference.org's brand.
 */
function FeatureIllustratedIcon({ id }: { id: PopOutFeature['id'] }) {
  if (id === 'plugins') {
    return (
      <svg viewBox="0 0 220 220" className="h-full w-full overflow-visible drop-shadow-[0_18px_28px_rgba(0,0,0,0.65)]" aria-hidden>
        <defs>
          <linearGradient id="plug-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="plug-left" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2e1f5e" />
            <stop offset="100%" stopColor="#130e26" />
          </linearGradient>
          <linearGradient id="plug-right" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="plug-ring" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>

        {/* Orbiting 3D Gimbal Ring */}
        <ellipse
          cx="112"
          cy="118"
          rx="84"
          ry="34"
          transform="rotate(-18 112 118)"
          fill="none"
          stroke="url(#plug-ring)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="175 28"
          opacity="0.9"
        />

        {/* Sculpted Isometric 3D Viewport Cube */}
        <polygon points="112,48 168,80 112,112 56,80" fill="url(#plug-top)" stroke="#bae6fd" strokeWidth="1.5" strokeOpacity="0.6" />
        <polygon points="56,80 112,112 112,174 56,142" fill="url(#plug-left)" stroke="#7c3aed" strokeWidth="1.5" strokeOpacity="0.5" />
        <polygon points="168,80 112,112 112,174 168,142" fill="url(#plug-right)" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5" />

        {/* Glowing Play Triangle Embedded on Right Face */}
        <polygon points="130,118 152,124 132,144" fill="#38bdf8" opacity="0.95" />

        {/* 3D Transform Gizmo Axis Arrows (Y Up, X Right, Z Left) */}
        <line x1="112" y1="68" x2="112" y2="22" stroke="#34d399" strokeWidth="4.5" strokeLinecap="round" />
        <polygon points="112,12 104,28 120,28" fill="#34d399" />

        <line x1="158" y1="138" x2="196" y2="156" stroke="#f43f5e" strokeWidth="4.5" strokeLinecap="round" />
        <polygon points="205,161 190,147 185,161" fill="#f43f5e" />

        <line x1="66" y1="138" x2="28" y2="156" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
        <polygon points="19,161 39,161 34,147" fill="#38bdf8" />

        {/* Floating Keyframe Diamond Spark */}
        <rect x="166" y="42" width="14" height="14" rx="2.5" transform="rotate(45 173 49)" fill="#38bdf8" />
        <circle cx="52" cy="54" r="5" fill="#c084fc" />
      </svg>
    );
  }

  if (id === 'moodboards') {
    return (
      <svg viewBox="0 0 220 220" className="h-full w-full overflow-visible drop-shadow-[0_18px_28px_rgba(0,0,0,0.65)]" aria-hidden>
        <defs>
          <linearGradient id="mb-card1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#311d5c" />
            <stop offset="100%" stopColor="#140d29" />
          </linearGradient>
          <linearGradient id="mb-card2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#1e1138" />
          </linearGradient>
          <linearGradient id="mb-card3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="55%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
          <linearGradient id="mb-arc" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>

        {/* Back Fanned Storyboard Frame */}
        <g transform="rotate(-14 110 120)">
          <rect x="44" y="46" width="116" height="84" rx="14" fill="url(#mb-card1)" stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.6" />
          <rect x="56" y="60" width="54" height="10" rx="5" fill="#a78bfa" opacity="0.35" />
        </g>

        {/* Middle Fanned Storyboard Frame */}
        <g transform="rotate(8 118 118)">
          <rect x="64" y="54" width="118" height="86" rx="14" fill="url(#mb-card2)" stroke="#c084fc" strokeWidth="2" strokeOpacity="0.7" />
          <circle cx="96" cy="96" r="16" fill="#e879f9" opacity="0.3" />
          <rect x="122" y="84" width="44" height="8" rx="4" fill="#f5d0fe" opacity="0.4" />
          <rect x="122" y="98" width="32" height="8" rx="4" fill="#c084fc" opacity="0.3" />
        </g>

        {/* Front Glass Hero Keyframe Card */}
        <g transform="rotate(-3 108 134)">
          <rect x="46" y="86" width="126" height="90" rx="16" fill="url(#mb-card3)" stroke="#f5d0fe" strokeWidth="2" strokeOpacity="0.75" />
          <rect x="56" y="96" width="106" height="54" rx="10" fill="#120b24" fillOpacity="0.65" />
          {/* Playhead & Motion Arc Inside Frame */}
          <path d="M 68 138 Q 108 98 150 128" fill="none" stroke="url(#mb-arc)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="108" cy="113" r="6" fill="#ffffff" />
          <rect x="64" y="159" width="90" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.3" />
          <rect x="64" y="159" width="48" height="5" rx="2.5" fill="#ffffff" />
        </g>

        {/* Floating Keyframe Diamonds Popping Out Above */}
        <rect x="150" y="28" width="18" height="18" rx="3.5" transform="rotate(45 159 37)" fill="#f472b6" stroke="#fdf4ff" strokeWidth="1.5" />
        <rect x="52" y="26" width="12" height="12" rx="2.5" transform="rotate(45 58 32)" fill="#38bdf8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 220" className="h-full w-full overflow-visible drop-shadow-[0_18px_28px_rgba(0,0,0,0.65)]" aria-hidden>
      <defs>
        <linearGradient id="pf-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2c194f" />
          <stop offset="100%" stopColor="#120c24" />
        </linearGradient>
        <linearGradient id="pf-top" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="55%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="pf-play" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* Tilted Cinema Clapper Top Arm (Popping Out!) */}
      <g transform="rotate(-18 52 78)">
        <rect x="44" y="54" width="136" height="24" rx="7" fill="url(#pf-top)" stroke="#fde68a" strokeWidth="1.5" strokeOpacity="0.65" />
        <polygon points="64,54 78,54 68,78 54,78" fill="#140d26" opacity="0.65" />
        <polygon points="98,54 112,54 102,78 88,78" fill="#140d26" opacity="0.65" />
        <polygon points="132,54 146,54 136,78 122,78" fill="#140d26" opacity="0.65" />
      </g>

      {/* Main Sculpted Obsidian Clapperboard Slate */}
      <rect x="44" y="84" width="136" height="98" rx="16" fill="url(#pf-body)" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.55" />
      <rect x="54" y="96" width="116" height="62" rx="10" fill="#0b0816" stroke="#a855f7" strokeWidth="1.2" strokeOpacity="0.4" />

      {/* Glowing 3D Play Crystal Centerpiece */}
      <polygon points="98,110 136,127 98,144" fill="url(#pf-play)" stroke="#fef3c7" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Bottom Timecode / Take Bar */}
      <rect x="58" y="167" width="44" height="6" rx="3" fill="#f59e0b" opacity="0.8" />
      <rect x="110" y="167" width="56" height="6" rx="3" fill="#a78bfa" opacity="0.35" />

      {/* Floating Star & Sparkle Accents */}
      <path d="M 176 28 L 180 39 L 191 43 L 180 47 L 176 58 L 172 47 L 161 43 L 172 39 Z" fill="#fbbf24" />
      <circle cx="44" cy="40" r="5" fill="#e879f9" />
    </svg>
  );
}

export function FeaturedSpotlightsBar() {
  return (
    <section aria-label="Featured Platform Highlights" className="space-y-3 pt-2">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm sm:text-base font-black uppercase tracking-[0.14em] text-white">
            Featured Tools &amp; Community
          </h2>
        </div>
        <Link
          href="/tools"
          className="inline-flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-violet-300 transition-colors"
        >
          <span>See all tools</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Brand-Matched Studio Pop-Out Illustrated Icon Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-6">
        {POP_OUT_FEATURES.map((feat) => (
          <Link
            key={feat.id}
            href={feat.href}
            className={cn(
              'group relative block rounded-2xl overflow-visible transition-all duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400',
              feat.glowClass
            )}
          >
            {/* Rich Brand Obsidian-Violet Card Surface */}
            <div
              className={cn(
                'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 sm:p-6 min-h-[178px] flex flex-col justify-between shadow-2xl transition-colors duration-300',
                feat.bgClass,
                feat.borderClass
              )}
            >
              {/* Custom Studio Vector Background Pattern */}
              <CardBackdropPattern pattern={feat.pattern} />

              {/* Soft Brand Rim Light Orbs */}
              <div className={cn('pointer-events-none absolute -right-6 -top-10 h-44 w-44 rounded-full blur-3xl opacity-80', feat.orbClass)} />
              <div className="pointer-events-none absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-violet-600/20 blur-2xl" />

              {/* Top Row: Tag Pills + Stat Chip */}
              <div className="relative z-10 flex flex-wrap items-center gap-1.5 max-w-[66%] sm:max-w-[62%]">
                {feat.badges.map((b) => (
                  <span
                    key={b.label}
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm',
                      b.tone
                    )}
                  >
                    {b.label}
                  </span>
                ))}
                <span className="rounded-md bg-black/50 border border-white/15 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-md">
                  {feat.statBadge}
                </span>
              </div>

              {/* Bottom Left: Crisp Headline & Subtitle */}
              <div className="relative z-10 mt-4 max-w-[62%] space-y-1">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white leading-[1.12] group-hover:text-violet-200 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs font-medium text-zinc-300/90 line-clamp-1">
                  {feat.subtitle}
                </p>
              </div>
            </div>

            {/* Pop-Out Brand Illustrated Icon breaking ABOVE the top card edge */}
            <div className="pointer-events-none absolute -bottom-1 right-2 sm:right-3 z-20 h-[122%] w-[40%] max-w-[185px] flex items-end justify-end overflow-visible transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-[1.07]">
              <FeatureIllustratedIcon id={feat.id} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
