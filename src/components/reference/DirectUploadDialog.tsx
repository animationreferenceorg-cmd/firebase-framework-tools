'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Crown, Film, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { getUserReferenceBoards } from '@/lib/reference-service';
import { isProProfile } from '@/lib/reference-utils';
import type { ReferenceBoard } from '@/lib/types';

const ACCEPTED_MEDIA = 'video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp,image/gif';

export function DirectUploadDialog({ onCreated }: { onCreated?(): void }) {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('Preparing upload…');
  const [uploadFailed, setUploadFailed] = useState(false);
  const [boards, setBoards] = useState<ReferenceBoard[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [form, setForm] = useState({ title: '', category: 'Personal Reference', tags: '', boardId: '', isPrivate: false, duration: 10 });

  useEffect(() => {
    if (open && user) getUserReferenceBoards(user.uid, true).then(setBoards).catch(() => setBoards([]));
  }, [open, user]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const isVideo = file?.type.startsWith('video/') ?? false;
  const isImage = file?.type.startsWith('image/') ?? false;
  const sizeLabel = useMemo(() => file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : '', [file]);

  const chooseFile = (next: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setUploadProgress(0);
    setUploadFailed(false);
    setPreviewUrl(next ? URL.createObjectURL(next) : '');
    if (!next) return;
    setForm((current) => ({ ...current, title: current.title || next.name.replace(/\.[^.]+$/, '') }));
    if (next.type.startsWith('video/')) {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(next);
      video.preload = 'metadata';
      video.src = objectUrl;
      video.onloadedmetadata = () => {
        setForm((current) => ({ ...current, duration: Number.isFinite(video.duration) ? video.duration : 10 }));
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      setForm((current) => ({ ...current, duration: 1 }));
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !user) return;
    setSaving(true);
    setUploadFailed(false);
    setUploadProgress(3);
    setUploadStage('Preparing your reference…');
    try {
      const token = await user.getIdToken();
      const payload = new FormData();
      payload.set('file', file);
      Object.entries(form).forEach(([key, value]) => payload.set(key, String(value)));
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', '/api/clips/upload');
        request.setRequestHeader('Authorization', `Bearer ${token}`);
        request.upload.onprogress = (progressEvent) => {
          if (!progressEvent.lengthComputable) return;
          setUploadProgress(Math.min(88, 5 + Math.round((progressEvent.loaded / progressEvent.total) * 83)));
          setUploadStage(`Uploading ${isVideo ? 'video' : 'reference'}…`);
        };
        request.upload.onload = () => {
          setUploadProgress(92);
          setUploadStage(isVideo ? 'Processing video for playback…' : 'Saving reference…');
        };
        request.onerror = () => reject(new Error('The upload was interrupted. Check your connection and try again.'));
        request.onload = () => {
          let result: any = {};
          try { result = JSON.parse(request.responseText || '{}'); } catch { /* Keep the fallback message. */ }
          if (request.status >= 200 && request.status < 300) resolve();
          else reject(new Error(result.message || result.error || 'Upload failed.'));
        };
        request.send(payload);
      });
      setUploadProgress(100);
      setUploadStage('Reference ready');
      toast({ title: 'Reference uploaded', description: `${file.name} is ready to view.` });
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      setOpen(false);
      setUploadProgress(0);
      setFile(null);
      setPreviewUrl('');
      setForm({ title: '', category: 'Personal Reference', tags: '', boardId: '', isPrivate: false, duration: 10 });
      onCreated?.();
    } catch (error: any) {
      setUploadFailed(true);
      setUploadProgress(100);
      setUploadStage('Upload failed');
      toast({ variant: 'destructive', title: 'Could not upload media', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const pro = isProProfile(userProfile);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
      <DialogTrigger asChild><Button variant="outline"><Upload className="mr-2 h-4 w-4" />Upload media</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add your own reference</DialogTitle>
          <DialogDescription>Upload videos, acting takes, photos, pose sheets, GIFs, and visual research as reference clips.</DialogDescription>
        </DialogHeader>
        {!pro ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
            <Crown className="mx-auto mb-3 h-8 w-8 text-amber-300" />
            <h3 className="font-bold">Personal media uploads are Pro</h3>
            <p className="mt-2 text-sm text-zinc-400">The $5 plan includes secure storage for videos and images, private boards, and breakdown pages.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[.03] p-4">
              <Label htmlFor="vault-media" className="flex cursor-pointer flex-col items-center gap-2 py-6 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-500/10 text-purple-300"><Upload className="h-5 w-5" /></span>
                <strong>Choose a video, photo, or GIF</strong>
                <span className="text-xs font-normal text-zinc-500">MP4, WebM, MOV up to 250 MB · JPG, PNG, WebP, GIF up to 25 MB</span>
              </Label>
              <Input id="vault-media" type="file" accept={ACCEPTED_MEDIA} required onChange={(event) => chooseFile(event.target.files?.[0] || null)} className="sr-only" />
            </div>

            {file && (
              <div className="flex gap-4 rounded-2xl border border-white/10 bg-black/40 p-3">
                <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-black">
                  {isVideo && <video src={previewUrl} muted playsInline className="h-full w-full object-contain" />}
                  {isImage && <img src={previewUrl} alt="Selected upload preview" className="h-full w-full object-contain" />}
                </div>
                <div className="min-w-0 py-1">
                  <div className="flex items-center gap-2 text-purple-300">{isVideo ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}<span className="text-xs font-bold uppercase tracking-wider">{isVideo ? 'Video' : file.type === 'image/gif' ? 'GIF' : 'Image'}</span></div>
                  <p className="mt-2 truncate text-sm font-bold text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500">{sizeLabel}</p>
                </div>
              </div>
            )}

            <Field label="Title"><Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category"><Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
              <Field label="Board">
                <Select value={form.boardId || 'none'} onValueChange={(value) => {
                  const board = boards.find((item) => item.id === value);
                  setForm({ ...form, boardId: value === 'none' ? '' : value, isPrivate: board?.isPrivate ?? form.isPrivate });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No board</SelectItem>{boards.map((board) => <SelectItem key={board.id} value={board.id}>{board.isPrivate ? 'Private · ' : 'Public · '}{board.title}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Tags"><Input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="pose sheet, facial acting, client-x" /></Field>
            <div className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <div><Label>Private</Label><p className="text-xs text-zinc-500">Keep this media outside public discovery</p></div>
              <Switch checked={form.isPrivate} onCheckedChange={(value) => setForm({ ...form, isPrivate: value })} />
            </div>
            {(saving || uploadProgress > 0) && (
              <div className={`rounded-xl border p-3 ${uploadFailed ? 'border-red-500/30 bg-red-500/5' : uploadProgress === 100 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-purple-500/30 bg-purple-500/5'}`} aria-live="polite">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2">{uploadProgress === 100 && !uploadFailed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : saving ? <Loader2 className="h-4 w-4 animate-spin text-purple-300" /> : null}{uploadStage}</span>
                  <span className="tabular-nums text-zinc-400">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2 bg-white/10 [&>div]:bg-purple-500" />
                <p className="mt-2 text-[11px] text-zinc-500">{saving ? 'Keep this window open until the reference is ready.' : uploadFailed ? 'Your file was not added. You can try again.' : 'Upload complete.'}</p>
              </div>
            )}
            <Button disabled={saving || !file} type="submit" className="w-full bg-purple-600 hover:bg-purple-500">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? uploadStage : 'Upload reference'}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
