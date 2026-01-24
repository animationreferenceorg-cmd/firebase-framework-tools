"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Grid, Settings2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

interface ChannelBarProps {
    categories: Category[];
    selectedCategory: string | null;
    onSelectCategory: (categoryId: string | null) => void;
    onOpenAllCategories?: () => void;
    columns?: number;
    setColumns?: (cols: number) => void;
}

export function ChannelBar({ categories, selectedCategory, onSelectCategory, onOpenAllCategories, columns = 5, setColumns }: ChannelBarProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [localColumns, setLocalColumns] = useState(columns);

    const { toast } = useToast();

    useEffect(() => {
        setLocalColumns(columns);
    }, [columns]);

    const handleShare = (e: React.MouseEvent, catId: string, catTitle: string) => {
        e.stopPropagation();
        const url = `${window.location.origin}/c/${catId}`;
        navigator.clipboard.writeText(url);
        toast({
            title: "Link copied!",
            description: `Share link for ${catTitle} ready to paste.`,
        });
    };

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            checkScroll();
            el.addEventListener("scroll", checkScroll);
            window.addEventListener("resize", checkScroll);
            return () => {
                el.removeEventListener("scroll", checkScroll);
                window.removeEventListener("resize", checkScroll);
            };
        }
    }, [categories]);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const amount = 300;
            const current = scrollRef.current.scrollLeft;
            scrollRef.current.scrollTo({
                left: direction === "left" ? current - amount : current + amount,
                behavior: "smooth",
            });
        }
    };

    return (
        <div className="w-full relative group/channelbar">
            {/* Left Controls/Buttons */}
            <div className="flex items-center gap-2 mb-2 md:mb-0 md:absolute md:left-0 md:top-0 md:bottom-0 md:z-10 bg-gradient-to-r from-[#030014] via-[#030014] to-transparent pr-8">

                {/* Settings Popover (Grid Control) */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-16 w-16 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl shrink-0 transition-all">
                            <Settings2 className="h-6 w-6" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 bg-zinc-950 border-zinc-800 p-4" align="start">
                        <div className="space-y-4">
                            <h4 className="font-medium text-sm text-zinc-400">Grid Size</h4>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500">Larger</span>
                                <span className="text-xs text-zinc-500">Smaller</span>
                            </div>
                            <Slider
                                value={[localColumns]}
                                min={2}
                                max={6}
                                step={1}
                                onValueChange={(vals) => setLocalColumns(vals[0])}
                                onValueCommit={(vals) => setColumns?.(vals[0])}
                                className="cursor-grab active:cursor-grabbing"
                            />
                            <div className="h-4 flex items-center justify-center">
                                <p className="text-[10px] text-zinc-500 text-center uppercase tracking-wider font-semibold">
                                    {localColumns === 2 ? "Detail View" : localColumns === 6 ? "Dense View" : `${localColumns} Columns`}
                                </p>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
                <Button
                    onClick={() => onOpenAllCategories ? onOpenAllCategories() : onSelectCategory(null)}
                    variant={selectedCategory === null ? "secondary" : "outline"}
                    className={cn(
                        "h-16 gap-3 px-6 rounded-xl text-lg font-bold border-zinc-800 shrink-0 transition-all min-w-[200px]",
                        selectedCategory === null
                            ? "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                            : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    )}
                >
                    <Grid className="h-6 w-6" />
                    All Channels
                </Button>
                <div className="h-6 w-px bg-zinc-800 mx-2 hidden md:block" />
            </div>

            {/* Scroll Buttons (Absolute) */}
            <div className="absolute left-[280px] top-1/2 -translate-y-1/2 z-20 hidden md:block">
                {canScrollLeft && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => scroll("left")}
                        className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-lg transition-all"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                )}
            </div>

            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:block">
                {canScrollRight && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => scroll("right")}
                        className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-lg transition-all"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Scrolling List */}
            {/* Added left padding to account for the absolute 'All Channels' button on desktop */}
            <div
                ref={scrollRef}
                className="flex items-center gap-4 overflow-x-auto scrollbar-hide py-2 md:pl-[300px] md:pr-12"
            >
                {categories.map((cat) => (
                    <div key={cat.id} className="relative group/item shrink-0">
                        <Link
                            href={cat.slug ? `/categories/${cat.slug}` : `/categories/${cat.id}`}
                            onClick={(e) => {
                                e.preventDefault();
                                onSelectCategory(cat.id);
                            }}
                            className={cn(
                                "flex items-center gap-4 pr-12 pl-2 py-2 h-16 rounded-xl border transition-all shrink-0 relative overflow-hidden min-w-[240px]",
                                selectedCategory === cat.id
                                    ? "bg-zinc-800 border-zinc-600 text-white shadow-md ring-1 ring-white/10"
                                    : "bg-zinc-900/50 border-transparent hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white"
                            )}
                        >
                            {/* Larger Thumbnail */}
                            <div className="h-12 w-12 relative rounded-lg overflow-hidden bg-zinc-950 shrink-0 border border-white/5">
                                {cat.imageUrl ? (
                                    <Image
                                        src={cat.imageUrl}
                                        alt={cat.title}
                                        fill
                                        className="object-cover opacity-80 group-hover/item:opacity-100 transition-opacity"
                                    />
                                ) : (
                                    <div className="h-full w-full bg-zinc-800" />
                                )}
                            </div>
                            <span className="text-lg font-semibold whitespace-nowrap">{cat.title}</span>
                        </Link>

                        {/* Share Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-700/50 rounded-full z-10 transition-colors"
                            onClick={(e) => handleShare(e, cat.id, cat.title)}
                        >
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
