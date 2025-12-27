"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

interface FeaturedCategoryRowProps {
    title?: string;
    categories: Category[];
}

export function FeaturedCategoryRow({ title = "Featured Collections", categories }: FeaturedCategoryRowProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkForScrollPosition = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        const currentRef = scrollRef.current;
        if (currentRef) {
            checkForScrollPosition();
            currentRef.addEventListener('scroll', checkForScrollPosition);
            window.addEventListener('resize', checkForScrollPosition);
        }
        return () => {
            if (currentRef) {
                currentRef.removeEventListener('scroll', checkForScrollPosition);
                window.removeEventListener('resize', checkForScrollPosition);
            }
        };
    }, [categories]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.7; // Scroll 70% of view
            const scrollTo = direction === 'left'
                ? scrollLeft - scrollAmount
                : scrollLeft + scrollAmount;

            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (!categories || categories.length === 0) return null;

    return (
        <section className="group/row relative w-full mb-12">

            {/* Header */}
            {title && (
                <div className="container mx-auto px-4 md:px-8 mb-6 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                </div>
            )}

            {/* Scroll Buttons */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 z-20 hidden md:block">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-12 w-12 rounded-full bg-black/60 border border-white/10 hover:bg-black/80 text-white backdrop-blur-md shadow-2xl transition-all duration-300 transform hover:scale-110",
                        !canScrollLeft && "opacity-0 pointer-events-none",
                        canScrollLeft && "opacity-0 group-hover/row:opacity-100"
                    )}
                    onClick={() => scroll('left')}
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 right-4 z-20 hidden md:block">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-12 w-12 rounded-full bg-black/60 border border-white/10 hover:bg-black/80 text-white backdrop-blur-md shadow-2xl transition-all duration-300 transform hover:scale-110",
                        !canScrollRight && "opacity-0 pointer-events-none",
                        canScrollRight && "opacity-0 group-hover/row:opacity-100"
                    )}
                    onClick={() => scroll('right')}
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </div>

            {/* Scroll Container */}
            <div
                ref={scrollRef}
                className="overflow-x-auto overflow-y-hidden scrollbar-hide px-4 md:px-8 pb-8"
            >
                <div className="flex gap-6 w-max">
                    {categories.map((category, index) => (
                        <Link
                            key={category.id}
                            href={category.href || `/browse?category=${category.id}`} // Fallback href
                            className="relative flex-shrink-0 group/card block"
                        >
                            <div className="w-[85vw] sm:w-[400px] aspect-[1.85/1] relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-lg transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)] hover:border-purple-500/30 hover:-translate-y-1">

                                {/* Background Image */}
                                {category.imageUrl ? (
                                    <Image
                                        src={category.imageUrl}
                                        alt={category.title}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover/card:scale-110"
                                        sizes="(max-width: 640px) 85vw, 400px"
                                        priority={index < 2} // Prioritize first few images
                                    />
                                ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                        <Sparkles className="h-10 w-10 text-white/10" />
                                    </div>
                                )}

                                {/* Gradient Overlays */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover/card:opacity-90 transition-opacity duration-300" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                                {/* Content */}
                                <div className="absolute inset-0 p-6 flex flex-col justify-end items-start">

                                    {/* Optional Badge/Tag (if needed in future, currently using index for variation example) */}
                                    {index === 0 && (
                                        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-bold tracking-wider uppercase shadow-lg">
                                            Featured
                                        </div>
                                    )}

                                    <h3 className="text-2xl font-bold text-white mb-2 leading-tight drop-shadow-lg group-hover/card:text-purple-100 transition-colors">
                                        {category.title}
                                    </h3>

                                    {category.description && (
                                        <p className="text-sm text-zinc-300 line-clamp-2 max-w-[90%] opacity-0 group-hover/card:opacity-100 transform translate-y-2 group-hover/card:translate-y-0 transition-all duration-300 delay-75">
                                            {category.description}
                                        </p>
                                    )}

                                    {/* Action indicator on hover */}
                                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-widest opacity-0 transform translate-y-4 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-300 delay-100">
                                        Explore Collection <ChevronRight className="h-3 w-3" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
