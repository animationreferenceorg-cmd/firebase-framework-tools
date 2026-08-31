'use client';

import { FormEvent, useEffect, useState } from 'react';
import { collection, doc, increment, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';

type PortfolioComment = {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar?: string | null;
  body: string;
  createdAt?: { toDate?: () => Date };
};

export function PortfolioCommentsDialog({ itemId, title, open, onOpenChange }: { itemId: string; title: string; open: boolean; onOpenChange(open: boolean): void }) {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const [comments, setComments] = useState<PortfolioComment[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    return onSnapshot(
      query(collection(db, 'portfolio_items', itemId, 'comments'), orderBy('createdAt', 'asc')),
      (snapshot) => setComments(snapshot.docs.map((comment) => ({ id: comment.id, ...comment.data() } as PortfolioComment))),
      () => setComments([]),
    );
  }, [itemId, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!user || !cleanBody || sending) return;
    setSending(true);
    try {
      const commentRef = doc(collection(db, 'portfolio_items', itemId, 'comments'));
      const batch = writeBatch(db);
      batch.set(commentRef, {
        userId: user.uid,
        authorName: userProfile?.displayName || userProfile?.username || user.displayName || 'Animator',
        authorAvatar: userProfile?.photoURL || user.photoURL || null,
        body: cleanBody.slice(0, 1000),
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'portfolio_items', itemId), {
        commentsCount: increment(1),
      });
      await batch.commit();
      setBody('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#0b0911] p-0 text-white">
        <DialogHeader className="border-b border-white/10 px-6 pb-5 pt-7 pr-16 md:px-12">
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription className="line-clamp-1 text-zinc-400">{title}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-8 md:px-12">
          {comments.length ? comments.map((comment) => (
            <article key={comment.id} className="flex gap-3">
              {comment.authorAvatar ? <img src={comment.authorAvatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-200">{comment.authorName.slice(0, 1).toUpperCase()}</span>}
              <div className="min-w-0 rounded-2xl bg-white/5 px-3 py-2">
                <p className="text-xs font-bold text-purple-200">{comment.authorName}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{comment.body}</p>
              </div>
            </article>
          )) : <div className="grid place-items-center gap-2 py-12 text-center text-sm text-zinc-500"><MessageCircle className="h-6 w-6" />Be the first to leave feedback.</div>}
        </div>
        <div className="border-t border-white/10 bg-[#0b0911]/95 px-6 py-5 backdrop-blur md:px-12">
          {user ? <form onSubmit={submit} className="flex gap-2"><input value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder="Add a thoughtful comment…" className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-zinc-600 focus:border-purple-400" /><Button type="submit" size="icon" disabled={!body.trim() || sending} className="shrink-0 bg-purple-600 hover:bg-purple-500">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></form> : <p className="text-center text-sm text-zinc-400"><Link href="/login" className="font-bold text-purple-300 hover:underline">Sign in</Link> to join the conversation.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
