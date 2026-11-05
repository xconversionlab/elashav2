import { useParams, Link } from 'react-router-dom';
import { useCollectionProducts } from '@/hooks/useCatalog';
import { ProductCard } from '@/components/product/ProductCard';
import { ChevronLeft } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { MaskedLines } from '@/components/motion/MaskedLines';

export function CollectionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, collection, loading } = useCollectionProducts(slug ?? '');

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="skeleton h-12 w-2/3 max-w-lg" />
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[4/5] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center bg-dark text-bone">
        <h1 className="font-display text-3xl font-bold text-bone">Series Not Found</h1>
        <Link to="/collections" className="mt-6 inline-block text-xs font-bold uppercase tracking-widest text-crimson-light hover:text-bone">
          Return to Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-dark min-h-screen text-bone">
      {/* Cinematic collection header */}
      <header className="grain relative overflow-hidden bg-charcoal border-b border-charcoal-border/80 text-bone">
        {collection.hero_image && (
          <img src={collection.hero_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-[2vw] bottom-[-8%] select-none font-display font-black text-[24vw] leading-none text-bone/5"
        >
          {collection.name.slice(0, 8).toUpperCase()}
        </span>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Link
            to="/collections"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-bone-muted hover:text-crimson-light transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-crimson" /> Back to Collections
          </Link>
          <MaskedLines
            as="h1"
            show
            stagger={80}
            className="mt-8 max-w-4xl font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
            lines={[
              <span key="col-title" className="text-metallic-silver inline-block">
                {collection.name}
              </span>,
            ]}
          />
          {collection.description && (
            <Reveal delay={220}>
              <p className="mt-6 max-w-xl text-xs sm:text-sm leading-relaxed text-bone-muted">{collection.description}</p>
            </Reveal>
          )}
          <Reveal delay={320}>
            <p className="mt-6 text-[10px] font-mono font-semibold uppercase tracking-[0.3em] text-crimson-light">
              CATALOGUE ARCHIVE · {products.length} {products.length === 1 ? 'PIECE' : 'PIECES'}
            </p>
          </Reveal>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        {/* Multi-Image Collection Gallery */}
        {collection.images && collection.images.length > 0 && (
          <div className="mb-16 border-b border-charcoal-border pb-12">
            <Reveal>
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-crimson-light">Series Imagery</span>
              <h2 className="mt-1 font-display text-2xl font-bold text-bone">Collection Gallery</h2>
            </Reveal>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {collection.images.map((imgUrl, idx) => (
                <Reveal key={idx} delay={(idx % 4) * 80}>
                  <div className="group overflow-hidden border border-charcoal-border bg-charcoal aspect-[4/3] rounded-sm relative">
                    <img
                      src={imgUrl}
                      alt={`${collection.name} gallery ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <p className="text-xs text-bone-muted font-mono">No pieces archived in this collection yet.</p>
        ) : (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-crimson-light block mb-6">Collection Pieces</span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product, i) => (
                <Reveal key={product.id} delay={(i % 4) * 80}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
