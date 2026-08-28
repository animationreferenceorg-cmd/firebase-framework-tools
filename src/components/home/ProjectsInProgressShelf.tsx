'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Clapperboard, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  Heart, 
  Layers,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MOCK_CREW_LISTINGS } from '@/components/crews/ProductionCrewsBoard';

export function ProjectsInProgressShelf() {
  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Indie Productions In-Progress
            </h3>
            <p className="text-xs text-zinc-400 font-medium">
              Active shot pipelines, open crew auditions & community short films
            </p>
          </div>
        </div>

        <Link
          href="/studio/projects"
          className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>All Studio Projects</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {MOCK_CREW_LISTINGS.map((project) => (
          <div
            key={project.id}
            className="group relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.04] via-zinc-950 to-black p-4 shadow-xl hover:border-purple-500/50 hover:shadow-purple-950/40 transition-all duration-300 flex flex-col justify-between"
          >
            {/* Banner & Progress Header */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-3.5 bg-black/60 border border-white/5">
              <Image
                src={project.bannerUrl}
                alt={project.projectTitle}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

              <div className="absolute top-2.5 left-2.5">
                <span className="px-2.5 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-black uppercase text-purple-300 border border-white/15">
                  {project.projectFormat}
                </span>
              </div>

              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {project.shotsProgress}
                </span>
              </div>
            </div>

            {/* Project Content */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6 border border-purple-400/60">
                  <AvatarImage src={project.directorAvatar} alt={project.directorName} />
                  <AvatarFallback className="text-[9px] bg-zinc-800">{project.directorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors truncate">
                    {project.projectTitle}
                  </h4>
                  <p className="text-[10px] text-zinc-400 truncate">Dir. {project.directorName}</p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-medium">
                {project.logline}
              </p>

              {/* Roles Badge List */}
              <div className="flex flex-wrap gap-1 pt-1">
                {project.openRoles.map(r => (
                  <span key={r.title} className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-800/40 text-[10px] text-purple-200 font-bold">
                    Need: {r.title}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-2">
              <Link href={`/studio/projects/${project.projectId}`} className="flex-1">
                <Button className="w-full h-9 rounded-xl bg-white/10 hover:bg-purple-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
                  <span>View Shot Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
