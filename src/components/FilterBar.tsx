'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Settings2 } from 'lucide-react';

export type TabOption = 'featured' | 'community' | 'trending' | 'latest';
export type TypeOption = 'all' | '2D' | '3D';
export type PillOption = 'all' | 'locomotion' | 'combat' | 'acting' | 'creature' | 'mechanics' | 'vfx' | 'shorts';

export const QUICK_FILTER_PILLS: { id: PillOption; label: string; icon?: string }[] = [
    { id: 'all', label: '🔥 All Shots' },
    { id: 'locomotion', label: '🏃 Locomotion' },
    { id: 'combat', label: '⚔️ Combat & Action' },
    { id: 'acting', label: '🎭 Acting & Facial' },
    { id: 'creature', label: '🐾 Creature' },
    { id: 'mechanics', label: '✨ Body Mechanics' },
    { id: 'vfx', label: '💥 VFX & Physics' },
    { id: 'shorts', label: '🎬 Short Films' },
];

interface FilterBarProps {
    activeTab: TabOption;
    setActiveTab: (tab: TabOption) => void;
    activeType: TypeOption;
    setActiveType: (type: TypeOption) => void;
    columns?: number;
    setColumns?: (cols: number) => void;
    activePill?: PillOption;
    setActivePill?: (pill: PillOption) => void;
}

export function FilterBar({ activeTab, setActiveTab, activeType, setActiveType, columns, setColumns, activePill = 'all', setActivePill }: FilterBarProps) {
    return (
        <div className="min-w-0 space-y-3 py-3 sm:space-y-4 sm:py-4">
            {/* Top Row: Dribbble-style Quick Filter Pills */}
            {setActivePill && (
                <div className="-mx-1 flex touch-pan-x items-center gap-2 overflow-x-auto px-1 pb-2 scrollbar-none no-scrollbar snap-x scroll-px-1">
                    {QUICK_FILTER_PILLS.map((pill) => {
                        const isSelected = activePill === pill.id;
                        return (
                            <button
                                key={pill.id}
                                onClick={() => setActivePill(pill.id)}
                                aria-pressed={isSelected}
                                className={cn(
                                    "squash relative isolate px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-200 snap-start border cursor-pointer flex items-center gap-1.5 select-none",
                                    isSelected
                                        ? "text-white border-transparent"
                                        : "bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:bg-white/[0.08] hover:text-white"
                                )}
                            >
                                {isSelected && (
                                    <motion.span
                                        layoutId="filter-pill"
                                        aria-hidden
                                        className="absolute inset-0 -z-10 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600 shadow-[0_6px_18px_-6px_rgba(124,58,237,0.9),inset_0_1px_0_rgba(255,255,255,0.25)]"
                                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                    />
                                )}
                                <span>{pill.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Sub Row: Tabs and Controls */}
            <div className="flex min-w-0 flex-col justify-between gap-3 pt-1 sm:pt-2 md:flex-row md:items-center md:gap-4">
            {/* Left Tabs */}
            <div className="-mx-1 flex w-[calc(100%+0.5rem)] touch-pan-x items-center gap-6 overflow-x-auto px-1 pb-3 scrollbar-none no-scrollbar md:mx-0 md:w-auto md:gap-8 md:overflow-visible md:px-0 md:pb-0">
                {/* One underline shared across tabs, so it slides to the new
                    selection. The old version gave Featured/Trending a purple
                    active state and Community/Latest a white one. */}
                {([
                    ['featured', 'Featured'],
                    ['community', 'Community'],
                    ['trending', 'Trending'],
                    ['latest', 'Latest'],
                ] as [TabOption, string][]).map(([id, label]) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        aria-pressed={activeTab === id}
                        className={cn(
                            "relative min-h-10 shrink-0 py-2 text-sm font-semibold transition-colors md:min-h-0 md:py-0",
                            activeTab === id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        {label}
                        {activeTab === id && (
                            <motion.span
                                layoutId="filter-tab-underline"
                                aria-hidden
                                className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-violet-400 to-amber-300 shadow-[0_0_10px_rgba(167,139,250,0.7)]"
                                transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Right Filters */}
            <div className="-mx-1 flex w-[calc(100%+0.5rem)] touch-pan-x items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-none no-scrollbar md:mx-0 md:w-auto md:gap-3 md:overflow-visible md:px-0 md:pb-0">
                {/* Grid Size Control (Desktop Only) */}
                {setColumns && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="hidden md:flex h-9 w-9 bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800">
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-zinc-950 border-zinc-800 p-4" align="end">
                            <div className="space-y-4">
                                <h4 className="font-medium text-sm text-zinc-400">Grid Size</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">Larger</span>
                                    <span className="text-xs text-zinc-500">Smaller</span>
                                </div>
                                <Slider
                                    value={[columns || 3]}
                                    min={2}
                                    max={6}
                                    step={1}
                                    onValueChange={(vals) => setColumns(vals[0])}
                                    className="cursor-grab active:cursor-grabbing"
                                />
                                <div className="h-4 flex items-center justify-center">
                                    <p className="text-[10px] text-zinc-500 text-center uppercase tracking-wider font-semibold">
                                        {columns === 2 ? "Detail View" : columns === 6 ? "Dense View" : `${columns} Columns`}
                                    </p>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {/* 2D/3D Segmented Control */}
                <div className="flex shrink-0 rounded-xl border border-white/10 bg-zinc-900/90 p-1 backdrop-blur-md">
                    {(['all', '2D', '3D'] as TypeOption[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setActiveType(type)}
                            className={cn(
                                "squash relative isolate min-h-8 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors sm:px-4 select-none",
                                activeType === type ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            {activeType === type && (
                                <motion.span
                                    layoutId="filter-type-thumb"
                                    aria-hidden
                                    className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-b from-violet-500 to-indigo-600 shadow-[0_4px_14px_-4px_rgba(124,58,237,0.9)]"
                                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                                />
                            )}
                            {type === 'all' ? 'All' : type}
                        </button>
                    ))}
                </div>

                {/* Media Type Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10 shrink-0 border-white/5 bg-zinc-900 px-3 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white sm:h-9 sm:px-4">
                            All Media <ChevronDown className="ml-2 h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-zinc-300">
                        <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white cursor-pointer">All Media</DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white cursor-pointer">Video</DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white cursor-pointer">Image</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            </div>
        </div>
    );
}
