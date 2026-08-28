'use client';

import React, { useState, useEffect } from 'react';
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
import { PRODUCTION_ROLES, DEFAULT_ONBOARDING_STEPS, DEFAULT_DEPARTMENTS, type AnimationProject } from '@/lib/types';
import { X, Plus } from 'lucide-react';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    title: string;
    logline: string;
    description?: string;
    genre: string[];
    format: AnimationProject['format'];
    fps: number;
    isPublic: boolean;
    isRecruiting: boolean;
    openRoles: Array<{ title: string; description?: string }>;
    onboardingSteps: string[];
    departments: Array<{ name: string; color: string }>;
  }) => Promise<void>;
}

const FORMATS: { value: AnimationProject['format']; label: string }[] = [
  { value: 'short_film', label: 'Short Film' },
  { value: 'series', label: 'Series' },
  { value: 'game_cinematic', label: 'Game Cinematic' },
  { value: 'game', label: 'Game' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'demo_reel', label: 'Demo Reel' },
];

const DEPARTMENT_COLOR_PALETTE = ['#f472b6', '#fb923c', '#a855f7', '#38bdf8', '#4ade80', '#facc15', '#f87171', '#818cf8'];

export function NewProjectDialog({ open, onOpenChange, onCreate }: NewProjectDialogProps) {
  const [title, setTitle] = useState('');
  const [logline, setLogline] = useState('');
  const [description, setDescription] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [genre, setGenre] = useState<string[]>([]);
  const [format, setFormat] = useState<AnimationProject['format']>('short_film');
  const [isPublic, setIsPublic] = useState(true);
  const [isRecruiting, setIsRecruiting] = useState(true);
  const [openRoles, setOpenRoles] = useState<Array<{ title: string; description?: string }>>([]);
  const [roleInput, setRoleInput] = useState('');
  const [onboardingSteps, setOnboardingSteps] = useState<string[]>(DEFAULT_ONBOARDING_STEPS);
  const [stepInput, setStepInput] = useState('');
  const [departments, setDepartments] = useState<Array<{ name: string; color: string }>>(DEFAULT_DEPARTMENTS.film);
  const [departmentsCustomized, setDepartmentsCustomized] = useState(false);
  const [deptInput, setDeptInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Swap in the game-appropriate department preset automatically, unless
  // the user has already started customizing the list themselves.
  useEffect(() => {
    if (departmentsCustomized) return;
    setDepartments(format === 'game' ? DEFAULT_DEPARTMENTS.game : DEFAULT_DEPARTMENTS.film);
  }, [format, departmentsCustomized]);

  const reset = () => {
    setTitle(''); setLogline(''); setDescription(''); setGenreInput(''); setGenre([]);
    setFormat('short_film'); setIsPublic(true); setIsRecruiting(true);
    setOpenRoles([]); setRoleInput(''); setOnboardingSteps(DEFAULT_ONBOARDING_STEPS); setStepInput('');
    setDepartments(DEFAULT_DEPARTMENTS.film); setDepartmentsCustomized(false); setDeptInput('');
  };

  const addDepartment = () => {
    const name = deptInput.trim();
    if (!name) return;
    setDepartmentsCustomized(true);
    setDepartments((prev) => [...prev, { name, color: DEPARTMENT_COLOR_PALETTE[prev.length % DEPARTMENT_COLOR_PALETTE.length] }]);
    setDeptInput('');
  };

  const removeDepartment = (name: string) => {
    setDepartmentsCustomized(true);
    setDepartments((prev) => prev.filter((d) => d.name !== name));
  };

  const addGenre = () => {
    const g = genreInput.trim();
    if (g && !genre.includes(g)) setGenre((prev) => [...prev, g]);
    setGenreInput('');
  };

  const addRole = () => {
    const r = roleInput.trim();
    if (r) setOpenRoles((prev) => [...prev, { title: r }]);
    setRoleInput('');
  };

  const addStep = () => {
    const s = stepInput.trim();
    if (s) setOnboardingSteps((prev) => [...prev, s]);
    setStepInput('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !logline.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        logline: logline.trim(),
        description: description.trim(),
        genre,
        format,
        fps: 24,
        isPublic,
        isRecruiting,
        openRoles,
        onboardingSteps,
        departments,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg bg-[#0d0b19] border-white/10 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Production</DialogTitle>
          <DialogDescription className="text-zinc-400">Set up a project, define what roles you need, and choose whether to showcase it for crew applications.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" className="bg-white/5 border-white/10" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Logline</Label>
            <Input value={logline} onChange={(e) => setLogline(e.target.value)} placeholder="One-sentence pitch" className="bg-white/5 border-white/10" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="More detail about the production" className="bg-white/5 border-white/10 min-h-20" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as AnimationProject['format'])}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Genre</Label>
              <div className="flex gap-1.5">
                <Input value={genreInput} onChange={(e) => setGenreInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGenre(); } }} placeholder="Add genre" className="bg-white/5 border-white/10" />
                <Button type="button" variant="ghost" size="icon" onClick={addGenre} className="shrink-0 border border-white/10"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          {genre.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genre.map((g) => (
                <span key={g} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                  {g}
                  <button onClick={() => setGenre((prev) => prev.filter((x) => x !== g))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Departments</Label>
            <div className="flex flex-wrap gap-1.5">
              {departments.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5 text-[11px] pl-2 pr-1.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-200">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  {d.name}
                  <button onClick={() => removeDepartment(d.name)}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input value={deptInput} onChange={(e) => setDeptInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDepartment(); } }} placeholder="Add a department" className="bg-white/5 border-white/10" />
              <Button type="button" variant="ghost" size="icon" onClick={addDepartment} className="shrink-0 border border-white/10"><Plus className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-purple-600" />
              Public project page
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={isRecruiting} onChange={(e) => setIsRecruiting(e.target.checked)} className="accent-purple-600" />
              Show on crew showcase
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Open Roles</Label>
            <div className="flex gap-1.5">
              <Input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } }}
                placeholder="e.g. 2D Animator"
                list="production-roles"
                className="bg-white/5 border-white/10"
              />
              <datalist id="production-roles">
                {PRODUCTION_ROLES.map((r) => <option key={r} value={r} />)}
              </datalist>
              <Button type="button" variant="ghost" size="icon" onClick={addRole} className="shrink-0 border border-white/10"><Plus className="h-4 w-4" /></Button>
            </div>
            {openRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {openRoles.map((r, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200">
                    {r.title}
                    <button onClick={() => setOpenRoles((prev) => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Onboarding Checklist</Label>
            <div className="space-y-1">
              {onboardingSteps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-zinc-300 bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5">
                  <span className="flex-1">{s}</span>
                  <button onClick={() => setOnboardingSteps((prev) => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3 text-zinc-500 hover:text-white" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input value={stepInput} onChange={(e) => setStepInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }} placeholder="Add a step" className="bg-white/5 border-white/10" />
              <Button type="button" variant="ghost" size="icon" onClick={addStep} className="shrink-0 border border-white/10"><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !logline.trim() || submitting} className="bg-purple-600 hover:bg-purple-500">
            {submitting ? 'Creating…' : 'Create Production'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
