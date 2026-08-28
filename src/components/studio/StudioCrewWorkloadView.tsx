'use client';

import React, { useState } from 'react';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Video, 
  Clock, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface StudioCrewWorkloadViewProps {
  onNavigateToReview?: () => void;
}

const mockCrewData = [
  {
    id: 'c1',
    name: 'Elena Rostova',
    role: 'Lead Concept Artist',
    department: 'Art & Vis Dev',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    allocatedHours: 32,
    maxHours: 40,
    status: 'Optimal',
    activeTask: 'Hero Character Turnaround Concept Sheet',
    taskTimeline: [
      { day: 'Mon', hours: 8, task: 'Vis Dev Sketches' },
      { day: 'Tue', hours: 8, task: 'Color Pass' },
      { day: 'Wed', hours: 8, task: 'Model Sheet Polish' },
      { day: 'Thu', hours: 8, task: 'Review Submission' },
      { day: 'Fri', hours: 0, task: 'Buffer' }
    ]
  },
  {
    id: 'c2',
    name: 'Sarah Chen',
    role: 'Lead Animator',
    department: 'Animation',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    allocatedHours: 48,
    maxHours: 40,
    status: 'Overcapacity',
    activeTask: 'Shot 02 Character Combat Blocking & Splining',
    taskTimeline: [
      { day: 'Mon', hours: 10, task: 'Blocking Shot 02' },
      { day: 'Tue', hours: 10, task: 'In-Betweening' },
      { day: 'Wed', hours: 10, task: 'Splining Sword Arc' },
      { day: 'Thu', hours: 10, task: 'Polish & Cleanup' },
      { day: 'Fri', hours: 8, task: 'Dailies Prep' }
    ]
  },
  {
    id: 'c3',
    name: 'Marcus Vance',
    role: 'Senior 3D Artist',
    department: '3D Assets',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    allocatedHours: 40,
    maxHours: 40,
    status: 'Optimal',
    activeTask: 'Dojo Courtyard 3D Architecture Model',
    taskTimeline: [
      { day: 'Mon', hours: 8, task: 'High Poly Sculpt' },
      { day: 'Tue', hours: 8, task: 'Retopology' },
      { day: 'Wed', hours: 8, task: 'UV Unwrapping' },
      { day: 'Thu', hours: 8, task: 'Substance Texturing' },
      { day: 'Fri', hours: 8, task: 'Unreal Material Pass' }
    ]
  },
  {
    id: 'c4',
    name: 'Chloe Zhao',
    role: 'Tech Artist & Rigger',
    department: 'Rigging',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80',
    allocatedHours: 28,
    maxHours: 40,
    status: 'Available',
    activeTask: 'Hero Katana & Sword Rigging',
    taskTimeline: [
      { day: 'Mon', hours: 7, task: 'Bone Setup' },
      { day: 'Tue', hours: 7, task: 'Weight Painting' },
      { day: 'Wed', hours: 7, task: 'IK/FK Controls' },
      { day: 'Thu', hours: 7, task: 'Physics Constraints' },
      { day: 'Fri', hours: 0, task: 'Buffer' }
    ]
  },
  {
    id: 'c5',
    name: 'Alex Rivera',
    role: 'Director & Writer',
    department: 'Story & Direction',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    allocatedHours: 36,
    maxHours: 40,
    status: 'Optimal',
    activeTask: 'Act I Master Screenplay Polish & Dailies',
    taskTimeline: [
      { day: 'Mon', hours: 8, task: 'Script Revisions' },
      { day: 'Tue', hours: 8, task: 'Dailies Review' },
      { day: 'Wed', hours: 8, task: 'Storyboard Lock' },
      { day: 'Thu', hours: 6, task: 'Exec Meeting' },
      { day: 'Fri', hours: 6, task: 'Weekly Signoff' }
    ]
  }
];

export function StudioCrewWorkloadView({ onNavigateToReview }: StudioCrewWorkloadViewProps) {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState('Week 02 (Jan 12 - Jan 18)');

  const handleReviewClick = (artistName: string, taskName: string) => {
    toast({
      title: `Opening SyncSketch for ${artistName}`,
      description: `Loading asset: ${taskName}`,
    });
    if (onNavigateToReview) {
      onNavigateToReview();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f7f7f8] overflow-y-auto p-6 gap-6 font-sans">
      
      {/* Top Controls Header */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            <span>Crew Capacity & Workload Allocation (TeamGantt Mode)</span>
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Monitor weekly artist hours, detect overallocations, and launch direct SyncSketch reviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700">
            <Calendar className="h-4 w-4 text-orange-500" />
            <span>{selectedWeek}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5" /> 3 Optimal
            </span>
            <span className="flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
              <AlertTriangle className="h-3.5 w-3.5" /> 1 Overallocated
            </span>
          </div>
        </div>
      </div>

      {/* Crew Workload Matrix */}
      <div className="space-y-4 pb-12">
        {mockCrewData.map((crew) => {
          const isOver = crew.allocatedHours > crew.maxHours;
          const pct = Math.min(100, Math.round((crew.allocatedHours / crew.maxHours) * 100));

          return (
            <div 
              key={crew.id}
              className={cn(
                "bg-white rounded-2xl border p-5 shadow-sm flex flex-col gap-4 transition-all hover:shadow-md",
                isOver ? "border-rose-300 ring-1 ring-rose-300/40" : "border-gray-200/80"
              )}
            >
              {/* Row Top Header: Artist Info & Capacity Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-100">
                
                {/* Left: Artist Avatar & Dept */}
                <div className="flex items-center gap-3.5">
                  <img src={crew.avatar} alt={crew.name} className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-gray-900">{crew.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {crew.role}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 mt-0.5">{crew.department}</span>
                  </div>
                </div>

                {/* Center: Workload Capacity Progress Bar */}
                <div className="flex flex-col gap-1.5 min-w-[220px]">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-500">Weekly Allocated Hours</span>
                    <span className={cn(isOver ? "text-rose-600 font-black" : "text-gray-900")}>
                      {crew.allocatedHours}h / {crew.maxHours}h
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        isOver ? "bg-gradient-to-r from-rose-500 to-red-600" :
                        pct > 85 ? "bg-gradient-to-r from-amber-500 to-orange-500" :
                        "bg-gradient-to-r from-emerald-500 to-teal-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Right: Direct SyncSketch Review Button */}
                <button
                  onClick={() => handleReviewClick(crew.name, crew.activeTask)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer shrink-0"
                >
                  <Video className="h-4 w-4" />
                  <span>🎬 Review in SyncSketch</span>
                </button>

              </div>

              {/* Row Bottom: Active Task & Weekly Day Blocks */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                
                {/* Active Task Info */}
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200/80 px-3 py-1.5 rounded-xl">
                  <span className="text-orange-600 font-mono">ACTIVE:</span>
                  <span className="truncate max-w-[300px]">{crew.activeTask}</span>
                </div>

                {/* Day Blocks */}
                <div className="grid grid-cols-5 gap-2 w-full md:w-auto">
                  {crew.taskTimeline.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-xl border text-center min-w-[70px]",
                        item.hours > 8 ? "bg-rose-50 border-rose-200 text-rose-700" :
                        item.hours > 0 ? "bg-blue-50/70 border-blue-200 text-blue-800" :
                        "bg-gray-50 border-gray-100 text-gray-400"
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase">{item.day}</span>
                      <span className="text-xs font-black mt-0.5">{item.hours}h</span>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
