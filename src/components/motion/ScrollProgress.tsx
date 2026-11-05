import { useScrollProgress } from '@/hooks/useMotion';

/** Hairline reading-progress bar pinned under the fixed header. */
export function ScrollProgress() {
  const progress = useScrollProgress();
  return (
    <div className="absolute bottom-0 left-0 right-0 h-px bg-transparent" aria-hidden="true">
      <div
        className="h-full origin-left bg-neutral-900 transition-transform duration-100 ease-linear"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
