'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ProductionTask, CrewMember, ShotStatus, Department } from '@/lib/types';
import { subscribeToTasks, subscribeToCrew, createTask, updateTask } from '@/lib/project-service';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, LayoutGrid, List as ListIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskBoard } from './TaskBoard';
import { TaskListView } from './TaskListView';
import { NewTaskDialog } from './NewTaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';

interface TasksTabProps {
  projectId: string;
  departments: Department[];
  canEdit: boolean;
  isOwner: boolean;
  currentUser: { uid: string; name: string; avatar?: string };
}

type ViewMode = 'board' | 'list';

export function TasksTab({ projectId, departments, canEdit, isOwner, currentUser }: TasksTabProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);
  const [view, setView] = useState<ViewMode>('board');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  useEffect(() => { const unsub = subscribeToTasks(projectId, setTasks); return unsub; }, [projectId]);
  useEffect(() => { const unsub = subscribeToCrew(projectId, setCrew); return unsub; }, [projectId]);

  // Keep the open detail dialog in sync with live task updates.
  useEffect(() => {
    if (!selectedTask) return;
    const fresh = tasks.find((t) => t.id === selectedTask.id);
    if (fresh) setSelectedTask(fresh);
  }, [tasks, selectedTask?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTasks = useMemo(
    () => (departmentFilter === 'all' ? tasks : tasks.filter((t) => t.departmentId === departmentFilter)),
    [tasks, departmentFilter]
  );

  const handleStatusChange = async (taskId: string, status: ShotStatus) => {
    try {
      await updateTask(projectId, taskId, { status });
    } catch (err) {
      console.error('Failed to move task:', err);
      toast({ title: 'Could not move task', variant: 'destructive' });
    }
  };

  const handleCreate = async (input: Parameters<typeof createTask>[1]) => {
    try {
      return await createTask(projectId, input);
    } catch (err) {
      console.error('Failed to create task:', err);
      toast({ title: 'Could not create task', variant: 'destructive' });
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-1 rounded-full bg-white/5 border border-white/10">
            <button
              onClick={() => setView('board')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors', view === 'board' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white')}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors', view === 'list' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white')}
            >
              <ListIcon className="h-3.5 w-3.5" /> List
            </button>
          </div>

          {departments.length > 0 && (
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />{d.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {canEdit && (
          <Button onClick={() => setShowNewTask(true)} className="bg-purple-600 hover:bg-purple-500 gap-2">
            <Plus className="h-4 w-4" /> New Task
          </Button>
        )}
      </div>

      {view === 'board' ? (
        <TaskBoard tasks={filteredTasks} departments={departments} canEdit={canEdit} onStatusChange={handleStatusChange} onCardClick={setSelectedTask} />
      ) : (
        <TaskListView tasks={filteredTasks} departments={departments} onCardClick={setSelectedTask} />
      )}

      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} crew={crew} departments={departments} defaultStatus="concept" onCreate={handleCreate} />

      {selectedTask && (
        <TaskDetailDialog
          open={!!selectedTask}
          onOpenChange={(o) => { if (!o) setSelectedTask(null); }}
          task={selectedTask}
          projectId={projectId}
          crew={crew}
          departments={departments}
          isOwner={isOwner}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
