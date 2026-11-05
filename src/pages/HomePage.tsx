import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useProducts, useCollections, useGarments } from '@/hooks/useCatalog';
import type { Collection, Garment, Product } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';
import { Reveal } from '@/components/motion/Reveal';
import { MaskedLines } from '@/components/motion/MaskedLines';
import { Parallax } from '@/components/motion/Parallax';
import { Marquee } from '@/components/motion/Marquee';
import { AnimatedImage } from '@/components/motion/AnimatedImage';
import { useInView, usePrefersReducedMotion } from '@/hooks/useMotion';
import { isTShirtProduct } from '@/lib/utils';

export function HomePage() {
  const { products, loading } = useProducts();
  const { collections } = useCollections();

  const featured = useMemo(() => {
    const tees = products.filter(isTShirtProduct);
    const picked = tees.filter(p => p.featured);
    return (picked.length ? picked : tees.length ? tees : products).slice(0, 6);
  }, [products]);

  return (
    <div className="relative bg-dark text-bone overflow-x-hidden">
      <Hero heroProduct={featured[0]} />

      <div className="border-y border-charcoal-border/80 bg-charcoal/60">
        <Marquee className="py-5" duration={38}>
          {['PREMIUM FABRICATION', 'ELEVATED ESSENTIALS', 'HEAVYWEIGHT COTTON', 'CRAFTED TO ORDER', 'REFINED SILHOUETTES', 'SIGNATURE PRINTS', 'CONSIDERED DETAILS', 'STUDIO FINISHED', 'SMALL-BATCH RELEASES', 'QUALITY IN EVERY STITCH', 'EVERYDAY LUXURY', 'DESIGNED TO LAST'].map(word => (
            <span key={word} className="flex items-center">
              <span className="px-8 text-xs font-bold uppercase tracking-[0.35em] text-bone-muted">{word}</span>
              <span className="text-crimson">✦</span>
            </span>
          ))}
        </Marquee>
      </div>

      <ArtDirectionShowcase />
      <FeaturedWorks products={featured} loading={loading} />
      <CollectionsShowcase collections={collections} />
      <CustomFeature />
      <ClosingCTA />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const HERO_BACKGROUND_IMAGES = [
  '/artwork/IMG-20261008-WA0015.jpg',
  '/artwork/IMG-20261008-WA0076.jpg',
  '/artwork/IMG-20261008-WA0079.jpg',
  '/artwork/IMG-20261008-WA0081.jpg',
  '/artwork/IMG-20261008-WA0082.jpg',
  '/artwork/IMG-20261008-WA0084.jpg',
  '/artwork/IMG-20261008-WA0085.jpg',
  '/artwork/IMG-20261008-WA0088.jpg',
  '/artwork/IMG-20261008-WA0089.jpg',
];

interface HeroProduct {
  name: string;
  slug: string;
  placeholder_image: string | null;
  front_image_url?: string | null;
}

function Hero({ heroProduct }: { heroProduct?: HeroProduct }) {
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBackgroundIndex(current => (current + 1) % HERO_BACKGROUND_IMAGES.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), reduced ? 0 : 120);
    return () => clearTimeout(t);
  }, [reduced]);

  return (
    <section className="relative -mt-20 overflow-hidden bg-dark text-bone border-b border-charcoal-border/60">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {HERO_BACKGROUND_IMAGES.map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === backgroundIndex ? 'opacity-35' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute inset-0 bg-dark/55" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[95vh] max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-32 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-7">
          <Reveal>
            <span className="flex w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-metallic-gold sm:gap-3 sm:text-[11px] sm:tracking-[0.35em]">
              <span className="h-px w-8 shrink-0 bg-crimson" />
              <span className="max-w-full">ELASHA T-SHIRT STUDIO</span>
            </span>
          </Reveal>

          <MaskedLines
            as="h1"
            show={ready}
            delay={150}
            className="mt-9 max-w-full break-words font-display text-[11vw] font-bold leading-[1.02] tracking-tight text-bone sm:mt-6 sm:text-[8.5vw] sm:leading-[0.95] lg:text-[5.4rem]"
            lines={[
              'Everyday essentials',
              'with a point of',
              <span key="gothic" className="font-display font-bold text-metallic-gold drop-shadow-md">
                view.
              </span>,
            ]}
          />

          <Reveal delay={620}>
            <p className="mt-8 max-w-md text-sm sm:text-base leading-relaxed text-bone-muted">
              Explore graphic T-shirts, oversized fits and everyday essentials made with considered details, original artwork and a distinct point of view.
            </p>
          </Reveal>

          <Reveal delay={760}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/shop"
                className="group inline-flex items-center gap-3 bg-crimson px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-bone shadow-lg transition-all hover:bg-crimson-light hover:shadow-crimson/30"
              >
                Shop T-Shirts
                <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
              </Link>
              <Link
                to="/custom"
                className="group inline-flex items-center gap-3 border border-bone-muted/40 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-bone transition-all hover:border-crimson hover:bg-charcoal hover:text-bone"
              >
                Custom Atelier
                <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5 text-crimson" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={900}>
            <dl className="mt-14 flex flex-wrap gap-x-12 gap-y-6 border-t border-charcoal-border/70 pt-8">
              {[
                ['Limited Series', 'Numbered runs, never reprinted'],
                ['Atelier Built', 'Made to order & hand finished'],
                ['Original Prints', "MEN'S & WOMEN'S T-SHIRTS"],
              ].map(([term, desc]) => (
                <div key={term}>
                  <dt className="font-display text-base font-semibold text-bone">{term}</dt>
                  <dd className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-bone-muted">{desc}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className="relative lg:col-span-5">
          <Parallax speed={-40} scale={0.02}>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md border border-charcoal-border bg-charcoal/80 p-3 shadow-2xl rounded-sm">
              <div className="relative h-full w-full overflow-hidden bg-dark-deep">
                {(heroProduct?.front_image_url || heroProduct?.placeholder_image) ? (
                  <AnimatedImage
                    src={heroProduct.front_image_url || heroProduct.placeholder_image || ''}
                    alt={heroProduct.name}
                    priority
                    reveal="mask"
                    className="h-full w-full"
                    imgClassName="object-cover p-0 scale-[1.05] transition-transform duration-700 group-hover:scale-[1.1]"
                  />
                ) : (
                  <div className="skeleton h-full w-full" />
                )}
                <div className="absolute inset-0 pointer-events-none border border-crimson/20" />
              </div>
              <span className="absolute -bottom-4 -right-4 hidden h-24 w-24 items-center justify-center border border-charcoal-border bg-dark/90 backdrop-blur sm:flex shadow-xl">
                <img src="/logo-mark-light.png" alt="" className="h-12 w-auto opacity-90" />
              </span>
            </div>
          </Parallax>

          {heroProduct && (
            <Reveal delay={1000} className="mt-8 flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-bone-muted">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-crimson" />
                Featured Piece
              </span>
              <Link to={`/shop/${heroProduct.slug}`} className="text-bone hover:text-crimson-light font-semibold transition-colors">
                {heroProduct.name}
              </Link>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function SectionLabel({ children, index }: { children: string; index: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs font-bold text-crimson">{index}</span>
      <span className="h-px w-6 bg-crimson/60" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-bone-muted">{children}</span>
    </div>
  );
}

function ArtDirectionShowcase() {
  return (
    <section className="relative bg-dark py-24 border-b border-charcoal-border/80 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <Reveal>
              <SectionLabel index="02">Art Direction</SectionLabel>
            </Reveal>
            <Reveal delay={120}>
              <h2 className="mt-6 font-display text-3xl sm:text-5xl font-bold text-bone leading-tight">
                Signature Design <span className="text-metallic-gold font-display font-light">×</span> Modern Craft
              </h2>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-6 text-sm text-bone-muted leading-relaxed max-w-xl">
                Every artwork begins with an intention. Each line, symbol, and colour becomes part of a process that gives form to an idea.
              </p>
            </Reveal>
            <Reveal delay={360}>
              <div className="mt-6 grid grid-cols-1 gap-2 text-xs text-bone-muted sm:mt-8 sm:flex sm:flex-wrap sm:gap-4">
                <div className="flex min-h-11 w-full items-center border border-charcoal-border bg-charcoal/80 px-3 py-3 rounded-sm sm:w-auto sm:px-4">
                  <span className="mr-3 shrink-0 font-mono text-crimson">01</span>
                  <span>Sacred art. Cosmic consciousness.</span>
                </div>
                <div className="flex min-h-11 w-full items-center border border-charcoal-border bg-charcoal/80 px-3 py-3 rounded-sm sm:w-auto sm:px-4">
                  <span className="mr-3 shrink-0 font-mono text-crimson">02</span>
                  <span>Clothing with a deeper meaning.</span>
                </div>
                <div className="flex min-h-11 w-full items-center border border-charcoal-border bg-charcoal/80 px-3 py-3 rounded-sm sm:w-auto sm:px-4">
                  <span className="mr-3 shrink-0 font-mono text-crimson">03</span>
                  <span>Art as a path to the infinite.</span>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-5 relative">
            <Reveal delay={200}>
              <div className="relative border border-crimson/40 p-2 bg-charcoal rounded-sm shadow-2xl overflow-hidden group">
                <img
                  src="/brand-hero.png"
                  alt="ELASHA Visual Direction"
                  className="w-full h-auto object-cover rounded-sm transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 text-xs font-mono text-bone-muted flex justify-between items-center">
                  <span className="uppercase tracking-widest text-[10px]">Studio Reference #01</span>
                  <span className="text-crimson-light font-semibold">ELASHA ARTWARE</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function FeaturedWorks({ products, loading }: { products: Product[]; loading: boolean }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-28 border-b border-charcoal-border/80">
      <div className="flex items-end justify-between gap-6">
        <div>
          <Reveal>
            <SectionLabel index="03">Selected Works</SectionLabel>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="mt-6 font-display text-4xl font-bold tracking-tight text-bone sm:text-5xl">
              Featured Artwear
            </h2>
          </Reveal>
        </div>
        <Reveal delay={200}>
          <Link to="/shop" className="hidden text-[11px] font-bold uppercase tracking-[0.25em] text-crimson-light hover:text-bone transition-colors sm:inline-block">
            View Catalogue →
          </Link>
        </Reveal>
      </div>

      {loading ? (
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[4/5] w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3">
          {products.map((product, i) => (
            <Reveal
              key={product.id}
              delay={(i % 3) * 110}
              className={i % 3 === 1 ? 'md:mt-12' : i % 3 === 2 ? 'md:mt-6' : ''}
            >
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      )}

      <div className="mt-12 sm:hidden">
        <Link to="/shop" className="text-[11px] font-bold uppercase tracking-[0.25em] text-crimson-light">
          View Catalogue →
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function CollectionsShowcase({ collections }: { collections: Collection[] }) {
  if (!collections.length) return null;
  return (
    <section className="bg-dark-surface py-24 text-bone lg:py-32 border-b border-charcoal-border/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <Reveal>
              <SectionLabel index="04">Signature Collections</SectionLabel>
            </Reveal>
            <Reveal delay={120}>
              <h2 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl text-bone">
                Collections
              </h2>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <Link to="/collections" className="text-[11px] font-bold uppercase tracking-[0.25em] text-crimson-light hover:text-bone transition-colors">
              All Series →
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {collections.slice(0, 6).map((col, i) => (
            <Reveal key={col.id} delay={(i % 3) * 120} variant="mask" className={i % 2 === 1 ? 'lg:mt-12' : ''}>
              <Link to={`/collections/${col.slug}`} className="group relative block overflow-hidden border border-charcoal-border hover:border-crimson transition-colors rounded-sm">
                <div className="relative aspect-[4/5] overflow-hidden bg-charcoal">
                  {col.hero_image && (
                    <img
                      src={col.hero_image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-[1.2s] ease-out-expo group-hover:scale-105"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute -right-4 top-4 select-none font-display font-black text-[7rem] leading-none text-bone/10"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/40 to-transparent flex flex-col justify-end p-6">
                    <h3 className="font-display text-2xl font-bold text-metallic-silver transition-all duration-300">{col.name}</h3>
                    <p className="mt-1 text-xs text-bone-muted line-clamp-2">{col.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson-light">
                      <span>Explore Collection</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function CustomFeature() {
  const { garments } = useGarments();

  return (
    <section className="relative overflow-hidden bg-dark py-24 lg:py-32 border-b border-charcoal-border/80">
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-5">
          <Reveal>
            <SectionLabel index="05">Custom Atelier</SectionLabel>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-bone sm:text-5xl">
              Your artwork,
              <br />
              <span className="font-display font-semibold text-crimson-light">made into artwear.</span>
            </h2>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-bone-muted">
              Choose a men's or women's T-shirt in half- or full-sleeve style, select your size, then position your artwork in our custom print studio.
            </p>
          </Reveal>
          <Reveal delay={340}>
            <ol className="mt-10 space-y-5">
              {[
                ['Choose T-Shirt Style', "Men's or women's; half or full sleeve"],
                ['Choose Your Size', 'Size options vary by style'],
                ['Upload & Compose', 'Transform, scale, and place artwork'],
              ].map(([t, d], i) => (
                <li key={t} className="flex items-start gap-4">
                  <span className="mt-0.5 font-mono text-xs font-bold text-crimson">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-sm font-semibold text-bone">{t}</p>
                    <p className="text-xs text-bone-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={440}>
            <Link
              to="/custom"
              className="group mt-10 inline-flex items-center gap-3 bg-crimson px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-bone transition-colors hover:bg-crimson-light"
            >
              Open Studio Designer
              <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>

        <div className="relative lg:col-span-7">
          <GarmentPlates garments={garments} />
        </div>
      </div>
    </section>
  );
}

function GarmentPlates({ garments }: { garments: Garment[] }) {
  const plates = garments.filter(g => g.slug === 'tee' || g.slug === 'longsleeve').slice(0, 2);
  const columns = [plates.filter(g => g.slug === 'tee'), plates.filter(g => g.slug === 'longsleeve')];

  return (
    <div className="grid grid-cols-2 gap-5">
      {columns.map((column, col) => (
        <Parallax key={col} speed={col === 0 ? -30 : 30}>
          <div className="space-y-5">
            {column.map(g =>
              g.placeholder_image ? (
                <div key={g.id} className="group relative overflow-hidden border border-charcoal-border bg-charcoal p-3 rounded-sm">
                  <AnimatedImage
                    src={g.placeholder_image}
                    alt={g.slug === 'longsleeve' ? 'Full Sleeve T-Shirt' : 'Half Sleeve T-Shirt'}
                    reveal="mask"
                    className="aspect-[4/5] w-full bg-dark-deep"
                    imgClassName="object-contain p-5 transition-transform duration-[1.1s] ease-out-expo group-hover:scale-105"
                  />
                  <div className="mt-2 text-center text-xs font-semibold text-bone">{g.slug === 'longsleeve' ? 'Full Sleeve T-Shirt' : 'Half Sleeve T-Shirt'}</div>
                </div>
              ) : (
                <div key={g.id} className="skeleton aspect-[4/5] w-full" />
              )
            )}
          </div>
        </Parallax>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */

function ClosingCTA() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4 });
  return (
    <section ref={ref} className="grain relative overflow-hidden bg-dark text-bone">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_50%_120%,rgba(128,15,46,0.25),transparent_60%)]" />
      <div className="relative mx-auto max-w-5xl px-4 py-28 text-center sm:px-6 lg:py-36">
        <MaskedLines
          as="h2"
          show={inView}
          stagger={120}
          className="font-display text-[10vw] font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl text-bone"
          lines={['Made to be', <span key="em" className="font-display font-semibold text-crimson-light">worn with confidence.</span>]}
        />
        <Reveal delay={400}>
          <p className="mx-auto mt-8 max-w-lg text-sm leading-relaxed text-bone-muted">
            Explore our latest limited releases or enter the custom atelier to compose your own piece.
          </p>
        </Reveal>
        <Reveal delay={520}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/shop" className="group inline-flex items-center gap-3 bg-crimson px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-bone transition-colors hover:bg-crimson-light">
              Shop Catalogue
              <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
            </Link>
            <Link to="/collections" className="inline-flex items-center gap-3 border border-charcoal-border bg-charcoal px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-bone transition-colors hover:border-crimson">
              View Collections
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
