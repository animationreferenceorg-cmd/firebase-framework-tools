'use client';

import { useEffect, useState } from 'react';
import { Chrome, Clipboard, ExternalLink, Loader2, Scissors, Share2, Smartphone, Sparkles, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/hooks/use-user';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getUserReferenceBoards } from '@/lib/reference-service';
import { isProProfile, normalizeHttpUrl } from '@/lib/reference-utils';
import type { ReferenceBoard } from '@/lib/types';
import Link from 'next/link';

interface OEmbedMeta {
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
  providerName?: string;
}

export function CaptureClipDialog({ onCreated, initialUrl, defaultOpen = false }: { onCreated?(): void; initialUrl?: string; defaultOpen?: boolean }) {
  const { userProfile } = useUser();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'clip' | 'mobile' | 'extension'>('clip');
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStage, setSaveStage] = useState('Preparing reference…');
  const [saveFailed, setSaveFailed] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [oembedMeta, setOembedMeta] = useState<OEmbedMeta | null>(null);
  const [boards, setBoards] = useState<ReferenceBoard[]>([]);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    sourceUrl: initialUrl || '',
    title: '',
    category: 'Acting',
    tags: '',
    startTime: '0',
    endTime: '5',
    boardId: '',
    isPrivate: false,
  });

  useEffect(() => {
    if (initialUrl) {
      setForm((prev) => ({ ...prev, sourceUrl: initialUrl }));
      fetchUrlMetadata(initialUrl);
    }
  }, [initialUrl]);

  useEffect(() => {
    if (open && userProfile) {
      getUserReferenceBoards(userProfile.uid, true).then(setBoards);
    }
  }, [open, userProfile]);

  const fetchUrlMetadata = async (url: string) => {
    if (!url.trim()) return;
    try {
      setFetchingMeta(true);
      const normalized = normalizeHttpUrl(url);
      const res = await fetch(`/api/oembed?url=${encodeURIComponent(normalized)}`);
      if (res.ok) {
        const meta: OEmbedMeta = await res.json();
        setOembedMeta(meta);
        setForm((prev) => ({
          ...prev,
          title: prev.title || meta.title || '',
          tags: prev.tags || (meta.authorName ? `${meta.authorName.toLowerCase()}, ${meta.providerName?.toLowerCase() || ''}` : ''),
        }));
      }
    } catch {
      // Ignore invalid URLs silently
    } finally {
      setFetchingMeta(false);
    }
  };

  const handleUrlChange = (value: string) => {
    setForm((prev) => ({ ...prev, sourceUrl: value }));
    if (value.length > 10 && value.includes('://')) {
      fetchUrlMetadata(value);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.startsWith('http')) {
        handleUrlChange(text);
        toast({ title: 'Link pasted from clipboard', description: 'Fetching video metadata...' });
      } else {
        toast({ variant: 'destructive', title: 'No valid link in clipboard', description: 'Copy a YouTube, Instagram, or video URL first.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Clipboard permission denied', description: 'Paste the link manually into the URL field.' });
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userProfile || !user) return;
    setSaving(true);
    setSaveFailed(false);
    setSaveProgress(5);
    setSaveStage('Preparing reference…');
    let currentProgress = 5;
    const progressTimer = window.setInterval(() => {
      currentProgress = Math.min(90, currentProgress + (currentProgress < 40 ? 7 : currentProgress < 72 ? 4 : 1));
      setSaveProgress(currentProgress);
      setSaveStage(currentProgress < 40 ? 'Downloading source video…' : currentProgress < 72 ? 'Uploading to Animation Reference…' : 'Processing playback…');
    }, 700);
    try {
      const sourceUrl = normalizeHttpUrl(form.sourceUrl);
      const startTime = Number(form.startTime);
      const endTime = Number(form.endTime);
      if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
        throw new Error('The Out time must be after the In time.');
      }
      const token = await user.getIdToken();
      const response = await fetch('/api/clips', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
        sourceUrl,
        startTime,
        endTime,
        title: form.title || oembedMeta?.title || 'Animation Reference Clip',
        category: form.category,
        tags: form.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean),
        isPrivate: form.isPrivate,
        boardId: form.boardId || undefined,
        thumbnailUrl: oembedMeta?.thumbnailUrl || undefined,
        sourceAuthorName: oembedMeta?.authorName || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || 'Could not capture this reference.');
      window.clearInterval(progressTimer);
      setSaveProgress(100);
      setSaveStage('Sent to Reference Clips');
      toast({ title: 'Reference queued', description: 'You can keep browsing while the video uploads on the Reference Clips page.' });
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setOpen(false);
      setSaveProgress(0);
      setForm({ sourceUrl: '', title: '', category: 'Acting', tags: '', startTime: '0', endTime: '5', boardId: '', isPrivate: false });
      setOembedMeta(null);
      onCreated?.();
    } catch (error: any) {
      setSaveFailed(true);
      setSaveProgress(100);
      setSaveStage('Upload failed');
      toast({ variant: 'destructive', title: 'Could not save clip', description: error.message });
    } finally {
      window.clearInterval(progressTimer);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-900/30">
          <Scissors className="mr-2 h-4 w-4" />
          Clip & Save
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-xl p-0 overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-white/10 bg-zinc-900/60 px-6 pt-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <DialogTitle className="text-xl font-bold">Clip Animation Reference</DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">Save precise timestamped moments to your boards</DialogDescription>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/50 p-1 text-xs">
            <button
              onClick={() => setActiveTab('clip')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition ${
                activeTab === 'clip' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Scissors className="h-3.5 w-3.5" />
              Clip a Link
            </button>
            <button
              onClick={() => setActiveTab('mobile')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition ${
                activeTab === 'mobile' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile App
            </button>
            <button
              onClick={() => setActiveTab('extension')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-medium transition ${
                activeTab === 'extension' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Chrome className="h-3.5 w-3.5" />
              Extension
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* TAB 1: CLIP A LINK */}
          {activeTab === 'clip' && (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Video or Reel URL">
                <div className="relative flex items-center">
                  <Input
                    type="url"
                    required
                    value={form.sourceUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="YouTube, Vimeo, Instagram, TikTok..."
                    className="pr-28 border-white/10 bg-black/40 focus:border-purple-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePasteFromClipboard}
                    className="absolute right-1 text-xs text-purple-300 hover:text-white hover:bg-purple-950/60"
                  >
                    <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                    Paste Link
                  </Button>
                </div>
              </Field>

              {/* OEmbed Metadata Preview Card */}
              {fetchingMeta ? (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-purple-950/20 p-3 text-xs text-purple-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching creator credit and video metadata...
                </div>
              ) : oembedMeta?.thumbnailUrl || oembedMeta?.title ? (
                <div className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-950/30 p-2.5">
                  {oembedMeta.thumbnailUrl && (
                    <img src={oembedMeta.thumbnailUrl} alt="Thumbnail preview" className="h-12 w-16 rounded-lg object-cover border border-white/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{oembedMeta.title || 'Video Reference'}</p>
                    {oembedMeta.authorName && (
                      <p className="text-[11px] text-purple-300">Credit: {oembedMeta.authorName} ({oembedMeta.providerName || 'Web'})</p>
                    )}
                  </div>
                </div>
              ) : null}

              <Field label="Clip Title">
                <Input
                  required
                  maxLength={120}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Heavy Sword Weight Shift Recovery"
                  className="border-white/10 bg-black/40"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="In (seconds)">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="border-white/10 bg-black/40"
                  />
                </Field>
                <Field label="Out (seconds)">
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="border-white/10 bg-black/40"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                    <SelectTrigger className="border-white/10 bg-black/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10">
                      {['Acting', 'Body Mechanics', 'Combat', 'Creature', 'Dance', 'Facial', 'Locomotion', 'Sports', 'Stunts'].map((item) => (
                        <SelectItem value={item} key={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Board">
                  <Select
                    value={form.boardId || 'none'}
                    onValueChange={(value) => {
                      const board = boards.find((item) => item.id === value);
                      setForm({ ...form, boardId: value === 'none' ? '' : value, isPrivate: board?.isPrivate ?? form.isPrivate });
                    }}
                  >
                    <SelectTrigger className="border-white/10 bg-black/40">
                      <SelectValue placeholder="No board" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10">
                      <SelectItem value="none">No board (General)</SelectItem>
                      {boards.map((board) => (
                        <SelectItem value={board.id} key={board.id}>
                          {board.isPrivate ? '🔒 ' : ''}
                          {board.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Tags (comma separated)">
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="sword, anticipation, weight, combat"
                  className="border-white/10 bg-black/40 text-xs"
                />
              </Field>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                <div>
                  <Label className="text-xs font-semibold">Private Reference Clip</Label>
                  <p className="text-[11px] text-zinc-400">Pro · Exclude from community reference library</p>
                </div>
                <Switch checked={form.isPrivate} disabled={!isProProfile(userProfile)} onCheckedChange={(value) => setForm({ ...form, isPrivate: value })} />
              </div>

              {(saving || saveProgress > 0) && (
                <div className={`rounded-xl border p-3 ${saveFailed ? 'border-red-500/30 bg-red-500/5' : saveProgress === 100 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-purple-500/30 bg-purple-500/5'}`} aria-live="polite">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2">{saveProgress === 100 && !saveFailed ? <Check className="h-4 w-4 text-emerald-400" /> : saving ? <Loader2 className="h-4 w-4 animate-spin text-purple-300" /> : null}{saveStage}</span>
                    <span className="tabular-nums text-zinc-400">{saveProgress}%</span>
                  </div>
                  <Progress value={saveProgress} className="h-2 bg-white/10 [&>div]:bg-purple-500" />
                  <p className="mt-2 text-[11px] text-zinc-500">{saving ? 'Keep this window open while the video is copied.' : saveFailed ? 'Nothing was added. You can try again.' : 'Upload complete.'}</p>
                </div>
              )}

              <Button type="submit" disabled={saving || !form.sourceUrl} className="w-full bg-purple-600 hover:bg-purple-500 font-bold py-5">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? saveStage : 'Save reference clip'}
              </Button>
            </form>
          )}

          {/* TAB 2: ARE YOU ON MOBILE? */}
          {activeTab === 'mobile' && (
            <div className="space-y-5 text-zinc-300">
              <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4 text-center">
                <Smartphone className="mx-auto mb-2 h-8 w-8 text-purple-400" />
                <h3 className="font-bold text-white text-base">Save Animation Reference to your Phone</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Add this app to your Home Screen to unlock 1-click native sharing directly from Instagram, YouTube, or TikTok!
                </p>
              </div>

              <div className="grid gap-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-bold text-purple-300">1</div>
                  <div>
                    <strong className="text-white">On iOS (Safari):</strong>
                    <p className="text-zinc-400 mt-0.5">Tap the <Share2 className="inline h-3.5 w-3.5 text-purple-300" /> Share icon at the bottom of Safari, then scroll down and tap <strong className="text-white">&quot;Add to Home Screen&quot;</strong>.</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-bold text-purple-300">2</div>
                  <div>
                    <strong className="text-white">On Android (Chrome):</strong>
                    <p className="text-zinc-400 mt-0.5">Tap the <strong>⋮ Menu</strong> in Chrome, then tap <strong className="text-white">&quot;Install App&quot;</strong> or &quot;Add to Home Screen&quot;.</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-bold text-purple-300">3</div>
                  <div>
                    <strong className="text-white">Share Directly:</strong>
                    <p className="text-zinc-400 mt-0.5">When watching any Reel or video, tap Share → Share to Animation Reference to clip it in seconds.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Button onClick={handlePasteFromClipboard} className="w-full bg-purple-600 hover:bg-purple-500">
                  <Clipboard className="mr-2 h-4 w-4" />
                  Paste Copied Link Now
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: DESKTOP EXTENSION */}
          {activeTab === 'extension' && (
            <div className="space-y-5 text-zinc-300 text-center py-2">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-purple-500/30 bg-purple-950/40 text-purple-300">
                <Chrome className="h-8 w-8" />
              </div>

              <div>
                <h3 className="font-bold text-white text-lg">Clip & Save Browser Extension</h3>
                <p className="mt-1 text-xs text-zinc-400 max-w-md mx-auto">
                  Save reference moments directly while browsing YouTube, Instagram, Vimeo, and Twitter with a single click.
                </p>
              </div>

               <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Features included:
                </div>
                <ul className="space-y-1.5 text-zinc-400 pl-6 list-disc">
                  <li>Instant timestamp clipping over any web video player</li>
                  <li>Automatic creator attribution & credit</li>
                  <li>Direct sync with your Vault & project boards</li>
                </ul>
               </div>

               <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">
                 Chrome Web Store listing coming soon. Download the plugin below for manual installation now.
               </div>

               <Button asChild variant="outline" className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10">
                 <a href="/downloads/animation-reference-clip-save.zip" download>
                   <Chrome className="mr-2 h-4 w-4" />
                   Download Chrome Plugin
                 </a>
               </Button>

               <Button asChild size="lg" className="w-full bg-purple-600 hover:bg-purple-500 font-bold">
                <Link href="/extension/connect">
                  <Chrome className="mr-2 h-4 w-4" />
                  Connect Extension to Vault
                </Link>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-300 font-semibold">{label}</Label>
      {children}
    </div>
  );
}
