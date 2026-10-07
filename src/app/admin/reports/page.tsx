'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Flag, Loader2, ShieldAlert, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { REPORT_REASON_LABELS, type ReportReason, type ReportTarget } from '@/lib/content-reports';

interface Report {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  targetTitle?: string;
  reason: ReportReason;
  details?: string;
  contactEmail?: string | null;
  status: string;
  createdAt?: number;
}

function targetHref(r: Report): string {
  if (r.targetType === 'clip') return `/clip/${r.targetId}`;
  if (r.targetType === 'video') return `/video/${r.targetId}`;
  return `/admin`;
}

export default function AdminReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<'open' | 'closed'>('open');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${view}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Could not load reports.');
      setReports(body.reports || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not load reports', description: error instanceof Error ? error.message : '' });
    } finally {
      setLoading(false);
    }
  }, [user, view, toast]);

  useEffect(() => { load(); }, [load]);

  const act = async (report: Report, action: 'remove' | 'dismiss') => {
    if (!user) return;
    if (action === 'remove' && !window.confirm(`Remove “${report.targetTitle || report.targetId}”? It will be hidden from everyone except its uploader.`)) return;
    setBusy(report.id);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Action failed.');
      if (body.repeatInfringer) {
        toast({ variant: 'destructive', title: 'Repeat infringer', description: `This uploader now has ${body.strikes} copyright strikes. Under the DMCA policy, terminate the account in Users & Subscriptions.` });
      } else {
        toast({ title: action === 'remove' ? 'Content removed' : 'Report dismissed', description: body.strikes ? `Uploader strikes: ${body.strikes}` : undefined });
      }
      await load();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Action failed', description: error instanceof Error ? error.message : '' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Flag className="h-6 w-6" />Content reports</h1>
          <p className="text-sm text-muted-foreground">Act quickly on copyright reports: fast removal is what keeps the site protected as a platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'open' ? 'default' : 'outline'} size="sm" onClick={() => setView('open')}>Open</Button>
          <Button variant={view === 'closed' ? 'default' : 'outline'} size="sm" onClick={() => setView('closed')}>Closed</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>
      ) : reports.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No {view} reports.</CardContent></Card>
      ) : (
        reports.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.reason === 'copyright' ? 'destructive' : 'secondary'}>{r.reason === 'copyright' && <ShieldAlert className="mr-1 h-3 w-3" />}{r.reason}</Badge>
                <Badge variant="outline">{r.targetType}</Badge>
                {r.status !== 'open' && <Badge variant="outline">{r.status}</Badge>}
                {r.createdAt && <span className="text-xs text-muted-foreground">{format(r.createdAt, 'PPp')}</span>}
              </div>
              <CardTitle className="text-base">
                <Link href={targetHref(r)} target="_blank" className="hover:underline">{r.targetTitle || r.targetId}</Link>
              </CardTitle>
              <CardDescription>{REPORT_REASON_LABELS[r.reason]}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.details && <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">{r.details}</p>}
              {r.contactEmail && <p className="text-xs text-muted-foreground">Reporter: <a className="underline" href={`mailto:${r.contactEmail}`}>{r.contactEmail}</a></p>}
              {r.status === 'open' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => act(r, 'remove')}>
                    {busy === r.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}Remove content
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => act(r, 'dismiss')}><X className="mr-1.5 h-4 w-4" />Dismiss</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
