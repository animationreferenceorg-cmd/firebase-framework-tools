'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AnimationProject } from '@/lib/types';

interface ApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: AnimationProject;
  onSubmit: (input: { roleId?: string; roleTitle?: string; message: string; portfolioUrl?: string }) => Promise<void>;
}

export function ApplyDialog({ open, onOpenChange, project, onSubmit }: ApplyDialogProps) {
  const [roleId, setRoleId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openRoles = project.openRoles?.filter((r) => !r.filled) ?? [];

  const handleSubmit = async () => {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    try {
      const role = openRoles.find((r) => r.id === roleId);
      await onSubmit({
        roleId: role?.id,
        roleTitle: role?.title,
        message: message.trim(),
        portfolioUrl: portfolioUrl.trim() || undefined,
      });
      setMessage(''); setPortfolioUrl(''); setRoleId('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0d0b19] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Apply to join {project.title}</DialogTitle>
          <DialogDescription className="text-zinc-400">Tell {project.ownerName} why you'd be a good fit.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {openRoles.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Role</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Choose a role (optional)" /></SelectTrigger>
                <SelectContent>
                  {openRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="A bit about your experience and why you want in" className="bg-white/5 border-white/10 min-h-24" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Portfolio / Reel URL</Label>
            <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!message.trim() || submitting} className="bg-purple-600 hover:bg-purple-500">
            {submitting ? 'Sending…' : 'Send Application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
