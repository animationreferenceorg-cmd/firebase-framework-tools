'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Columns2, Crown, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { createShotBreakdown, getUserReferenceClips } from '@/lib/reference-service';
import { isProProfile, slugifyReference } from '@/lib/reference-utils';
import type { ReferenceClip } from '@/lib/types';

export function ShotBreakdownBuilder() {
  const { userProfile } = useUser(); const { toast } = useToast(); const router = useRouter();
  const [open, setOpen] = useState(false); const [clips, setClips] = useState<ReferenceClip[]>([]); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', referenceClipId: '', finishedMediaUrl: '', notes: '' });
  useEffect(() => { if (open && userProfile) getUserReferenceClips(userProfile.uid, true).then(setClips); }, [open, userProfile]);
  const pro = isProProfile(userProfile);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!userProfile || !pro) return; setSaving(true); try { const slug = slugifyReference(form.title); await createShotBreakdown({ ownerId: userProfile.uid, ownerName: userProfile.displayName || userProfile.username || 'Animator', ownerUsername: userProfile.username, ownerAvatar: userProfile.photoURL || undefined, slug, title: form.title, referenceClipId: form.referenceClipId, finishedMediaUrl: form.finishedMediaUrl, finishedMediaType: 'video', notes: form.notes, isPublic: true }, userProfile); toast({ title: 'Breakdown published' }); router.push(`/${userProfile.username || userProfile.uid}/${slug}`); } catch (error: any) { toast({ variant: 'destructive', title: 'Could not publish breakdown', description: error.message }); } finally { setSaving(false); } };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline"><Columns2 className="mr-2 h-4 w-4" />Shot breakdown</Button></DialogTrigger><DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-lg"><DialogHeader><DialogTitle>Reference-to-shot breakdown</DialogTitle><DialogDescription>Create a recruiter-ready comparison link showing how reference informed your final animation.</DialogDescription></DialogHeader>{!pro ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center"><Crown className="mx-auto mb-3 h-8 w-8 text-amber-300" /><h3 className="font-bold">A Pro portfolio feature</h3><p className="my-3 text-sm text-zinc-400">Private boards, direct proprietary uploads, and shot breakdown pages are included in the $5 plan.</p><Button asChild className="bg-purple-600"><a href="/profile">View Pro plan</a></Button></div> : <form onSubmit={submit} className="space-y-4"><Field label="Breakdown title"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Greatsword attack — from reference to polish" /></Field><Field label="Reference clip"><Select required value={form.referenceClipId} onValueChange={(value) => setForm({ ...form, referenceClipId: value })}><SelectTrigger><SelectValue placeholder="Choose one of your clips" /></SelectTrigger><SelectContent>{clips.map((clip) => <SelectItem key={clip.id} value={clip.id}>{clip.title}</SelectItem>)}</SelectContent></Select></Field><Field label="Finished shot URL"><Input type="url" required value={form.finishedMediaUrl} onChange={(e) => setForm({ ...form, finishedMediaUrl: e.target.value })} placeholder="YouTube, Vimeo, or hosted MP4" /></Field><Field label="Animator notes"><Textarea required rows={6} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Key poses, timing changes, arcs, and the decisions you made…" /></Field><Button type="submit" disabled={saving} className="w-full bg-purple-600 hover:bg-purple-500">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Publish breakdown</Button></form>}</DialogContent></Dialog>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
