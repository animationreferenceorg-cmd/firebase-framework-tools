'use client';

import React, { useEffect, useState } from 'react';
import type { AnimationProject, CrewMember, CrewApplication } from '@/lib/types';
import {
  subscribeToCrew,
  subscribeToProjectApplications,
  acceptApplication,
  declineApplication,
  updateOnboardingProgress,
  updateProject,
  updateCrewMemberDepartment,
} from '@/lib/project-service';
import { getUserProfile } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Plus } from 'lucide-react';
import { PRODUCTION_ROLES } from '@/lib/types';
import { nanoid } from 'nanoid';

const DEPARTMENT_COLOR_PALETTE = ['#f472b6', '#fb923c', '#a855f7', '#38bdf8', '#4ade80', '#facc15', '#f87171', '#818cf8'];

interface CrewTabProps {
  project: AnimationProject;
  currentUserId: string;
  isOwner: boolean;
  onProjectUpdated: (project: AnimationProject) => void;
}

export function CrewTab({ project, currentUserId, isOwner, onProjectUpdated }: CrewTabProps) {
  const { toast } = useToast();
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [applications, setApplications] = useState<CrewApplication[]>([]);
  const [roleInput, setRoleInput] = useState('');
  const [deptInput, setDeptInput] = useState('');

  useEffect(() => {
    const unsub = subscribeToCrew(project.id, setCrew);
    return unsub;
  }, [project.id]);

  useEffect(() => {
    if (!isOwner) return;
    const unsub = subscribeToProjectApplications(project.id, setApplications);
    return unsub;
  }, [project.id, isOwner]);

  const handleAccept = async (app: CrewApplication) => {
    try {
      await acceptApplication(app);
      toast({ title: `${app.applicantName} joined the crew!` });
      const applicantProfile = await getUserProfile(app.applicantId).catch(() => null);
      if (applicantProfile?.email) {
        fetch('/api/notify-crew-accepted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: applicantProfile.email,
            applicantName: app.applicantName,
            projectTitle: project.title,
            projectId: project.id,
          }),
        }).catch(() => {});
      }
      onProjectUpdated({ ...project, teamMemberIds: Array.from(new Set([...project.teamMemberIds, app.applicantId])) });
    } catch (err) {
      console.error('Failed to accept application:', err);
      toast({ title: 'Could not accept application', variant: 'destructive' });
    }
  };

  const handleDecline = async (app: CrewApplication) => {
    try {
      await declineApplication(app.id);
      toast({ title: 'Application declined' });
    } catch (err) {
      console.error('Failed to decline application:', err);
      toast({ title: 'Could not decline application', variant: 'destructive' });
    }
  };

  const myProgress = crew.find((c) => c.userId === currentUserId);

  const toggleStep = async (stepId: string) => {
    if (!myProgress) return;
    const has = myProgress.completedSteps.includes(stepId);
    const next = has ? myProgress.completedSteps.filter((s) => s !== stepId) : [...myProgress.completedSteps, stepId];
    setCrew((prev) => prev.map((c) => (c.userId === currentUserId ? { ...c, completedSteps: next } : c)));
    try {
      await updateOnboardingProgress(project.id, currentUserId, next);
    } catch (err) {
      console.error('Failed to update onboarding progress:', err);
    }
  };

  const addOpenRole = async () => {
    const title = roleInput.trim();
    if (!title) return;
    const next = [...project.openRoles, { id: `${Date.now()}`, title, filled: false }];
    setRoleInput('');
    try {
      await updateProject(project.id, { openRoles: next });
      onProjectUpdated({ ...project, openRoles: next });
    } catch (err) {
      console.error('Failed to add role:', err);
      toast({ title: 'Could not add role', variant: 'destructive' });
    }
  };

  const removeOpenRole = async (id: string) => {
    const next = project.openRoles.filter((r) => r.id !== id);
    try {
      await updateProject(project.id, { openRoles: next });
      onProjectUpdated({ ...project, openRoles: next });
    } catch (err) {
      console.error('Failed to remove role:', err);
    }
  };

  const handleMemberDepartmentChange = async (userId: string, departmentId: string) => {
    setCrew((prev) => prev.map((c) => (c.userId === userId ? { ...c, departmentId } : c)));
    try {
      await updateCrewMemberDepartment(project.id, userId, departmentId || null);
    } catch (err) {
      console.error('Failed to update department:', err);
      toast({ title: 'Could not update department', variant: 'destructive' });
    }
  };

  const addDepartment = async () => {
    const name = deptInput.trim();
    if (!name) return;
    const next = [...project.departments, { id: nanoid(8), name, color: DEPARTMENT_COLOR_PALETTE[project.departments.length % DEPARTMENT_COLOR_PALETTE.length] }];
    setDeptInput('');
    try {
      await updateProject(project.id, { departments: next });
      onProjectUpdated({ ...project, departments: next });
    } catch (err) {
      console.error('Failed to add department:', err);
      toast({ title: 'Could not add department', variant: 'destructive' });
    }
  };

  const removeDepartment = async (id: string) => {
    const next = project.departments.filter((d) => d.id !== id);
    try {
      await updateProject(project.id, { departments: next });
      onProjectUpdated({ ...project, departments: next });
    } catch (err) {
      console.error('Failed to remove department:', err);
    }
  };

  return (
    <div className="space-y-8">
      {myProgress && project.onboardingSteps.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Your onboarding checklist</h3>
          <div className="space-y-2">
            {project.onboardingSteps.map((step) => {
              const done = myProgress.completedSteps.includes(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => toggleStep(step.id)}
                  className="flex items-center gap-2.5 w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${done ? 'bg-purple-600 border-purple-500' : 'border-white/20'}`}>
                    {done && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className={done ? 'text-zinc-500 line-through' : 'text-zinc-200'}>{step.text}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {isOwner && applications.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Pending Applications ({applications.length})</h3>
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <Avatar>
                  <AvatarImage src={app.applicantAvatar} />
                  <AvatarFallback>{app.applicantName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white text-sm">{app.applicantName}</span>
                    {app.roleTitle && <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200">{app.roleTitle}</span>}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{app.message}</p>
                  {app.portfolioUrl && (
                    <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline mt-1 inline-block">View portfolio →</a>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => handleAccept(app)} className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10" title="Accept">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDecline(app)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Decline">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Crew ({crew.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {crew.map((member) => {
            const total = project.onboardingSteps.length;
            const done = member.completedSteps.length;
            const dept = project.departments.find((d) => d.id === member.departmentId);
            return (
              <div key={member.userId} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <Avatar>
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback>{member.name?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-medium truncate">{member.name}</div>
                  <div className="text-xs text-zinc-400">{member.role}</div>
                  {total > 0 && (
                    <div className="text-[10px] text-zinc-500 mt-0.5">{done}/{total} onboarding steps</div>
                  )}
                </div>
                {isOwner ? (
                  <Select value={member.departmentId ?? ''} onValueChange={(v) => handleMemberDepartmentChange(member.userId, v)}>
                    <SelectTrigger className="h-7 text-[11px] bg-white/5 border-white/10 w-32 shrink-0"><SelectValue placeholder="No dept." /></SelectTrigger>
                    <SelectContent>
                      {project.departments.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />{d.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : dept ? (
                  <span className="text-[10px] px-2 py-1 rounded-full border shrink-0 flex items-center gap-1.5" style={{ backgroundColor: `${dept.color}1a`, borderColor: `${dept.color}4d`, color: dept.color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dept.color }} />{dept.name}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {isOwner && (
        <section>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Departments</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {project.departments.map((d) => (
              <span key={d.id} className="flex items-center gap-1.5 text-[11px] pl-2 pr-1.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-200">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                {d.name}
                <button onClick={() => removeDepartment(d.id)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5 max-w-sm">
            <input
              value={deptInput}
              onChange={(e) => setDeptInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDepartment(); } }}
              placeholder="e.g. Rigging"
              className="flex-1 h-9 rounded-md bg-white/5 border border-white/10 px-3 text-xs text-white"
            />
            <Button type="button" variant="ghost" size="icon" onClick={addDepartment} className="shrink-0 border border-white/10 h-9 w-9"><Plus className="h-4 w-4" /></Button>
          </div>
        </section>
      )}

      {isOwner && (
        <section>
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Open Roles</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {project.openRoles.map((r) => (
              <span key={r.id} className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${r.filled ? 'bg-white/5 border-white/10 text-zinc-500' : 'bg-purple-500/10 border-purple-500/30 text-purple-200'}`}>
                {r.title}{r.filled && ' (filled)'}
                <button onClick={() => removeOpenRole(r.id)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5 max-w-sm">
            <input
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOpenRole(); } }}
              placeholder="e.g. Rigger"
              list="production-roles-crew-tab"
              className="flex-1 h-9 rounded-md bg-white/5 border border-white/10 px-3 text-xs text-white"
            />
            <datalist id="production-roles-crew-tab">
              {PRODUCTION_ROLES.map((r) => <option key={r} value={r} />)}
            </datalist>
            <Button type="button" variant="ghost" size="icon" onClick={addOpenRole} className="shrink-0 border border-white/10 h-9 w-9"><Plus className="h-4 w-4" /></Button>
          </div>
        </section>
      )}
    </div>
  );
}
