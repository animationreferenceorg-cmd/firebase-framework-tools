'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CrewMember, TaskPriority, ShotStatus, Department } from '@/lib/types';

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crew: CrewMember[];
  departments: Department[];
  defaultStatus: ShotStatus;
  defaultTitle?: string;
  onCreate: (input: { title: string; description?: string; status: ShotStatus; priority: TaskPriority; departmentId?: string; assigneeId?: string; assigneeName?: string; assigneeAvatar?: string }) => Promise<string>;
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export function NewTaskDialog({ open, onOpenChange, crew, departments, defaultStatus, defaultTitle, onCreate }: NewTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setTitle(defaultTitle ?? '');
  }, [open, defaultTitle]);

  const reset = () => { setTitle(''); setDescription(''); setPriority('medium'); setAssigneeId(''); setDepartmentId(''); };

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const assignee = crew.find((c) => c.userId === assigneeId);
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        status: defaultStatus,
        priority,
        departmentId: departmentId || undefined,
        assigneeId: assignee?.userId,
        assigneeName: assignee?.name,
        assigneeAvatar: assignee?.avatar,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md bg-[#0d0b19] border-white/10 text-white">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Block SH_010 walk cycle" className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/10 min-h-16" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="bg-white/5 border-white/10 capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {crew.map((c) => <SelectItem key={c.userId} value={c.userId}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
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
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || submitting} className="bg-purple-600 hover:bg-purple-500">
            {submitting ? 'Creating…' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
