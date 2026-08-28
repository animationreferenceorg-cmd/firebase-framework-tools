'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { AnimationProject } from '@/lib/types';
import type { ProjectTaskStats } from '@/lib/project-service';
import { Clapperboard, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASE_LABELS: Record<AnimationProject['phase'], string> = {
  development: 'Development',
  pre_production: 'Pre-Production',
  in_production: 'In Production',
  post_production: 'Post-Production',
  completed: 'Completed',
};

const PHASE_DOT: Record<AnimationProject['phase'], string> = {
  development: '#facc15',
  pre_production: '#fb923c',
  in_production: '#a855f7',
  post_production: '#38bdf8',
  completed: '#4ade80',
};

export function ProjectCard({ project, taskStats }: { project: AnimationProject; taskStats?: ProjectTaskStats }) {
  const openRoleCount = project.openRoles?.filter((r) => !r.filled).length ?? 0;
  const progress = taskStats && taskStats.total > 0 ? Math.round((taskStats.approved / taskStats.total) * 100) : null;

  return (
    <Link
      href={`/studio`}
      className="group flex flex-col rounded-xl border border-white/10 bg-white/5 overflow-hidden hover:border-purple-500/50 hover:bg-white/[0.07] transition-colors"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="relative h-11 w-11 rounded-lg overflow-hidden shrink-0 bg-[conic-gradient(#2a2340_0deg_90deg,#1a1530_90deg_180deg,#2a2340_180deg_270deg,#1a1530_270deg_360deg)]">
          {project.coverImageUrl ? (
            <Image src={project.coverImageUrl} alt={project.title} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><Clapperboard className="h-4.5 w-4.5 text-purple-300/70" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors truncate">{project.title}</h3>
          <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{project.logline}</p>
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center gap-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: PHASE_DOT[project.phase] }} />
          {PHASE_LABELS[project.phase]}
        </span>
        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{project.teamMemberIds?.length ?? 1}</span>
        {openRoleCount > 0 && project.isRecruiting && (
          <span className="text-purple-300">{openRoleCount} open role{openRoleCount === 1 ? '' : 's'}</span>
        )}
      </div>

      <div className="px-4 pb-4 mt-auto">
        {progress !== null ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>{taskStats!.approved}/{taskStats!.total} tasks approved</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-zinc-600">No tasks yet</div>
        )}
      </div>

      {project.genre?.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {project.genre.slice(0, 3).map((g) => (
            <span key={g} className={cn('text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-500')}>{g}</span>
          ))}
        </div>
      )}
    </Link>
  );
}
