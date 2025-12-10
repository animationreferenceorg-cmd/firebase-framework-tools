
'use client';

import type { Category } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import React from 'react';
import { cn } from '@/lib/utils';
import { SortableCategoryCard } from './SortableCategoryCard';
import { useDroppable } from '@dnd-kit/core';

interface DroppableCategoryRowProps {
  id: string;
  title: string;
  categories: Category[];
}

export function DroppableCategoryRow({ id, title, categories }: DroppableCategoryRowProps) {
  const { setNodeRef } = useDroppable({ id });
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkForScrollPosition = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.8
        : scrollLeft + clientWidth * 0.8;
      
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    const currentRef = scrollRef.current;
    if (currentRef) {
      checkForScrollPosition();
      currentRef.addEventListener('scroll', checkForScrollPosition);
    }
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', checkForScrollPosition);
      }
    };
  }, [categories]);

  if (!categories || categories.length === 0) {
    return null;
  }
  
  return (
    <section ref={setNodeRef} className="group/row relative">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">{title}</h2>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all opacity-0 group-hover/row:opacity-100",
          !canScrollLeft && "opacity-0 pointer-events-none"
        )}
        onClick={() => scroll('left')}
      >
        <ChevronLeft size={24} />
      </Button>

      <div className="overflow-x-auto overflow-y-hidden scrollbar-hide ml-4">
        <div ref={scrollRef} className="flex space-x-3 md:space-x-4 pb-4">
          {categories.map(category => (
            <div key={`${title}-${category.id}`} className="flex-shrink-0 w-[60vw] sm:w-[40vw] md:w-[30vw] lg:w-[24vw]">
              <SortableCategoryCard category={category} />
            </div>
          ))}
        </div>
      </div>

      <Button 
        variant="ghost" 
        size="icon" 
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all opacity-0 group-hover/row:opacity-100",
          !canScrollRight && "opacity-0 pointer-events-none"
        )}
        onClick={() => scroll('right')}
      >
        <ChevronRight size={24} />
      </Button>
    </section>
  );
}
