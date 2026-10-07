'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookmarkPlus, Film, Flame, Trophy, Upload } from 'lucide-react';
import { getPublicReferenceClips } from '@/lib/reference-service';
import { daysLeft, getActiveChallenge, rankEntries } from '@/lib/challenges';
import { CONTRIBUTION_BONUS_PER_UPLOAD } from '@/lib/plans';
import type { ReferenceClip } from '@/lib/types';

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function createdMs(value: unknown): number {
  const v = value as { toMillis?: () => number; seconds?: number } | number | undefined;
  if (typeof v === 'number') return v;
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (v && typeof v.seconds === 'number') return v.seconds * 1000;
  return 0;
}

/** Home-page community block: this month's challenge plus the most-saved community references. */
export function TrendingCommunityShelf() {
  const [clips, setClips] = useState<ReferenceClip[]>([]);
  const challenge = getActiveChallenge();

  useEffect(() => {
    getPublicReferenceClips(150).then((all) => {
      const cutoff = Date.now() - WINDOW_MS;
      const recent = all.filter((c) => createdMs(c.createdAt) >= cutoff && (c.thumbnailUrl || c.uploadedMediaUrl));
      setClips(rankEntries(recent).slice(0, 8));
    }).catch(() => setClips([]));
  }, []);

  return (
    <section className="mb-12 mt-6 space-y-6">
      {challenge && (
        <Link href={`/challenges/${challenge.slug}`} className="group flex flex-col gap-4 overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/70 via-zinc-950 to-zinc-950 p-5 transition-colors hover:border-purple-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300"><Trophy className="h-6 w-6" /></span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-purple-300">Monthly challenge · {daysLeft(challenge)} days left</p>
              <h2 className="text-xl font-black text-white">{challenge.title}: {challenge.tagline}</h2>
              <p className="text-xs text-zinc-400">Film it, upload it, win 3 months of Pro and a home-page feature.</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white group-hover:bg-purple-500">Enter <ArrowRight className="h-4 w-4" /></span>
        </Link>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/15 text-orange-300"><Flame className="h-5 w-5" /></span>
            <div>
              <h2 className="text-xl font-black text-white md:text-2xl">Trending from the community</h2>
              <p className="text-xs text-zinc-400">The references animators saved most this month.</p>
            </div>
          </div>
          <Link href="/references" className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20">
            <Upload className="h-4 w-4" />Share a reference · +{CONTRIBUTION_BONUS_PER_UPLOAD} views today
          </Link>
        </div>

        {clips.length === 0 ? (
          <Link href="/references" className="block rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400 hover:border-purple-500/40">
            Be one of the first to share: upload a reference you filmed and it shows up here for everyone.
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-4 px-1 md:grid-cols-4">
            {clips.map((clip) => (
              <Link key={clip.id} href={`/clip/${clip.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 hover:border-purple-500/40">
                <div className="relative aspect-video bg-black">
                  {clip.thumbnailUrl
                    ? <img src={clip.thumbnailUrl} alt={clip.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
                    : clip.mediaType === 'video'
                      ? <video src={`${clip.uploadedMediaUrl}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      : <div className="grid h-full place-items-center text-zinc-600"><Film className="h-6 w-6" /></div>}
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white"><BookmarkPlus className="h-3 w-3" />{clip.saveCount || 0}</span>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-white">{clip.title}</p>
                  <p className="truncate text-xs text-purple-300">@{clip.creatorUsername || clip.creatorName}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
