import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MaskedLinesProps {
  lines: ReactNode[];
  /** Animate when true (usually driven by an in-view flag). */
  show?: boolean;
  className?: string;
  /** Per-line stagger in milliseconds. */
  stagger?: number;
  /** Extra delay before the first line. */
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div';
}

/**
 * Typographic mask reveal: each line sits in an overflow-hidden shell and slides
 * up into place, staggered line by line. Composing whole lines lets the mask
 * read cleanly at display sizes without fragmenting words.
 */
export function MaskedLines({ lines, className, as = 'div' }: MaskedLinesProps) {
  const Tag = as;
  return (
    <Tag className={cn(className)}>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </Tag>
  );
}
