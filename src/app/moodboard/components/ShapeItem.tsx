import React, { useRef, useEffect } from 'react';

interface ShapeItemProps {
    id: string;
    shapeType?: 'rectangle' | 'circle' | 'triangle' | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down';
    text?: string;
    color?: string; // Fill color
    borderColor?: string;
    borderWidth?: number;
    fontSize?: number;
    textColor?: string;
    onUpdate: (id: string, text: string) => void;
    isSelected: boolean;
}

export const ShapeItem = ({
    id,
    shapeType = 'rectangle',
    text = '',
    color = '#1e1b4b', // Default Indigo-950 (dark violet)
    borderColor = '#6366f1', // Default Indigo-500
    borderWidth = 2,
    fontSize = 16,
    textColor = '#ffffff',
    onUpdate,
    isSelected
}: ShapeItemProps) => {
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (textRef.current && textRef.current.innerText !== text) {
            textRef.current.innerText = text;
        }
    }, [text]);

    const strokeWidthVal = borderWidth * 2; // scale for SVG 100x100 viewBox

    const renderShape = () => {
        const commonProps = {
            fill: color,
            stroke: borderColor,
            strokeWidth: strokeWidthVal,
            vectorEffect: 'non-scaling-stroke' // keeps stroke weight consistent when stretched
        };

        switch (shapeType) {
            case 'circle':
                return (
                    <ellipse
                        cx="50"
                        cy="50"
                        rx="48"
                        ry="48"
                        {...commonProps}
                    />
                );
            case 'triangle':
                return (
                    <polygon
                        points="50,4 96,96 4,96"
                        {...commonProps}
                    />
                );
            case 'arrow-right':
                return (
                    <path
                        d="M 4,35 L 60,35 L 60,15 L 96,50 L 60,85 L 60,65 L 4,65 Z"
                        {...commonProps}
                    />
                );
            case 'arrow-left':
                return (
                    <path
                        d="M 96,35 L 40,35 L 40,15 L 4,50 L 40,85 L 40,65 L 96,65 Z"
                        {...commonProps}
                    />
                );
            case 'arrow-up':
                return (
                    <path
                        d="M 35,96 L 35,40 L 15,40 L 50,4 L 85,40 L 65,40 L 65,96 Z"
                        {...commonProps}
                    />
                );
            case 'arrow-down':
                return (
                    <path
                        d="M 35,4 L 35,60 L 15,60 L 50,96 L 85,60 L 65,60 L 65,4 Z"
                        {...commonProps}
                    />
                );
            case 'rectangle':
            default:
                return (
                    <rect
                        x="2"
                        y="2"
                        width="96"
                        height="96"
                        rx="4"
                        ry="4"
                        {...commonProps}
                    />
                );
        }
    };

    return (
        <div className="w-full h-full relative select-none">
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full overflow-visible"
            >
                {renderShape()}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div
                    ref={textRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="w-full max-h-full overflow-y-auto outline-none font-medium text-center leading-normal whitespace-pre-wrap break-words cursor-text font-sans p-1 min-w-[20px]"
                    style={{
                        fontSize: `${fontSize}px`,
                        color: textColor,
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                    }}
                    onBlur={(e) => {
                        const newText = (e.target as HTMLDivElement).innerText;
                        if (newText !== text) {
                            onUpdate(id, newText);
                        }
                    }}
                />
            </div>
        </div>
    );
};
