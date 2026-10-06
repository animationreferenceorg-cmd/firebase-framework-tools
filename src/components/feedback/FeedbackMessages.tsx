'use client';

import { useEffect, useRef, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * Follow-up conversation on a feedback thread. The original message and the
 * first admin reply live on the feedback doc itself (content / response);
 * everything after that is in feedback/{id}/messages so either side can keep
 * replying. A user reply reopens the thread for the admin; an admin reply
 * sets lastAdminReplyAt, which drives the user's unread badge.
 */

export const FEEDBACK_MESSAGE_MAX = 2000;

interface FeedbackMessage {
  id: string;
  authorRole: 'user' | 'admin';
  body: string;
  createdAt?: { toDate(): Date } | null;
}

interface FeedbackMessagesProps {
  feedbackId: string;
  viewer: 'user' | 'admin';
  /** `dark` matches the user threads page; `theme` uses the app's theme tokens (admin). */
  tone?: 'dark' | 'theme';
}

export function FeedbackMessages({ feedbackId, viewer, tone = 'theme' }: FeedbackMessagesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'feedback', feedbackId, 'messages'), orderBy('createdAt', 'asc'));
    return onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FeedbackMessage)),
      (err) => console.warn('Could not load feedback replies:', err?.message || err),
    );
  }, [feedbackId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !user || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      await addDoc(collection(db, 'feedback', feedbackId, 'messages'), {
        authorId: user.uid,
        authorRole: viewer,
        body: body.slice(0, FEEDBACK_MESSAGE_MAX),
        createdAt: serverTimestamp(),
      });
      // Surface the new message to the other side.
      await updateDoc(
        doc(db, 'feedback', feedbackId),
        viewer === 'user'
          ? { status: 'new', lastUserMessageAt: serverTimestamp() }
          : { status: 'read', lastAdminReplyAt: serverTimestamp() },
      ).catch((err) => console.warn('Could not flag the thread as updated:', err));
      setDraft('');
    } catch (err) {
      console.error('Failed to send reply:', err);
      toast({ variant: 'destructive', title: 'Reply not sent', description: 'Please try again.' });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const dark = tone === 'dark';

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const fromViewer = m.authorRole === viewer;
        const label = m.authorRole === 'admin' ? 'Animation Reference' : viewer === 'user' ? 'You' : 'User';
        return (
          <div key={m.id} className={cn('flex', fromViewer ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words',
                dark
                  ? m.authorRole === 'admin'
                    ? 'border border-purple-500/30 bg-purple-950/40 text-purple-100'
                    : 'border border-white/10 bg-white/5 text-zinc-200'
                  : m.authorRole === 'admin'
                    ? 'border border-primary/30 bg-primary/10'
                    : 'border border-border bg-muted/50',
              )}
            >
              <p className={cn('mb-1 text-[11px] font-semibold', dark ? 'text-zinc-400' : 'text-muted-foreground')}>
                {label}
                {m.createdAt?.toDate && <span className="font-normal"> · {format(m.createdAt.toDate(), 'MMM d, h:mm a')}</span>}
              </p>
              {m.body}
            </div>
          </div>
        );
      })}

      <div className="flex items-end gap-2">
        <textarea
          aria-label={viewer === 'admin' ? 'Reply as Animation Reference' : 'Reply to this thread'}
          placeholder={viewer === 'admin' ? 'Reply as Animation Reference…' : 'Add a reply…'}
          value={draft}
          maxLength={FEEDBACK_MESSAGE_MAX}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          className={cn(
            'min-h-[44px] flex-1 resize-y rounded-xl px-3 py-2 text-sm outline-none',
            dark
              ? 'border border-white/10 bg-black/30 text-white placeholder:text-zinc-500 focus:border-purple-400'
              : 'border border-input bg-background focus:border-primary',
          )}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !draft.trim()}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-40',
            dark ? 'bg-purple-600 text-white hover:bg-purple-500' : 'bg-primary text-primary-foreground hover:opacity-90',
          )}
        >
          <Send className="h-4 w-4" />
          {sending ? 'Sending…' : 'Reply'}
        </button>
      </div>
    </div>
  );
}
