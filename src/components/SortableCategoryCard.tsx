
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CategoryCard } from './CategoryCard';
import type { Category } from '@/lib/types';
import { GripVertical } from 'lucide-react';

export function SortableCategoryCard({ category }: { category: Category }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
        <CategoryCard {...category} />
        <button 
            {...attributes} 
            {...listeners} 
            className="absolute top-1/2 -translate-y-1/2 -left-3 z-20 h-10 w-6 rounded-full bg-black/30 text-white/50 hover:bg-black/70 hover:text-white opacity-0 group-hover/sortable:opacity-100 transition-opacity flex items-center justify-center cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
        >
            <GripVertical className="h-5 w-5" />
        </button>
    </div>
  );
}
