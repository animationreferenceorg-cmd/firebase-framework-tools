'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { ProductionTask, CrewMember, TaskPriority, TaskComment, Department } from '@/lib/types';
import {
  updateTask,
  deleteTask,
  submitTaskForReview,
  approveTask,
  requestTaskChanges,
  subscribeToTaskComments,
  addTaskComment,
} from '@/lib/project-service';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Send, CheckCircle2, MessageCircleWarning } from 'lucide-react';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ProductionTask;
  projectId: string;
  crew: CrewMember[];
  departments: Department[];
  isOwner: boolean;
  currentUser: { uid: string; name: string; avatar?: string };
}

export function TaskDetailDialog({ open, onOpenChange, task, projectId, crew, departments, isOwner, currentUser }: TaskDetailDialogProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState(task.description ?? '');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [changesFeedback, setChangesFeedback] = useState('');
  const [showChangesInput, setShowChangesInput] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setDescription(task.description ?? ''); }, [task.id, task.description]);

  useEffect(() => {
    if (!open) return;
    const unsub = subscribeToTaskComments(projectId, task.id, setComments);
    return unsub;
  }, [open, projectId, task.id]);

  const canReview = isOwner;

  const handleFieldChange = async (field: Partial<ProductionTask>) => {
    try {
      await updateTask(projectId, task.id, field);
    } catch (err) {
      console.error('Failed to update task:', err);
      toast({ title: 'Could not update task', variant: 'destructive' });
    }
  };

  const handleAssigneeChange = (userId: string) => {
    const member = crew.find((c) => c.userId === userId);
    handleFieldChange({ assigneeId: member?.userId, assigneeName: member?.name, assigneeAvatar: member?.avatar });
  };

  const handleSubmitForReview = async () => {
    setBusy(true);
    try {
      await submitTaskForReview(projectId, task.id);
      toast({ title: 'Submitted for review' });
    } catch (err) {
      console.error('Failed to submit for review:', err);
      toast({ title: 'Could not submit', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    setBusy(true);
    try {
      await approveTask(projectId, task.id, task.status);
      toast({ title: 'Approved!' });
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to approve task:', err);
      toast({ title: 'Could not approve', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changesFeedback.trim() || busy) return;
    setBusy(true);
    try {
      await requestTaskChanges(projectId, task.id, currentUser, changesFeedback.trim());
      setChangesFeedback('');
      setShowChangesInput(false);
      toast({ title: 'Changes requested' });
    } catch (err) {
      console.error('Failed to request changes:', err);
      toast({ title: 'Could not request changes', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText('');
    try {
      await addTaskComment(projectId, task.id, currentUser, text);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask(projectId, task.id);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast({ title: 'Could not delete task', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#0d0b19] border-white/10 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleFieldChange({ description })}
              className="bg-white/5 border-white/10 min-h-16"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Priority</Label>
              <Select value={task.priority} onValueChange={(v) => handleFieldChange({ priority: v as TaskPriority })}>
                <SelectTrigger className="bg-white/5 border-white/10 capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Assignee</Label>
              <Select value={task.assigneeId ?? ''} onValueChange={handleAssigneeChange}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {crew.map((c) => <SelectItem key={c.userId} value={c.userId}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Department</Label>
              <Select value={task.departmentId ?? ''} onValueChange={(v) => handleFieldChange({ departmentId: v })}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />{d.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {task.submissionNote && (
            <div className="text-xs text-zinc-400 bg-white/5 border border-white/10 rounded-lg p-2.5">
              <span className="text-zinc-500">Submission note: </span>{task.submissionNote}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {task.reviewStatus === 'in_progress' || task.reviewStatus === 'changes_requested' ? (
              <Button size="sm" onClick={handleSubmitForReview} disabled={busy} className="bg-blue-600 hover:bg-blue-500 gap-1.5">
                <Send className="h-3.5 w-3.5" /> Submit for Review
              </Button>
            ) : task.reviewStatus === 'submitted' ? (
              <span className="text-[11px] px-2.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center gap-1.5"><Send className="h-3 w-3" /> Awaiting review</span>
            ) : (
              <span className="text-[11px] px-2.5 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-300 flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Approved</span>
            )}

            {canReview && task.reviewStatus === 'submitted' && (
              <>
                <Button size="sm" onClick={handleApprove} disabled={busy} className="bg-green-600 hover:bg-green-500 gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowChangesInput((v) => !v)} className="border-red-500/30 text-red-300 hover:bg-red-500/10 gap-1.5">
                  <MessageCircleWarning className="h-3.5 w-3.5" /> Request Changes
                </Button>
              </>
            )}

            <Button size="icon" variant="ghost" onClick={handleDelete} className="h-8 w-8 text-zinc-500 hover:text-red-400 ml-auto">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {showChangesInput && (
            <div className="flex gap-2">
              <Textarea value={changesFeedback} onChange={(e) => setChangesFeedback(e.target.value)} placeholder="What needs to change?" className="bg-white/5 border-white/10 min-h-16" />
              <Button size="sm" onClick={handleRequestChanges} disabled={!changesFeedback.trim() || busy} className="bg-red-600 hover:bg-red-500 shrink-0 self-end">Send</Button>
            </div>
          )}

          <div className="border-t border-white/10 pt-4 space-y-3">
            <Label className="text-xs text-zinc-400">Comments</Label>
            {comments.length === 0 && <p className="text-xs text-zinc-500">No comments yet.</p>}
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={c.authorAvatar} />
                  <AvatarFallback className="text-[9px]">{c.authorName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
                </Avatar>
                <div className="text-xs">
                  <span className="text-zinc-300 font-medium">{c.authorName}</span>
                  <p className="text-zinc-400 mt-0.5">{c.text}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                placeholder="Add a comment…"
                className="flex-1 h-9 rounded-full bg-white/5 border border-white/10 px-3.5 text-xs text-white outline-none focus:border-purple-500/50"
              />
              <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()} className="bg-purple-600 hover:bg-purple-500 rounded-full">Post</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
