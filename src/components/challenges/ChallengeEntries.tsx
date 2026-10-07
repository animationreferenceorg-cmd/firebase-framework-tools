'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { BookmarkPlus, Crown, Film } from 'lucide-react';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { DirectUploadDialog } from '@/components/reference/DirectUploadDialog';
import { SaveClipToBoardDialog } from '@/components/reference/SaveClipToBoardDialog';
import { rankEntries, type Challenge } from '@/lib/challenges';
import type { ReferenceClip } from '@/lib/types';

/** Entries for one challenge, ranked by votes (saves). */
export function ChallengeEntries({ challenge, status }: { challenge: Challenge; status: 'upcoming' | 'active' | 'ended' }) {
  const [entries, setEntries] = useState<ReferenceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [voteClip, setVoteClip] = useState<ReferenceClip | null>(null);

  const load = useCallback(async () => {
    try {
      // The rules only let other users list public clips, so the query must say so.
      const snap = await getDocs(query(collection(db, 'reference_clips'), where('isPrivate', '==', false), where('challengeId', '==', challenge.slug), limit(300)));
      const clips = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReferenceClip).filter((c) => !c.removedFromCreatorAt);
      setEntries(rankEntries(clips));
    } catch (error) {
      console.error('Could not load challenge entries:', error);
    } finally {
      setLoading(false);
    }
  }, [challenge.slug]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="mt-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-white">{status === 'ended' ? 'Results' : 'Entries'} <span className="text-zinc-500">({entries.length})</span></h2>
        {status === 'active' && (
          <DirectUploadDialog challenge={challenge} onCreated={load} triggerLabel="Enter the challenge" triggerClassName="border-purple-500/40 bg-purple-600 font-bold text-white hover:bg-purple-500" />
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-video animate-pulse rounded-2xl bg-white/5" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-zinc-400">
          <Film className="mx-auto mb-3 h-8 w-8 text-purple-300" />
          {status === 'active' ? 'No entries yet. Be the first: your entry gets seen by everyone who visits this month.' : 'No entries.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {entries.map((clip, index) => (
            <article key={clip.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
              <Link href={`/clip/${clip.id}`} className="relative block aspect-video bg-black">
                {clip.thumbnailUrl
                  ? <img src={clip.thumbnailUrl} alt={clip.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
                  : clip.uploadedMediaUrl && clip.mediaType === 'video'
                    ? <video src={`${clip.uploadedMediaUrl}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    : <div className="grid h-full place-items-center text-zinc-600"><Film className="h-6 w-6" /></div>}
                {status === 'ended' && index < 3 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black text-black"><Crown className="h-3 w-3" />#{index + 1}</span>
                )}
              </Link>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{clip.title}</p>
                  <Link href={clip.creatorUsername ? `/${clip.creatorUsername}` : `/u/${clip.creatorId}`} className="truncate text-xs text-purple-300 hover:underline">@{clip.creatorUsername || clip.creatorName}</Link>
                </div>
                <Button size="sm" variant="ghost" className="shrink-0 text-zinc-300 hover:text-white" onClick={() => setVoteClip(clip)} disabled={status !== 'active'} title="Save to a board to vote">
                  <BookmarkPlus className="mr-1 h-4 w-4" />{clip.saveCount || 0}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {voteClip && (
        <SaveClipToBoardDialog clip={voteClip} open={Boolean(voteClip)} onOpenChange={(open) => { if (!open) { setVoteClip(null); load(); } }} />
      )}
    </section>
  );
}
