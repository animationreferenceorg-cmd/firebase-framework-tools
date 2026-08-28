'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Layers3 } from 'lucide-react';
import { getUserReferenceBoards } from '@/lib/reference-service';
import type { ReferenceBoard } from '@/lib/types';

export function PublicBoardsRail({ userId }: { userId: string }) {
  const [boards, setBoards] = useState<ReferenceBoard[]>([]);
  useEffect(() => { if (userId) getUserReferenceBoards(userId, false).then(setBoards).catch(() => setBoards([])); }, [userId]);
  if (!boards.length) return null;
  return <section className="rounded-3xl border border-white/10 bg-black/30 p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-purple-300">Curated reference</p><h2 className="mt-1 text-2xl font-black">Public boards</h2></div><span className="text-xs text-zinc-500">Follow or duplicate any playlist</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{boards.slice(0, 6).map((board) => <Link href={`/board/${board.id}`} key={board.id} className="group rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-purple-500/50"><div className="flex items-start justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-500/10 text-purple-300"><Layers3 className="h-4 w-4" /></span><ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-purple-300" /></div><h3 className="mt-5 font-bold">{board.title}</h3><p className="mt-1 text-xs text-zinc-500">{board.clipCount} clips · {board.followerCount} followers</p></Link>)}</div></section>;
}
