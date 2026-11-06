import { useParams, Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useProduct, useProducts } from '@/hooks/useCatalog';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/context/CartContext';
import { formatPrice, cn, isTShirtProduct } from '@/lib/utils';
import { ChevronLeft, ShoppingBag, Check } from 'lucide-react';
import type { ProductVariant } from '@/types';
import { Reveal } from '@/components/motion/Reveal';
import { MaskedLines } from '@/components/motion/MaskedLines';
import { BrandLoader } from '@/components/motion/PageTransition';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductCard } from '@/components/product/ProductCard';
import { GarmentPlaceholder } from '@/components/product/GarmentPlaceholder';
import { handleProductPhotoMove, resetProductPhotoTilt } from '@/lib/productPhotoMotion';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { product, variants, loading } = useProduct(slug ?? '');
  const { products: allProducts } = useProducts();
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [activeImageView, setActiveImageView] = useState<'front' | 'back'>('front');

  useEffect(() => {
    setActiveImageView('front');
  }, [product?.id]);

  const sizes = useMemo(() => {
    const map = new Map<string, string>();
    variants.forEach(v => {
      if (v.size && v.size.label !== 'XS') map.set(v.size.id, v.size.label);
    });
    return Array.from(map.entries());
  }, [variants]);

  // Find variant matching selected size (using product's default/first available variant for that size)
  const selectedVariant: ProductVariant | undefined = useMemo(() => {
    if (!selectedSize) return undefined;
    return variants.find(v => v.size_id === selectedSize && v.stock > 0)
      ?? variants.find(v => v.size_id === selectedSize);
  }, [variants, selectedSize]);

  // Recommendations: products from same collection or other pieces
  const recommendations = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter(p => p.id !== product.id)
      .sort((a, b) => {
        const sameColA = a.collection_id === product.collection_id ? -1 : 1;
        const sameColB = b.collection_id === product.collection_id ? -1 : 1;
        return sameColA - sameColB;
      })
      .slice(0, 4);
  }, [allProducts, product]);

  function handleAddToCart() {
    if (!selectedSize) {
      setError('Please select a size.');
      return;
    }
    if (!product || !selectedVariant) {
      setError('Selected size option is unavailable.');
      return;
    }
    if (selectedVariant.stock <= 0) {
      setError('This variant is out of stock.');
      return;
    }
    const price = selectedVariant.price_override ?? product.price;
    addItem({
      id: `${product.id}-${selectedVariant.id}`,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      product_image: product.front_image_url || product.placeholder_image,
      variant_id: selectedVariant.id,
      size_label: selectedVariant.size?.label ?? '',
      colour_name: selectedVariant.colour?.name ?? '',
      colour_hex: selectedVariant.colour?.hex ?? '',
      price,
      quantity: 1,
      is_custom: false,
    });
    setError(null);
    setAdded(true);
    setTimeout(() => setAdded(false), 2600);
  }

  if (loading) {
    return <BrandLoader className="py-40" />;
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center bg-dark text-bone">
        <h1 className="font-display text-3xl font-bold text-bone">Piece Not Found</h1>
        <Link to="/shop" className="mt-6 inline-block text-xs font-bold uppercase tracking-widest text-crimson-light hover:text-bone">
          Return to Catalogue
        </Link>
      </div>
    );
  }

  const isTee = isTShirtProduct(product);
  const frontImage = product.front_image_url || product.placeholder_image;
  const backImage = product.back_image_url;
  const hasRealProductImage = Boolean(frontImage && !/\/placeholders\//i.test(frontImage));
  const hasFrontBackViews = Boolean(frontImage && backImage);
  const showBackImage = Boolean(activeImageView === 'back' && backImage);

  return (
    <div className="bg-dark text-bone min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link to="/shop" className="mb-8 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-bone-muted hover:text-crimson-light transition-colors">
          <ChevronLeft className="h-4 w-4 text-crimson" /> Return to Catalogue
        </Link>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-4">
            {/* Consistent 4:5 complete product gallery without cropping */}
            <div
              className={cn(
                'relative aspect-[4/5] overflow-hidden border border-charcoal-border bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,255,255,0.05),transparent_65%),linear-gradient(145deg,#141417,#09090b)] shadow-2xl p-4 sm:p-6 flex items-center justify-center',
                hasRealProductImage && 'product-photo-stage'
              )}
              onMouseMove={hasRealProductImage ? handleProductPhotoMove : undefined}
              onMouseLeave={hasRealProductImage ? resetProductPhotoTilt : undefined}
            >
              {frontImage && !/\/placeholders\//i.test(frontImage) ? (
                <img
                  src={frontImage}
                  alt={product.name + ' — front view'}
                  className={cn(
                    'absolute inset-0 m-auto h-full w-full object-contain p-4 sm:p-6 transition-opacity duration-500 ease-out motion-reduce:transition-none',
                    showBackImage ? 'opacity-0' : 'opacity-100'
                  )}
                />
              ) : (
                <GarmentPlaceholder name={product.name} className="px-6 py-7 sm:px-8 sm:py-8" />
              )}
              {backImage && (
                <img
                  src={backImage}
                  alt={product.name + ' — back view'}
                  className={cn(
                    'absolute inset-0 m-auto h-full w-full object-contain p-4 sm:p-6 transition-opacity duration-500 ease-out motion-reduce:transition-none',
                    showBackImage ? 'opacity-100' : 'opacity-0'
                  )}
                />
              )}
              <span className="absolute left-4 top-4 z-10 border border-white/15 bg-black/70 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-bone backdrop-blur-md">
                {showBackImage ? '02 / Back View' : '01 / Front View'}
              </span>
              <span className="pointer-events-none absolute bottom-4 right-4 z-10 text-[8px] font-semibold uppercase tracking-[0.2em] text-bone/75">
                ELASHA · Studio
              </span>
            </div>

            {hasFrontBackViews && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={activeImageView === 'front'} onClick={() => setActiveImageView('front')}
                  className={cn('group/view flex items-center justify-between border px-4 py-3 text-left transition-all duration-300',
                    activeImageView === 'front' ? 'border-[#D4AF37]/70 bg-[#D4AF37]/10 text-bone' : 'border-charcoal-border bg-charcoal/50 text-bone-muted hover:border-[#D4AF37]/40 hover:text-bone')}>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">01 / Front</span>
                  <span className={cn('h-1.5 w-1.5 rounded-full transition-colors', activeImageView === 'front' ? 'bg-[#D4AF37]' : 'bg-white/20')} />
                </button>
                <button type="button" aria-pressed={activeImageView === 'back'} onClick={() => setActiveImageView('back')}
                  className={cn('group/view flex items-center justify-between border px-4 py-3 text-left transition-all duration-300',
                    activeImageView === 'back' ? 'border-[#D4AF37]/70 bg-[#D4AF37]/10 text-bone' : 'border-charcoal-border bg-charcoal/50 text-bone-muted hover:border-[#D4AF37]/40 hover:text-bone')}>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">02 / Back</span>
                  <span className={cn('h-1.5 w-1.5 rounded-full transition-colors', activeImageView === 'back' ? 'bg-[#D4AF37]' : 'bg-white/20')} />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between border-y border-charcoal-border py-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-bone-muted sm:text-[10px] sm:tracking-[0.25em]">
              <span>Product view</span>
              <span className="text-[#D4AF37]">Studio product imagery</span>
            </div>
          </div>

          {/* Details */}
          <div className="lg:pt-2">
            {product.collection && (
              <Reveal>
                <Link
                  to={`/collections/${product.collection.slug}`}
                  className="text-xs font-bold uppercase tracking-[0.3em] text-metallic-silver hover:brightness-125 transition-all inline-block"
                >
                  {product.collection.name}
                </Link>
              </Reveal>
            )}

            <RevealShowH1 name={product.name} isTee={isTee} />

            <Reveal delay={150}>
              <p className="mt-4 font-mono text-2xl font-bold text-bone">{formatPrice(product.price)}</p>
            </Reveal>

            {product.description && (
              <Reveal delay={220}>
                <p className="mt-6 max-w-prose text-xs sm:text-sm leading-relaxed text-bone-muted">{product.description}</p>
              </Reveal>
            )}

            {/* Sizing (No color swatches displayed) */}
            <Reveal delay={300} className="mt-8">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-bone-muted">Sizing</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setSelectedSize(id)}
                    className={cn(
                      'min-w-[3.5rem] border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-sm',
                      selectedSize === id ? 'border-crimson bg-crimson text-bone shadow-md' : 'border-charcoal-border bg-charcoal text-bone-muted hover:border-bone hover:text-bone'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Reveal>

            {selectedVariant && (
              <p className="mt-4 text-xs font-mono text-bone-muted">
                {selectedVariant.stock > 0 ? (
                  <span className="text-emerald-400">In Stock ({selectedVariant.stock} available)</span>
                ) : (
                  <span className="text-crimson-light font-bold">Sold Out / Archive</span>
                )}
              </p>
            )}

            {error && <p className="mt-4 text-xs font-bold text-crimson-light bg-crimson/10 border border-crimson/30 p-3 rounded-sm">{error}</p>}

            <Reveal delay={420} className="mt-8">
              <Button
                onClick={handleAddToCart}
                disabled={!selectedVariant || selectedVariant.stock <= 0}
                size="lg"
                className="w-full bg-crimson text-bone hover:bg-crimson-light py-4 font-bold tracking-widest text-xs uppercase"
              >
                {added ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-4 w-4" /> Add to Bag
                  </>
                )}
              </Button>
            </Reveal>

            {product.is_customizable && (
              <Reveal delay={480}>
                <Link
                  to="/custom"
                  className="mt-6 inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-crimson-light hover:text-bone transition-colors"
                >
                  ✦ Custom Atelier Available — Design Your Own Artwork
                </Link>
              </Reveal>
            )}
          </div>
        </div>

        {/* Recommendations / Related Pieces */}
        {recommendations.length > 0 && (
          <div className="mt-20 border-t border-charcoal-border/80 pt-16">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-crimson-light">Atelier Archive</span>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-bone">
              Recommended Pieces
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
              {recommendations.map((rec) => (
                <ProductCard key={rec.id} product={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Customer Reviews Section */}
        <ProductReviews productId={product.id} />
      </div>
    </div>
  );
}

function RevealShowH1({ name, isTee }: { name: string; isTee: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <MaskedLines
      as="h1"
      show={show}
      stagger={0}
      delay={60}
      className="mt-3 font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight text-bone"
      lines={[
        isTee ? (
          <span key={name} className="text-metallic-silver inline-block">
            {name}
          </span>
        ) : (
          name
        ),
      ]}
    />
  );
}
