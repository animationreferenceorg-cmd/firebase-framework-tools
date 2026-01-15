import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { MoodboardItemCard } from '@/components/MoodboardItemCard';
import { DraggableCanvasItem } from '../types';

interface CanvasItemProps {
    item: DraggableCanvasItem;
    style: React.CSSProperties;
    onRemove: () => void;
    onMaximize: () => void;
    onUpdate: (id: string, text: string) => void;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onDoubleClick?: (e: React.MouseEvent) => void;
    index: number;
}

export const CanvasItem = React.memo(({
    item,
    style,
    onRemove,
    onMaximize,
    onUpdate,
    isSelected,
    onSelect,
    onDoubleClick,
    index
}: CanvasItemProps) => {
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasAnimated(true);
        }, 500 + (index * 50)); // Duration + Delay
        return () => clearTimeout(timer);
    }, [index]);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.id,
        data: { id: item.id, type: 'canvas', video: item.video },
    });

    const finalStyle: React.CSSProperties = {
        ...style,
        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : style.transform,
        left: item.x,
        top: item.y,
        position: 'absolute',
        opacity: isDragging ? 0 : 1, // Hide original when dragging
        zIndex: isDragging ? 100 : 1,
        // Staggered entrance animation - only apply if not finished
        animationDelay: hasAnimated ? '0s' : `${index * 50}ms`,
        animationFillMode: 'backwards'
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={finalStyle}
            // Remove animate-in classes after animation is done to prevent replay
            className={`${item.type !== 'note' ? 'w-64 aspect-video shadow-2xl rounded-xl bg-black' : 'w-auto max-w-lg h-auto min-w-[50px]'} group cursor-move hover:z-50 ${!hasAnimated ? 'animate-in fade-in zoom-in duration-500 slide-in-from-bottom-4' : ''} ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
            onClick={onSelect}
            onDoubleClick={onDoubleClick}
            onMouseDown={(e) => {
                e.stopPropagation();
                listeners?.onMouseDown?.(e);
            }}
        >
            {item.type === 'note' ? (
                <div className="w-full h-full p-2 relative group-hover:block min-w-[50px] min-h-[50px] hover:bg-white/10 rounded-lg transition-colors">
                    <div
                        role="textbox"
                        contentEditable
                        suppressContentEditableWarning
                        className="w-full h-full bg-transparent outline-none font-medium text-2xl text-white placeholder-white/20 leading-relaxed font-sans whitespace-pre-wrap break-words"
                        style={{ fieldSizing: 'content' } as any} // Future proofing, though likely ignored
                        onPointerDown={(e) => e.stopPropagation()}
                        onInput={(e) => {
                            // Optional: Local mutation if needed, or rely on onBlur
                        }}
                        onBlur={(e) => {
                            // Trigger state update to ensure save
                            onUpdate(item.id, (e.target as HTMLDivElement).innerText);
                        }}
                    >
                        {item.text}
                    </div>
                </div>
            ) : (
                <div className="w-full h-full pointer-events-auto">
                    <MoodboardItemCard
                        video={item.video}
                        className="w-full h-full rounded-xl border-2 border-purple-500/0 hover:border-purple-500/50 transition-colors"
                        onMaximize={onMaximize}
                    />
                </div>
            )}

            <button
                onPointerDown={(e) => {
                    e.stopPropagation();
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-red-600"
            >
                <Plus className="h-3 w-3 text-white rotate-45" />
            </button>
        </div>
    );
});

CanvasItem.displayName = 'CanvasItem';
