import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCollections } from '@/hooks/useCatalog';
import { Reveal } from '@/components/motion/Reveal';
import { Parallax } from '@/components/motion/Parallax';

export function CollectionsPage() {
  const { collections, loading } = useCollections();

  return (
    <div className="bg-dark min-h-screen text-bone">
      <header className="border-b border-charcoal-border/80 bg-charcoal/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-20">
          <div>
            <Reveal>
              <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-crimson-light">Signature Collections</span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-bone sm:text-6xl lg:text-7xl">
                Collections
              </h1>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p className="max-w-xs text-xs leading-relaxed text-bone-muted">
              Seasonal releases and ongoing artwear series — limited numbered drops conceived in studio.
            </p>
          </Reveal>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {loading ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/3] w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2">
            {collections.map((col, i) => (
              <Reveal key={col.id} variant="mask" delay={(i % 2) * 120} className={i % 2 === 1 ? 'md:mt-16' : ''}>
                <Link to={`/collections/${col.slug}`} className="group block border border-charcoal-border hover:border-crimson transition-colors rounded-sm overflow-hidden shadow-2xl">
                  <Parallax speed={i % 2 === 0 ? -20 : 20}>
                    <div className="media-zoom relative aspect-[4/3] overflow-hidden bg-charcoal">
                      {col.hero_image && (
                        <img
                          src={col.hero_image}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className="absolute left-4 top-4 select-none font-display font-black text-[8rem] sm:text-[9rem] leading-none text-bone/15"
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/50 to-transparent flex flex-col justify-end p-8">
                        <div className="flex items-baseline gap-3 mb-1">
                          <span className="font-mono text-sm font-bold text-crimson">{String(i + 1).padStart(2, '0')}</span>
                          <span className="h-px w-6 bg-crimson/50" />
                        </div>
                        <h2 className="font-display text-3xl font-bold text-metallic-silver transition-all duration-300">{col.name}</h2>
                        {col.description && (
                          <p className="mt-2 max-w-sm text-xs text-bone-muted line-clamp-2">
                            {col.description}
                          </p>
                        )}
                        <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-crimson-light">
                          Explore Series
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </Parallax>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
