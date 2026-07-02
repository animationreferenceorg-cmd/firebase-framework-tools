import React from 'react';

interface DrawingItemProps {
    points?: { x: number; y: number }[];
    color?: string;
    borderWidth?: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
}

export const DrawingItem = ({
    points = [],
    color = '#ffffff',
    borderWidth = 3,
    x,
    y,
    width = 0,
    height = 0
}: DrawingItemProps) => {
    if (!points || points.length === 0) return null;

    // Build the SVG path string relative to the bounding box (x, y)
    const pathData = points
        .map((p, index) => {
            const relX = p.x - x;
            const relY = p.y - y;
            return `${index === 0 ? 'M' : 'L'} ${relX.toFixed(1)} ${relY.toFixed(1)}`;
        })
        .join(' ');

    return (
        <svg
            className="w-full h-full overflow-visible pointer-events-none"
            style={{
                width: `${width}px`,
                height: `${height}px`
            }}
        >
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth={borderWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
