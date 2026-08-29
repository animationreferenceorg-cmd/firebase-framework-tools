'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
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
                                    "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 snap-start border cursor-pointer flex items-center gap-1.5 select-none",
                                    isSelected
                                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400/40 shadow-md shadow-purple-900/30 scale-[1.02]"
                                        : "bg-white/[0.04] text-zinc-400 border-white/5 hover:bg-white/[0.08] hover:text-white hover:border-white/10"
                                )}
                            >
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
                <button
                    onClick={() => setActiveTab('featured')}
                    aria-pressed={activeTab === 'featured'}
                    className={cn(
                        "relative min-h-10 shrink-0 py-2 text-sm font-semibold transition-colors md:min-h-0 md:py-0",
                        activeTab === 'featured' ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Featured
                    {activeTab === 'featured' && (
                        <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('community')}
                    aria-pressed={activeTab === 'community'}
                    className={cn(
                        "relative min-h-10 shrink-0 py-2 text-sm font-semibold transition-colors md:min-h-0 md:py-0",
                        activeTab === 'community' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Community
                    {activeTab === 'community' && (
                        <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('trending')}
                    aria-pressed={activeTab === 'trending'}
                    className={cn(
                        "relative min-h-10 shrink-0 py-2 text-sm font-semibold transition-colors md:min-h-0 md:py-0",
                        activeTab === 'trending' ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Trending
                    {activeTab === 'trending' && (
                        <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('latest')}
                    aria-pressed={activeTab === 'latest'}
                    className={cn(
                        "relative min-h-10 shrink-0 py-2 text-sm font-semibold transition-colors md:min-h-0 md:py-0",
                        activeTab === 'latest' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    Latest
                    {activeTab === 'latest' && (
                        <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-white" />
                    )}
                </button>
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
                <div className="flex shrink-0 rounded-lg border border-white/5 bg-zinc-900/80 p-1">
                    {(['all', '2D', '3D'] as TypeOption[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setActiveType(type)}
                            className={cn(
                                "min-h-9 rounded-md px-3 py-1.5 text-xs font-semibold transition-all sm:px-4",
                                activeType === type
                                    ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                                    : "text-zinc-400 hover:text-zinc-200"
                            )}
                        >
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
