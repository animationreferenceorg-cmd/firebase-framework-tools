'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Lock, Share2, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { duplicateReferenceBoard, getBoardClips, getReferenceBoard, isFollowingBoard, toggleBoardFollow } from '@/lib/reference-service';
import type { ReferenceBoard, ReferenceClip } from '@/lib/types';
import { ReferenceClipCard } from './ReferenceClipCard';

export function BoardDetailClient({ boardId }: { boardId: string }) {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [board, setBoard] = useState<ReferenceBoard | null>(null);
  const [clips, setClips] = useState<ReferenceClip[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([getReferenceBoard(boardId), getBoardClips(boardId)]).then(([b, c]) => { setBoard(b); setClips(c); if (user) isFollowingBoard(boardId, user.uid).then(setFollowing); }).finally(() => setLoading(false)); }, [boardId, user?.uid]);
  if (loading) return <div className="py-32 text-center text-zinc-500">Loading board…</div>;
  if (!board) return <div className="py-32 text-center"><h1 className="text-3xl font-bold">Board unavailable</h1><p className="mt-2 text-zinc-500">It may be private or no longer exist.</p></div>;
  const owner = user?.uid === board.ownerId;
  const follow = async () => { if (!user) return toast({ title: 'Sign in to follow boards' }); setFollowing(await toggleBoardFollow(board.id, user.uid)); };
  const duplicate = async () => { if (!userProfile) return toast({ title: 'Sign in to duplicate boards' }); const id = await duplicateReferenceBoard(board, clips, userProfile); toast({ title: 'Board duplicated', description: 'A live copy is now in your vault.' }); window.location.href = `/board/${id}`; };
  const share = () => { navigator.clipboard.writeText(location.href); toast({ title: 'Board link copied' }); };
  return <main className="mx-auto max-w-[1700px] px-4 pb-20 pt-12 md:px-8"><header className="mb-10 rounded-3xl border border-white/10 bg-gradient-to-br from-purple-950/40 to-zinc-950 p-8 md:p-10"><div className="mb-8 flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">{board.isPrivate ? <Lock className="text-amber-300" /> : <Users className="text-purple-300" />}</span><div className="flex gap-2"><Button size="icon" variant="outline" onClick={share}><Share2 className="h-4 w-4" /></Button>{!owner && !board.isPrivate && <><Button variant="outline" onClick={follow}><UserPlus className="mr-2 h-4 w-4" />{following ? 'Following' : 'Follow'}</Button><Button onClick={duplicate} className="bg-purple-600 hover:bg-purple-500"><Copy className="mr-2 h-4 w-4" />Duplicate</Button></>}</div></div><p className="text-xs font-black uppercase tracking-[.2em] text-purple-300">{board.isPrivate ? 'Private board' : 'Public playlist'}</p><h1 className="mt-2 text-4xl font-black md:text-5xl">{board.title}</h1><p className="mt-3 max-w-2xl text-zinc-400">{board.description || 'A focused collection of motion reference.'}</p><p className="mt-6 text-sm text-zinc-500">Curated by <Link href={board.ownerUsername ? `/${board.ownerUsername}` : `/u/${board.ownerId}`} className="text-purple-300 hover:underline">@{board.ownerUsername || board.ownerName}</Link> · {board.clipCount} clips · {board.followerCount} followers</p></header>{clips.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{clips.map((clip) => <ReferenceClipCard key={clip.id} clip={clip} />)}</div> : <div className="rounded-2xl border border-dashed border-white/10 py-24 text-center text-zinc-500">This board is waiting for its first clip.</div>}</main>;
}
