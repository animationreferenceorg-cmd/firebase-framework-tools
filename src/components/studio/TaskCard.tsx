'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { ProductionTask, Department } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CheckCircle2, Send, MessageCircleWarning } from 'lucide-react';

const PRIORITY_COLORS: Record<ProductionTask['priority'], string> = {
  low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export function TaskCard({ task, department, onClick }: { task: ProductionTask; department?: Department; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'rounded-xl border border-white/10 bg-white/5 p-3 space-y-2 cursor-grab active:cursor-grabbing hover:border-purple-500/40 transition-colors',
        isDragging && 'opacity-40 z-50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-white leading-snug">{task.title}</p>
        {task.reviewStatus === 'submitted' && <Send className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
        {task.reviewStatus === 'approved' && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />}
        {task.reviewStatus === 'changes_requested' && <MessageCircleWarning className="h-3.5 w-3.5 text-red-400 shrink-0" />}
      </div>
      {department && (
        <span
          className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border font-medium"
          style={{ backgroundColor: `${department.color}1a`, borderColor: `${department.color}4d`, color: department.color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: department.color }} />
          {department.name}
        </span>
      )}
      <div className="flex items-center justify-between">
        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wide', PRIORITY_COLORS[task.priority])}>{task.priority}</span>
        {task.assigneeId && (
          <Avatar className="h-5 w-5">
            <AvatarImage src={task.assigneeAvatar} />
            <AvatarFallback className="text-[8px]">{task.assigneeName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
