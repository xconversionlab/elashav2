import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { MaskedLines } from '@/components/motion/MaskedLines';

export function AboutPage() {
  return (
    <div className="bg-dark min-h-screen text-bone">
      <section className="grain relative overflow-hidden border-b border-charcoal-border/80 bg-charcoal text-bone">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[4vw] top-1/2 -translate-y-1/2 select-none font-display font-black text-[22vw] leading-none text-bone/5"
        >
          ELASHA
        </span>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <Reveal>
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-crimson-light">The ELASHA Story</span>
          </Reveal>
          <MaskedLines
            as="h1"
            show
            stagger={90}
            delay={120}
            className="mt-8 max-w-4xl font-display text-5xl font-bold leading-[1.02] tracking-tight text-bone sm:text-6xl lg:text-7xl"
            lines={['Sacred art.', 'Cosmic consciousness.', <span key="em" className="font-display font-semibold text-crimson-light">Wearable expressions of the divine.</span>]}
          />
          <Reveal delay={250}>
            <p className="mt-8 max-w-2xl text-sm leading-relaxed text-bone-muted sm:text-base">
              Every ritual begins with intention. Through sacred gestures, symbolic forms, and the rhythm of creation, the unseen finds its way into the physical world. Ancient traditions, esoteric patterns, and cosmic imagery become part of a transformative process where each mark holds purpose and every artwork becomes an act of devotion.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-b border-charcoal-border/80 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <Reveal>
              <span className="font-mono text-xs font-bold text-crimson">01</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-bone sm:text-4xl">The Idea</h2>
            </Reveal>
          </div>
          <div className="space-y-8 lg:col-span-8">
            <Reveal>
              <p className="font-display text-2xl font-bold leading-relaxed text-bone sm:text-3xl">
                An idea emerges from silence. An image takes shape through intuition. Ancient forms, abstract patterns, and celestial influences converge to create something that exists between imagination and reality.
              </p>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-base font-semibold text-crimson-light sm:text-lg">✦ Beyond the material. Into the infinite.</p>
            </Reveal>
            <Reveal delay={150}>
              <p className="text-sm leading-relaxed text-bone-muted sm:text-base">
                Art as a path to the infinite.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-bone-muted sm:text-base">
                Clothing with a deeper meaning.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-b border-charcoal-border/80 bg-dark-surface py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <Reveal>
                <span className="font-mono text-xs font-bold text-crimson">02</span>
                <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-bone sm:text-4xl">The Ritual of Creation</h2>
              </Reveal>
            </div>
            <div className="space-y-6 lg:col-span-8">
              <Reveal>
                <p className="text-sm leading-relaxed text-bone-muted sm:text-base">
                  Every artwork begins with an intention. Each line, symbol, and colour becomes part of a process that gives form to an idea.
                </p>
              </Reveal>
              <Reveal delay={100}>
                <p className="font-display text-2xl font-bold leading-relaxed text-bone sm:text-3xl">
                  Art communicates what ordinary language cannot. Symbols become a bridge between personal meaning, ancient imagery, and the unknown.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-bold tracking-tight text-bone sm:text-5xl">
            Art as a path to the infinite.
          </h2>
        </Reveal>
        <Reveal delay={150}>
          <Link
            to="/shop"
            className="group mt-10 inline-flex items-center gap-3 bg-crimson px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-bone transition-colors hover:bg-crimson-light"
          >
            Explore the Catalogue
            <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
