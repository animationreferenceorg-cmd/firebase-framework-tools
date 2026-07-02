import React, { useRef, useEffect } from 'react';

interface TextItemProps {
    id: string;
    text?: string;
    fontSize?: number;
    textColor?: string;
    onUpdate: (id: string, text: string) => void;
    isSelected: boolean;
}

export const TextItem = ({
    id,
    text = 'Text',
    fontSize = 24,
    textColor = '#ffffff',
    onUpdate,
    isSelected
}: TextItemProps) => {
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (textRef.current && textRef.current.innerText !== text) {
            textRef.current.innerText = text;
        }
    }, [text]);

    return (
        <div className="w-full h-full p-2 flex items-center justify-start select-none overflow-hidden">
            <div
                ref={textRef}
                contentEditable
                suppressContentEditableWarning
                className="w-full max-h-full overflow-y-auto outline-none leading-normal whitespace-pre-wrap break-words cursor-text font-sans p-1 min-w-[20px]"
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
    );
};
