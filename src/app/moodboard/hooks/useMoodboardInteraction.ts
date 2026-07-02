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
    const handleGlobalPointerMove = useCallback((e: PointerEvent) => {
        const state = interactionState.current;
        // Adjust for container offset captured at start
        const currentX = e.clientX - (state.containerLeft || 0);
        const currentY = e.clientY - (state.containerTop || 0);

        if (state.isPanning) {
            const deltaX = currentX - state.startX;
            const deltaY = currentY - state.startY;
            setViewport(prev => ({
                ...prev,
                x: state.initialViewportX + deltaX,
                y: state.initialViewportY + deltaY
            }));
        } else {
            // Check if user dragged far enough to start a marquee selection (15px threshold)
            const dx = currentX - state.startX;
            const dy = currentY - state.startY;
            const distance = Math.hypot(dx, dy);

            if (!state.isMarquee && distance > 15) {
                state.isMarquee = true;
                setIsMarqueeSelecting(true);
            }

            if (state.isMarquee) {
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
                    // Connections don't have bounding boxes for marquee selection
                    if (item.type === 'connection') return;

                    // Project Item to Screen Space (Local to Container)
                    const itemW = item.width || (item.type === 'note' || item.type === 'shape' ? 256 : item.type === 'text' ? 200 : 256);
                    const itemH = item.height || (item.type === 'note' || item.type === 'shape' ? 256 : item.type === 'text' ? 80 : 144);

                    const itemScreenX = (item.x * viewport.scale) + viewport.x;
                    const itemScreenY = (item.y * viewport.scale) + viewport.y;
                    const itemScreenW = itemW * viewport.scale;
                    const itemScreenH = itemH * viewport.scale;

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
        }
    }, [viewport, canvasItems, setSelectedItemIds]);

    // 3. The End Handler
    const handleGlobalPointerUp = useCallback((e: PointerEvent) => {
        const state = interactionState.current;

        // If it was a simple click without dragging, clear selection (unless holding shift)
        if (!state.isPanning && !state.isMarquee) {
            const isShift = e.shiftKey;
            if (!isShift) {
                setSelectedItemIds(new Set());
            }
        }

        // Cleanup State
        setIsPanning(false);
        setIsMarqueeSelecting(false);
        setMarqueeSelectionRect(null);
        document.body.style.cursor = '';

        // Detach Listeners
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
    }, [handleGlobalPointerMove, setSelectedItemIds]);

    // 1. The Entry Point: onPointerDown on the Data-Grid
    const handleBackgroundMouseDown = (e: React.PointerEvent) => {
        // Only Left or Middle mouse/pointer clicks
        if (e.button !== 0 && e.button !== 1) return;

        // Stop browser default selections
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
            // MARQUEE (Ready to marquee but only activates past a movement threshold)
            interactionState.current = {
                ...interactionState.current,
                isPanning: false,
                isMarquee: false, // Start as false, set to true on drag threshold
                startX,
                startY,
                containerLeft,
                containerTop,
                initialSelected: isShift ? new Set(selectedItemIds) : new Set(),
                initialViewportX: 0,
                initialViewportY: 0
            };
        }

        // Attach Global Listeners
        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
    };

    // Clean up on unmount just in case
    useEffect(() => {
        return () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
        };
    }, [handleGlobalPointerMove, handleGlobalPointerUp]);

    return {
        viewport,
        setViewport,
        isPanning,
        setIsPanning,
        isMarqueeSelecting,
        marqueeSelectionRect,
        handleBackgroundMouseDown
    };
}
