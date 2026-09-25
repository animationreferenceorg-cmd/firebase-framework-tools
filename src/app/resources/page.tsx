import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Animation Reference Guides | Animation Reference',
  description: 'Practical animation reference guides for walk cycles, run cycles, body mechanics, combat, facial acting, timing, and effects.',
  alternates: { canonical: 'https://animationreference.org/resources' },
};

const guides = [
  ['Walk cycle animation reference', '/resources/walk-cycle-animation-reference'],
  ['Run cycle animation reference', '/resources/run-cycle-animation-reference'],
  ['Punch animation reference', '/resources/punch-animation-reference'],
  ['Facial acting animation reference', '/resources/facial-acting-animation-reference'],
  ['Body mechanics animation reference', '/resources/body-mechanics-animation-reference'],
  ['Creature locomotion animation reference', '/resources/creature-locomotion-animation-reference'],
  ['Animation timing and spacing reference', '/resources/animation-timing-and-spacing-reference'],
  ['FX animation reference', '/resources/fx-animation-reference'],
  ['Combat animation reference', '/resources/combat-animation-reference'],
  ['Locomotion animation reference', '/resources/locomotion-animation-reference'],
  ['How to analyze animation reference', '/resources/how-to-analyze-animation-reference'],
];

export default function ResourcesIndexPage() {
  return <main className="container mx-auto max-w-5xl px-4 py-12 md:px-8"><header className="mb-12 max-w-3xl"><p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-purple-300">Learn by studying</p><h1 className="mb-5 text-4xl font-black tracking-tight md:text-6xl">Animation Reference Guides</h1><p className="text-lg leading-relaxed text-muted-foreground">Practical guides for studying timing, spacing, posing, weight, acting, and movement. Each guide connects the ideas to reference clips you can scrub frame by frame.</p></header><div className="grid gap-4 sm:grid-cols-2">{guides.map(([label, href]) => <Link key={href} href={href} className="rounded-2xl border border-border bg-card p-6 text-lg font-bold hover:border-primary/50">{label}<span className="ml-2 text-primary" aria-hidden="true">→</span></Link>)}</div></main>;
}
