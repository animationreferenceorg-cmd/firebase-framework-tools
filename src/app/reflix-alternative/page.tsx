import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Film, FolderHeart, Trophy, Upload } from 'lucide-react';
import { ACCESS_LIMITS, CONTRIBUTION_BONUS_PER_UPLOAD } from '@/lib/plans';

const URL = 'https://animationreference.org/reflix-alternative';

export const metadata: Metadata = {
  title: 'Reflix Down? A Free Game Animation Reference Alternative',
  description: 'Reflix.dev is offline. Keep studying game animation reference: free unlimited boards, frame-by-frame playback, a community library you can add to, and monthly reference challenges.',
  alternates: { canonical: URL },
  openGraph: { title: 'Reflix is offline. Here’s where to keep studying.', url: URL, type: 'website' },
};

const FAQ = [
  {
    q: 'Is Reflix down?',
    a: 'Yes. Since around early October 2026, reflix.dev shows a hosting error and its video files no longer load. We are not affiliated with Reflix and don’t know if or when it will return.',
  },
  {
    q: 'Can I get my Reflix clips back here?',
    a: 'No. Reflix’s files aren’t available to anyone right now, and they weren’t ours. What you can do here is rebuild your boards: save references from our library, upload reference you filmed yourself, and organise everything into unlimited free boards.',
  },
  {
    q: 'Is it free?',
    a: `Yes. Free accounts get unlimited public boards and uploads, frame-by-frame playback, and ${ACCESS_LIMITS.free.maxUnlockedReferences} new library references a day, plus ${CONTRIBUTION_BONUS_PER_UPLOAD} extra for every reference you share. Pro removes the daily limit and adds private boards, playblast compare and downloads.`,
  },
  {
    q: 'What makes it good for game animation?',
    a: 'Frame stepping, A–B loops, onion skin and silhouette views for reading spacing and poses, side-by-side playblast compare, and a community of game and film animators sharing combat, locomotion and acting reference.',
  },
];

export default function ReflixAlternativePage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 md:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">For Reflix users</p>
      <h1 className="mt-3 text-4xl font-black leading-tight text-white md:text-6xl">Reflix is offline.<br />Keep studying here.</h1>
      <p className="mt-5 max-w-2xl text-lg text-zinc-400">
        If you used Reflix for game animation reference, you lost your library overnight. Animation Reference is a free
        place to rebuild it: a reference library with frame-by-frame study tools, unlimited boards, and a community that
        shares the reference it films.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/login?redirect=/home&source=reflix" className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500">
          Create a free account <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/categories" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 font-bold text-white hover:bg-white/5">Browse the library</Link>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-2">
        {[
          { icon: FolderHeart, title: 'Unlimited free boards', body: 'Organise reference per shot, per character or per project. No board limit on the free plan.' },
          { icon: Film, title: 'Study frame by frame', body: 'Step frames, loop a beat, check silhouettes and onion-skin spacing. Built for animators, not for scrolling.' },
          { icon: Upload, title: 'Share what you film', body: `Upload your own reference and earn ${CONTRIBUTION_BONUS_PER_UPLOAD} extra library views for every clip you share.` },
          { icon: Trophy, title: 'Monthly challenges', body: 'Film reference for a monthly theme. Winners get 3 months of Pro and a home-page feature.' },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <Icon className="h-6 w-6 text-purple-300" />
            <h2 className="mt-3 text-lg font-bold text-white">{title}</h2>
            <p className="mt-1 text-sm text-zinc-400">{body}</p>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="mb-4 text-2xl font-black text-white">Questions</h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-xl border border-white/10 bg-zinc-950 p-4 [&_summary]:cursor-pointer">
              <summary className="font-bold text-white">{f.q}</summary>
              <p className="mt-2 text-sm text-zinc-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-zinc-950 p-8 text-center">
        <h2 className="text-2xl font-black text-white">Rebuild your reference library today</h2>
        <ul className="mx-auto mt-4 inline-flex flex-col gap-1 text-left text-sm text-zinc-300">
          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" />Free forever plan, no card needed</li>
          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" />Unlimited public boards and uploads</li>
          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" />Pro from $1 for your first month</li>
        </ul>
        <div className="mt-6">
          <Link href="/login?redirect=/home&source=reflix" className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500">Get started free <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <p className="mt-4 text-xs text-zinc-500">Animation Reference is independent and not affiliated with Reflix.</p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </main>
  );
}
