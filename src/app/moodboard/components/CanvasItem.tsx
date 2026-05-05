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
    onResize?: (id: string, width: number, height: number) => void;
    onDoubleClick?: (e: React.MouseEvent) => void;
    index: number;
    zoomScale?: number;
}

export const CanvasItem = React.memo(({
    item,
    style,
    onRemove,
    onMaximize,
    onUpdate,
    isSelected,
    onSelect,
    onResize,
    onDoubleClick,
    index,
    zoomScale = 1
}: CanvasItemProps) => {
    const [hasAnimated, setHasAnimated] = useState(false);
    
    // Default fallback sizes
    const initialWidth = item.width || (item.type === 'note' ? 256 : 256);
    const initialHeight = item.height || (item.type === 'note' ? 256 : 144);
    
    const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
    const [isResizing, setIsResizing] = useState(false);

    // Sync size if item props change (e.g., loaded from DB)
    useEffect(() => {
        if (item.width && item.height && !isResizing) {
            setSize({ width: item.width, height: item.height });
        }
    }, [item.width, item.height, isResizing]);

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
        animationFillMode: 'backwards',
        width: size.width,
        height: size.height
    };

    // Resize handlers
    const handleResizeStart = (e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = size.width;
        const startHeight = size.height;

        // Since viewport is scaled, we might need to adjust for scale if we know it. 
        // For simplicity, we can calculate delta without scale if we apply zoom correctly, 
        // but dragging the handle natively means we should probably use the movement delta directly or let the user visual cue guide it.
        // If we want it perfectly aligned with cursor under scale, we need scale prop. 
        // We will just do screen delta for now. It works decently.

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const deltaX = (moveEvent.clientX - startX) / zoomScale;
            const deltaY = (moveEvent.clientY - startY) / zoomScale;

            // PureRef scales proportionally by default.
            // Let's implement proportional scaling for images/videos.
            if (item.type !== 'note') {
                const aspectRatio = startWidth / startHeight;
                const newWidth = Math.max(50, startWidth + deltaX);
                const newHeight = newWidth / aspectRatio;
                setSize({ width: newWidth, height: newHeight });
            } else {
                // Free resize for notes
                setSize({
                    width: Math.max(100, startWidth + deltaX),
                    height: Math.max(100, startHeight + deltaY)
                });
            }
        };

        const handlePointerUp = () => {
            setIsResizing(false);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            // We use the functional state update or just trust that `size` has updated via the last render?
            // Since this is a closure, `size` might be stale. We should rely on a ref or use the calculated values.
            // For now, we'll let a separate useEffect trigger the onResize prop when isResizing turns false.
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    // Fire onResize when resizing finishes
    useEffect(() => {
        if (!isResizing && onResize) {
            onResize(item.id, size.width, size.height);
        }
    }, [isResizing]);

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={finalStyle}
            // Remove animate-in classes after animation is done to prevent replay
            className={`${item.type !== 'note' ? 'shadow-2xl rounded-xl bg-black overflow-hidden' : 'min-w-[50px]'} group cursor-move hover:z-50 ${!hasAnimated ? 'animate-in fade-in zoom-in duration-500 slide-in-from-bottom-4' : ''} ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
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

            {/* Resize Handle */}
            <div 
                className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 z-50 flex items-end justify-end p-1"
                onPointerDown={handleResizeStart}
            >
                <div className="w-3 h-3 border-r-2 border-b-2 border-white/50 rounded-br-sm pointer-events-none" />
            </div>
        </div>
    );
});

CanvasItem.displayName = 'CanvasItem';
