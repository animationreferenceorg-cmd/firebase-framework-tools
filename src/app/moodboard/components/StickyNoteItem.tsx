import React, { useRef, useEffect } from 'react';

interface StickyNoteItemProps {
    id: string;
    text?: string;
    color?: string;
    fontSize?: number;
    textColor?: string;
    onUpdate: (id: string, text: string) => void;
    isSelected: boolean;
}

export const StickyNoteItem = ({
    id,
    text = '',
    color = '#fef08a', // Default Yellow-200
    fontSize = 16,
    textColor = '#1c1917', // Stone-900 for high contrast on stickies
    onUpdate,
    isSelected
}: StickyNoteItemProps) => {
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (textRef.current && textRef.current.innerText !== text) {
            textRef.current.innerText = text;
        }
    }, [text]);

    return (
        <div
            className="w-full h-full p-4 flex flex-col items-center justify-center text-center shadow-md select-none rounded-sm transition-all overflow-hidden"
            style={{
                backgroundColor: color,
                color: textColor,
            }}
        >
            <div
                ref={textRef}
                contentEditable
                suppressContentEditableWarning
                className="w-full max-h-full overflow-y-auto outline-none font-medium leading-normal whitespace-pre-wrap break-words cursor-text font-sans p-1"
                style={{
                    fontSize: `${fontSize}px`,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                    // Prevent propagation so delete key inside input doesn't trigger item deletion
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
    );
};
