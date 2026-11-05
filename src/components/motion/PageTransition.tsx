import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** Brushed editorial loading state used for route changes and image loads. */
export function BrandLoader({ label = 'ELASHA', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <span className="text-xs font-medium uppercase tracking-[0.4em] text-neutral-400">{label}</span>
      <span className="relative block h-px w-40 overflow-hidden bg-neutral-200">
        <span className="absolute inset-y-0 left-0 w-full origin-left animate-loader-line bg-neutral-900" />
      </span>
    </div>
  );
}

/**
 * Fades the routed content in on every navigation, giving page changes a soft,
 * cinematic entry instead of an abrupt swap.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(false);
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div
      className={cn(
        'transition-opacity duration-500 ease-out-expo motion-reduce:transition-none',
        shown ? 'opacity-100' : 'opacity-0'
      )}
    >
      {children}
    </div>
  );
}
