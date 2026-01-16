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
import { SlidersHorizontal, Settings2 } from 'lucide-react'; // Import Icon

export type TabOption = 'featured' | 'community' | 'trending' | 'latest';
export type TypeOption = 'all' | '2D' | '3D';

interface FilterBarProps {
    activeTab: TabOption;
    setActiveTab: (tab: TabOption) => void;
    activeType: TypeOption;
    setActiveType: (type: TypeOption) => void;
    columns?: number;
    setColumns?: (cols: number) => void;
}

export function FilterBar({ activeTab, setActiveTab, activeType, setActiveType, columns, setColumns }: FilterBarProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6">
            {/* Left Tabs */}
            <div className="flex items-center gap-8">
                <button
                    onClick={() => setActiveTab('featured')}
                    className={cn(
                        "text-sm font-semibold transition-colors relative",
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
                    className={cn(
                        "text-sm font-semibold transition-colors relative",
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
                    className={cn(
                        "text-sm font-semibold transition-colors relative",
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
                    className={cn(
                        "text-sm font-semibold transition-colors relative",
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
            <div className="flex items-center gap-3">
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
                <div className="flex p-1 bg-zinc-900/80 rounded-lg border border-white/5">
                    {(['all', '2D', '3D'] as TypeOption[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setActiveType(type)}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-xs font-semibold transition-all",
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
                        <Button variant="outline" size="sm" className="bg-zinc-900 border-white/5 text-zinc-300 hover:bg-zinc-800 hover:text-white h-9 px-4 text-xs font-medium">
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
    );
}
