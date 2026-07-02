import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { MoodboardItemCard } from '@/components/MoodboardItemCard';
import { DraggableCanvasItem } from '../types';
import { StickyNoteItem } from './StickyNoteItem';
import { TextItem } from './TextItem';
import { ShapeItem } from './ShapeItem';
import { DrawingItem } from './DrawingItem';

interface CanvasItemProps {
    item: DraggableCanvasItem;
    style?: React.CSSProperties;
    onRemove: () => void;
    onMaximize: () => void;
    onUpdate: (id: string, text: string) => void;
    isSelected: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onResize?: (id: string, width: number, height: number) => void;
    onDoubleClick?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent, item: DraggableCanvasItem) => void;
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
    onPointerDown,
    index,
    zoomScale = 1
}: CanvasItemProps) => {
    const [hasAnimated, setHasAnimated] = useState(false);
    
    // Default fallback sizes
    const initialWidth = item.width || (item.type === 'note' || item.type === 'shape' ? 256 : item.type === 'text' ? 200 : 256);
    const initialHeight = item.height || (item.type === 'note' || item.type === 'shape' ? 256 : item.type === 'text' ? 80 : 144);
    
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

    const finalStyle: React.CSSProperties = {
        ...style,
        left: item.x,
        top: item.y,
        position: 'absolute',
        zIndex: item.zIndex || 1,
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

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const deltaX = (moveEvent.clientX - startX) / zoomScale;
            const deltaY = (moveEvent.clientY - startY) / zoomScale;

            if (item.type === 'video' || item.type === 'image') {
                // Proportional scaling for media
                const aspectRatio = startWidth / startHeight;
                const newWidth = Math.max(100, startWidth + deltaX);
                const newHeight = newWidth / aspectRatio;
                setSize({ width: newWidth, height: newHeight });
            } else {
                // Free resize for text/notes/shapes
                setSize({
                    width: Math.max(80, startWidth + deltaX),
                    height: Math.max(40, startHeight + deltaY)
                });
            }
        };

        const handlePointerUp = () => {
            setIsResizing(false);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
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

    const renderContent = () => {
        switch (item.type) {
            case 'note':
                return (
                    <StickyNoteItem
                        id={item.id}
                        text={item.text}
                        color={item.color}
                        fontSize={item.fontSize}
                        textColor={item.textColor}
                        onUpdate={onUpdate}
                        isSelected={isSelected}
                    />
                );
            case 'text':
                return (
                    <TextItem
                        id={item.id}
                        text={item.text}
                        fontSize={item.fontSize}
                        textColor={item.textColor}
                        onUpdate={onUpdate}
                        isSelected={isSelected}
                    />
                );
            case 'shape':
                return (
                    <ShapeItem
                        id={item.id}
                        shapeType={item.shapeType}
                        text={item.text}
                        color={item.color}
                        borderColor={item.borderColor}
                        borderWidth={item.borderWidth}
                        fontSize={item.fontSize}
                        textColor={item.textColor}
                        onUpdate={onUpdate}
                        isSelected={isSelected}
                    />
                );
            case 'drawing':
                return (
                    <DrawingItem
                        points={item.points}
                        color={item.color}
                        borderWidth={item.borderWidth}
                        x={item.x}
                        y={item.y}
                        width={size.width}
                        height={size.height}
                    />
                );
            case 'video':
            case 'image':
            default:
                return (
                    <div className="w-full h-full pointer-events-auto rounded-xl overflow-hidden">
                        <MoodboardItemCard
                            video={item.video!}
                            className="w-full h-full rounded-xl border-2 border-purple-500/0 hover:border-purple-500/50 transition-colors"
                            onMaximize={onMaximize}
                        />
                    </div>
                );
        }
    };

    const isDrawingType = item.type === 'drawing';

    return (
        <div
            style={finalStyle}
            // Remove animate-in classes after animation is done to prevent replay
            className={`group cursor-move hover:z-50 ${
                !hasAnimated ? 'animate-in fade-in zoom-in duration-500 slide-in-from-bottom-4' : ''
            } ${
                isSelected && !isDrawingType ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black' : ''
            } ${
                !isDrawingType && item.type !== 'note' && item.type !== 'text' && item.type !== 'shape'
                    ? 'shadow-2xl rounded-xl bg-black'
                    : ''
            }`}
            onClick={onSelect}
            onDoubleClick={onDoubleClick}
            onPointerDown={(e) => {
                // Ignore dragging triggers if clicking inputs, resize handles, delete button
                const target = e.target as HTMLElement;
                if (
                    target.closest('[contenteditable]') || 
                    target.closest('.cursor-nwse-resize') || 
                    target.closest('.delete-btn')
                ) {
                    return;
                }
                if (onPointerDown) {
                    onPointerDown(e, item);
                }
            }}
        >
            {renderContent()}

            {/* Remove button */}
            {!isDrawingType && (
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="delete-btn absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 hover:bg-red-600 shadow-md"
                >
                    <Plus className="h-3 w-3 text-white rotate-45" />
                </button>
            )}

            {/* Resize Handle */}
            {!isDrawingType && (
                <div 
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 z-50 flex items-end justify-end p-1"
                    onPointerDown={handleResizeStart}
                >
                    <div className="w-3 h-3 border-r-2 border-b-2 border-white/50 rounded-br-sm pointer-events-none" />
                </div>
            )}
        </div>
    );
});

CanvasItem.displayName = 'CanvasItem';
