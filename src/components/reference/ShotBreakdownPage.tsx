'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactPlayer from 'react-player';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReferenceClip, getShotBreakdown } from '@/lib/reference-service';
import type { ReferenceClip, ShotBreakdown } from '@/lib/types';
import { ReferenceClipPlayer } from './ReferenceClipPlayer';

export function ShotBreakdownPage({ ownerId, slug }: { ownerId: string; slug: string }) {
  const [breakdown, setBreakdown] = useState<ShotBreakdown | null>(null); const [clip, setClip] = useState<ReferenceClip | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { getShotBreakdown(ownerId, slug).then(async (item) => { setBreakdown(item); if (item) setClip(await getReferenceClip(item.referenceClipId)); }).finally(() => setLoading(false)); }, [ownerId, slug]);
  if (loading) return <div className="py-32 text-center text-zinc-500">Loading breakdown…</div>;
  if (!breakdown || !clip) return <div className="py-32 text-center"><h1 className="text-3xl font-bold">Breakdown not found</h1></div>;
  return <main className="mx-auto max-w-[1600px] px-4 pb-24 pt-10 md:px-8"><Button variant="ghost" asChild className="mb-7"><Link href={breakdown.ownerUsername ? `/${breakdown.ownerUsername}` : `/u/${breakdown.ownerId}`}><ArrowLeft className="mr-2 h-4 w-4" />{breakdown.ownerName}'s portfolio</Link></Button><header className="mb-9"><p className="text-xs font-black uppercase tracking-[.2em] text-purple-300">Reference → finished shot</p><h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">{breakdown.title}</h1></header><div className="grid gap-5 lg:grid-cols-2"><section><div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Original reference</h2><a href={clip.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-500 hover:text-white">Source <ExternalLink className="inline h-3 w-3" /></a></div><ReferenceClipPlayer clip={clip} /></section><section><h2 className="mb-2 font-bold">Finished animation</h2><div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black"><ReactPlayer url={breakdown.finishedMediaUrl} controls width="100%" height="100%" /></div></section></div><section className="mt-10 grid gap-6 rounded-3xl border border-white/10 bg-zinc-950/70 p-7 md:grid-cols-[220px_1fr] md:p-10"><div><p className="text-xs font-black uppercase tracking-[.18em] text-purple-300">Animator notes</p><h2 className="mt-2 text-2xl font-black">Decisions behind the shot</h2></div><div className="whitespace-pre-wrap leading-7 text-zinc-300">{breakdown.notes}</div></section><footer className="mt-8 text-sm text-zinc-500">Breakdown by <Link className="text-purple-300 hover:underline" href={breakdown.ownerUsername ? `/${breakdown.ownerUsername}` : `/u/${breakdown.ownerId}`}>@{breakdown.ownerUsername || breakdown.ownerName}</Link></footer></main>;
}
