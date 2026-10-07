import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Trophy } from 'lucide-react';
import { CHALLENGES, challengeStatus, daysLeft, getActiveChallenge } from '@/lib/challenges';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Monthly Animation Reference Challenges',
  description: 'Every month, animators film and share reference for one theme. Enter with your own reference, vote by saving your favourites, and win Pro and a home-page feature.',
  alternates: { canonical: 'https://animationreference.org/challenges' },
};

export default function ChallengesPage() {
  const now = new Date();
  const active = getActiveChallenge(now);
  const others = CHALLENGES.filter((c) => c.slug !== active?.slug)
    .sort((a, b) => (a.month < b.month ? 1 : -1));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 md:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">Monthly challenge</p>
      <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">Shoot it. Share it. Get seen.</h1>
      <p className="mt-4 max-w-2xl text-zinc-400">
        One theme a month. Film your own reference, upload it, and the community votes by saving the entries they&apos;d
        actually use. The top three win <strong className="text-white">3 months of Pro</strong> and a spot on the home page.
        Everyone who enters 3+ references earns a contributor badge and extra daily library views.
      </p>

      {active && (
        <Link href={`/challenges/${active.slug}`} className="group mt-10 block overflow-hidden rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-950/60 via-zinc-950 to-zinc-950 p-8 transition-colors hover:border-purple-400">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Open now · {daysLeft(active, now)} days left
          </span>
          <h2 className="mt-4 text-3xl font-black text-white md:text-4xl">{active.title}</h2>
          <p className="mt-2 text-lg text-purple-200">{active.tagline}</p>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">{active.brief}</p>
          <span className="mt-6 inline-flex items-center gap-2 font-bold text-white">See entries &amp; enter <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
        </Link>
      )}

      <h2 className="mt-14 mb-4 text-xl font-bold text-white">All challenges</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {others.map((c) => {
          const status = challengeStatus(c, now);
          return (
            <Link key={c.slug} href={`/challenges/${c.slug}`} className="rounded-2xl border border-white/10 bg-zinc-950 p-5 transition-colors hover:border-purple-500/40">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                {status === 'ended' ? <Trophy className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                {status === 'ended' ? 'Ended · see winners' : `Starts ${new Date(`${c.month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`}
              </div>
              <h3 className="mt-2 text-lg font-black text-white">{c.title}</h3>
              <p className="text-sm text-zinc-400">{c.tagline}</p>
            </Link>
          );
        })}
      </div>

      <section className="mt-14 rounded-2xl border border-white/10 bg-zinc-950 p-6 text-sm text-zinc-400">
        <h2 className="mb-2 font-bold text-white">Rules</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Enter reference you filmed or made yourself, or have permission to share. Clips cut from films, shows or games can&apos;t win.</li>
          <li>Entries are public and stay in the community library with your name on them.</li>
          <li>Voting is saving: the entries saved to the most boards by the end of the month win.</li>
          <li>Prizes: 3 months of Pro for the top three, plus a home-page feature. We may disqualify entries that break the <Link href="/terms" className="text-purple-300 underline">Terms</Link>.</li>
        </ul>
      </section>
    </main>
  );
}
