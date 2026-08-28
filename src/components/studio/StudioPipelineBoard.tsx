'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  MoreHorizontal,
  Calendar,
  MessageSquare,
  Paperclip,
  Search,
  List,
  LayoutGrid,
  Workflow,
  Settings2,
  Filter,
  UserCircle2,
  Share2,
  Sparkles,
  Users,
  Video,
  Eye,
  Kanban,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StudioWorkflowBoard } from './StudioWorkflowBoard';
import { StudioTaskListView } from './StudioTaskListView';
import { StudioCrewWorkloadView } from './StudioCrewWorkloadView';
import { StudioGanttChartView } from './StudioGanttChartView';

// --- Types & Mock Data ---

type Priority = 'low' | 'medium' | 'high';
type Status = 'todo' | 'in-progress' | 'review' | 'complete';

interface TaskCard {
  id: string;
  title: string;
  description: string;
  status: Status;
  tags: string[];
  date: string;
  commentsCount: number;
  attachmentsCount: number;
  assignees: string[];
  imageUrl?: string;
}

const initialTasks: TaskCard[] = [
  {
    id: 't-1',
    title: 'Project Management Web App',
    description: 'Make a design for a web application for organizing the workspace of an IT company',
    status: 'todo',
    tags: ['Dribbble', 'Design'],
    date: '30 Jan',
    commentsCount: 2,
    attachmentsCount: 1,
    assignees: [
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=50&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 't-2',
    title: 'Neobank App Case',
    description: 'It should include wireframes, user flows, and visual design elements that demonstrate how the app delivers a seamless and modern banking experience',
    status: 'todo',
    tags: ['Behance', 'Design'],
    date: '5 Feb',
    commentsCount: 8,
    attachmentsCount: 3,
    assignees: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 't-3',
    title: 'Speaking App',
    description: 'Create a mobile application design for language exchange. The purpose of the application is to help users learn foreign languages',
    status: 'in-progress',
    tags: ['Dribbble', 'Design'],
    date: '30 Jan',
    commentsCount: 6,
    attachmentsCount: 2,
    assignees: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 't-4',
    title: 'Online Catalog Development',
    description: 'Develop an online employee directory for a company with more than 50,000 employees.',
    status: 'in-progress',
    tags: ['Dev', 'Design'],
    date: '3 Feb',
    commentsCount: 4,
    attachmentsCount: 1,
    assignees: [
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=50&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 't-5',
    title: 'Administrator Panel Interface',
    description: 'Develop an interface for the administrator to manage the rights of the company\'s users to various products',
    status: 'review',
    tags: ['Research', 'Design'],
    date: '24 Jan',
    commentsCount: 3,
    attachmentsCount: 1,
    assignees: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 't-6',
    title: 'Fintech App',
    description: 'The goal is to create an intuitive, user-friendly, and visually appealing design that simplifies complex financial transactions',
    status: 'review',
    tags: ['Design'],
    date: '23 Jan',
    commentsCount: 5,
    attachmentsCount: 3,
    imageUrl: 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=500&auto=format&fit=crop&q=60',
    assignees: [
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=50&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 't-7',
    title: 'Finance Manager',
    description: 'Make a design for a web application for organizing the workspace of an IT company',
    status: 'complete',
    tags: ['Dribbble', 'Design'],
    date: '12 Jan',
    commentsCount: 0,
    attachmentsCount: 0,
    assignees: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80'
    ]
  }
];

const COLUMNS: { id: Status; title: string; count: number; color: string }[] = [
  { id: 'todo', title: 'To Do / Backlog', count: 12, color: 'border-t-zinc-400' },
  { id: 'in-progress', title: 'In Progress (Active)', count: 2, color: 'border-t-blue-500' },
  { id: 'review', title: 'In Review / Dailies', count: 3, color: 'border-t-amber-500' },
  { id: 'complete', title: 'Approved & Done', count: 26, color: 'border-t-emerald-500' },
];

function getTagColor(tag: string) {
  switch (tag.toLowerCase()) {
    case 'design': return 'bg-orange-100 text-orange-600';
    case 'dribbble': return 'bg-pink-100 text-pink-600';
    case 'behance': return 'bg-blue-100 text-blue-600';
    case 'dev': return 'bg-cyan-100 text-cyan-600';
    case 'research': return 'bg-purple-100 text-purple-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

// --- Sortable Task Card Component ---
function SortableTaskCard({ task, onNavigateToReview }: { task: TaskCard; onNavigateToReview?: () => void }) {
  const { toast } = useToast();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group relative",
        isDragging && "opacity-30 border-dashed border-2 border-orange-400 bg-orange-50"
      )}
    >
      {/* Top Tags */}
      <div className="flex flex-wrap gap-2">
        {task.tags.map((tag, i) => (
          <span key={i} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide", getTagColor(tag))}>
            {tag}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5">
        <h4 className="text-[15px] font-bold text-[#1f1f22] leading-tight">{task.title}</h4>
        <p className="text-[12px] text-gray-500 line-clamp-3 leading-relaxed">{task.description}</p>
      </div>

      {/* Image (if any) */}
      {task.imageUrl && (
        <div className="w-full h-28 rounded-xl overflow-hidden mt-1">
          <img src={task.imageUrl} alt={task.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Bottom Bar: Date & Metadata */}
      <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg">
          <Calendar className="h-3.5 w-3.5" />
          <span>{task.date}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Avatars */}
          <div className="flex -space-x-2">
            {task.assignees.slice(0, 3).map((img, i) => (
              <img key={i} src={img} className="w-6 h-6 rounded-full border-2 border-white object-cover" />
            ))}
            {task.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-orange-500 flex items-center justify-center text-[9px] font-bold text-white z-10">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-gray-400">
            <span className="flex items-center gap-1 text-[11px] font-medium"><MessageSquare className="h-3.5 w-3.5" />{task.commentsCount}</span>
            <span className="flex items-center gap-1 text-[11px] font-medium"><Paperclip className="h-3.5 w-3.5" />{task.attachmentsCount}</span>
          </div>
        </div>
      </div>

      {/* SyncSketch Direct Action */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toast({
            title: `Loading ${task.title} into Review`,
            description: "Opening SyncSketch frame theater...",
          });
          if (onNavigateToReview) onNavigateToReview();
        }}
        className="w-full py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <Video className="h-3.5 w-3.5" />
        <span>🎬 Review in SyncSketch</span>
      </button>

    </div>
  );
}

// --- Main Pipeline Board ---
export function StudioPipelineBoard({ onNavigateToReview }: { onNavigateToReview?: () => void }) {
  const [tasks, setTasks] = useState<TaskCard[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskCard | null>(null);
  const [currentView, setCurrentView] = useState<'kanban' | 'list' | 'gantt' | 'workflow' | 'crew'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');

  const handleUpdateStatus = (taskId: string, newStatus: Status) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setTasks(tasks => {
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        const overIndex = tasks.findIndex(t => t.id === overId);

        if (tasks[activeIndex].status !== tasks[overIndex].status) {
          const newTasks = [...tasks];
          newTasks[activeIndex].status = tasks[overIndex].status;
          return arrayMove(newTasks, activeIndex, overIndex);
        }
        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setTasks(tasks => {
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex].status = overId as Status;
        return arrayMove(newTasks, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = () => {
    setActiveTask(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f7f7f8] text-[#1f1f22]">
      
      {/* Top Header Bar */}
      <div className="px-8 py-6 flex items-center justify-between border-b border-gray-200/50 shrink-0">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Task Management & Kanban Pipeline</h1>
            <p className="text-xs text-gray-500 mt-0.5">Drag-and-drop shot tracking, department lists, and crew capacity.</p>
          </div>
          
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setCurrentView('kanban')}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer", currentView === 'kanban' ? "bg-[#212124] text-white shadow-md font-bold" : "text-gray-500 hover:text-gray-900")}
            >
              <Kanban className="h-4 w-4 text-orange-500" /> Kanban Board
            </button>
            <button 
              onClick={() => setCurrentView('list')}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer", currentView === 'list' ? "bg-[#212124] text-white shadow-md font-bold" : "text-gray-500 hover:text-gray-900")}
            >
              <List className="h-4 w-4" /> Weekly Scheduler
            </button>
            <button 
              onClick={() => setCurrentView('gantt')}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer", currentView === 'gantt' ? "bg-[#212124] text-white shadow-md font-bold" : "text-gray-500 hover:text-gray-900")}
            >
              <Clock className="h-4 w-4 text-purple-400" /> Gantt Chart
            </button>
            <button 
              onClick={() => setCurrentView('workflow')}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer", currentView === 'workflow' ? "bg-[#212124] text-white shadow-md font-bold" : "text-gray-500 hover:text-gray-900")}
            >
              <Workflow className="h-4 w-4" /> Workflow
            </button>
            <button 
              onClick={() => setCurrentView('crew')}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer", currentView === 'crew' ? "bg-[#212124] text-white shadow-md font-bold" : "text-gray-500 hover:text-gray-900")}
            >
              <Users className="h-4 w-4" /> Crew Workload
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 px-4 py-2.5 rounded-xl text-sm font-bold text-[#1f1f22] shadow-sm transition-colors">
            <Sparkles className="h-4 w-4 text-orange-500" /> Automate
          </button>
          <button className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 px-4 py-2.5 rounded-xl text-sm font-bold text-[#1f1f22] shadow-sm transition-colors">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>

      {/* Secondary Bar: Search & Filters */}
      <div className="px-8 py-4 flex items-center justify-between border-b border-gray-200/50 bg-white/50 shrink-0">
        <div className="relative w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm font-medium text-gray-900"
          />
        </div>

        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            <Settings2 className="h-4 w-4" /> Sort by
          </button>
          <button className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            <Filter className="h-4 w-4" /> Filters
          </button>
          <button className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            <UserCircle2 className="h-4 w-4" /> Me
          </button>
          <button className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
            <Eye className="h-4 w-4" /> Show
          </button>
        </div>
      </div>

      {currentView === 'workflow' ? (
        <StudioWorkflowBoard />
      ) : currentView === 'gantt' ? (
        <StudioGanttChartView onNavigateToReview={onNavigateToReview} />
      ) : currentView === 'crew' ? (
        <StudioCrewWorkloadView onNavigateToReview={onNavigateToReview} />
      ) : currentView === 'list' ? (
        <StudioTaskListView 
          tasks={tasks}
          onUpdateStatus={handleUpdateStatus}
          onNavigateToReview={onNavigateToReview}
          onAddNewTask={() => {
            const newTask: TaskCard = {
              id: `task-${Date.now()}`,
              title: 'New Production Task',
              description: 'Created from List View. Assign team members and update timeline.',
              status: 'todo',
              tags: ['Art', 'Design'],
              date: 'Due Next Week',
              commentsCount: 0,
              attachmentsCount: 0,
              assignees: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80']
            };
            setTasks(prev => [newTask, ...prev]);
          }}
          searchQuery={searchQuery}
        />
      ) : (
        /* Kanban Board Area */
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 flex gap-6">
          
          {COLUMNS.map((col) => {
            const colTasks = tasks
              .filter(t => t.status === col.id)
              .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()));

            return (
              <div key={col.id} className="w-[320px] flex flex-col shrink-0 bg-gray-100/60 p-4 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-sm font-black text-gray-900">{col.title}</h3>
                  <span className="text-xs font-mono font-bold bg-white text-gray-700 px-2 py-0.5 rounded-full border border-gray-200 shadow-xs">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
                  <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {colTasks.map(task => (
                      <SortableTaskCard key={task.id} task={task} onNavigateToReview={onNavigateToReview} />
                    ))}
                  </SortableContext>
                </div>

                <button 
                  onClick={() => {
                    const newTask: TaskCard = {
                      id: `task-${Date.now()}`,
                      title: 'New Animation Task',
                      description: 'Task added to column. Assign team members and update timeline.',
                      status: col.id,
                      tags: ['Art', 'Design'],
                      date: 'Due Next Week',
                      commentsCount: 0,
                      attachmentsCount: 0,
                      assignees: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80']
                    };
                    setTasks(prev => [newTask, ...prev]);
                  }}
                  className="w-full mt-2 py-2 border border-dashed border-gray-300 hover:border-gray-400 hover:bg-white rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Task
                </button>
              </div>
            );
          })}

        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? <SortableTaskCard task={activeTask} onNavigateToReview={onNavigateToReview} /> : null}
        </DragOverlay>
      </DndContext>
      )}

    </div>
  );
}
