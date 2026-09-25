import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  /** Small monospace label above the title, e.g. "Library" or "Reel 02". */
  eyebrow?: string;
  title: React.ReactNode;
  /** Right-aligned slot for a count, link or controls. */
  aside?: React.ReactNode;
  className?: string;
}

/**
 * One heading treatment for every shelf, so the page reads as a single
 * product instead of sections each styled by whoever built them.
 */
export function SectionHeading({ eyebrow, title, aside, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3 px-1', className)}>
      <div className="space-y-1.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="font-display text-xl font-bold leading-none tracking-tight text-white md:text-2xl">
          {title}
        </h2>
      </div>
      {aside && <div className="flex items-center gap-2">{aside}</div>}
    </div>
  );
}
