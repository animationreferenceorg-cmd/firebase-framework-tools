import React from 'react';
import { MoodboardItemCard } from '@/components/MoodboardItemCard';
import { DraggableSidebarItemProps } from '../types';
import { Plus, Eye, Check } from 'lucide-react';

export function DraggableSidebarItem({ 
    video, 
    onMaximize, 
    onAdd,
    isSelectMode = false,
    isSelected = false,
    onToggleSelect
}: DraggableSidebarItemProps) {
    const handleDragStart = (e: React.DragEvent) => {
        if (isSelectMode) {
            e.preventDefault();
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        e.dataTransfer.setData('application/json', JSON.stringify({ video, offsetX, offsetY }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            draggable={!isSelectMode}
            onDragStart={handleDragStart}
            onClick={() => {
                if (isSelectMode) {
                    onToggleSelect?.();
                } else {
                    onAdd?.(video);
                }
            }}
            className={`group relative rounded-xl overflow-hidden border hover:shadow-lg transition-all duration-300 aspect-video w-full bg-zinc-100 dark:bg-zinc-950 ${
                isSelectMode
                    ? isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-600/50 shadow-md cursor-pointer scale-[0.98]'
                        : 'border-zinc-200 dark:border-white/5 cursor-pointer hover:border-zinc-400 dark:hover:border-white/20'
                    : 'cursor-grab active:cursor-grabbing border-zinc-200 dark:border-white/5 hover:border-indigo-500/40 dark:hover:border-indigo-500/50 hover:scale-[1.01]'
            }`}
        >
            {/* The base card that handles video preview on hover */}
            <div className="w-full h-full pointer-events-none">
                <MoodboardItemCard
                    video={video}
                    playbackSpeed={2.0}
                    hoverDelay={300}
                    className="w-full h-full border-none rounded-none bg-transparent"
                />
            </div>

            {/* Premium Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-85 transition-opacity pointer-events-none" />

            {/* Video Title & Uploader Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col pointer-events-none">
                <span className="text-[8px] font-bold text-indigo-400 dark:text-indigo-450 uppercase tracking-wider scale-90 origin-left">
                    {video.tags && video.tags.length > 0 ? `#${video.tags[0]}` : 'Reference'}
                </span>
                <span className="text-[10px] font-semibold text-white leading-tight truncate drop-shadow-sm">
                    {video.title}
                </span>
            </div>

            {/* Selection Checkbox Overlay */}
            {isSelectMode && (
                <div 
                    className="absolute inset-0 bg-black/10 flex items-start p-2 z-20"
                >
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-black/35 border-white text-transparent hover:border-indigo-500 hover:bg-black/50'
                    }`}>
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                </div>
            )}

            {/* Quick Actions (Hover Overlay) - Only visible when NOT in select mode */}
            {!isSelectMode && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 z-20">
                    {/* Top Actions: Maximize Preview */}
                    <div className="flex justify-end">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMaximize?.();
                            }}
                            className="h-6 w-6 rounded-full bg-white/20 hover:bg-white/40 active:scale-95 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer animate-in fade-in zoom-in-75 duration-200"
                            title="Preview Video"
                        >
                            <Eye className="h-3 w-3" />
                        </button>
                    </div>

                    {/* Bottom Actions: Click-to-Add trigger */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAdd?.(video);
                        }}
                        className="w-full py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[9px] font-bold flex items-center justify-center gap-0.5 shadow-md transition-all cursor-pointer"
                    >
                        <Plus className="h-2.5 w-2.5" /> Add to Board
                    </button>
                </div>
            )}
        </div>
    );
}
