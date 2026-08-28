'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectMessage, CrewMember, Department, ShotStatus } from '@/lib/types';
import { MESSAGE_REACTION_EMOJIS } from '@/lib/types';
import {
  subscribeToMessages,
  sendMessage,
  toggleMessageReaction,
  linkMessageToTask,
  setMessageResolved,
  subscribeToCrew,
  createTask,
} from '@/lib/project-service';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NewTaskDialog } from './NewTaskDialog';
import { cn } from '@/lib/utils';
import { Send, SmilePlus, Reply, ListPlus, Check, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';

interface ChatTabProps {
  projectId: string;
  departments: Department[];
  isOwner: boolean;
  currentUser: { uid: string; name: string; avatar?: string };
}

export function ChatTab({ projectId, departments, currentUser }: ChatTabProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [taskSourceMessage, setTaskSourceMessage] = useState<ProjectMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const unsub = subscribeToMessages(projectId, setMessages); return unsub; }, [projectId]);
  useEffect(() => { const unsub = subscribeToCrew(projectId, setCrew); return unsub; }, [projectId]);

  const topLevel = useMemo(() => messages.filter((m) => !m.parentMessageId), [messages]);
  const repliesByParent = useMemo(() => {
    const map = new Map<string, ProjectMessage[]>();
    for (const m of messages) {
      if (!m.parentMessageId) continue;
      const arr = map.get(m.parentMessageId) ?? [];
      arr.push(m);
      map.set(m.parentMessageId, arr);
    }
    return map;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [topLevel.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setSending(true);
    try {
      await sendMessage(projectId, currentUser, trimmed);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (parentId: string) => {
    const trimmed = (replyDrafts[parentId] ?? '').trim();
    if (!trimmed) return;
    setReplyDrafts((prev) => ({ ...prev, [parentId]: '' }));
    try {
      await sendMessage(projectId, currentUser, trimmed, parentId);
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await toggleMessageReaction(projectId, messageId, emoji, currentUser.uid);
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const handleToggleResolved = async (msg: ProjectMessage) => {
    try {
      await setMessageResolved(projectId, msg.id, !msg.resolved, currentUser.name);
    } catch (err) {
      console.error('Failed to update resolved state:', err);
    }
  };

  const handleCreateTaskFromMessage = async (input: Parameters<typeof createTask>[1]) => {
    try {
      const taskId = await createTask(projectId, input);
      if (taskSourceMessage) {
        await linkMessageToTask(projectId, taskSourceMessage.id, taskId, input.title);
      }
      return taskId;
    } catch (err) {
      console.error('Failed to create task from message:', err);
      toast({ title: 'Could not create task', variant: 'destructive' });
      throw err;
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 min-h-[60vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {topLevel.length === 0 && <p className="text-sm text-zinc-500 text-center py-8">No messages yet — say hi to your crew.</p>}
        {topLevel.map((msg) => {
          const replies = repliesByParent.get(msg.id) ?? [];
          const isExpanded = expanded.has(msg.id);
          return (
            <div key={msg.id} className="py-2 border-b border-white/[0.04] last:border-b-0">
              <MessageRow
                msg={msg}
                currentUser={currentUser}
                onReact={(emoji) => handleReact(msg.id, emoji)}
                onReply={() => toggleExpanded(msg.id)}
                onCreateTask={() => setTaskSourceMessage(msg)}
                onToggleResolved={() => handleToggleResolved(msg)}
              />

              {(replies.length > 0 || isExpanded) && (
                <div className="ml-11 mt-1">
                  {replies.length > 0 && !isExpanded && (
                    <button onClick={() => toggleExpanded(msg.id)} className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 py-1">
                      <ChevronRight className="h-3 w-3" /> {replies.length} repl{replies.length === 1 ? 'y' : 'ies'}
                    </button>
                  )}
                  {isExpanded && (
                    <>
                      {replies.length > 0 && (
                        <button onClick={() => toggleExpanded(msg.id)} className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 py-1">
                          <ChevronDown className="h-3 w-3" /> {replies.length} repl{replies.length === 1 ? 'y' : 'ies'}
                        </button>
                      )}
                      <div className="space-y-2 border-l border-white/10 pl-3">
                        {replies.map((reply) => (
                          <MessageRow
                            key={reply.id}
                            msg={reply}
                            currentUser={currentUser}
                            compact
                            onReact={(emoji) => handleReact(reply.id, emoji)}
                            onCreateTask={() => setTaskSourceMessage(reply)}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          value={replyDrafts[msg.id] ?? ''}
                          onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendReply(msg.id); } }}
                          placeholder="Reply…"
                          className="flex-1 h-8 rounded-full bg-white/5 border border-white/10 px-3 text-xs text-white outline-none focus:border-purple-500/50"
                        />
                        <Button size="icon" onClick={() => handleSendReply(msg.id)} disabled={!(replyDrafts[msg.id] ?? '').trim()} className="rounded-full bg-purple-600 hover:bg-purple-500 h-8 w-8 shrink-0">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 p-3 border-t border-white/10">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Message the crew…"
          className="flex-1 h-10 rounded-full bg-white/5 border border-white/10 px-4 text-sm text-white outline-none focus:border-purple-500/50"
        />
        <Button size="icon" onClick={handleSend} disabled={!text.trim() || sending} className="rounded-full bg-purple-600 hover:bg-purple-500 h-10 w-10 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {taskSourceMessage && (
        <NewTaskDialog
          open={!!taskSourceMessage}
          onOpenChange={(o) => { if (!o) setTaskSourceMessage(null); }}
          crew={crew}
          departments={departments}
          defaultStatus={'concept' as ShotStatus}
          defaultTitle={taskSourceMessage.text.slice(0, 80)}
          onCreate={handleCreateTaskFromMessage}
        />
      )}
    </div>
  );
}

function MessageRow({ msg, currentUser, compact, onReact, onReply, onCreateTask, onToggleResolved }: {
  msg: ProjectMessage;
  currentUser: { uid: string; name: string; avatar?: string };
  compact?: boolean;
  onReact: (emoji: string) => void;
  onReply?: () => void;
  onCreateTask: () => void;
  onToggleResolved?: () => void;
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const reactionEntries = Object.entries(msg.reactions ?? {}).filter(([, ids]) => ids.length > 0);

  return (
    <div className="group flex items-start gap-2.5">
      <Avatar className={compact ? 'h-6 w-6 shrink-0' : 'h-8 w-8 shrink-0'}>
        <AvatarImage src={msg.senderAvatar} />
        <AvatarFallback className={compact ? 'text-[9px]' : 'text-[10px]'}>{msg.senderName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn('font-medium text-white', compact ? 'text-xs' : 'text-sm')}>{msg.senderName}</span>
          {msg.resolved && (
            <span className="flex items-center gap-1 text-[10px] text-green-400"><CheckCircle2 className="h-3 w-3" /> Resolved{msg.resolvedByName ? ` by ${msg.resolvedByName}` : ''}</span>
          )}
        </div>
        <p className={cn('text-zinc-300', compact ? 'text-xs' : 'text-sm')}>{msg.text}</p>

        {msg.linkedTaskId && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200">
            <ListPlus className="h-3 w-3" /> Task: {msg.linkedTaskTitle}
          </span>
        )}

        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactionEntries.map(([emoji, ids]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className={cn(
                  'text-[11px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors',
                  ids.includes(currentUser.uid) ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                )}
              >
                {emoji} {ids.length}
              </button>
            ))}
          </div>
        )}

        <div className="relative inline-block">
          <div className="hidden group-hover:flex items-center gap-0.5 mt-1 -ml-1">
            <button onClick={() => setShowReactionPicker((v) => !v)} className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-white" title="React">
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
            {onReply && (
              <button onClick={onReply} className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-white" title="Reply">
                <Reply className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={onCreateTask} className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-white" title="Create Task">
              <ListPlus className="h-3.5 w-3.5" />
            </button>
            {onToggleResolved && (
              <button onClick={onToggleResolved} className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-white" title={msg.resolved ? 'Mark unresolved' : 'Mark resolved'}>
                <Check className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {showReactionPicker && (
            <div className="absolute z-10 top-full left-0 mt-1 flex items-center gap-1 bg-[#0d0b19] border border-white/10 rounded-full px-2 py-1.5 shadow-xl">
              {MESSAGE_REACTION_EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => { onReact(emoji); setShowReactionPicker(false); }} className="text-base hover:scale-125 transition-transform">
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
