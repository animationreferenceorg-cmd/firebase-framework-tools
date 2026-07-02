import React, { useState } from 'react';
import { Trash2, Copy, ChevronsUp, ChevronsDown, Type, Palette, CircleDot } from 'lucide-react';
import { MoodboardItem } from '@/lib/types';

interface PropertyToolbarProps {
    selectedItems: MoodboardItem[];
    viewport: { x: number; y: number; scale: number };
    themeMode?: 'dark' | 'light';
    onUpdateItems: (updatedFields: Partial<MoodboardItem>) => void;
    onDeleteItems: () => void;
    onDuplicateItems: () => void;
    onBringToFront: () => void;
    onSendToBack: () => void;
}

const FILL_COLORS = [
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Green', value: '#dcfce7' },
    { name: 'Blue', value: '#dbeafe' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Orange', value: '#ffedd5' },
    { name: 'Purple', value: '#f3e8ff' },
    { name: 'Dark Indigo', value: '#1e1b4b' },
    { name: 'Slate', value: '#334155' },
    { name: 'Transparent', value: 'transparent' }
];

const BORDER_COLORS = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#000000' }
];

const TEXT_COLORS = [
    { name: 'White', value: '#ffffff' },
    { name: 'Dark Stone', value: '#1c1917' },
    { name: 'Slate Gray', value: '#94a3b8' },
    { name: 'Yellow', value: '#fde047' },
    { name: 'Green', value: '#4ade80' },
    { name: 'Blue', value: '#60a5fa' }
];

