import React from 'react';
import { MoodboardItem } from '@/lib/types';

interface ConnectionLineProps {
    id: string;
    fromItem: string;
    toItem: string;
    color?: string;
    borderWidth?: number;
    canvasItems: MoodboardItem[];
}

interface Bounds {
    x: number;
    y: number;
    w: number;
    h: number;
    cx: number;
    cy: number;
}

const getItemBounds = (item: MoodboardItem): Bounds => {
    let w = item.width;
    let h = item.height;
    if (!w || !h) {
        if (item.type === 'note' || item.type === 'shape') {
            w = w || 256;
            h = h || 256;
        } else if (item.type === 'text') {
            w = w || 200;
            h = h || 80;
        } else if (item.type === 'video' || item.type === 'image') {
            w = w || 256;
            h = h || 144;
        } else {
            w = w || 0;
            h = h || 0;
        }
    }
    return {
        x: item.x,
        y: item.y,
        w,
        h,
        cx: item.x + w / 2,
        cy: item.y + h / 2
    };
};

const getEdgePoint = (rect: Bounds, target: { x: number; y: number }) => {
    const dx = target.x - rect.cx;
    const dy = target.y - rect.cy;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: rect.cx, y: rect.cy };

    const rectRatio = rect.w / rect.h;
    const targetRatio = Math.abs(dx / dy);

    if (targetRatio > rectRatio) {
        const sign = dx > 0 ? 1 : -1;
        const x = rect.cx + sign * (rect.w / 2);
        const y = rect.cy + sign * (rect.w / 2) * (dy / dx);
        return { x, y };
    } else {
        const sign = dy > 0 ? 1 : -1;
        const x = rect.cx + sign * (rect.h / 2) * (dx / dy);
        const y = rect.cy + sign * (rect.h / 2);
        return { x, y };
    }
};

export const ConnectionLine = ({
    id,
    fromItem,
    toItem,
    color = '#6366f1', // Indigo-500 default
    borderWidth = 2,
    canvasItems
}: ConnectionLineProps) => {
    const fromEl = canvasItems.find(i => i.id === fromItem);
    const toEl = canvasItems.find(i => i.id === toItem);

    if (!fromEl || !toEl) return null;

    // Get item boundaries
    const fromBounds = getItemBounds(fromEl);
    const toBounds = getItemBounds(toEl);

    // Calculate edge intersection points
    const startPoint = getEdgePoint(fromBounds, { x: toBounds.cx, y: toBounds.cy });
    const endPoint = getEdgePoint(toBounds, { x: fromBounds.cx, y: fromBounds.cy });

    // Calculate control points for a smooth quadratic/cubic curve
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If too close, don't render
    if (distance < 10) return null;

    // Use a slightly curved path
    // We can offset the control point perpendicular to the line
    const mx = (startPoint.x + endPoint.x) / 2;
    const my = (startPoint.y + endPoint.y) / 2;
    
    // Perpendicular vector
    const px = -dy / distance;
    const py = dx / distance;
    
    // Curve offset amount
    const curveAmount = Math.min(30, distance * 0.15);
    const cx = mx + px * curveAmount;
    const cy = my + py * curveAmount;

    const pathData = `M ${startPoint.x} ${startPoint.y} Q ${cx} ${cy} ${endPoint.x} ${endPoint.y}`;

    return (
        <g id={`conn-${id}`} className="select-none">
            {/* Hover area (thick invisible stroke to make selection easy) */}
            <path
                d={pathData}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                className="cursor-pointer"
            />
            {/* Visible line */}
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth={borderWidth}
                markerEnd="url(#arrowhead)"
                className="transition-colors pointer-events-none"
            />
        </g>
    );
};
