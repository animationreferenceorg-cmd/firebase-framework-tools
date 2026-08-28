'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  MoreHorizontal, 
  Calendar,
  MessageSquare,
  Paperclip,
  Check,
  ChevronRight,
  ArrowRight,
  Clock,
  Sparkles,
  UserPlus,
  Image as ImageIcon,
  Layers,
  ChevronDown,
  Video
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { TaskCard, Status } from './StudioPipelineBoard';

interface StudioTaskListViewProps {
  tasks: TaskCard[];
  onUpdateStatus: (taskId: string, newStatus: Status) => void;
  onAddNewTask: () => void;
  onNavigateToReview?: () => void;
  searchQuery?: string;
}

interface ScheduledTask {
  id: string;
  title: string;
  department: 'Story' | 'Art' | '3D Assets' | 'Rigging' | 'Animation' | 'Lighting';
  weekId: string;
  status: Status;
  estDays: string;
  thumbnail?: string;
  assignees: { name: string; avatar: string }[];
  commentsCount: number;
}

const mockWeeks = [
  { id: 'w1', label: 'Week 01', dates: 'Jan 05 - Jan 11' },
  { id: 'w2', label: 'Week 02', dates: 'Jan 12 - Jan 18' },
  { id: 'w3', label: 'Week 03', dates: 'Jan 19 - Jan 25' },
  { id: 'w4', label: 'Week 04', dates: 'Jan 26 - Feb 01' },
];

