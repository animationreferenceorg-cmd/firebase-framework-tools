'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

interface RevealProps extends HTMLMotionProps<'div'> {
  /** Seconds to wait before this block starts moving — use to stagger siblings. */
  delay?: number;
  /** How far the block travels up into place, in px. */
  distance?: number;
}

/**
 * Fades and lifts content into place the first time it scrolls into view.
 *
 * Plays once: re-animating a section every time it re-enters the viewport
 * reads as a gimmick after the second scroll. Under reduced motion it renders
 * statically — no opacity trick, so nothing can end up stuck invisible.
 */
export function Reveal({ delay = 0, distance = 22, children, ...rest }: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children as React.ReactNode}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
