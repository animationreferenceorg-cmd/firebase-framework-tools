'use client';

import React, { useState } from 'react';
import { DndContext, closestCenter, useDroppable, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import type { ProductionTask, ShotStatus, Department } from '@/lib/types';
import { TaskCard } from './TaskCard';

const COLUMNS: { value: ShotStatus; label: string }[] = [
  { value: 'concept', label: 'Concept' },
  { value: 'storyboard', label: 'Storyboard' },
  { value: 'layout', label: 'Layout' },
  { value: 'blocking', label: 'Blocking' },
  { value: 'splining', label: 'Splining' },
  { value: 'polish', label: 'Polish' },
  { value: 'rendered', label: 'Rendered' },
  { value: 'approved', label: 'Approved' },
];

function Column({ status, label, tasks, departments, onCardClick }: { status: ShotStatus; label: string; tasks: ProductionTask[]; departments: Department[]; onCardClick: (t: ProductionTask) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-64 shrink-0 rounded-2xl border p-3 gap-2 transition-colors ${isOver ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10 bg-white/5'}`}
    >
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">{label}</h4>
        <span className="text-[10px] text-zinc-500">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-[60px]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} department={departments.find((d) => d.id === task.departmentId)} onClick={() => onCardClick(task)} />
        ))}
      </div>
    </div>
  );
}

export function TaskBoard({ tasks, departments, canEdit, onStatusChange, onCardClick }: {
  tasks: ProductionTask[];
  departments: Department[];
  canEdit: boolean;
  onStatusChange: (taskId: string, status: ShotStatus) => void;
  onCardClick: (task: ProductionTask) => void;
}) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !canEdit) return;
    const taskId = active.id as string;
    const newStatus = over.id as ShotStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) onStatusChange(taskId, newStatus);
  };

  // Without an activation distance, dnd-kit treats even a zero-movement
  // click as a completed drag and swallows the card's onClick — this is
  // what lets a plain click still open the task detail dialog while a real
  // drag (8px+ of movement) moves it between columns.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Column key={col.value} status={col.value} label={col.label} tasks={tasks.filter((t) => t.status === col.value)} departments={departments} onCardClick={onCardClick} />
        ))}
      </div>
    </DndContext>
  );
}