const mockDepartments = [
  { id: 'Story', name: 'Story & Screenplay', icon: '📝', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { id: 'Art', name: 'Art & Vis Dev', icon: '🎨', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: '3D Assets', name: '3D Asset Modeling & Textures', icon: '📦', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'Rigging', name: 'Tech & Character Rigging', icon: '⚙️', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'Animation', name: 'Animation Blocking & Splining', icon: '🎬', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'Lighting', name: 'Lighting & Compositing', icon: '💡', color: 'bg-purple-50 text-purple-700 border-purple-200' },
];

const initialScheduledTasks: ScheduledTask[] = [
  {
    id: 'st-1',
    title: 'Act I Master Screenplay Polish',
    department: 'Story',
    weekId: 'w1',
    status: 'complete',
    estDays: '4 Days',
    thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=150&auto=format&fit=crop&q=80',
    assignees: [{ name: 'Alex', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=50&q=80' }],
    commentsCount: 3
  },
  {
    id: 'st-2',
    title: 'Hero Character Turnaround Concept Sheet',
    department: 'Art',
    weekId: 'w1',
    status: 'in-progress',
    estDays: '5 Days',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    assignees: [
      { name: 'Elena', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80' },
      { name: 'Katrina', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80' }
    ],
    commentsCount: 12
  },
  {
    id: 'st-3',
    title: 'Scene 01 Environment Color Script',
    department: 'Art',
    weekId: 'w1',
    status: 'review',
    estDays: '3 Days',
    thumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&auto=format&fit=crop&q=80',
    assignees: [{ name: 'Elena', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80' }],
    commentsCount: 5
  },
  {
    id: 'st-4',
    title: 'Dojo Courtyard 3D Architecture Model',
    department: '3D Assets',
    weekId: 'w2',
    status: 'in-progress',
    estDays: '6 Days',
    thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&auto=format&fit=crop&q=80',
    assignees: [{ name: 'Marcus', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80' }],
    commentsCount: 2
  },
  {
    id: 'st-5',
    title: 'Hero Katana & Sword Rigging',
    department: 'Rigging',
    weekId: 'w2',
    status: 'todo',
    estDays: '2 Days',
    thumbnail: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80',
    assignees: [{ name: 'Chloe', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&q=80' }],
    commentsCount: 0
  },
  {
    id: 'st-6',
    title: 'Shot 02 Character Combat Blocking',
    department: 'Animation',
    weekId: 'w3',
    status: 'todo',
    estDays: '5 Days',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80',
    assignees: [{ name: 'Sarah', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&q=80' }],
    commentsCount: 1
  },
  {
    id: 'st-7',
    title: 'Temple Roof Volumetric Fog & Moon Lighting',
    department: 'Lighting',
    weekId: 'w4',
    status: 'todo',
    estDays: '4 Days',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=150&auto=format&fit=crop&q=80',
    assignees: [{ name: 'David', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&q=80' }],
    commentsCount: 0
  }
];

export function StudioTaskListView({
  tasks,
  onUpdateStatus,
  onAddNewTask,
  onNavigateToReview,
  searchQuery = ''
}: StudioTaskListViewProps) {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<string>('w1');
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>(initialScheduledTasks);
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  const activeWeekObj = mockWeeks.find(w => w.id === selectedWeek) || mockWeeks[0];

  const toggleDept = (deptId: string) => {
    setCollapsedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const handlePushToNextWeek = (taskId: string) => {
    const currentWeekIdx = mockWeeks.findIndex(w => w.id === selectedWeek);
    if (currentWeekIdx < mockWeeks.length - 1) {
      const nextWeekId = mockWeeks[currentWeekIdx + 1].id;
      setScheduledTasks(prev => prev.map(t => t.id === taskId ? { ...t, weekId: nextWeekId } : t));
    }
  };

  const handleTaskStatusChange = (taskId: string, newStatus: Status) => {
    setScheduledTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  // Filter tasks for active week & search
  const currentWeekTasks = scheduledTasks.filter(t => 
    t.weekId === selectedWeek &&
    (searchQuery === '' || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col bg-[#f7f7f8] overflow-y-auto p-6 gap-6 font-sans">
      
      {/* ──────────────── 1. WEEK TABS BAR ──────────────── */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Week Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {mockWeeks.map((week) => {
            const isSelected = week.id === selectedWeek;
            const weekTaskCount = scheduledTasks.filter(t => t.weekId === week.id).length;

            return (
              <button
                key={week.id}
                onClick={() => setSelectedWeek(week.id)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all text-xs cursor-pointer font-bold shrink-0",
                  isSelected
                    ? "bg-[#212124] text-white shadow-md"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/70"
                )}
              >
                <span>{week.label}</span>
                <span className={cn(
                  "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full",
                  isSelected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                )}>
                  {weekTaskCount}
                </span>
              </button>
            );
          })}

          <button 
            onClick={onAddNewTask}
            className="px-3.5 py-2.5 rounded-xl border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-xs font-bold text-gray-500 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Week</span>
          </button>
        </div>

        {/* Date Context Indicator */}
        <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <Calendar className="h-3.5 w-3.5 text-orange-500" />
            <span>Active Window: {activeWeekObj.dates}</span>
          </div>
        </div>

      </div>

      {/* ──────────────── 2. DEPARTMENT SECTIONS ──────────────── */}
      <div className="flex flex-col gap-5 pb-10">
        {mockDepartments.map((dept) => {
          const deptTasks = currentWeekTasks.filter(t => t.department === dept.id);
          const isCollapsed = collapsedDepts[dept.id];

          return (
            <div key={dept.id} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
              
              {/* Department Header */}
              <div 
                onClick={() => toggleDept(dept.id)}
                className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200/60 flex items-center justify-between cursor-pointer hover:bg-gray-100/60 transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{dept.icon}</span>
                  <h3 className="text-sm font-black text-gray-900">{dept.name}</h3>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", dept.color)}>
                    {deptTasks.length} {deptTasks.length === 1 ? 'task' : 'tasks'} scheduled
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddNewTask();
                    }}
                    className="h-7 px-2.5 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1 hover:bg-gray-50 transition-colors shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5 text-gray-500" />
                    <span>Assign Task</span>
                  </button>

                  <button className="text-gray-400 hover:text-gray-600 p-1">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Department Task Cards List */}
              {!isCollapsed && (
                <div className="p-4 flex flex-col gap-3">
                  {deptTasks.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs font-semibold bg-gray-50/40 rounded-xl border border-dashed border-gray-200">
                      No tasks assigned to {dept.name} in {activeWeekObj.label}. Click Assign Task to add one.
                    </div>
                  ) : (
                    deptTasks.map((task) => (
                      <div 
                        key={task.id}
                        className="bg-white border border-gray-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-orange-300 hover:shadow-md transition-all group"
                      >
                        
                        {/* Left: Thumbnail & Info */}
                        <div className="flex items-start md:items-center gap-4">
                          {task.thumbnail ? (
                            <img src={task.thumbnail} alt={task.title} className="w-16 h-12 rounded-lg object-cover border border-gray-100 shadow-xs shrink-0" />
                          ) : (
                            <div className="w-16 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}

                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-snug">
                                {task.title}
                              </h4>
                              {task.commentsCount > 0 && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                  <MessageSquare className="h-3 w-3" /> {task.commentsCount}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-500">
                              <span className="flex items-center gap-1 text-gray-400 font-mono">
                                <Clock className="h-3 w-3 text-gray-400" /> {task.estDays}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="font-mono text-gray-500">{activeWeekObj.dates}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Status Dropdown, Assignees & Quick Producer Actions */}
                        <div className="flex items-center gap-4 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                          
                          {/* Status Picker */}
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value as Status)}
                            className={cn(
                              "text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer transition-all shadow-xs",
                              task.status === 'complete' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              task.status === 'review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              task.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            )}
                          >
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="review">In Review</option>
                            <option value="complete">Approved</option>
                          </select>

                          {/* Crew Assignees */}
                          <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-2">
                              {task.assignees.map((person, i) => (
                                <img 
                                  key={i} 
                                  src={person.avatar} 
                                  alt={person.name} 
                                  className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-xs" 
                                  title={person.name}
                                />
                              ))}
                            </div>
                            <button 
                              onClick={onAddNewTask}
                              className="w-6 h-6 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-700 hover:border-gray-400 flex items-center justify-center transition-colors"
                              title="Assign Team Member"
                            >
                              <UserPlus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* SyncSketch Direct Review Button */}
                          <button
                            onClick={() => {
                              toast({
                                title: `Loading ${task.title} into Review`,
                                description: "Opening SyncSketch frame theater...",
                              });
                              if (onNavigateToReview) onNavigateToReview();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-orange-500/20 transition-all cursor-pointer shrink-0"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>SyncSketch</span>
                          </button>

                          {/* Producer Action: Push to Next Week */}
                          <button
                            onClick={() => handlePushToNextWeek(task.id)}
                            className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-orange-50 hover:text-orange-600 border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                            title="Extend assignment into next week"
                          >
                            <span>Push +1 Wk</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>

                        </div>

                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
