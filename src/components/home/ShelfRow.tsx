'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Horizontal scroller in the streaming-app idiom: snap scrolling, arrow
 * buttons that appear on hover and disappear at either end, and faded edges
 * that tell you there is more.
 *
 * The inner track carries vertical and horizontal padding with matching
 * negative margins. A scroll container clips both axes, so without that
 * breathing room a card's hover lift and onion-skin edges would be cut off.
 */
export function Scroller({ children, className, itemGap = 'gap-4' }: { children: React.ReactNode; className?: string; itemGap?: string }) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);

  const measure = React.useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children]);

  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className={cn('group/row relative', className)}>
      <div
        ref={trackRef}
        onScroll={measure}
        className={cn(
          '-mx-4 -my-6 flex snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 py-6 scrollbar-none md:-mx-8 md:scroll-px-8 md:px-8',
          itemGap
        )}
        style={{
          maskImage: `linear-gradient(90deg, ${atStart ? '#000' : 'transparent'} 0, #000 40px, #000 calc(100% - 40px), ${atEnd ? '#000' : 'transparent'} 100%)`,
          WebkitMaskImage: `linear-gradient(90deg, ${atStart ? '#000' : 'transparent'} 0, #000 40px, #000 calc(100% - 40px), ${atEnd ? '#000' : 'transparent'} 100%)`,
        }}
      >
        {children}
      </div>

      <RowArrow side="left" hidden={atStart} onClick={() => page(-1)} />
      <RowArrow side="right" hidden={atEnd} onClick={() => page(1)} />
    </div>
  );
}

function RowArrow({ side, hidden, onClick }: { side: 'left' | 'right'; hidden: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Scroll left' : 'Scroll right'}
      tabIndex={hidden ? -1 : 0}
      className={cn(
        'squash absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#110f1a]/85 text-white shadow-xl backdrop-blur-xl transition-opacity duration-300 hover:bg-white/15 md:grid',
        side === 'left' ? '-left-3' : '-right-3',
        hidden ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100'
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
