import { useState, useRef, useCallback, useEffect } from 'react';
import { DraggableCanvasItem } from '../types';

interface InteractionState {
    isPanning: boolean;
    isMarquee: boolean;
    startX: number;
    startY: number;
    containerLeft: number;
    containerTop: number;
    initialViewportX: number;
    initialViewportY: number;
    initialSelected: Set<string>;
}

interface UseMoodboardInteractionProps {
    canvasItems: DraggableCanvasItem[];
    selectedItemIds: Set<string>;
    setSelectedItemIds: (ids: Set<string>) => void;
    isSpacePressed: React.MutableRefObject<boolean>;
}

export function useMoodboardInteraction({
    canvasItems,
    selectedItemIds,
    setSelectedItemIds,
    isSpacePressed
}: UseMoodboardInteractionProps) {
    // Interaction States
    const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
    const [marqueeSelectionRect, setMarqueeSelectionRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
    const [isPanning, setIsPanning] = useState(false);

    // Refs for interaction state to be accessible in window listeners without stale closures
    const interactionState = useRef<InteractionState>({
        isPanning: false,
        isMarquee: false,
        startX: 0,
        startY: 0,
        containerLeft: 0,
        containerTop: 0,
        initialViewportX: 0,
        initialViewportY: 0,
        initialSelected: new Set<string>()
    });

    // 2. The Move Handler
    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        const state = interactionState.current;
        // Adjust for container offset captured at start
        const currentX = e.clientX - (state.containerLeft || 0);
        const currentY = e.clientY - (state.containerTop || 0);

        if (state.isPanning) {
            // For Panning, we just need delta, which is invariant to offset if both are offset.
            const deltaX = currentX - state.startX;
            const deltaY = currentY - state.startY;
            setViewport(prev => ({
                ...prev,
                x: state.initialViewportX + deltaX,
                y: state.initialViewportY + deltaY
            }));
        } else if (state.isMarquee) {
            // Update Visual Rect
            const x = Math.min(currentX, state.startX);
            const y = Math.min(currentY, state.startY);
            const w = Math.abs(currentX - state.startX);
            const h = Math.abs(currentY - state.startY);
            setMarqueeSelectionRect({ x, y, w, h });

            // --- HIT TESTING ---
            const mLeft = x;
            const mRight = x + w;
            const mTop = y;
            const mBottom = y + h;

            const newSelected = new Set(state.initialSelected);

            canvasItems.forEach(item => {
                // Project Item to Screen Space (Local to Container)
                const itemW = (item.type === 'note' ? 200 : 256);
                const itemH = (item.type === 'note' ? 100 : 144);

                // Note: viewport.x/y are applied to the transform layer
                // item.x/y are local to that layer
                const itemScreenX = (item.x * viewport.scale) + viewport.x;
                const itemScreenY = (item.y * viewport.scale) + viewport.y;
                const itemScreenW = itemW * viewport.scale;
                const itemScreenH = itemH * viewport.scale;

                // AABB Intersection
                const iLeft = itemScreenX;
                const iRight = itemScreenX + itemScreenW;
                const iTop = itemScreenY;
                const iBottom = itemScreenY + itemScreenH;

                const intersects = (
                    iLeft < mRight &&
                    iRight > mLeft &&
                    iTop < mBottom &&
                    iBottom > mTop
                );

                if (intersects) {
                    newSelected.add(item.id);
                }
            });
            setSelectedItemIds(newSelected);
        }
    }, [viewport, canvasItems, setSelectedItemIds]); // Added setSelectedItemIds dependency

    // 3. The End Handler
    const handleGlobalMouseUp = useCallback(() => {
        // Cleanup State
        setIsPanning(false);
        setIsMarqueeSelecting(false);
        setMarqueeSelectionRect(null);
        document.body.style.cursor = '';

        // Detach Listeners
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [handleGlobalMouseMove]);

    // 1. The Entry Point: onMouseDown on the Data-Grid
    const handleBackgroundMouseDown = (e: React.MouseEvent) => {
        // Only Left or Middle mouse
        if (e.button !== 0 && e.button !== 1) return;

        // CRITICAL: Stop browser selection
        e.preventDefault();

        // Setup State
        const rect = e.currentTarget.getBoundingClientRect();
        const startX = e.clientX - rect.left;
        const startY = e.clientY - rect.top;
        const containerLeft = rect.left;
        const containerTop = rect.top;

        const isSpace = isSpacePressed.current;
        const isMiddle = e.button === 1;
        const isShift = e.shiftKey;

        // (Removed strict target check as propagation is now stopped by items)

        // Decide Mode
        if (isMiddle || isSpace) {
            // PANNING
            interactionState.current = {
                ...interactionState.current,
                isPanning: true,
                isMarquee: false,
                startX,
                startY,
                containerLeft,
                containerTop,
                initialViewportX: viewport.x,
                initialViewportY: viewport.y
            };
            setIsPanning(true);
            document.body.style.cursor = 'grabbing';
        } else {
            // MARQUEE (Default for Left Click on background)
            interactionState.current = {
                ...interactionState.current,
                isPanning: false,
                isMarquee: true,
                startX,
                startY,
                containerLeft,
                containerTop,
                initialSelected: isShift ? new Set(selectedItemIds) : new Set(), // Snapshot selection
                initialViewportX: 0, // Unused
                initialViewportY: 0
            };
            setIsMarqueeSelecting(true);
            setMarqueeSelectionRect({ x: startX, y: startY, w: 0, h: 0 });

            // Immediate Clear if not adding
            if (!isShift) {
                setSelectedItemIds(new Set());
            }
        }

        // Attach Global Listeners
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
    };

    // Clean up on unmount just in case
    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);

    return {
        viewport,
        setViewport,
        isPanning,
        setIsPanning, // Exported if needed externally
        isMarqueeSelecting,
        marqueeSelectionRect,
        handleBackgroundMouseDown // Attached to the container
    };
}
