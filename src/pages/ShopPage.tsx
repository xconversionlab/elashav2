import { useState, useMemo } from 'react';
import { useProducts } from '@/hooks/useCatalog';
import { ProductCard } from '@/components/product/ProductCard';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Package } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { cn, isTShirtProduct } from '@/lib/utils';

export function ShopPage() {
  const { products, loading } = useProducts();
  const [sort, setSort] = useState('featured');
  const [collection, setCollection] = useState('all');
  const [category, setCategory] = useState('tees');

  const collections = useMemo(() => {
    const set = new Map<string, string>();
    products.forEach(p => {
      if (p.collection) set.set(p.collection.slug, p.collection.name);
    });
    return Array.from(set.entries());
  }, [products]);

  const filtered = useMemo(() => {
    let result = [...products];
    if (category === 'tees') result = result.filter(isTShirtProduct);
    if (collection !== 'all') {
      result = result.filter(p => p.collection?.slug === collection);
    }
    switch (sort) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return result;
  }, [products, sort, collection, category]);

  return (
    <div className="bg-dark min-h-screen text-bone">
      <header className="border-b border-charcoal-border/80 bg-charcoal/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-20">
          <div>
            <Reveal>
              <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-crimson-light">
                The ELASHA Collection
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-bone sm:text-6xl lg:text-7xl">
                T-Shirts & Essentials
              </h1>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p className="max-w-xs text-xs leading-relaxed text-bone-muted">
              Graphic tees, oversized fits and everyday essentials. Original Elasha artwork, considered details. {loading ? 'Loading collection…' : `${filtered.length} pieces available.`}
            </p>
          </Reveal>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="sticky top-16 z-30 mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-charcoal-border/80 bg-dark/95 py-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <div className="w-full sm:w-48">
              <Select value={category} onChange={e => setCategory(e.target.value)} className="bg-charcoal text-bone border-charcoal-border">
                <option value="tees">T-Shirts First</option>
                <option value="all">All Pieces</option>
              </Select>
            </div>
            <div className="w-full sm:w-56">
              <Select value={collection} onChange={e => setCollection(e.target.value)} className="bg-charcoal text-bone border-charcoal-border">
                <option value="all">All Collections</option>
                {collections.map(([slug, name]) => (
                  <option key={slug} value={slug}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-56">
              <Select value={sort} onChange={e => setSort(e.target.value)} className="bg-charcoal text-bone border-charcoal-border">
                <option value="featured">Featured / Limited</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </Select>
            </div>
          </div>
          <div className="text-xs font-mono text-bone-muted hidden md:block">
            SHOWING <span className="text-crimson-light font-bold">{filtered.length}</span> PIECES
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="skeleton aspect-[4/5] w-full" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Package className="h-12 w-12" />} title="No products found" description="Try adjusting your filters." />
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((product, i) => (
              <Reveal key={product.id} delay={(i % 4) * 80} className={cn(i % 4 === 1 && 'lg:mt-10', i % 4 === 3 && 'lg:mt-6')}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
