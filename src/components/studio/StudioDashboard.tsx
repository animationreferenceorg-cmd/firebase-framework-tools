'use client';

import React, { useState } from 'react';
import { 
  Film, 
  AlertCircle, 
  Box, 
  Clock,
  Plus,
  X,
  Calendar as CalendarIcon,
  AlignLeft,
  Users,
  ChevronLeft,
  ChevronRight,
  Kanban as KanbanIcon,
  BarChart3,
  CheckCircle2,
  Filter,
  Layers,
  Sparkles,
  ArrowUpRight,
  MoreHorizontal,
  Flame,
  Check,
  Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

// --- Mock Data ---

const summaryMetrics = [
  { title: 'Shots Approved', value: '142 / 250', trend: '56.8% Complete', date: 'Deadline: Apr 30', icon: Film, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50' },
  { title: 'Tasks in Review', value: '28', trend: '+4 today', date: 'Next Dailies: 3:00 PM', icon: AlertCircle, iconColor: 'text-amber-500', iconBg: 'bg-amber-50' },
  { title: 'Active Assets', value: '1,204', trend: '45 pending rig', date: 'Updated 2h ago', icon: Box, iconColor: 'text-blue-500', iconBg: 'bg-blue-50' },
  { title: 'Days to Delivery', value: '45', trend: 'On Schedule', date: 'Final Master: May 15', icon: Clock, iconColor: 'text-purple-500', iconBg: 'bg-purple-50' },
];

const shotStatusData = [
  { name: 'Blocking', value: 40, color: '#f59e0b', count: '100 shots' },
  { name: 'Splining', value: 25, color: '#3b82f6', count: '62 shots' },
  { name: 'Lighting', value: 20, color: '#8b5cf6', count: '50 shots' },
  { name: 'Compositing', value: 10, color: '#ec4899', count: '25 shots' },
  { name: 'Approved', value: 5, color: '#10b981', count: '13 shots' },
];

// Gantt Detailed Phase Data with Real Dates
const detailedGanttPhases = [
  {
    id: 'p1',
    name: 'Story & Screenplay Finalization',
    department: 'Story',
    deptColor: 'bg-pink-100 text-pink-700 border-pink-200',
    barColor: 'bg-gradient-to-r from-pink-500 to-rose-500',
    startDate: 'Jan 05, 2026',
    endDate: 'Jan 28, 2026',
    startMonthIndex: 0.1,
    durationMonth: 0.8,
    progress: 100,
    status: 'Completed',
    lead: 'Alex Rivera',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80'
  },
  {
    id: 'p2',
    name: 'Character & World Vis Dev',
    department: 'Art',
    deptColor: 'bg-orange-100 text-orange-700 border-orange-200',
    barColor: 'bg-gradient-to-r from-orange-500 to-amber-500',
    startDate: 'Jan 15, 2026',
    endDate: 'Feb 20, 2026',
    startMonthIndex: 0.4,
    durationMonth: 1.2,
    progress: 85,
    status: 'In Progress',
    lead: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80'
  },
  {
    id: 'p3',
    name: '3D Asset Modeling & Texturing',
    department: '3D Assets',
    deptColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    barColor: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    startDate: 'Feb 01, 2026',
    endDate: 'Mar 15, 2026',
    startMonthIndex: 0.9,
    durationMonth: 1.5,
    progress: 60,
    status: 'In Progress',
    lead: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80'
  },
  {
    id: 'p4',
    name: 'Hero Character Rigging & Cloth FX',
    department: 'Rigging',
    deptColor: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    barColor: 'bg-gradient-to-r from-cyan-500 to-teal-500',
    startDate: 'Feb 15, 2026',
    endDate: 'Mar 30, 2026',
    startMonthIndex: 1.4,
    durationMonth: 1.5,
    progress: 35,
    status: 'In Progress',
    lead: 'Chloe Zhao',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&q=80'
  },
  {
    id: 'p5',
    name: 'Animation Blocking & Splining (Shot 1-80)',
    department: 'Animation',
    deptColor: 'bg-blue-100 text-blue-700 border-blue-200',
    barColor: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    startDate: 'Mar 01, 2026',
    endDate: 'May 10, 2026',
    startMonthIndex: 1.9,
    durationMonth: 2.3,
    progress: 20,
    status: 'Upcoming',
    lead: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&q=80'
  },
  {
    id: 'p6',
    name: 'Lighting, Shading & Volumetrics',
    department: 'Lighting',
    deptColor: 'bg-purple-100 text-purple-700 border-purple-200',
    barColor: 'bg-gradient-to-r from-purple-500 to-violet-500',
    startDate: 'Apr 01, 2026',
    endDate: 'May 25, 2026',
    startMonthIndex: 2.9,
    durationMonth: 1.8,
    progress: 0,
    status: 'Upcoming',
    lead: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&q=80'
  },
  {
    id: 'p7',
    name: 'Final Compositing, Color Grade & Sound FX',
    department: 'Post / Comp',
    deptColor: 'bg-pink-100 text-pink-700 border-pink-200',
    barColor: 'bg-gradient-to-r from-pink-500 to-red-500',
    startDate: 'May 01, 2026',
    endDate: 'Jun 15, 2026',
    startMonthIndex: 3.9,
    durationMonth: 1.5,
    progress: 0,
    status: 'Upcoming',
    lead: 'Tara Sterling',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&q=80'
  }
];

const ganttMonths = [
  { name: 'January 2026', short: 'Jan', weeks: ['W1', 'W2', 'W3', 'W4'] },
  { name: 'February 2026', short: 'Feb', weeks: ['W5', 'W6', 'W7', 'W8'] },
  { name: 'March 2026', short: 'Mar', weeks: ['W9', 'W10', 'W11', 'W12'] },
  { name: 'April 2026', short: 'Apr', weeks: ['W13', 'W14', 'W15', 'W16'] },
  { name: 'May 2026', short: 'May', weeks: ['W17', 'W18', 'W19', 'W20'] },
  { name: 'June 2026', short: 'Jun', weeks: ['W21', 'W22', 'W23', 'W24'] },
];

// Calendar Events Data
const calendarDaysFeb2026 = [
  // Previous month spill
  { day: 26, isCurrentMonth: false, events: [] },
  { day: 27, isCurrentMonth: false, events: [] },
  { day: 28, isCurrentMonth: false, events: [] },
  { day: 29, isCurrentMonth: false, events: [] },
  { day: 30, isCurrentMonth: false, events: [] },
  { day: 31, isCurrentMonth: false, events: [] },
  { day: 1, isCurrentMonth: true, isWeekend: true, events: [] },
  { 
    day: 2, 
    isCurrentMonth: true, 
    events: [
      { id: 'e1', title: 'Asset Modeling Kickoff', time: '10:00 AM', dept: 'Art', color: 'bg-orange-500' }
    ] 
  },
  { day: 3, isCurrentMonth: true, events: [] },
  { 
    day: 4, 
    isCurrentMonth: true, 
    events: [
      { id: 'e2', title: 'Story Review with Execs', time: '2:30 PM', dept: 'Story', color: 'bg-pink-500' }
    ] 
  },
  { day: 5, isCurrentMonth: true, events: [] },
  { 
    day: 6, 
    isCurrentMonth: true, 
    events: [
      { id: 'e3', title: 'Dailies Screening #12', time: '4:00 PM', dept: 'All', color: 'bg-emerald-500' }
    ] 
  },
  { day: 7, isCurrentMonth: true, isWeekend: true, events: [] },
  { day: 8, isCurrentMonth: true, isWeekend: true, events: [] },
  { 
    day: 9, 
    isCurrentMonth: true, 
    events: [
      { id: 'e4', title: 'Hero Turnaround Approval', time: '11:00 AM', dept: 'Art', color: 'bg-orange-500' }
    ] 
  },
  { day: 10, isCurrentMonth: true, events: [] },
  { 
    day: 11, 
    isCurrentMonth: true, 
    events: [
      { id: 'e5', title: 'Rigging Pipeline Sync', time: '1:00 PM', dept: 'Tech', color: 'bg-cyan-500' }
    ] 
  },
  { day: 12, isCurrentMonth: true, events: [] },
  { 
    day: 13, 
    isCurrentMonth: true, 
    isToday: true,
    events: [
      { id: 'e6', title: 'Sprint 04 Milestone Cut', time: '3:00 PM', dept: 'Prod', color: 'bg-purple-500' },
      { id: 'e7', title: 'Lighting Tech Test', time: '5:00 PM', dept: 'Lighting', color: 'bg-violet-500' }
    ] 
  },
  { day: 14, isCurrentMonth: true, isWeekend: true, events: [] },
  { day: 15, isCurrentMonth: true, isWeekend: true, events: [] },
  { 
    day: 16, 
    isCurrentMonth: true, 
    events: [
      { id: 'e8', title: 'Anim Layout Sign-off', time: '9:30 AM', dept: 'Animation', color: 'bg-blue-500' }
    ] 
  },
  { day: 17, isCurrentMonth: true, events: [] },
  { 
    day: 18, 
    isCurrentMonth: true, 
    events: [
      { id: 'e9', title: 'Storyboard Lock (Act I)', time: '2:00 PM', dept: 'Story', color: 'bg-pink-500' }
    ] 
  },
  { day: 19, isCurrentMonth: true, events: [] },
  { 
    day: 20, 
    isCurrentMonth: true, 
    events: [
      { id: 'e10', title: 'Vis Dev Milestone Deadline', time: '6:00 PM', dept: 'Art', color: 'bg-rose-500' }
    ] 
  },
  { day: 21, isCurrentMonth: true, isWeekend: true, events: [] },
  { day: 22, isCurrentMonth: true, isWeekend: true, events: [] },
  { 
    day: 23, 
    isCurrentMonth: true, 
    events: [
      { id: 'e11', title: 'Hero Rig Hand-off', time: '10:00 AM', dept: 'Rigging', color: 'bg-cyan-500' }
    ] 
  },
  { day: 24, isCurrentMonth: true, events: [] },
  { 
    day: 25, 
    isCurrentMonth: true, 
    events: [
      { id: 'e12', title: 'Animation Blocking Begins', time: '9:00 AM', dept: 'Animation', color: 'bg-blue-500' }
    ] 
  },
  { day: 26, isCurrentMonth: true, events: [] },
  { 
    day: 27, 
    isCurrentMonth: true, 
    events: [
      { id: 'e13', title: 'Monthly Producer Review', time: '4:30 PM', dept: 'All', color: 'bg-emerald-500' }
    ] 
  },
  { day: 28, isCurrentMonth: true, isWeekend: true, events: [] },
  // Next month spill
  { day: 1, isCurrentMonth: false, isWeekend: true, events: [] },
];

// Kanban Overview Board Mock Data
const overviewKanbanColumns = [
  {
    id: 'todo',
    title: 'To Do',
    count: 14,
    color: 'border-t-zinc-400',
    tasks: [
      { id: 'k1', title: 'Texture Village Background Props', dept: '3D Assets', date: 'Due Feb 24', priority: 'Medium', assignees: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80'] },
      { id: 'k2', title: 'Facial Blendshapes for Secondary Cast', dept: 'Rigging', date: 'Due Mar 02', priority: 'High', assignees: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&q=80'] },
      { id: 'k3', title: 'Camera Track Shot 12-18', dept: 'Layout', date: 'Due Mar 05', priority: 'Low', assignees: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80'] },
    ]
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    count: 8,
    color: 'border-t-blue-500',
    tasks: [
      { id: 'k4', title: 'Hero Character Turnaround Final Clean', dept: 'Art', date: 'Due Feb 18', priority: 'High', assignees: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80'] },
      { id: 'k5', title: 'Anim Keyframe Blocking (Shot 02)', dept: 'Animation', date: 'Due Feb 20', priority: 'High', assignees: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&q=80'] },
      { id: 'k6', title: 'Temple Roof Shading & Volumetric Fog', dept: 'Lighting', date: 'Due Feb 22', priority: 'Medium', assignees: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&q=80'] },
    ]
  },
  {
    id: 'review',
    title: 'In Review / Dailies',
    count: 5,
    color: 'border-t-amber-500',
    tasks: [
      { id: 'k7', title: 'Action Sequence Storyboard (Scene 03)', dept: 'Story', date: 'Today, 3 PM', priority: 'High', assignees: ['https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=50&q=80'] },
      { id: 'k8', title: 'Main Antagonist Sword Model & Rig', dept: 'Tech', date: 'Today, 4 PM', priority: 'Medium', assignees: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&q=80'] },
    ]
  },
  {
    id: 'approved',
    title: 'Approved & Delivered',
    count: 26,
    color: 'border-t-emerald-500',
    tasks: [
      { id: 'k9', title: 'Act I Master Screenplay', dept: 'Story', date: 'Completed Jan 28', priority: 'High', assignees: ['https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=50&q=80'] },
      { id: 'k10', title: 'Environment Color Script & Moodboard', dept: 'Art', date: 'Completed Feb 04', priority: 'Medium', assignees: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80'] },
    ]
  }
];

export function StudioDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'gantt' | 'calendar' | 'kanban' | 'analytics'>('gantt');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(13);
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDepartment, setTaskDepartment] = useState('Story & Screenplay');

  const selectedDayInfo = calendarDaysFeb2026.find(d => d.day === selectedCalendarDate && d.isCurrentMonth);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f7f7f8] p-8 gap-8 text-[#1f1f22] relative font-sans">
      
      {/* ──────────────── HEADER ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Production Overview</h1>
            <span className="text-xs font-mono font-bold bg-orange-50 text-orange-600 border border-orange-200/80 px-2.5 py-0.5 rounded-full">
              SEASON 1 • H1 2026
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-500 mt-1">
            Master roadmap, live department schedule, calendar milestones and Kanban pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task / Milestone</span>
          </button>
        </div>
      </div>

      {/* ──────────────── 1. SUMMARY METRICS (KPI Cards) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryMetrics.map((card, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", card.iconBg)}>
                <card.icon className={cn("h-5 w-5", card.iconColor)} />
              </div>
              <span className="text-[11px] font-bold text-gray-400 font-mono">{card.date}</span>
            </div>
            
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{card.title}</span>
              <h2 className="text-2xl font-black text-gray-900 mt-0.5">{card.value}</h2>
            </div>

            <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-600 flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {card.trend}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Live Sync</span>
            </div>
          </div>
        ))}
      </div>

      {/* ──────────────── 2. TAB SELECTOR BAR ──────────────── */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Navigation Tabs */}
        <div className="flex items-center bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('gantt')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === 'gantt' 
                ? "bg-white text-gray-900 shadow-sm font-black" 
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Clock className="h-4 w-4 text-orange-500" />
            <span>Gantt Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === 'calendar' 
                ? "bg-white text-gray-900 shadow-sm font-black" 
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <CalendarIcon className="h-4 w-4 text-blue-500" />
            <span>Calendar View</span>
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === 'kanban' 
                ? "bg-white text-gray-900 shadow-sm font-black" 
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <KanbanIcon className="h-4 w-4 text-purple-500" />
            <span>Kanban Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === 'analytics' 
                ? "bg-white text-gray-900 shadow-sm font-black" 
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            <span>Shot Analytics</span>
          </button>
        </div>

        {/* Right Tab Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <span>Dept:</span>
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
            >
              <option>All</option>
              <option>Story</option>
              <option>Art</option>
              <option>Animation</option>
              <option>Rigging</option>
              <option>Lighting</option>
            </select>
          </div>

          <span className="text-xs font-mono font-bold text-gray-400 bg-gray-100 px-3 py-2 rounded-xl">
            {activeTab === 'gantt' && 'H1 2026 (Jan - Jun)'}
            {activeTab === 'calendar' && 'February 2026'}
            {activeTab === 'kanban' && 'Active Sprints'}
            {activeTab === 'analytics' && '250 Total Shots'}
          </span>
        </div>

      </div>

      {/* ──────────────── 3. TAB CONTENT ──────────────── */}

      {/* TAB A: GANTT CHART VIEW */}
      {activeTab === 'gantt' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6 overflow-hidden">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Master Production Schedule & Deliverables</span>
                <span className="text-xs font-mono font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-md">
                  7 Core Phases
                </span>
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Exact calendar windows, phase dependencies and department ownership.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" /> In Progress</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Upcoming</div>
            </div>
          </div>

          {/* Gantt Matrix */}
          <div className="overflow-x-auto">
            <div className="min-w-[950px]">
              
              {/* Timeline Header (Months & Weeks) */}
              <div className="grid grid-cols-12 gap-0 mb-3 border-b border-gray-200 pb-2">
                
                {/* Left Phase Info Column (span 4) */}
                <div className="col-span-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-2">
                  Phase / Department / Dates
                </div>

                {/* Right 6 Months Grid (span 8) */}
                <div className="col-span-8 grid grid-cols-6 text-center">
                  {ganttMonths.map((m, i) => (
                    <div key={i} className="border-l border-gray-200 pl-2">
                      <div className="text-xs font-black text-gray-800">{m.short}</div>
                      <div className="text-[9px] font-mono text-gray-400">2026</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Rows */}
              <div className="space-y-3 relative pb-4">
                
                {/* Background Month Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                  <div className="col-span-4" />
                  <div className="col-span-8 grid grid-cols-6 h-full">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="border-l border-dashed border-gray-100 h-full" />
                    ))}
                  </div>
                </div>

                {/* Phase Rows */}
                {detailedGanttPhases.map((phase) => (
                  <div 
                    key={phase.id} 
                    className="grid grid-cols-12 items-center bg-gray-50/70 hover:bg-gray-100/60 p-2.5 rounded-xl border border-gray-100 transition-colors relative z-10"
                  >
                    
                    {/* Phase Info (span 4) */}
                    <div className="col-span-4 pr-4 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <img src={phase.avatar} alt={phase.lead} className="w-5 h-5 rounded-full object-cover border border-white shrink-0" />
                        <span className="text-xs font-bold text-gray-900 truncate">{phase.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                        <span className={cn("px-1.5 py-0.2 rounded border font-semibold", phase.deptColor)}>
                          {phase.department}
                        </span>
                        <span className="font-mono text-gray-400">
                          {phase.startDate.split(',')[0]} → {phase.endDate.split(',')[0]}
                        </span>
                        <span className="font-bold text-gray-600 ml-auto">{phase.progress}%</span>
                      </div>
                    </div>

                    {/* Timeline Bar (span 8) */}
                    <div className="col-span-8 relative h-9 flex items-center">
                      <div 
                        className={cn(
                          "absolute h-7 rounded-lg shadow-sm flex items-center justify-between px-3 cursor-pointer hover:shadow-md hover:brightness-105 transition-all text-white",
                          phase.barColor
                        )}
                        style={{ 
                          left: `${(phase.startMonthIndex / 5.5) * 100}%`, 
                          width: `${Math.max(12, (phase.durationMonth / 5.5) * 100)}%` 
                        }}
                      >
                        <span className="text-[10px] font-black truncate drop-shadow-sm">
                          {phase.name}
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-black/20 px-1.5 py-0.5 rounded ml-2 shrink-0">
                          {phase.progress === 100 ? 'DONE' : `${phase.progress}%`}
                        </span>
                      </div>
                    </div>

                  </div>
                ))}

              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB B: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Month Grid (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
            
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-gray-900">February 2026</h2>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
                  13 Scheduled Events
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Today
                </button>
                <button className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span className="text-rose-400">Sat</span>
              <span className="text-rose-400">Sun</span>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDaysFeb2026.map((item, idx) => {
                const isSelected = item.day === selectedCalendarDate && item.isCurrentMonth;

                return (
                  <div
                    key={idx}
                    onClick={() => item.isCurrentMonth && setSelectedCalendarDate(item.day)}
                    className={cn(
                      "min-h-[90px] p-2 rounded-xl border flex flex-col gap-1.5 transition-all text-left relative",
                      !item.isCurrentMonth && "bg-gray-50/40 text-gray-300 border-transparent cursor-default",
                      item.isCurrentMonth && "bg-white border-gray-100 hover:border-blue-300 hover:shadow-sm cursor-pointer",
                      item.isToday && "ring-2 ring-orange-500 border-orange-500 bg-orange-50/20",
                      isSelected && "ring-2 ring-blue-500 border-blue-500 bg-blue-50/30"
                    )}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-bold",
                        item.isToday ? "h-6 w-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-black" :
                        isSelected ? "text-blue-600 font-black" :
                        item.isCurrentMonth ? "text-gray-800" : "text-gray-300"
                      )}>
                        {item.day}
                      </span>
                      {item.isToday && (
                        <span className="text-[9px] font-bold text-orange-600 uppercase font-mono">Today</span>
                      )}
                    </div>

                    {/* Events List for Day */}
                    <div className="space-y-1 overflow-hidden">
                      {item.events.map(ev => (
                        <div 
                          key={ev.id}
                          className={cn(
                            "text-[10px] font-bold text-white px-1.5 py-0.5 rounded truncate shadow-xs",
                            ev.color
                          )}
                          title={`${ev.time}: ${ev.title}`}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Selected Date Agenda Sidebar (1 col) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Daily Schedule</span>
              <h3 className="text-lg font-black text-gray-900 mt-1">
                Feb {selectedCalendarDate}, 2026
              </h3>
            </div>

            {selectedDayInfo && selectedDayInfo.events.length > 0 ? (
              <div className="space-y-3 flex-1 overflow-y-auto">
                {selectedDayInfo.events.map(ev => (
                  <div key={ev.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 flex flex-col gap-1.5 hover:border-gray-200 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-gray-500">{ev.time}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-gray-700 border border-gray-200">
                        {ev.dept}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-900 leading-snug">{ev.title}</h4>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <CalendarIcon className="h-8 w-8 text-gray-300 mb-2" />
                <span className="text-xs font-bold text-gray-500">No scheduled tasks</span>
                <span className="text-[11px] text-gray-400 mt-0.5">Click any date with events or click Create Task to add one.</span>
              </div>
            )}

            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Schedule Event for Feb {selectedCalendarDate}</span>
            </button>
          </div>

        </div>
      )}

      {/* TAB C: KANBAN PIPELINE VIEW */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {overviewKanbanColumns.map(col => (
            <div key={col.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
              
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-gray-900">{col.title}</h3>
                  <span className="text-xs font-mono font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {col.tasks.length}
                  </span>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Task Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {col.tasks.map(task => (
                  <div key={task.id} className="p-4 rounded-xl border border-gray-100 bg-[#fbfbfb] hover:bg-white hover:shadow-md hover:border-gray-200 transition-all flex flex-col gap-2.5 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-200/70 text-gray-700">
                        {task.dept}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                        task.priority === 'High' ? 'text-rose-600 bg-rose-50' :
                        task.priority === 'Medium' ? 'text-amber-600 bg-amber-50' :
                        'text-blue-600 bg-blue-50'
                      )}>
                        {task.priority}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-gray-900 leading-snug">{task.title}</h4>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px] font-medium text-gray-400 font-mono">
                      <span>{task.date}</span>
                      <div className="flex -space-x-1.5">
                        {task.assignees.map((img, i) => (
                          <img key={i} src={img} className="w-5 h-5 rounded-full border border-white object-cover" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Add Button */}
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="w-full py-2 border border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Task
              </button>

            </div>
          ))}
        </div>
      )}

      {/* TAB D: SHOT ANALYTICS VIEW */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Shot Breakdown Pie Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Shot Status Distribution</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">250 Total Sequence Shots in Episode 1</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shotStatusData}
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {shotStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-gray-900">250</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Shots</span>
                </div>
              </div>

              {/* Legend with Counts */}
              <div className="w-full mt-4 space-y-2.5">
                {shotStatusData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-700 font-semibold">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-gray-400">{item.count}</span>
                      <span className="font-bold text-gray-900">{item.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Department Production Velocity */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Department Velocity & Milestones</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Average turnaround time and weekly completion rate.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">Story & Boarding</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">98% on time</span>
                </div>
                <div className="text-2xl font-black text-gray-900">1.8 days / panel</div>
                <p className="text-xs text-gray-500">Act I & II locked ahead of schedule.</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">Character Vis Dev</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">85% on time</span>
                </div>
                <div className="text-2xl font-black text-gray-900">3.4 days / model sheet</div>
                <p className="text-xs text-gray-500">All primary protagonists approved.</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">Tech & Rigging</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Moderate load</span>
                </div>
                <div className="text-2xl font-black text-gray-900">5.2 days / hero rig</div>
                <p className="text-xs text-gray-500">Cloth and hair dynamics testing underway.</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">Animation Sprints</span>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Ramping up</span>
                </div>
                <div className="text-2xl font-black text-gray-900">22.5 sec / animator / wk</div>
                <p className="text-xs text-gray-500">Blocking kickoff scheduled for next sprint.</p>
              </div>

            </div>

            {/* Quick Director Note */}
            <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-orange-950">Executive Producer Note</h4>
                <p className="text-xs text-orange-800/90 mt-0.5 leading-relaxed">
                  Overall production velocity is tracking 4 days ahead of Q1 targets. Next milestone delivery is Episode 1 rough cut screening on March 15.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ──────────────── 4. TASK CREATION DRAWER ──────────────── */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div className={cn(
        "fixed top-0 right-0 h-full w-full max-w-[460px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 flex flex-col font-sans",
        isDrawerOpen ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Task / Milestone</h2>
            <p className="text-xs text-gray-500">Add to calendar, Gantt timeline and Kanban board.</p>
          </div>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-xs"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Task Title</label>
            <input 
              type="text" 
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. VisDev Character Design for Monkey" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Description & Notes</label>
            <div className="relative">
              <AlignLeft className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <textarea 
                rows={3}
                placeholder="Include specifications, reference links, and criteria..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Department</label>
              <select 
                value={taskDepartment}
                onChange={(e) => setTaskDepartment(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option>Story & Screenplay</option>
                <option>Art / Vis Dev</option>
                <option>3D Assets & Modeling</option>
                <option>Tech & Rigging</option>
                <option>Animation</option>
                <option>Lighting & Comp</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Priority</label>
              <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-orange-500 cursor-pointer">
                <option>High Priority</option>
                <option>Medium Priority</option>
                <option>Low Priority</option>
                <option>Critical Milestone</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Start Date</label>
              <input 
                type="date" 
                defaultValue="2026-02-13"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Due Date</label>
              <input 
                type="date" 
                defaultValue="2026-02-28"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Assignees</label>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="h-8 w-8 rounded-full bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-orange-200 transition-colors">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-xs text-gray-500 font-semibold">Click to assign team members...</span>
            </div>
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-3">
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              const name = taskTitle.trim() || 'VisDev Character Design for Monkey';
              const formattedFolderName = name.replace(/\s+/g, '_');
              toast({
                title: "Task Created & Folder Auto-Generated! 📁",
                description: `Created task "${name}". Auto-created Drive Folder: "02_VisDev/${formattedFolderName}". Progress uploads will auto-route to Dailies Review.`,
              });
              setIsDrawerOpen(false);
              setTaskTitle('');
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Create & Schedule</span>
          </button>
        </div>

      </div>

    </div>
  );
}
