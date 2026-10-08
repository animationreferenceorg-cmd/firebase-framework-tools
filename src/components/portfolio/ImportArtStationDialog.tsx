'use client';

import { useState } from 'react';
import { Check, Copy, Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

/** Two-step ArtStation import: get a code, put it in the headline, import. */
export function ImportArtStationDialog({ onImported, className }: { onImported?(): void; className?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const clean = username.trim().replace(/^https?:\/\/(www\.)?artstation\.com\//i, '').replace(/\/.*$/, '');

  const call = async (action: 'start' | 'import') => {
    if (!user) return null;
    const res = await fetch('/api/import/artstation', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: clean, action }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'Something went wrong.');
    return body;
  };

  const start = async () => {
    setBusy(true);
    try { setCode((await call('start')).code); }
    catch (e) { toast({ variant: 'destructive', title: 'Could not start', description: e instanceof Error ? e.message : '' }); }
    finally { setBusy(false); }
  };

  const runImport = async () => {
    setBusy(true);
    try {
      const result = await call('import');
      toast({ title: `Imported ${result.imported} project${result.imported === 1 ? '' : 's'}`, description: 'You can now remove the code from your ArtStation headline.' });
      setOpen(false);
      setCode(null);
      onImported?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Import not finished', description: e instanceof Error ? e.message : '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className ?? 'border-white/15 text-zinc-200 hover:bg-white/10 gap-1.5 font-bold'}>
          <Download className="h-4 w-4" />Import from ArtStation
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import your ArtStation portfolio</DialogTitle>
          <DialogDescription>Bring in up to 30 of your latest projects in one go. Each post links back to the original on ArtStation.</DialogDescription>
        </DialogHeader>
        {!code ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="as-user">ArtStation username</Label>
              <Input id="as-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="artstation.com/yourname" />
            </div>
            <Button onClick={start} disabled={busy || clean.length < 2} className="w-full bg-purple-600 hover:bg-purple-500">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Continue
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-zinc-300">To confirm it&apos;s your account, add this code anywhere in your <strong>ArtStation headline</strong> (Edit profile → Headline) and save:</p>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(code).catch(() => {}); setCopied(true); }}
              className="flex w-full items-center justify-between rounded-xl border border-purple-500/40 bg-purple-950/30 px-4 py-3 font-mono text-base text-purple-100"
            >
              {code}{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
            <p className="text-xs text-zinc-500">ArtStation can take a minute to update. You can remove the code after the import.</p>
            <Button onClick={runImport} disabled={busy} className="w-full bg-purple-600 hover:bg-purple-500">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}I&apos;ve added it. Import now
            </Button>
            <button type="button" onClick={() => setCode(null)} className="w-full text-xs text-zinc-500 hover:text-zinc-300">Use a different username</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
