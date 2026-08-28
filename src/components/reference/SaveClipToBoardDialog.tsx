'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, FolderPlus, Loader2, Lock, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { createReferenceBoard, getUserReferenceBoards, saveClipToBoard } from '@/lib/reference-service';
import type { ReferenceBoard, ReferenceClip } from '@/lib/types';

export function SaveClipToBoardDialog({ clip, open, onOpenChange }: { clip: ReferenceClip; open: boolean; onOpenChange(open: boolean): void }) {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [boards, setBoards] = useState<ReferenceBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    getUserReferenceBoards(user.uid, true).then(setBoards).finally(() => setLoading(false));
  }, [open, user]);

  const save = async (board: ReferenceBoard) => {
    if (!user) return;
    if (board.isPrivate !== clip.isPrivate) {
      toast({ variant: 'destructive', title: 'Privacy mismatch', description: `Save ${clip.isPrivate ? 'private' : 'public'} clips to a matching board.` });
      return;
    }
    try {
      await saveClipToBoard(clip.id, board.id, user.uid);
      toast({ title: `Saved to ${board.title}` });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not save clip', description: error.message });
    }
  };

  const createAndSave = async () => {
    if (!userProfile || !title.trim()) return;
    setLoading(true);
    try {
      const boardId = await createReferenceBoard({ owner: userProfile, title, isPrivate: clip.isPrivate });
      await saveClipToBoard(clip.id, boardId, userProfile.uid);
      toast({ title: 'Board created', description: `${clip.title} was saved to ${title}.` });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not create board', description: error.message });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-md">
        <DialogHeader><DialogTitle>Save to my vault</DialogTitle><DialogDescription>Re-save this clip without copying the source video.</DialogDescription></DialogHeader>
        {!user ? <Button asChild><Link href="/login">Sign in to save</Link></Button> : (
          <>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {loading && boards.length === 0 ? <div className="py-8 grid place-items-center"><Loader2 className="animate-spin" /></div> : boards.map((board) => (
                <button key={board.id} onClick={() => save(board)} className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-purple-500/60">
                  <span className="flex items-center gap-2 font-semibold">{board.isPrivate && <Lock className="h-3.5 w-3.5 text-amber-300" />}{board.title}</span><Plus className="h-4 w-4" />
                </button>
              ))}
            </div>
            <div className="flex gap-2 border-t border-white/10 pt-4"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New board name" /><Button onClick={createAndSave} disabled={loading || !title.trim()}><FolderPlus className="mr-2 h-4 w-4" />Create</Button></div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
