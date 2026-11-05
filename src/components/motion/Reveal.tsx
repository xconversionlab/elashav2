import { createElement, useState, useEffect, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useInView, usePrefersReducedMotion } from '@/hooks/useMotion';

type Variant = 'up' | 'mask';

interface RevealProps {
  children: ReactNode;
  /** `up` slides and fades; `mask` wipes the element open with a clip edge. */
  variant?: Variant;
  /** Milliseconds to stagger the reveal. */
  delay?: number;
  className?: string;
  as?: ElementType;
  threshold?: number;
}

/**
 * Reveals its children as they enter the viewport using CSS transitions so the
 * animation never blocks the main thread. Falls back to instantly visible when
 * the visitor prefers reduced motion.
 */
export function Reveal({ children, variant = 'up', delay = 0, className, as = 'div', threshold = 0.01 }: RevealProps) {
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLElement>({ threshold });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  const shown = reduced || inView || mounted;

  const style = { '--reveal-delay': `${delay}ms` } as CSSProperties;

  // A masked node is clipped to zero height, which empties its intersection
  // region — an observer on it would never fire and the content would stay
  // hidden. For the mask variant the observer lives on an unclipped wrapper and
  // the wipe is applied to a child that lays out identically.
  if (variant === 'mask') {
    return (
      <span ref={ref} style={{ display: 'block' }}>
        {createElement(
          as,
          { className: cn(className), style, 'data-mask': shown ? 'in' : '' },
          children
        )}
      </span>
    );
  }

  return createElement(
    as,
    {
      ref,
      className: cn(className),
      style,
      'data-reveal': shown ? 'in' : '',
    },
    children
  );
}
