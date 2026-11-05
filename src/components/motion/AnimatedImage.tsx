import { useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { useInView, usePrefersReducedMotion } from '@/hooks/useMotion';

interface AnimatedImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Classes applied to the <img> itself. */
  imgClassName?: string;
  /** Reveal style once the image scrolls into view. */
  reveal?: 'mask' | 'fade' | 'none';
  /** Load eagerly (above the fold) instead of lazily. */
  priority?: boolean;
  /** Milliseconds to delay the reveal. */
  delay?: number;
}

/**
 * Image with a masked reveal and a shimmering skeleton until the bitmap has
 * decoded, so large artwork never flashes in half-painted. The reveal degrades
 * to an instant show for reduced motion and screens out of view.
 */
export function AnimatedImage({
  src,
  alt,
  className,
  imgClassName,
  reveal = 'mask',
  priority = false,
  delay = 0,
}: AnimatedImageProps) {
  const reduced = usePrefersReducedMotion();
  const [watchRef, inView] = useInView<HTMLDivElement>({ threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
  const [loaded, setLoaded] = useState(false);

  const shown = reduced || inView;
  const delayStyle = { '--reveal-delay': `${delay}ms` } as CSSProperties;
  const fadeStyle = reveal === 'fade' ? { transitionDelay: `${delay}ms`, opacity: loaded ? 1 : 0 } : undefined;

  const img = (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      style={fadeStyle}
      className={cn(
        'h-full w-full object-contain',
        reveal === 'fade' && 'transition-opacity duration-700 ease-out-expo',
        !loaded && reveal === 'none' && 'opacity-0',
        imgClassName
      )}
    />
  );

  // clip-path shrinks an element's intersection region to zero, so an observer
  // placed on the masked node would never report it visible and the image would
  // stay hidden forever. For the mask variant the observer lives on an unclipped
  // outer box (which carries the layout classes) while the inner box does the
  // wipe; the two are the same size so the layout is unchanged.
  if (reveal === 'mask') {
    return (
      <div ref={watchRef} className={cn('relative', className)}>
        <div className="relative h-full w-full overflow-hidden" style={delayStyle} data-mask={shown ? 'in' : ''}>
          {!loaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}
          {img}
        </div>
      </div>
    );
  }

  return (
    <div ref={watchRef} className={cn('relative overflow-hidden', className)} style={delayStyle}>
      {!loaded && reveal !== 'none' && <div className="skeleton absolute inset-0" aria-hidden="true" />}
      {img}
    </div>
  );
}
