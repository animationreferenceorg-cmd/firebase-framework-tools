'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  ReactFlowProvider,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Calendar, MoreVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// --- Custom Node Types ---

interface TaskNodeData {
  title: string;
  department: string;
  date: string;
  color: string;
  avatars: string[];
  status: string;
}

const TaskNode = ({ data, selected }: { data: TaskNodeData; selected?: boolean }) => {
  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm border w-64 flex flex-col transition-all cursor-grab active:cursor-grabbing",
      selected ? "border-orange-500 shadow-md ring-2 ring-orange-500/20" : "border-gray-200"
    )}>
      {/* Top Handle (Target) */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-300 border-2 border-white" />

      {/* Header (Color Bar) */}
      <div className={cn("h-1.5 w-full rounded-t-xl", data.color)} />

      {/* Content */}
      <div className="p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide",
            data.department === 'Story' ? 'bg-pink-100 text-pink-600' :
            data.department === 'Art' ? 'bg-orange-100 text-orange-600' :
            data.department === 'Animation' ? 'bg-blue-100 text-blue-600' :
            data.department === 'Rigging' ? 'bg-cyan-100 text-cyan-600' :
            'bg-purple-100 text-purple-600'
          )}>
            {data.department}
          </span>
          <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="h-3.5 w-3.5" /></button>
        </div>

        <h4 className="text-sm font-bold text-[#1f1f22] leading-tight">{data.title}</h4>

        {/* Footer */}
        <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 border border-gray-100 px-2 py-0.5 rounded-md">
            <Calendar className="h-3 w-3" />
            <span>{data.date}</span>
          </div>

          <div className="flex -space-x-1.5">
            {data.avatars.map((img, i) => (
              <img key={i} src={img} className="w-5 h-5 rounded-full border border-white object-cover" />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Handle (Source) */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-500 border-2 border-white" />
    </div>
  );
};

const nodeTypes = {
  task: TaskNode,
};

// --- Initial Data ---

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'task',
    position: { x: 250, y: 50 },
    data: {
      title: 'Draft Script (Scene 1-5)',
      department: 'Story',
      date: '10 Jan',
      color: 'bg-pink-500',
      status: 'complete',
      avatars: ['https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=50&q=80'],
    },
  },
  {
    id: '2',
    type: 'task',
    position: { x: 100, y: 250 },
    data: {
      title: 'Hero Character Design',
      department: 'Art',
      date: '15 Jan',
      color: 'bg-orange-500',
      status: 'review',
      avatars: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80'],
    },
  },
  {
    id: '3',
    type: 'task',
    position: { x: 400, y: 250 },
    data: {
      title: 'Storyboard Panels',
      department: 'Story',
      date: '18 Jan',
      color: 'bg-pink-500',
      status: 'in-progress',
      avatars: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80'],
    },
  },
  {
    id: '4',
    type: 'task',
    position: { x: 100, y: 450 },
    data: {
      title: 'Character Rigging (Hero)',
      department: 'Rigging',
      date: '25 Jan',
      color: 'bg-cyan-500',
      status: 'todo',
      avatars: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&q=80'],
    },
  },
  {
    id: '5',
    type: 'task',
    position: { x: 250, y: 650 },
    data: {
      title: 'Anim Blocking (Shot 02)',
      department: 'Animation',
      date: '05 Feb',
      color: 'bg-blue-500',
      status: 'todo',
      avatars: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&q=80'
      ],
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true, style: { stroke: '#f97316', strokeWidth: 2 } },
  { id: 'e1-3', source: '1', target: '3', type: 'smoothstep', animated: true, style: { stroke: '#f97316', strokeWidth: 2 } },
  { id: 'e2-4', source: '2', target: '4', type: 'smoothstep', style: { stroke: '#d1d5db', strokeWidth: 2 } },
  { id: 'e4-5', source: '4', target: '5', type: 'smoothstep', style: { stroke: '#d1d5db', strokeWidth: 2 } },
  { id: 'e3-5', source: '3', target: '5', type: 'smoothstep', style: { stroke: '#d1d5db', strokeWidth: 2 } },
];

