'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flag, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason, type ReportTarget } from '@/lib/content-reports';

/** "Report" link + dialog for any clip, library video or portfolio post. */
export function ReportContentButton({ targetType, targetId, className }: { targetType: ReportTarget; targetId: string; className?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('copyright');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetType, targetId, reason, details, contactEmail: email || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Could not send the report.');
      toast({ title: 'Report sent', description: 'Thanks. We review every report.' });
      setOpen(false);
      setDetails('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Report not sent', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={className ?? 'text-zinc-500 hover:text-white'}>
          <Flag className="mr-1.5 h-3.5 w-3.5" />Report
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this content</DialogTitle>
          <DialogDescription>Tell us what&apos;s wrong. Copyright owners can also send a formal notice under our <Link href="/dmca" className="text-purple-300 underline">DMCA policy</Link>.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            {REPORT_REASONS.map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 text-sm has-[:checked]:border-purple-500/60">
                <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="accent-purple-500" />
                {REPORT_REASON_LABELS[value]}
              </label>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-details">Details</Label>
            <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} placeholder={reason === 'copyright' ? 'Which work of yours is this, and where was it originally published?' : 'Anything that helps us review it'} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-email">Your email (optional)</Label>
            <Input id="report-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="So we can follow up" />
          </div>
          <Button type="submit" disabled={sending} className="w-full bg-purple-600 hover:bg-purple-500">
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send report
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
