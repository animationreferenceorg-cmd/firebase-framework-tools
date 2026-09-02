'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutGrid, Paintbrush, Scissors, Sparkles, UserPlus } from 'lucide-react';

const launches = [
  {
    title: 'Paint',
    badge: 'Beta',
    eyebrow: 'Draw, time, and compare',
    description: 'Sketch with layers and custom brushes, build timed panels, use onion skinning, bring in references, and export your work.',
    href: '/paint',
    image: 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/site-assets%2Fhome-launch%2Fpaint-workspace.webp?alt=media&token=18697b50-a12e-4952-82c5-ca10c4a31b75',
    icon: Paintbrush,
    accent: 'from-fuchsia-500/25 to-purple-500/5',
  },
  {
    title: 'Reference Clips',
    eyebrow: 'Find and save the exact moment',
    description: 'Clip precise timestamps from the web or upload your own media, then search and organize motion references in one shared vault.',
    href: '/references',
    image: 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/site-assets%2Fhome-launch%2Freference-vault.webp?alt=media&token=a077e8f9-941e-43a3-b42a-db85ecd6d1ec',
    icon: Scissors,
    accent: 'from-violet-500/30 to-fuchsia-500/5',
  },
  {
    title: 'Free Portfolio Submissions',
    eyebrow: 'Show your work at no cost',
    description: 'Create a free animator profile, submit portfolio work and reels, and get discovered by studios and the community.',
    href: '/profile?tab=portfolio',
    image: 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/site-assets%2Fhome-launch%2Fportfolio-page.webp?alt=media&token=16cbe9f9-a5b6-42cb-989e-6c173b2ab8e7',
    icon: UserPlus,
    accent: 'from-pink-500/25 to-purple-500/5',
  },
  {
    title: 'Updated Boards',
    eyebrow: 'Organize references visually',
    description: 'Create focused boards, file saved clips, search your collection, and arrange references on a dedicated canvas.',
    href: '/moodboard',
    image: 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/site-assets%2Fhome-launch%2Fupdated-boards.webp?alt=media&token=df1b3e9f-e06a-4d03-95a9-9b584d7d06f6',
    icon: LayoutGrid,
    accent: 'from-amber-500/20 to-violet-500/5',
  },
];

function LaunchCardImage({ launch }: { launch: typeof launches[number] }) {
  const [hasError, setHasError] = useState(false);
  const Icon = launch.icon;

  if (hasError) {
    return (
      <div className={`h-full w-full flex items-center justify-center bg-gradient-to-tr ${launch.accent} bg-zinc-900`}>
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-zinc-300">{launch.title} Preview</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={launch.image}
      alt={`${launch.title} workspace preview`}
      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
      onError={() => setHasError(true)}
    />
  );
}

export function HomeProductLaunchAnnouncement() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-purple-400/20 bg-[#0b0912] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.55)] sm:p-7 lg:p-9">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(147,51,234,0.22),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.12),transparent_38%)]" />

      <div className="relative mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-purple-200">
            <Sparkles className="h-3.5 w-3.5" />
            New creative tools
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            Save it. Share it. Shape the idea.
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
            Collect exact motion moments, submit your portfolio for free, and turn saved inspiration into organized visual boards.
          </p>
        </div>

        <Link
          href="/references"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-zinc-950 transition-transform hover:scale-[1.03]"
        >
          Explore what&apos;s new
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative -mx-5 flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
        {launches.map((launch) => {
          const Icon = launch.icon;
          return (
            <Link
              key={launch.title}
              href={launch.href}
              className="group w-[82vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-black/35 transition-all duration-300 hover:-translate-y-1 hover:border-purple-400/40 hover:shadow-[0_18px_50px_rgba(88,28,135,0.22)] sm:w-auto sm:max-w-none"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-zinc-950">
                <LaunchCardImage launch={launch} />
                <div className={`absolute inset-0 bg-gradient-to-t ${launch.accent} via-transparent to-transparent pointer-events-none`} />
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-xl border border-white/10 bg-white/[0.06] p-2 text-purple-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white">{launch.title}</h3>
                        {'badge' in launch && launch.badge && (
                          <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-fuchsia-200">
                            {launch.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300">{launch.eyebrow}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition-all group-hover:translate-x-1 group-hover:text-white" />
                </div>
                <p className="text-xs font-medium leading-relaxed text-zinc-400">{launch.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