function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, type: 'smoothstep', style: { stroke: '#d1d5db', strokeWidth: 2 } }, eds));
    toast({ title: "Dependency Linked", description: "Tasks have been successfully linked in the pipeline." });
  }, [setEdges, toast]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = {
        x: event.clientX - 350, // rough offset
        y: event.clientY - 150,
      };

      const newNode: Node = {
        id: `task-${Date.now()}`,
        type,
        position,
        data: {
          title: 'New Unassigned Task',
          department: 'Art',
          date: 'TBD',
          color: 'bg-gray-400',
          status: 'todo',
          avatars: [],
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-white relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#f7f7f8]"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#e5e7eb" />
        <Controls className="bg-white border-gray-200 shadow-sm rounded-lg overflow-hidden" showInteractive={false} />
        <MiniMap 
          className="bg-white border-gray-200 shadow-sm rounded-lg"
          nodeColor={(n) => {
            if (n.data.department === 'Story') return '#ec4899';
            if (n.data.department === 'Art') return '#f97316';
            if (n.data.department === 'Animation') return '#3b82f6';
            if (n.data.department === 'Rigging') return '#06b6d4';
            return '#cbd5e1';
          }}
        />
      </ReactFlow>
    </div>
  );
}

export function StudioWorkflowBoard() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#f7f7f8]">
      
      {/* Sidebar Tool Palette */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm z-10">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900">Task Palette</h2>
          <button className="h-6 w-6 rounded flex items-center justify-center bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-900 transition-colors">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col gap-3">
          <p className="text-xs text-gray-500 leading-relaxed mb-2">
            Drag a task type onto the whiteboard to create a new production node.
          </p>

          <div 
            className="p-3 border border-gray-200 rounded-xl bg-white shadow-sm cursor-grab hover:border-pink-300 hover:shadow-md transition-all flex items-center gap-3"
            onDragStart={(e) => onDragStart(e, 'task')}
            draggable
          >
            <div className="w-2 h-8 rounded-full bg-pink-500" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">Story Task</span>
              <span className="text-[10px] font-semibold text-gray-500">Scripts & Storyboards</span>
            </div>
          </div>

          <div 
            className="p-3 border border-gray-200 rounded-xl bg-white shadow-sm cursor-grab hover:border-orange-300 hover:shadow-md transition-all flex items-center gap-3"
            onDragStart={(e) => onDragStart(e, 'task')}
            draggable
          >
            <div className="w-2 h-8 rounded-full bg-orange-500" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">Art / Vis Dev</span>
              <span className="text-[10px] font-semibold text-gray-500">Concepts & Designs</span>
            </div>
          </div>

          <div 
            className="p-3 border border-gray-200 rounded-xl bg-white shadow-sm cursor-grab hover:border-cyan-300 hover:shadow-md transition-all flex items-center gap-3"
            onDragStart={(e) => onDragStart(e, 'task')}
            draggable
          >
            <div className="w-2 h-8 rounded-full bg-cyan-500" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">Tech / Rigging</span>
              <span className="text-[10px] font-semibold text-gray-500">Models & Rigs</span>
            </div>
          </div>

          <div 
            className="p-3 border border-gray-200 rounded-xl bg-white shadow-sm cursor-grab hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3"
            onDragStart={(e) => onDragStart(e, 'task')}
            draggable
          >
            <div className="w-2 h-8 rounded-full bg-blue-500" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">Animation</span>
              <span className="text-[10px] font-semibold text-gray-500">Blocking & Splining</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Whiteboard */}
      <ReactFlowProvider>
        <WorkflowCanvas />
      </ReactFlowProvider>
      
    </div>
  );
}
