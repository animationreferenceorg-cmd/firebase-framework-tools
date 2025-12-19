'use client';

import React from 'react';
import { Film, Box, Move3d, Smile, Zap } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

const brands = [
    {
        title: '2D Animation',
        icon: <Film className="w-8 h-8 md:w-12 md:h-12 text-blue-400" />,
        gradient: 'from-[#0f0c29] via-[#302b63] to-[#24243e]',
        border: 'group-hover:border-blue-500/50'
    },
    {
        title: '3D Animation',
        icon: <Box className="w-8 h-8 md:w-12 md:h-12 text-purple-400" />,
        gradient: 'from-[#200122] to-[#6f0000]',
        border: 'group-hover:border-purple-500/50'
    },
    {
        title: 'Stop Motion',
        icon: <Move3d className="w-8 h-8 md:w-12 md:h-12 text-orange-400" />,
        gradient: 'from-[#4568dc] to-[#b06ab3]',
        border: 'group-hover:border-orange-500/50'
    },
    {
        title: 'Acting',
        icon: <Smile className="w-8 h-8 md:w-12 md:h-12 text-green-400" />,
        gradient: 'from-[#11998e] to-[#38ef7d]',
        border: 'group-hover:border-green-500/50'
    },
    {
        title: 'Effects',
        icon: <Zap className="w-8 h-8 md:w-12 md:h-12 text-yellow-400" />,
        gradient: 'from-[#ff9966] to-[#ff5e62]',
        border: 'group-hover:border-yellow-500/50'
    }
];

export function BrandRow() {
    return (
        <div className="w-full px-4 md:px-6 mb-12">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {brands.map((brand, i) => (
                    <div
                        key={i}
                        className={cn(
                            "group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-white/40",
                            brand.gradient,
                            // Mobile: the last 2 items might wrap if 3 cols, or we can scroll. 
                            // Disney uses a scrollable row on mobile usually, but grid is cleaner for small number (5).
                            // Let's force 2 cols on very small screens, 3 on sm, 5 on md?
                            // Actually, simplified to 3 cols mobile (last 2 wrap) or just scroll.
                            // Let's do a flex with min-width for true disney style scroll, OR a responsive grid.
                            // Grid is asked for in context of "row", but Disney is actually a static row of 5.
                            // Let's stick to the grid for now as it fits nicely.
                        )}
                    >
                        {/* Hover Glow Background */}
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center justify-center py-6 md:py-8 gap-3">
                            <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm border border-white/5 shadow-inner">
                                {brand.icon}
                            </div>
                            <span className="text-xs md:text-sm font-bold text-white/90 uppercase tracking-widest text-center shadow-black drop-shadow-md">
                                {brand.title}
                            </span>
                        </div>

                        {/* Shine Effect */}
                        <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                    </div>
                ))}
            </div>
        </div>
    );
}
