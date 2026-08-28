'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderPlus, Lock, Plus, Scissors, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { createReferenceBoard, getUserReferenceBoards, getUserReferenceClips } from '@/lib/reference-service';
import { isProProfile } from '@/lib/reference-utils';
import type { ReferenceBoard, ReferenceClip } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { CaptureClipDialog } from './CaptureClipDialog';
import { ReferenceClipCard } from './ReferenceClipCard';
import { ShotBreakdownBuilder } from './ShotBreakdownBuilder';
import { DirectUploadDialog } from './DirectUploadDialog';

export function VaultClient() {
  const searchParams = useSearchParams();
  const sharedUrl = searchParams.get('url') || searchParams.get('text') || '';
  const { user, loading: authLoading } = useAuth();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [boards, setBoards] = useState<ReferenceBoard[]>([]);
  const [clips, setClips] = useState<ReferenceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [privateBoard, setPrivateBoard] = useState(false);

  const load = async () => {
    if (!user) return setLoading(false);
    setLoading(true);
    try {
      const [nextBoards, nextClips] = await Promise.all([getUserReferenceBoards(user.uid, true), getUserReferenceClips(user.uid, true)]);
      setBoards(nextBoards); setClips(nextClips);
    } catch {
      setBoards([]); setClips([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [user?.uid]);

  const create = async () => {
    if (!userProfile || !boardTitle.trim()) return;
    try {
      await createReferenceBoard({ owner: userProfile, title: boardTitle, isPrivate: privateBoard });
      setBoardTitle(''); setPrivateBoard(false); setCreateOpen(false); await load();
      toast({ title: 'Board created' });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Could not create board', description: error.message }); }
  };

  if (authLoading) return <div className="py-32 text-center text-zinc-500">Opening your vault…</div>;
  if (!user) return <div className="mx-auto mt-24 max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-10 text-center"><Lock className="mx-auto mb-4 h-9 w-9 text-purple-300" /><h1 className="text-3xl font-black">Your vault is personal</h1><p className="my-4 text-zinc-400">Sign in to create public collections, re-save clips, and unlock private project boards with Pro.</p><Button asChild><Link href="/login?redirect=/vault">Sign in</Link></Button></div>;

  return (
    <main className="mx-auto max-w-[1700px] px-4 pb-20 pt-10 md:px-8">
      <div className="mb-4 flex flex-wrap justify-end gap-2"><DirectUploadDialog onCreated={load} /><ShotBreakdownBuilder /></div>
      <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-purple-300">Personal reference library</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Your Vault</h1><p className="mt-2 text-zinc-400">Public curation is unlimited. Private NDA work stays Pro-only.</p></div><div className="flex gap-2"><CaptureClipDialog onCreated={load} initialUrl={sharedUrl} defaultOpen={Boolean(sharedUrl)} /><Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogTrigger asChild><Button variant="outline"><FolderPlus className="mr-2 h-4 w-4" />New board</Button></DialogTrigger><DialogContent className="border-white/10 bg-zinc-950 text-white"><DialogHeader><DialogTitle>Create a board</DialogTitle><DialogDescription>Build a focused, shareable motion playlist.</DialogDescription></DialogHeader><Input autoFocus value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} placeholder="Heavy Greatsword Combos" /><div className="flex items-center justify-between rounded-xl border border-white/10 p-3"><div><strong className="text-sm">Private board</strong><p className="text-xs text-zinc-500">Pro · for NDA and client work</p></div><Switch checked={privateBoard} disabled={!isProProfile(userProfile)} onCheckedChange={setPrivateBoard} /></div>{!isProProfile(userProfile) && <p className="text-xs text-amber-300">Upgrade to the $5 Pro plan to create private boards.</p>}<Button onClick={create} disabled={!boardTitle.trim()} className="bg-purple-600 hover:bg-purple-500">Create board</Button></DialogContent></Dialog></div></header>
      <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Boards</h2><span className="text-sm text-zinc-500">{boards.length} collections</span></div>{boards.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{boards.map((board) => <Link key={board.id} href={`/board/${board.id}`} className="group rounded-2xl border border-white/10 bg-zinc-950/70 p-5 transition hover:border-purple-500/40"><div className="mb-8 flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-300">{board.isPrivate ? <Lock className="h-5 w-5" /> : <Users className="h-5 w-5" />}</span><span className="text-xs text-zinc-500">{board.clipCount} clips</span></div><h3 className="text-lg font-bold group-hover:text-purple-200">{board.title}</h3><p className="mt-1 line-clamp-2 text-sm text-zinc-500">{board.description || (board.isPrivate ? 'Private project references' : 'Public, forkable playlist')}</p></Link>)}</div> : <Empty icon={<FolderPlus />} title="Create your first board" text="Organize references by shot, movement, character, or project." />}</section>
      <section className="mt-14"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Clipped by you</h2><span className="text-sm text-zinc-500">{clips.length} moments</span></div>{clips.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{clips.map((clip) => <ReferenceClipCard clip={clip} key={clip.id} onDeleted={(clipId) => setClips((current) => current.filter((item) => item.id !== clipId))} />)}</div> : <Empty icon={<Scissors />} title="Capture your first moment" text="Paste a timestamp here, or use the browser extension while you browse." />}</section>
    </main>
  );
}

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 py-16 text-center text-zinc-500"><span className="mb-3 text-purple-400">{icon}</span><strong className="text-white">{title}</strong><span className="mt-1 text-sm">{text}</span></div>; }
