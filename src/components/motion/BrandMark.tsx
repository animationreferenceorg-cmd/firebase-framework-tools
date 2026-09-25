import { cn } from '@/lib/utils';

/**
 * The bouncing ball — the first exercise every animator is given — inside a
 * film frame. At rest it sits squashed on the floor; on hover of the nearest
 * `group` it starts bouncing with proper squash and stretch.
 *
 * Pure CSS so it costs nothing to render in the header on every page.
 */
export function BrandMark({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn('group/brand inline-flex items-center gap-2.5', className)}>
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_6px_20px_-6px_rgba(124,58,237,0.8)] ring-1 ring-white/20">
        {/* Film sprocket holes, top and bottom. */}
        <span className="absolute inset-x-1 top-[3px] flex justify-between">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-[3px] w-[3px] rounded-[1px] bg-black/35" />
          ))}
        </span>
        <span className="absolute inset-x-1 bottom-[3px] flex justify-between">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-[3px] w-[3px] rounded-[1px] bg-black/35" />
          ))}
        </span>

        {/* Floor contact shadow — shrinks as the ball rises. */}
        <span className="absolute bottom-[8px] h-[3px] w-[10px] rounded-full bg-black/40 group-hover/brand:animate-shadow-pulse" />
        {/* The ball. Origin at its base so the squash reads as weight on the floor. */}
        <span className="absolute bottom-[9px] h-[9px] w-[9px] origin-bottom scale-x-[1.15] scale-y-[0.85] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)] group-hover/brand:animate-ball-bounce" />
      </span>

      {showWordmark && (
        <span className="hidden font-display text-[15px] font-bold leading-none tracking-tight text-white sm:inline">
          Animation<span className="text-violet-300">Ref</span>
        </span>
      )}
    </span>
  );
}
