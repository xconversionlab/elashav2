import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MaskedLines } from '@/components/motion/MaskedLines';
import { Reveal } from '@/components/motion/Reveal';

interface AuthShellProps {
  eyebrow: string;
  title: ReactNode[];
  subtitle: string;
  children: ReactNode;
}

/**
 * Split-screen auth layout: an editorial brand panel on the left, the form on
 * the right. On mobile the panel collapses to a slim masthead so the form stays
 * the focus.
 */
export function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="grid min-h-[calc(100vh-5rem)] grid-cols-1 lg:grid-cols-2 bg-dark text-bone">
      {/* Brand panel */}
      <div className="grain relative hidden overflow-hidden bg-charcoal text-bone border-r border-charcoal-border/80 lg:block">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-[6%] top-1/2 -translate-y-1/2 select-none font-display font-black text-[18vw] leading-none text-bone/5"
        >
          ELASHA
        </span>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_100%_at_20%_100%,rgba(128,15,46,0.25),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between p-14">
          <Link to="/">
            <img src="/logo-horizontal-light.png" alt="ELASHA" className="h-8 w-auto" />
          </Link>
          <div>
            <MaskedLines
              as="p"
              show
              stagger={90}
              className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-bone"
              lines={['Underground objects', <span key="em" className="font-display font-semibold text-crimson-light">of intention.</span>]}
            />
            <p className="mt-6 max-w-sm text-xs leading-relaxed text-bone-muted">
              Limited series, made to order, and custom printed. Manage your orders, studio designs, and saved pieces in one private account.
            </p>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-crimson-light">Artware · Fashion · Studio</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 bg-dark">
        <div className="w-full max-w-md bg-charcoal p-8 border border-charcoal-border rounded-sm shadow-2xl">
          <div className="lg:hidden">
            <Link to="/" className="inline-block">
              <img src="/logo-horizontal-light.png" alt="ELASHA" className="h-9 w-auto" />
            </Link>
          </div>
          <Reveal>
            <span className="mt-8 block text-[11px] font-semibold uppercase tracking-[0.35em] text-crimson-light lg:mt-0">{eyebrow}</span>
          </Reveal>
          <MaskedLines
            as="h1"
            show
            stagger={0}
            delay={120}
            className="mt-3 font-display text-3xl font-bold tracking-tight text-bone"
            lines={title}
          />
          <Reveal delay={220}>
            <p className="mt-4 text-xs leading-relaxed text-bone-muted">{subtitle}</p>
          </Reveal>
          <Reveal delay={320} className="mt-8">
            {children}
          </Reveal>
        </div>
      </div>
    </div>
  );
}
