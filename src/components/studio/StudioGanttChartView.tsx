'use client';

import React, { useState } from 'react';
import { 
  Clock, 
  Video, 
  Plus, 
  LayoutGrid, 
  FileText, 
  Palette, 
  Layers, 
  GripVertical,
  Home,
  Bell,
  Trophy,
  ChevronDown,
  ChevronRight,
  Sparkles,
  BarChart2,
  Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface StudioGanttChartViewProps {
  onNavigateToReview?: () => void;
}

interface ClickUpTask {
  id: string;
  title: string;
  space: string;
  barColor: string; // Tailwind bg color
  textColor: string;
  startDayIdx: number; // 0 to 22
  durationDays: number;
  avatar: string;
  dependsOn?: string;
  hasConnectionNodes?: boolean;
}

const mockClickUpTasks: ClickUpTask[] = [
  {
    id: 'cu-1',
    title: 'Create new SLA for client',
    space: 'Development',
    barColor: 'bg-purple-600',
    textColor: 'text-white',
    startDayIdx: 2,
    durationDays: 5,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80'
  },
  {
    id: 'cu-2',
    title: 'Document KPIs',
    space: 'Development',
    barColor: 'bg-indigo-500',
    textColor: 'text-white',
    startDayIdx: 4,
    durationDays: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80',
    dependsOn: 'cu-1'
  },
  {
    id: 'cu-3',
    title: 'Develop new brand strategy',
    space: 'Marketing',
    barColor: 'bg-pink-600',
    textColor: 'text-white',
    startDayIdx: 4,
    durationDays: 8,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80',
    hasConnectionNodes: true,
    dependsOn: 'cu-2'
  },
  {
    id: 'cu-4',
    title: 'Implement strategy in email campaign',
    space: 'Marketing',
    barColor: 'bg-slate-200',
    textColor: 'text-slate-800',
    startDayIdx: 12,
    durationDays: 7,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&q=80',
    dependsOn: 'cu-3'
  },
  {
    id: 'cu-5',
    title: 'Align with video team',
    space: 'Product',
    barColor: 'bg-amber-500',
    textColor: 'text-white',
    startDayIdx: 10,
    durationDays: 5,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&q=80',
    dependsOn: 'cu-3'
  },
  {
    id: 'cu-6',
    title: 'Plan new TV ad campaign',
    space: 'Marketing',
    barColor: 'bg-slate-200',
    textColor: 'text-slate-800',
    startDayIdx: 14,
    durationDays: 8,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&q=80',
    dependsOn: 'cu-5'
  },
  {
    id: 'cu-7',
    title: 'Redesign client website',
    space: 'Product',
    barColor: 'bg-[#5cdb5c]',
    textColor: 'text-white',
    startDayIdx: 7,
    durationDays: 9,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&q=80'
  }
];

const clickUpDays = [
  '20', '21', '22', '23', '24', '25', '26', 
  '27', '28', '29', '30', '1', '2', '3', 
  '4', '5', '6', '7', '8', '9', '10', '11', '12'
];

export function StudioGanttChartView({ onNavigateToReview }: StudioGanttChartViewProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ClickUpTask[]>(mockClickUpTasks);
  const [selectedSpace, setSelectedSpace] = useState<string>('Everything');
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const filteredTasks = selectedSpace === 'Everything' 
    ? tasks 
    : tasks.filter(t => t.space === selectedSpace);

  return (
    <div className="flex-1 flex bg-white text-slate-800 font-sans overflow-hidden select-none">
      
      {/* ──────────────── 1. CLICKUP LEFT NAVIGATION SIDEBAR ──────────────── */}
      <div className="w-56 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 p-4 font-semibold text-slate-600 text-xs">
        
        <div className="flex flex-col gap-6">
          
          {/* ClickUp / TeamUnity Brand Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-xs shadow-md">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-black text-slate-900 tracking-tight">ClickUp</span>
          </div>

          {/* Home, Notifications, Goals */}
          <div className="flex flex-col gap-1">
            <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Home className="h-4 w-4 text-slate-400" />
              <span>Home</span>
            </button>

            <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Bell className="h-4 w-4 text-slate-400" />
              <span>Notifications</span>
            </button>

            <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Trophy className="h-4 w-4 text-slate-400" />
              <span>Goals</span>
            </button>
          </div>

          {/* SPACES ACCORDION SECTION */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between px-3 text-slate-500 font-bold text-[11px]">
              <span>Spaces</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 cursor-pointer" />
            </div>

            <button 
              onClick={() => setSelectedSpace('Everything')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer",
                selectedSpace === 'Everything' ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <LayoutGrid className="h-4 w-4 text-slate-400" />
              <span>Everything</span>
            </button>

            <button 
              onClick={() => setSelectedSpace('Development')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer",
                selectedSpace === 'Development' ? "bg-purple-50 text-purple-700 font-bold border border-purple-200/60" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <div className="w-5 h-5 rounded-md bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center">D</div>
              <span>Development</span>
            </button>

            <button 
              onClick={() => setSelectedSpace('Marketing')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer",
                selectedSpace === 'Marketing' ? "bg-amber-50 text-amber-700 font-bold border border-amber-200/60" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <div className="w-5 h-5 rounded-md bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">M</div>
              <span>Marketing</span>
            </button>

            <button 
              onClick={() => setSelectedSpace('Product')}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer",
                selectedSpace === 'Product' ? "bg-pink-50 text-pink-700 font-bold border border-pink-200/60" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <div className="w-5 h-5 rounded-md bg-pink-500 text-white font-bold text-[10px] flex items-center justify-center">P</div>
              <span>Product</span>
            </button>
          </div>

          {/* Dashboards & Docs */}
          <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
            <button className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
              <span>Dashboards</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <button className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
              <span>Docs</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

        </div>

        {/* Bottom User Avatar Stack */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-200 px-2 cursor-pointer">
          <div className="flex -space-x-1.5">
            <div className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs border-2 border-white">S</div>
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80" className="w-7 h-7 rounded-full object-cover border-2 border-white" />
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-auto" />
        </div>

      </div>

      {/* ──────────────── 2. MAIN CLICKUP GANTT CANVAS ──────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        
        {/* ClickUp Header Toolbar */}
        <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white shadow-xs z-30">
          <div className="flex items-center gap-6 text-sm font-semibold text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs shadow-xs">
                📦
              </div>
              <span>Project</span>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* ClickUp Active View Tabs */}
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-colors">
                <LayoutGrid className="h-4 w-4" /> Board
              </button>
              <button className="px-3.5 py-1.5 rounded-lg bg-pink-50 text-pink-600 font-bold border border-pink-200/80 flex items-center gap-1.5 shadow-xs">
                <Clock className="h-4 w-4 text-pink-500" /> Gantt
              </button>
              <button className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-colors">
                <Layers className="h-4 w-4" /> Timeline
              </button>
              <button className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-colors">
                <FileText className="h-4 w-4" /> Doc
              </button>
              <button className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-colors">
                <Palette className="h-4 w-4" /> Whiteboard
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                toast({
                  title: "Task Created in Gantt 🟢",
                  description: "Added new task to production timeline.",
                });
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Timeline Grid Container */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-auto bg-white relative">
          <div className="min-w-[1000px] w-full flex-1 flex flex-col relative pb-12">
            
            {/* Top Overall Milestone Green Progress Bar */}
            <div className="h-2.5 bg-emerald-500/30 w-full relative overflow-hidden shrink-0">
              <div className="h-full bg-[#5cdb5c] w-[55%] rounded-r-full shadow-xs" />
            </div>

            {/* Two-Tiered Date Header */}
            <div className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs shrink-0">
              {/* Top Tier: Week Ranges */}
              <div 
                className="text-center border-b border-slate-100 text-[11px] font-bold text-slate-500 py-1.5"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(23, minmax(0, 1fr))' }}
              >
                <div className="border-r border-slate-200" style={{ gridColumn: 'span 7' }}>20 APR - 26 APR</div>
                <div className="border-r border-slate-200" style={{ gridColumn: 'span 7' }}>27 APR - 3 MAY</div>
                <div style={{ gridColumn: 'span 9' }}>4 MAY - 10 MAY</div>
              </div>

              {/* Bottom Tier: Daily Numbers */}
              <div 
                className="text-center text-xs font-semibold text-slate-400 py-1.5"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(23, minmax(0, 1fr))' }}
              >
                {clickUpDays.map((day, idx) => (
                  <div key={idx} className={cn("py-0.5 relative flex justify-center", idx === 2 && "text-purple-600 font-black")}>
                    {day}
                    {idx === 2 && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-xs shadow-xs uppercase tracking-widest z-40">
                        TODAY
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Vertical TODAY Line Indicator */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-purple-500 z-20 pointer-events-none shadow-xs"
              style={{ left: `${((2.5 / 23) * 100).toFixed(2)}%` }}
            />

            {/* Vertical Grid Background Lines */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(23, minmax(0, 1fr))' }}
            >
              {clickUpDays.map((_, idx) => (
                <div key={idx} className="border-r border-slate-100 h-full" />
              ))}
            </div>

            {/* CLICKUP RIGHT-ANGLE STEPPED SVG CONNECTOR PATHS */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
              <defs>
                <marker id="cu-arrow-exact" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
                </marker>
                <marker id="cu-arrow-exact-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ec4899" />
                </marker>
              </defs>

              {filteredTasks.map((t, idx) => {
                if (!t.dependsOn) return null;
                const predIndex = filteredTasks.findIndex(x => x.id === t.dependsOn);
                if (predIndex === -1) return null;

                const pred = filteredTasks[predIndex];
                const rowHeight = 52;
                const headerHeight = 65;

                const y1 = headerHeight + (predIndex * rowHeight) + 26;
                const y2 = headerHeight + (idx * rowHeight) + 26;

                const x1Pct = ((pred.startDayIdx + pred.durationDays) / 23) * 100;
                const x2Pct = (t.startDayIdx / 23) * 100;

                const isHovered = hoveredTaskId === t.id || hoveredTaskId === pred.id;

                return (
                  <g key={`cu-exact-dep-${t.id}`}>
                    <path
                      d={`M ${x1Pct}% ${y1} H calc(${x1Pct}% + 12px) V ${y2} H ${x2Pct}%`}
                      fill="none"
                      stroke={isHovered ? '#ec4899' : '#cbd5e1'}
                      strokeWidth={isHovered ? 2 : 1.5}
                      markerEnd={isHovered ? 'url(#cu-arrow-exact-active)' : 'url(#cu-arrow-exact)'}
                      className="transition-all duration-200"
                    />
                  </g>
                );
              })}
            </svg>

            {/* FLOATING STAGGERED TASK PILL BARS */}
            <div className="flex flex-col relative z-10 pt-3">
              {filteredTasks.map((task) => {
                const isHovered = hoveredTaskId === task.id;

                return (
                  <div 
                    key={task.id}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    className="h-[52px] relative flex items-center px-2 group border-b border-slate-50"
                  >
                    {/* Floating Pill Bar with Embedded Avatar */}
                    <div
                      className={cn(
                        "absolute h-9 rounded-full shadow-md flex items-center justify-between pl-1 pr-4 transition-all cursor-pointer border border-black/10 group/bar",
                        task.barColor,
                        task.textColor,
                        isHovered && "ring-2 ring-purple-500 shadow-xl scale-[1.01]"
                      )}
                      style={{
                        left: `${(task.startDayIdx / 23) * 100}%`,
                        width: `${Math.max(14, (task.durationDays / 23) * 100)}%`
                      }}
                    >
                      {/* Embedded Avatar on Left Edge */}
                      <div className="flex items-center gap-2 truncate">
                        <img 
                          src={task.avatar} 
                          alt="Assignee" 
                          className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-xs shrink-0" 
                        />

                        {task.hasConnectionNodes && (
                          <GripVertical className="h-3.5 w-3.5 opacity-60 text-white shrink-0 -ml-1" />
                        )}

                        <span className="text-xs font-bold truncate drop-shadow-xs">
                          {task.title}
                        </span>
                      </div>

                      {/* Right Edge Connection Node & Review Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {task.hasConnectionNodes && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white border border-blue-500 shadow-xs" title="Dependency Node" />
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toast({
                              title: `Loading ${task.title} into Review`,
                              description: "Opening SyncSketch frame theater...",
                            });
                            if (onNavigateToReview) onNavigateToReview();
                          }}
                          className="opacity-0 group-hover/bar:opacity-100 p-1 rounded-full bg-black/30 hover:bg-black/60 text-white transition-opacity cursor-pointer"
                          title="Review in SyncSketch"
                        >
                          <Video className="h-3.5 w-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
