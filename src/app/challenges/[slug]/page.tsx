import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { ChallengeEntries } from '@/components/challenges/ChallengeEntries';
import { challengeStatus, daysLeft, getChallenge } from '@/lib/challenges';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const challenge = getChallenge((await params).slug);
  if (!challenge) return { title: 'Challenge not found', robots: { index: false } };
  return {
    title: `${challenge.title} — Animation Reference Challenge`,
    description: `${challenge.tagline} ${challenge.brief}`,
    alternates: { canonical: `https://animationreference.org/challenges/${challenge.slug}` },
  };
}

export default async function ChallengePage({ params }: Props) {
  const challenge = getChallenge((await params).slug);
  if (!challenge) notFound();
  const now = new Date();
  const status = challengeStatus(challenge, now);
  const monthLabel = new Date(`${challenge.month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8">
      <Link href="/challenges" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" />All challenges</Link>
      <div className="mt-6 rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/50 via-zinc-950 to-zinc-950 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
          {monthLabel} challenge · {status === 'active' ? `${daysLeft(challenge, now)} days left` : status === 'ended' ? 'Ended' : 'Coming soon'}
        </p>
        <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">{challenge.title}</h1>
        <p className="mt-2 text-lg text-purple-200">{challenge.tagline}</p>
        <p className="mt-4 max-w-2xl text-zinc-300">{challenge.brief}</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><Lightbulb className="h-4 w-4 text-amber-300" />Ideas</p>
          <ul className="grid gap-1 text-sm text-zinc-400 sm:grid-cols-2">
            {challenge.ideas.map((idea) => <li key={idea}>• {idea}</li>)}
          </ul>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Vote by saving entries to your boards. Top three by saves win 3 months of Pro and a home-page feature.
          Enter reference you filmed or made yourself. <Link href="/challenges" className="text-purple-300 underline">Full rules</Link>
        </p>
      </div>

      {status === 'upcoming'
        ? <p className="mt-10 rounded-2xl border border-dashed border-white/15 p-10 text-center text-zinc-400">Entries open on the 1st of {monthLabel}. Start planning your shoot!</p>
        : <ChallengeEntries challenge={challenge} status={status} />}
    </main>
  );
}
