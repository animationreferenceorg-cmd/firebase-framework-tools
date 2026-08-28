'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookmarkPlus, ExternalLink, Image as ImageIcon, Loader2, Lock, Play, Sparkles, Timer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import type { ReferenceClip } from '@/lib/types';
import { secondsLabel } from '@/lib/reference-utils';
import { SaveClipToBoardDialog } from './SaveClipToBoardDialog';
import { ReferenceMediaPreview } from './ReferenceMediaPreview';
import { ReferenceHomeVideoPlayer } from './ReferenceHomeVideoPlayer';

export function ReferenceClipCard({ clip, onDeleted, onTagClick, onColorClick }: { clip: ReferenceClip; onDeleted?(clipId: string): void; onTagClick?(tag: string): void; onColorClick?(hex: string): void }) {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [saveOpen, setSaveOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = Boolean(user && (user.uid === clip.creatorId || userProfile?.role === 'admin'));

  const isFailed = clip.captureStatus === 'failed' || clip.bunnySyncStatus === 'failed';
  const isSyncing = !isFailed && (clip.captureStatus === 'queued' || clip.captureStatus === 'processing' || clip.bunnySyncStatus === 'pending' || (!clip.uploadedMediaUrl && clip.sourceUrl));
  const captureProgress = Math.max(5, Math.min(100, clip.captureProgress || 5));

  const deleteClip = async () => {
    if (!user || deleting || !confirm(`Remove “${clip.title}” from your boards and profile? The reference stays safely categorized in Animation Reference.`)) return;
    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/clips/${clip.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not remove this reference.');
      setPlayerOpen(false);
      onDeleted?.(clip.id);
      toast({ title: 'Removed from your library', description: 'It was removed from your boards and profile. The categorized reference was retained.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Removal failed', description: error.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <article className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 transition hover:-translate-y-1 hover:border-purple-500/40">
        <button onClick={() => { if (!isSyncing && !isFailed) setPlayerOpen(true); }} className="relative block aspect-video w-full overflow-hidden bg-zinc-900 text-left">
          <ReferenceMediaPreview clip={clip} />

          {/* Syncing / Processing Shimmer Banner */}
          {isSyncing ? (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-3 text-center">
              <span className="flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-500/40 shadow-lg">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                {clip.captureStage || 'Uploading reference…'}
              </span>
              <div className="h-1.5 w-44 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-purple-500 transition-all duration-500" style={{ width: `${captureProgress}%` }} /></div>
              <p className="text-[11px] tabular-nums text-zinc-400">{captureProgress}% · You can leave this page</p>
            </div>
          ) : isFailed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 p-4 text-center">
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">Upload failed</span>
              <p className="line-clamp-2 text-[11px] text-zinc-400">{clip.syncError || 'The source video could not be captured.'}</p>
            </div>
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-black/10 transition group-hover:bg-black/30">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-black opacity-0 transition group-hover:opacity-100">
                {clip.mediaType === 'image' || clip.mediaType === 'gif' ? <ImageIcon className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
              </span>
            </div>
          )}

          {clip.mediaType !== 'image' && clip.mediaType !== 'gif' && !isSyncing && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/80 px-2 py-1 font-mono text-[11px]">
              <Timer className="mr-1 inline h-3 w-3" />
              {secondsLabel(clip.endTime - clip.startTime)}
            </span>
          )}

          {clip.isPrivate && (
            <span className="absolute left-3 top-3 rounded-full bg-amber-950/90 px-2 py-1 text-[11px] text-amber-200">
              <Lock className="mr-1 inline h-3 w-3" />
              Private
            </span>
          )}
        </button>

        <div className="p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button onClick={() => setPlayerOpen(true)} className="block max-w-full text-left">
                <h3 className="line-clamp-1 font-bold text-white">{clip.title}</h3>
              </button>
              <p className="mt-1 text-xs text-zinc-500">
                Saved by{' '}
                <Link href={clip.creatorUsername ? `/${clip.creatorUsername}` : `/u/${clip.creatorId}`} className="text-purple-300 hover:underline">
                  @{clip.creatorUsername || clip.creatorName}
                </Link>
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {canDelete && (
                <Button size="icon" variant="ghost" aria-label="Remove from my library" disabled={deleting} onClick={deleteClip} className="text-zinc-500 hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="ghost" aria-label="Save to board" onClick={() => setSaveOpen(true)}>
                <BookmarkPlus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-purple-500/30 text-purple-200">
              {clip.category}
            </Badge>
            {[...new Set([...(clip.tags || []), ...(clip.visualTags || [])])].slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" onClick={() => onTagClick?.(tag)} className="cursor-pointer bg-white/5 text-zinc-400 hover:bg-purple-500/20 hover:text-purple-200">
                {tag}
              </Badge>
            ))}
            {(clip.palette || []).slice(0, 4).map((hex) => (
              <button key={hex} type="button" title={`Filter by ${hex}`} aria-label={`Filter by ${hex}`} onClick={() => onColorClick?.(hex)} className="h-5 w-5 rounded-full border border-white/25 transition hover:scale-110" style={{ backgroundColor: hex }} />
            ))}
          </div>
        </div>
      </article>

      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent className="h-screen w-screen max-w-none overflow-y-auto rounded-none border-0 bg-[#0f0c1d]/95 p-0 text-white backdrop-blur-xl">
          <DialogTitle className="sr-only">{clip.title}</DialogTitle>
          <main className="container mx-auto px-4 pb-12 pt-10">
            <div className="mx-auto max-w-6xl space-y-6">
              <Button variant="ghost" size="icon" onClick={() => setPlayerOpen(false)} className="rounded-full bg-white/10 text-white hover:bg-white/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_0_50px_-10px_rgba(124,58,237,.3)]">
                <ReferenceHomeVideoPlayer clip={clip} />
              </div>
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{clip.title}</h1>
                  {clip.sourceDescription && <p className="mt-4 leading-relaxed text-zinc-400">{clip.sourceDescription}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="bg-purple-600">{clip.category}</Badge>
                    {clip.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {clip.sourceUrl && (
                    <Button variant="outline" asChild>
                      <a href={clip.sourceUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Original
                      </a>
                    </Button>
                  )}
                  <Button onClick={() => setSaveOpen(true)} className="bg-purple-600 hover:bg-purple-500">
                    <BookmarkPlus className="mr-2 h-4 w-4" />
                    Save to board
                  </Button>
                  {canDelete && (
                    <Button variant="destructive" disabled={deleting} onClick={deleteClip}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deleting ? 'Removing…' : 'Remove from my library'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </main>
        </DialogContent>
      </Dialog>
      <SaveClipToBoardDialog clip={clip} open={saveOpen} onOpenChange={setSaveOpen} />
    </>
  );
}