export const PropertyToolbar = ({
    selectedItems,
    viewport,
    themeMode = 'dark',
    onUpdateItems,
    onDeleteItems,
    onDuplicateItems,
    onBringToFront,
    onSendToBack
}: PropertyToolbarProps) => {
    const [activeMenu, setActiveMenu] = useState<'fill' | 'border' | 'text' | null>(null);

    if (selectedItems.length === 0) return null;

    // Calculate bounding box of selection in canvas coordinates
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;

    selectedItems.forEach(item => {
        const w = item.width || 256;
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y);
        maxX = Math.max(maxX, item.x + w);
    });

    // Compute toolbar center in screen space
    const selectionWidth = maxX - minX;
    const centerX = minX + selectionWidth / 2;
    
    const screenX = (centerX * viewport.scale) + viewport.x;
    const screenY = (minY * viewport.scale) + viewport.y;

    // Determine features to show based on selected item types
    const hasNoteOrShape = selectedItems.some(i => i.type === 'note' || i.type === 'shape');
    const hasTextOrShapeOrNote = selectedItems.some(i => i.type === 'note' || i.type === 'shape' || i.type === 'text');
    const hasBorder = selectedItems.some(i => i.type === 'shape' || i.type === 'drawing');

    // Get current properties (if single item selected)
    const singleItem = selectedItems.length === 1 ? selectedItems[0] : null;

    const isDark = themeMode === 'dark';

    return (
        <div
            className="absolute z-[150] flex flex-col items-center gap-1.5 transition-all select-none pointer-events-auto"
            style={{
                left: `${screenX}px`,
                top: `${screenY - 12}px`,
                transform: 'translate(-50%, -100%)'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {/* Main Action Bar */}
            <div 
                className={`flex items-center gap-1 border backdrop-blur-xl px-2.5 py-1.5 rounded-xl shadow-2xl transition-colors duration-200 ${
                    isDark 
                        ? 'bg-[#0c0a1c] border-indigo-500/20 text-white' 
                        : 'bg-white border-zinc-200 text-zinc-800'
                }`}
            >
                {/* Background / Fill Selector */}
                {hasNoteOrShape && (
                    <button
                        onClick={() => setActiveMenu(activeMenu === 'fill' ? null : 'fill')}
                        className={`p-1.5 rounded-lg transition-colors ${
                            activeMenu === 'fill' 
                                ? 'bg-indigo-600/10 text-indigo-400' 
                                : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                        }`}
                        title="Fill Color"
                    >
                        <Palette className="h-4.5 w-4.5" />
                    </button>
                )}

                {/* Border Color & Width */}
                {hasBorder && (
                    <button
                        onClick={() => setActiveMenu(activeMenu === 'border' ? null : 'border')}
                        className={`p-1.5 rounded-lg transition-colors ${
                            activeMenu === 'border' 
                                ? 'bg-indigo-600/10 text-indigo-400' 
                                : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                        }`}
                        title="Border Style"
                    >
                        <CircleDot className="h-4.5 w-4.5" />
                    </button>
                )}

                {/* Text Sizing & Colors */}
                {hasTextOrShapeOrNote && (
                    <button
                        onClick={() => setActiveMenu(activeMenu === 'text' ? null : 'text')}
                        className={`p-1.5 rounded-lg transition-colors ${
                            activeMenu === 'text' 
                                ? 'bg-indigo-600/10 text-indigo-400' 
                                : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                        }`}
                        title="Text Format"
                    >
                        <Type className="h-4.5 w-4.5" />
                    </button>
                )}

                {hasTextOrShapeOrNote && <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />}

                {/* Layering: Bring to Front */}
                <button
                    onClick={onBringToFront}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
                    title="Bring to Front"
                >
                    <ChevronsUp className="h-4.5 w-4.5" />
                </button>

                {/* Layering: Send to Back */}
                <button
                    onClick={onSendToBack}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
                    title="Send to Back"
                >
                    <ChevronsDown className="h-4.5 w-4.5" />
                </button>

                <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-zinc-200'}`} />

                {/* Duplicate */}
                <button
                    onClick={onDuplicateItems}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'}`}
                    title="Duplicate (Ctrl+D)"
                >
                    <Copy className="h-4.5 w-4.5" />
                </button>

                {/* Delete */}
                <button
                    onClick={onDeleteItems}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:text-red-500 hover:bg-red-500/10'}`}
                    title="Delete (Delete)"
                >
                    <Trash2 className="h-4.5 w-4.5" />
                </button>
            </div>

            {/* Sub-Menus */}
            {activeMenu === 'fill' && (
                <div 
                    className={`flex items-center gap-1.5 border p-2 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 ${
                        isDark ? 'bg-[#0f0d23] border-white/5' : 'bg-white border-zinc-200'
                    }`}
                >
                    {FILL_COLORS.map(c => (
                        <button
                            key={c.value}
                            onClick={() => onUpdateItems({ color: c.value })}
                            className="w-5 h-5 rounded-full border border-zinc-300/40 hover:scale-110 active:scale-95 transition-transform"
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                        />
                    ))}
                </div>
            )}

            {activeMenu === 'border' && (
                <div 
                    className={`flex flex-col gap-2 border p-2.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 ${
                        isDark ? 'bg-[#0f0d23] border-white/5' : 'bg-white border-zinc-200'
                    }`}
                >
                    <div className="flex items-center gap-1.5">
                        {BORDER_COLORS.map(c => (
                            <button
                                key={c.value}
                                onClick={() => onUpdateItems({ borderColor: c.value })}
                                className="w-5 h-5 rounded-full border border-zinc-300/40 hover:scale-110 active:scale-95 transition-transform"
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                            />
                        ))}
                    </div>
                    <div className={`h-px my-0.5 ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`} />
                    <div className={`flex items-center justify-between gap-4 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        <span>Border Thickness</span>
                        <div className="flex gap-1">
                            {[1, 2, 4, 6].map(w => (
                                <button
                                    key={w}
                                    onClick={() => onUpdateItems({ borderWidth: w })}
                                    className={`px-2 py-0.5 rounded border transition-colors ${
                                        singleItem?.borderWidth === w
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : isDark ? 'border-white/10 hover:bg-white/5 hover:text-white' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                                    }`}
                                >
                                    {w}px
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeMenu === 'text' && (
                <div 
                    className={`flex flex-col gap-2 border p-2.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 ${
                        isDark ? 'bg-[#0f0d23] border-white/5' : 'bg-white border-zinc-200'
                    }`}
                >
                    <div className="flex items-center gap-1.5">
                        {TEXT_COLORS.map(c => (
                            <button
                                key={c.value}
                                onClick={() => onUpdateItems({ textColor: c.value })}
                                className="w-5 h-5 rounded-full border border-zinc-300/40 hover:scale-110 active:scale-95 transition-transform"
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                            />
                        ))}
                    </div>
                    <div className={`h-px my-0.5 ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`} />
                    <div className={`flex items-center justify-between gap-4 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        <span>Font Size</span>
                        <div className="flex gap-1">
                            {[12, 16, 24, 32, 48].map(sz => (
                                <button
                                    key={sz}
                                    onClick={() => onUpdateItems({ fontSize: sz })}
                                    className={`px-2 py-0.5 rounded border transition-colors ${
                                        singleItem?.fontSize === sz
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : isDark ? 'border-white/10 hover:bg-white/5 hover:text-white' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                                    }`}
                                >
                                    {sz}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
