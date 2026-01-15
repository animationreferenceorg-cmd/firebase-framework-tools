import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { MoodboardItemCard } from '@/components/MoodboardItemCard';
import { DraggableSidebarItemProps } from '../types';

export function DraggableSidebarItem({ video, onMaximize }: DraggableSidebarItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `sidebar-${video.id}`,
        data: { video, type: 'sidebar' },
    });

    return (
        <div ref={setNodeRef} {...listeners} {...attributes} className={`cursor-grab active:cursor-grabbing group relative ${isDragging ? 'opacity-30' : ''}`}>
            {/* Aspect Ratio container handled by MoodboardItemCard or parent grid, here we enforce height/width via the card or wrapper */}
            <div className="aspect-video w-full">
                <MoodboardItemCard video={video} onMaximize={onMaximize} playbackSpeed={2.0} hoverDelay={500} className="w-full h-full shadow-sm hover:shadow-md transition-shadow" />
            </div>
        </div>
    );
}
