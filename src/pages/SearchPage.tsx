import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useCatalog';
import { ProductCard } from '@/components/product/ProductCard';
import { Search, Package } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { EmptyState } from '@/components/ui/EmptyState';

export function SearchPage() {
  const { products, loading } = useProducts();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.collection?.name.toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <div className="bg-dark min-h-screen text-bone py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-crimson-light">Search the Collection</span>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-bone sm:text-5xl">Catalogue Search</h1>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-8 max-w-md">
            <Search className="absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 text-crimson" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search pieces, series, or graphics…"
              className="w-full border-b border-charcoal-border bg-transparent py-3 pl-8 pr-4 text-sm font-semibold text-bone placeholder:text-bone-muted/50 outline-none transition-colors focus:border-crimson"
            />
          </div>
        </Reveal>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-bone-muted">
          {loading ? 'Searching collection…' : `${filtered.length} RESULT${filtered.length === 1 ? '' : 'S'} FOUND`}
        </p>

        {loading ? (
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/5] w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={<Package className="h-12 w-12 text-crimson" />}
              title="No Pieces Found"
              description="Try adjusting your search query."
              action={
                <Link to="/shop" className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson-light hover:text-bone">
                  Browse All Products
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
