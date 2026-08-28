'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookmarkPlus, ExternalLink, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getReferenceClip } from '@/lib/reference-service';
import type { ReferenceClip } from '@/lib/types';
import { ReferenceHomeVideoPlayer } from './ReferenceHomeVideoPlayer';
import { SaveClipToBoardDialog } from './SaveClipToBoardDialog';

export function ClipDetailClient({ clipId }: { clipId: string }) {
  const [clip, setClip] = useState<ReferenceClip | null>(null); const [loading, setLoading] = useState(true); const [saveOpen, setSaveOpen] = useState(false);
  useEffect(() => { getReferenceClip(clipId).then(setClip).finally(() => setLoading(false)); }, [clipId]);
  if (loading) return <div className="py-32 text-center text-zinc-500">Loading clip…</div>;
  if (!clip) return <div className="py-32 text-center"><h1 className="text-3xl font-bold">Clip unavailable</h1><p className="mt-2 text-zinc-500">It may be private or removed.</p></div>;
  return <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 md:px-8"><div className="aspect-video overflow-hidden rounded-2xl bg-black"><ReferenceHomeVideoPlayer clip={clip} /></div><div className="mt-7 flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div><div className="mb-3 flex flex-wrap gap-2"><Badge className="bg-purple-600">{clip.category}</Badge>{clip.isPrivate && <Badge variant="outline" className="border-amber-500/40 text-amber-200"><Lock className="mr-1 h-3 w-3" />Private</Badge>}{clip.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div><h1 className="text-3xl font-black md:text-4xl">{clip.title}</h1>{clip.sourceDescription && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{clip.sourceDescription}</p>}<div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-400">{clip.sourceAuthorName && <a href={clip.sourceAuthorUrl || clip.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-white hover:text-purple-300">{clip.sourceAuthorAvatar && <img src={clip.sourceAuthorAvatar} alt="" className="h-7 w-7 rounded-full object-cover" />}<span>Original by {clip.sourceAuthorName}</span></a>}<span>Saved by <Link href={clip.creatorUsername ? `/${clip.creatorUsername}` : `/u/${clip.creatorId}`} className="font-semibold text-purple-300 hover:underline">@{clip.creatorUsername || clip.creatorName}</Link></span></div></div><div className="flex gap-2">{clip.sourceUrl && <Button variant="outline" asChild><a href={clip.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Original source</a></Button>}<Button onClick={() => setSaveOpen(true)} className="bg-purple-600 hover:bg-purple-500"><BookmarkPlus className="mr-2 h-4 w-4" />Save to board</Button></div></div><SaveClipToBoardDialog clip={clip} open={saveOpen} onOpenChange={setSaveOpen} /></main>;
}
