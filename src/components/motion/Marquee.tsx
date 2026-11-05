import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  /** Seconds for one full loop. */
  duration?: number;
  reverse?: boolean;
}

/**
 * Infinite horizontal marquee. The content is duplicated once and the track
 * translates -50%, producing a seamless loop entirely in CSS.
 */
export function Marquee({ children, className, duration = 32, reverse = false }: MarqueeProps) {
  return (
    <div className={cn('marquee-paused relative overflow-hidden', className)}>
      <div
        className="marquee-track"
        style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        <span className="flex shrink-0 items-center">{children}</span>
        <span className="flex shrink-0 items-center" aria-hidden="true">{children}</span>
      </div>
    </div>
  );
}
