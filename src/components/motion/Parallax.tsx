import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useElementProgress, usePrefersReducedMotion } from '@/hooks/useMotion';

interface ParallaxProps {
  children: ReactNode;
  /** Pixels of travel across the full viewport pass. Negative moves upward. */
  speed?: number;
  className?: string;
  /** Adds a subtle scale drift for depth. */
  scale?: number;
}

/**
 * Moves its children against the scroll using a rAF-throttled transform. Only
 * `transform` is animated, so it composites on the GPU and stays smooth on
 * mobile. Disabled entirely when the visitor prefers reduced motion.
 */
export function Parallax({ children, speed = 60, className, scale = 0 }: ParallaxProps) {
  const reduced = usePrefersReducedMotion();
  const [ref, progress] = useElementProgress<HTMLDivElement>();

  const style: CSSProperties = reduced
    ? {}
    : {
        transform: `translate3d(0, ${(progress * speed).toFixed(2)}px, 0)${scale ? ` scale(${(1 + progress * scale).toFixed(4)})` : ''}`,
        willChange: 'transform',
      };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div style={style}>{children}</div>
    </div>
  );
}
