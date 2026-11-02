'use client';

import { useEffect, useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { embedCode, embedUrl, isEmbeddableMediaUrl, type EmbedKind } from '@/lib/embed';

export function EmbedShareButton({ kind, id, title, mediaUrl }: { kind: EmbedKind; id: string; title: string; mediaUrl?: string }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setOrigin(window.location.origin); setReady(false); setError(''); setCopied(false); setCopyError('');
    fetch(`/api/embed/${kind}/${encodeURIComponent(id)}`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Embedding is unavailable.');
      if (!controller.signal.aborted) setReady(true);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [open, kind, id]);
  if (!isEmbeddableMediaUrl(mediaUrl)) return null;
  const url = origin ? embedUrl(origin, kind, id, { autoplay, loop }) : '';
  const code = embedCode(url, title);
  return <>
    <Button variant="outline" size="sm" onClick={event => { event.stopPropagation(); setOpen(true); }} aria-label="Embed video" title="Embed video" className="gap-1.5"><Code2 className="h-4 w-4" /><span className="hidden sm:inline">Embed</span></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl" onClick={event => event.stopPropagation()}>
        <DialogHeader><DialogTitle>Embed video</DialogTitle><DialogDescription>Add this public video to your website or portfolio. The player has no logo or watermark.</DialogDescription></DialogHeader>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : !ready ? <p role="status">Preparing embed…</p> : <>
          <iframe src={url} title={`Preview: ${title}`} className="aspect-video w-full rounded-lg border-0 bg-black" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={autoplay} onChange={event => { setAutoplay(event.target.checked); setCopied(false); }} />Autoplay (muted)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={loop} onChange={event => { setLoop(event.target.checked); setCopied(false); }} />Loop</label>
          </div>
          <textarea aria-label="Embed code" readOnly value={code} onFocus={event => event.target.select()} className="h-28 w-full rounded-md border border-input bg-muted p-3 font-mono text-xs" />
          {copyError && <p role="alert" className="text-sm text-destructive">{copyError}</p>}
          <Button onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setCopyError(''); } catch { setCopyError('Select the embed code and copy it manually.'); } }} className="gap-2">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy embed code'}</Button>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
