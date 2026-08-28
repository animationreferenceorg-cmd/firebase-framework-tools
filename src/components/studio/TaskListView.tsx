'use client';

import React, { useMemo, useState } from 'react';
import type { ProductionTask, Department, ShotStatus } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, CheckCircle2, MessageCircleWarning } from 'lucide-react';

const STATUS_LABELS: Record<ShotStatus, string> = {
  concept: 'Concept', storyboard: 'Storyboard', layout: 'Layout', blocking: 'Blocking',
  splining: 'Splining', polish: 'Polish', rendered: 'Rendered', approved: 'Approved',
};

const PRIORITY_COLORS: Record<ProductionTask['priority'], string> = {
  low: 'text-zinc-400', medium: 'text-blue-300', high: 'text-orange-300', urgent: 'text-red-300',
};

type GroupBy = 'none' | 'status' | 'department' | 'assignee';

export function TaskListView({ tasks, departments, onCardClick }: { tasks: ProductionTask[]; departments: Department[]; onCardClick: (task: ProductionTask) => void }) {
  const [groupBy, setGroupBy] = useState<GroupBy>('status');

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: null as string | null, tasks }];
    if (groupBy === 'status') {
      const order: ShotStatus[] = ['concept', 'storyboard', 'layout', 'blocking', 'splining', 'polish', 'rendered', 'approved'];
      return order.map((s) => ({ key: s, label: STATUS_LABELS[s], tasks: tasks.filter((t) => t.status === s) })).filter((g) => g.tasks.length > 0);
    }
    if (groupBy === 'department') {
      const withDept = departments.map((d) => ({ key: d.id, label: d.name, tasks: tasks.filter((t) => t.departmentId === d.id) })).filter((g) => g.tasks.length > 0);
      const noDept = tasks.filter((t) => !t.departmentId);
      return noDept.length > 0 ? [...withDept, { key: 'none', label: 'No Department', tasks: noDept }] : withDept;
    }
    // assignee
    const byAssignee = new Map<string, { name: string; tasks: ProductionTask[] }>();
    const unassigned: ProductionTask[] = [];
    for (const t of tasks) {
      if (!t.assigneeId) { unassigned.push(t); continue; }
      const entry = byAssignee.get(t.assigneeId) ?? { name: t.assigneeName ?? 'Unknown', tasks: [] };
      entry.tasks.push(t);
      byAssignee.set(t.assigneeId, entry);
    }
    const groupsOut = Array.from(byAssignee.entries()).map(([id, v]) => ({ key: id, label: v.name, tasks: v.tasks }));
    if (unassigned.length > 0) groupsOut.push({ key: 'unassigned', label: 'Unassigned', tasks: unassigned });
    return groupsOut;
  }, [tasks, departments, groupBy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Group by</span>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="status" className="text-xs">Status</SelectItem>
            <SelectItem value="department" className="text-xs">Department</SelectItem>
            <SelectItem value="assignee" className="text-xs">Assignee</SelectItem>
            <SelectItem value="none" className="text-xs">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-[1fr_110px_120px_90px_110px_90px] gap-2 px-4 py-2 bg-white/5 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">
          <span>Task</span>
          <span>Department</span>
          <span>Assignee</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Review</span>
        </div>

        {groups.map((group) => (
          <div key={group.key}>
            {group.label && (
              <div className="px-4 py-1.5 bg-white/[0.03] text-[11px] font-semibold text-zinc-400 border-t border-white/5">
                {group.label} <span className="text-zinc-600">({group.tasks.length})</span>
              </div>
            )}
            {group.tasks.map((task) => {
              const dept = departments.find((d) => d.id === task.departmentId);
              return (
                <button
                  key={task.id}
                  onClick={() => onCardClick(task)}
                  className="grid grid-cols-[1fr_110px_120px_90px_110px_90px] gap-2 items-center px-4 py-2.5 border-t border-white/5 hover:bg-white/5 transition-colors text-left w-full"
                >
                  <span className="text-xs text-white truncate">{task.title}</span>
                  {dept ? (
                    <span className="text-[10px] flex items-center gap-1.5 truncate" style={{ color: dept.color }}>
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />{dept.name}
                    </span>
                  ) : <span className="text-[10px] text-zinc-600">—</span>}
                  {task.assigneeId ? (
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={task.assigneeAvatar} />
                        <AvatarFallback className="text-[8px]">{task.assigneeName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-zinc-300 truncate">{task.assigneeName}</span>
                    </span>
                  ) : <span className="text-[10px] text-zinc-600">—</span>}
                  <span className={`text-[10px] uppercase font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                  <span className="text-[10px] text-zinc-400">{STATUS_LABELS[task.status]}</span>
                  <span>
                    {task.reviewStatus === 'submitted' && <Send className="h-3.5 w-3.5 text-blue-400" />}
                    {task.reviewStatus === 'approved' && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                    {task.reviewStatus === 'changes_requested' && <MessageCircleWarning className="h-3.5 w-3.5 text-red-400" />}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {tasks.length === 0 && <div className="px-4 py-8 text-center text-xs text-zinc-500">No tasks yet.</div>}
      </div>
    </div>
  );
}
