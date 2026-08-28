'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Users, 
  Briefcase, 
  Sparkles, 
  Plus, 
  ArrowRight, 
  Clapperboard, 
  CheckCircle2, 
  Heart,
  Send,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export interface ProductionCrewListing {
  id: string;
  projectId: string;
  projectTitle: string;
  projectFormat: string;
  directorName: string;
  directorAvatar: string;
  bannerUrl: string;
  logline: string;
  shotsProgress: string; // e.g. "5 / 12 Shots Approved"
  openRoles: Array<{
    title: string;
    software: string[];
    urgency: 'high' | 'medium';
  }>;
  compensation: string; // e.g. "Crowdfund Rev-Share ($1,150 raised)" or "Portfolio Collab"
}

export const MOCK_CREW_LISTINGS: ProductionCrewListing[] = [
  {
    id: 'crew-1',
    projectId: 'proj-cyber-ronin',
    projectTitle: 'Cyber Ronin: Neon Protocol',
    projectFormat: '3D Short Film',
    directorName: 'Marcus Vance',
    directorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    logline: 'High-speed cyberpunk katana duel in subterranean Tokyo. Seeking specialists for combat arcs and smear frames.',
    shotsProgress: '5 of 12 Shots Approved',
    openRoles: [
      { title: '3D Character Rigger', software: ['Maya', 'Blender'], urgency: 'high' },
      { title: '2D FX & Smear Artist', software: ['ToonBoom', 'Photoshop'], urgency: 'medium' },
      { title: 'Sound & Foley Designer', software: ['Reaper', 'FMOD'], urgency: 'medium' },
    ],
    compensation: 'Crowdfund Revenue Share ($1,150 raised)',
  },
  {
    id: 'crew-2',
    projectId: 'proj-spirit-fox',
    projectTitle: 'Kitsune: Whispers of the Shrine',
    projectFormat: 'Creature Reel & Series Pilot',
    directorName: 'Elena Rostova',
    directorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    logline: 'Exploring stylized quadruped weight and magical particle interaction. Seeking lighting & lookdev animator.',
    shotsProgress: '4 of 8 Shots Approved',
    openRoles: [
      { title: 'Lighting & Unreal 5 LookDev', software: ['Unreal 5'], urgency: 'high' },
      { title: 'Quadruped In-Betweener', software: ['Blender'], urgency: 'medium' },
    ],
    compensation: 'Portfolio Collab & IMDB Credit',
  },
  {
    id: 'crew-3',
    projectId: 'proj-mech-strike',
    projectTitle: 'Aegis Vanguard: Titan Breach',
    projectFormat: 'Game Cinematic',
    directorName: 'Kai Tanaka',
    directorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    logline: 'Heavy mechanical biped locomotion and explosive missile barrage sequence for an indie mech action game.',
    shotsProgress: '2 of 6 Shots Approved',
    openRoles: [
      { title: 'Heavy Mech Combat Animator', software: ['Maya'], urgency: 'high' },
      { title: 'Environment Modeler', software: ['Blender', 'ZBrush'], urgency: 'medium' },
    ],
    compensation: 'Funded Indie Game Contract ($500/shot)',
  },
];

export function ProductionCrewsBoard() {
  const { toast } = useToast();
  const [selectedCrew, setSelectedCrew] = useState<ProductionCrewListing | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [applicantReel, setApplicantReel] = useState<string>('');
  const [applicantNote, setApplicantNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantReel.trim()) {
      toast({ title: 'Showreel / Portfolio URL Required', description: 'Please paste your showreel or portfolio link.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: '🎉 Application Sent to Director!',
        description: `Your reel has been submitted to ${selectedCrew?.directorName} for the ${selectedRole} role.`,
      });
      setSelectedCrew(null);
      setApplicantReel('');
      setApplicantNote('');
    }, 600);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
        <div className="space-y-1">
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-purple-400" />
            <span>Active Production Crews & Open Roles</span>
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium">
            Team up on indie short films, demo reels, and game cinematics.
          </p>
        </div>

        <Link href="/studio/projects">
          <Button className="h-10 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Post Open Role</span>
          </Button>
        </Link>
      </div>

      {/* Crew Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {MOCK_CREW_LISTINGS.map((crew) => (
          <div
            key={crew.id}
            className="group relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.04] via-zinc-950 to-black p-5 shadow-xl hover:border-purple-500/50 hover:shadow-purple-950/40 transition-all duration-300 flex flex-col justify-between"
          >
            {/* Banner & Director */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden mb-4 bg-black/60 border border-white/5">
              <Image
                src={crew.bannerUrl}
                alt={crew.projectTitle}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

              {/* Top Format Badge */}
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-black uppercase text-purple-300 tracking-wider">
                  {crew.projectFormat}
                </span>
              </div>

              {/* Progress Indicator */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                <span className="font-bold flex items-center gap-1.5 drop-shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {crew.shotsProgress}
                </span>
              </div>
            </div>

            {/* Project Header */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2.5">
                <img
                  src={crew.directorAvatar}
                  alt={crew.directorName}
                  className="h-8 w-8 rounded-full object-cover border border-purple-400/60 shadow-md"
                />
                <div>
                  <h4 className="text-base font-black text-white group-hover:text-purple-300 transition-colors truncate">
                    {crew.projectTitle}
                  </h4>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Directed by <span className="text-white font-semibold">{crew.directorName}</span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-medium">
                {crew.logline}
              </p>

              {/* Open Roles Pill Badges */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Open Roles ({crew.openRoles.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {crew.openRoles.map((role) => (
                    <button
                      key={role.title}
                      onClick={() => {
                        setSelectedCrew(crew);
                        setSelectedRole(role.title);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-[11px] font-bold text-purple-200 transition-all hover:scale-105 flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span>{role.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">⚡ Split:</span>
                <span>{crew.compensation}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-2">
              <Link href={`/studio/projects/${crew.projectId}`} className="flex-1">
                <Button variant="outline" className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs">
                  View Shot Board
                </Button>
              </Link>

              <Button
                onClick={() => {
                  setSelectedCrew(crew);
                  setSelectedRole(crew.openRoles[0]?.title || 'Animator');
                }}
                className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <span>Apply</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* 1-Click Application Dialog */}
      <Dialog open={Boolean(selectedCrew)} onOpenChange={(open) => !open && setSelectedCrew(null)}>
        <DialogContent className="max-w-lg bg-[#0d0a1a] border-purple-500/30 text-white p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-3xl">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Join Production Crew
              </span>
            </div>
            <DialogTitle className="text-2xl font-black text-white">
              Apply for {selectedRole}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Applying to <span className="text-white font-semibold">{selectedCrew?.projectTitle}</span> directed by {selectedCrew?.directorName}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApply} className="space-y-4 my-4 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Your Showreel / Portfolio URL *</label>
              <Input
                required
                value={applicantReel}
                onChange={(e) => setApplicantReel(e.target.value)}
                placeholder="https://vimeo.com/... or animationreference.org/u/..."
                className="bg-zinc-950 border-white/10 text-white h-11 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Quick Note on Software / Availability</label>
              <Textarea
                value={applicantNote}
                onChange={(e) => setApplicantNote(e.target.value)}
                placeholder="e.g. Maya 2024 & Blender rigger, available 10h/week..."
                rows={3}
                className="bg-zinc-950 border-white/10 text-white rounded-xl text-xs"
              />
            </div>

            <div className="pt-3 flex items-center justify-between gap-3 border-t border-white/10">
              <Button type="button" variant="ghost" onClick={() => setSelectedCrew(null)} className="text-zinc-400 hover:text-white rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting Reel...' : 'Submit Application'}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
