'use client';

import { FormEvent, useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Loader2, MessageCircle, Pencil, Send, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';

type Comment = { id: string; userId: string; authorName: string; authorAvatar?: string | null; body: string };

export function PortfolioCommentsPanel({ itemId }: { itemId: string }) {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => onSnapshot(query(collection(db, 'portfolio_items', itemId, 'comments'), orderBy('createdAt', 'asc')), (snapshot) => {
    setComments(snapshot.docs.map((comment) => ({ id: comment.id, ...comment.data() } as Comment)));
  }, () => setComments([])), [itemId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !body.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'portfolio_items', itemId, 'comments'), {
        userId: user.uid,
        authorName: userProfile?.displayName || userProfile?.username || user.displayName || 'Animator',
        authorAvatar: userProfile?.photoURL || user.photoURL || null,
        body: body.trim().slice(0, 1000),
        createdAt: serverTimestamp(),
      });
      setBody('');
    } finally { setSending(false); }
  };

  const saveEdit = async (comment: Comment) => {
    const cleanBody = editBody.trim();
    if (!cleanBody || busyId) return;
    setBusyId(comment.id);
    try {
      await updateDoc(doc(db, 'portfolio_items', itemId, 'comments', comment.id), { body: cleanBody.slice(0, 1000), editedAt: serverTimestamp() });
      setEditingId(null);
      setEditBody('');
    } finally { setBusyId(null); }
  };

  const remove = async (comment: Comment) => {
    if (busyId || !window.confirm('Delete this comment?')) return;
    setBusyId(comment.id);
    try {
      await deleteDoc(doc(db, 'portfolio_items', itemId, 'comments', comment.id));
    } finally { setBusyId(null); }
  };

  return <section className="border-t border-white/10 pt-8">
    <div className="mb-5 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-purple-300" /><h2 className="text-xl font-black">Comments</h2><span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-400">{comments.length}</span></div>
    <div className="space-y-4">{comments.length ? comments.map((comment) => {
      const canManage = user?.uid === comment.userId || userProfile?.role === 'admin';
      const editing = editingId === comment.id;
      return <article key={comment.id} className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-purple-500/20 text-xs font-bold text-purple-200">{comment.authorAvatar ? <img src={comment.authorAvatar} alt="" className="h-full w-full object-cover" /> : comment.authorName.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1 rounded-2xl bg-white/5 px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-purple-200">{comment.authorName}</p>{canManage && <div className="flex gap-1"><button type="button" aria-label="Edit comment" onClick={() => { setEditingId(comment.id); setEditBody(comment.body); }} className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white"><Pencil className="h-3.5 w-3.5" /></button><button type="button" aria-label="Delete comment" disabled={busyId === comment.id} onClick={() => remove(comment)} className="rounded p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button></div>}</div>{editing ? <div className="mt-2 flex gap-2"><input autoFocus value={editBody} onChange={(event) => setEditBody(event.target.value)} maxLength={1000} className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-purple-400" /><Button type="button" size="sm" disabled={!editBody.trim() || busyId === comment.id} onClick={() => saveEdit(comment)} className="h-9 bg-purple-600 hover:bg-purple-500">Save</Button><button type="button" aria-label="Cancel edit" onClick={() => { setEditingId(null); setEditBody(''); }} className="rounded p-2 text-zinc-400 hover:bg-white/10"><X className="h-4 w-4" /></button></div> : <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{comment.body}</p>}</div></article>;
    }) : <p className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">Be the first to leave feedback.</p>}</div>
    <div className="mt-6">{user ? <form onSubmit={submit} className="flex gap-2"><input value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder="Leave a thoughtful comment…" className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none placeholder:text-zinc-600 focus:border-purple-400" /><Button type="submit" size="icon" disabled={!body.trim() || sending} className="h-11 w-11 shrink-0 bg-purple-600 hover:bg-purple-500">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></form> : <p className="text-sm text-zinc-400"><Link href="/login" className="font-bold text-purple-300 hover:underline">Sign in</Link> to join the conversation.</p>}</div>
  </section>;
}
