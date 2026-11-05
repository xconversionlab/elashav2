import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowUpRight, MoveUpRight } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice, cn, isTShirtProduct } from '@/lib/utils';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');
  const isWishlisted = has(product.id);
  const frontImage = product.front_image_url || product.placeholder_image;
  const backImage = product.back_image_url;
  const isPlaceholder = Boolean(frontImage && /\/placeholders\//i.test(frontImage));
  const canSwitchView = Boolean(frontImage && backImage && !isPlaceholder);
  const isTee = isTShirtProduct(product);

  return (
    <article className="group/product flex h-full select-none flex-col overflow-hidden border border-charcoal-border/80 bg-charcoal/55 transition-[transform,border-color,box-shadow] duration-700 ease-out hover:-translate-y-1.5 hover:border-[#D4AF37]/65 hover:shadow-[0_24px_70px_rgba(0,0,0,0.5)] motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative aspect-[4/5] overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,255,255,0.05),transparent_65%),linear-gradient(145deg,#151518,#0a0a0c)]">
        <Link
          to={`/shop/${product.slug}`}
          className="absolute inset-0 z-0 block overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
          onContextMenu={event => event.preventDefault()}
          aria-label={`View ${product.name}`}
        >
          {isPlaceholder ? (
            <GarmentPlaceholder name={product.name} />
          ) : frontImage ? (
            <>
              <img
                src={frontImage}
                alt={product.name + ' — front view'}
                loading="lazy"
                className={cn(
                  'absolute inset-0 m-auto h-full w-full object-contain p-2.5 sm:p-3.5 transition-opacity duration-500 ease-out motion-reduce:transition-none',
                  activeView === 'front' || !backImage ? 'opacity-100' : 'opacity-0'
                )}
              />
              {backImage && (
                <img
                  src={backImage}
                  alt={product.name + ' — back view'}
                  loading="lazy"
                  className={cn(
                    'absolute inset-0 m-auto h-full w-full object-contain p-2.5 sm:p-3.5 transition-opacity duration-500 ease-out motion-reduce:transition-none',
                    activeView === 'back' ? 'opacity-100' : 'opacity-0'
                  )}
                />
              )}
            </>
          ) : (
            <GarmentPlaceholder name={product.name} />
          )}

          <div className="pointer-events-none absolute inset-2.5 border border-white/[0.06] transition-all duration-700 group-hover/product:border-[#D4AF37]/35 sm:inset-3" />
        </Link>

        {canSwitchView ? (
          <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-0.5 border border-white/15 bg-black/75 p-1 backdrop-blur-md sm:left-3.5 sm:top-3.5">
            <button
              type="button"
              aria-pressed={activeView === 'front'}
              onClick={() => setActiveView('front')}
              className={cn(
                'px-2 py-1 text-[8px] font-bold uppercase tracking-[0.18em] transition-colors duration-300 sm:text-[9px]',
                activeView === 'front' ? 'bg-[#D4AF37] text-[#090909]' : 'text-bone/75 hover:text-bone'
              )}
            >
              01 / Front
            </button>
            <button
              type="button"
              aria-pressed={activeView === 'back'}
              onClick={() => setActiveView('back')}
              className={cn(
                'px-2 py-1 text-[8px] font-bold uppercase tracking-[0.18em] transition-colors duration-300 sm:text-[9px]',
                activeView === 'back' ? 'bg-[#D4AF37] text-[#090909]' : 'text-bone/75 hover:text-bone'
              )}
            >
              02 / Back
            </button>
          </div>
        ) : (
          <span className="pointer-events-none absolute left-3 top-3 z-10 border border-white/15 bg-black/65 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.19em] text-bone/90 sm:left-3.5 sm:top-3.5 sm:text-[9px]">
            {isPlaceholder || !frontImage ? 'Studio preview' : '01 / Front'}
          </span>
        )}

        {product.featured && (
          <span className="pointer-events-none absolute bottom-3 left-3 z-10 bg-[#D4AF37] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.18em] text-[#090909] shadow-lg sm:bottom-3.5 sm:left-3.5 sm:text-[9px]">
            Limited series
          </span>
        )}

        {user && (
          <button
            type="button"
            onClick={() => toggle(product.id)}
            className="absolute right-3 top-3 z-20 rounded-full border border-white/15 bg-black/65 p-2 text-bone/80 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#D4AF37]/60 hover:text-[#D4AF37] sm:right-3.5 sm:top-3.5"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart className={cn('h-3.5 w-3.5', isWishlisted ? 'fill-[#D4AF37] text-[#D4AF37]' : '')} />
          </button>
        )}

        <Link
          to={`/shop/${product.slug}`}
          className="absolute bottom-3 right-3 z-20 inline-flex translate-y-2 items-center gap-1.5 border border-white/20 bg-black/80 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-bone opacity-0 backdrop-blur-md transition-all duration-500 hover:border-[#D4AF37]/60 hover:text-[#D4AF37] group-hover/product:translate-y-0 group-hover/product:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 sm:bottom-3.5 sm:right-3.5 sm:text-[9px]"
        >
          View piece <MoveUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-between bg-charcoal/45 p-3 sm:p-4">
        <div>
          {product.collection && (
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-metallic-silver sm:text-[10px]">
              {product.collection.name}
            </p>
          )}
          <Link to={`/shop/${product.slug}`} className="mt-1 block">
            <h3 className={cn(
              'font-display text-base font-bold leading-snug tracking-wide transition-all duration-300 sm:text-lg',
              isTee ? 'text-metallic-silver' : 'text-bone group-hover/product:text-[#F0D77A]'
            )}>
              {product.name}
            </h3>
          </Link>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-charcoal-border/60 pt-3">
          <p className="font-mono text-xs tracking-wider text-bone-muted">{formatPrice(product.price)}</p>
          <Link
            to={`/shop/${product.slug}`}
            className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.15em] text-bone-muted/75 transition-colors hover:text-[#F0D77A] sm:text-[10px]"
          >
            View piece <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function GarmentPlaceholder({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_32%,rgba(212,175,55,0.12),transparent_55%),linear-gradient(145deg,#1b1b1d,#080809)] px-5 py-6">
      <div className="pointer-events-none absolute inset-4 border border-[#D4AF37]/15" />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/15 to-transparent" />
      <svg viewBox="0 0 400 420" aria-hidden="true" className="relative z-10 h-[78%] w-[78%] max-w-[320px] drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)] transition-transform duration-700 ease-out group-hover/product:scale-[1.045]">
        <defs>
          <linearGradient id="elasha-shirt-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eae5d9" stopOpacity=".16" />
            <stop offset="100%" stopColor="#eae5d9" stopOpacity=".035" />
          </linearGradient>
          <linearGradient id="elasha-shirt-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0d77a" stopOpacity=".85" />
            <stop offset="100%" stopColor="#8c6b1f" stopOpacity=".55" />
          </linearGradient>
        </defs>
        <path d="M143 53 105 76 57 123 91 170 125 148 125 355 275 355 275 148 309 170 343 123 295 76 257 53 228 70 200 78 172 70Z" fill="url(#elasha-shirt-fill)" stroke="url(#elasha-shirt-line)" strokeWidth="2" />
        <path d="M172 70 Q200 114 228 70" fill="none" stroke="#D4AF37" strokeOpacity=".7" strokeWidth="2" />
        <path d="M125 148 155 164 M275 148 245 164 M151 355v-20 M249 355v-20" fill="none" stroke="#eae5d9" strokeOpacity=".16" strokeWidth="1.5" />
        <path d="M200 130v177 M150 218h100" stroke="#D4AF37" strokeOpacity=".15" strokeDasharray="3 7" strokeWidth="1.5" />
      </svg>
      <div className="relative z-10 mt-1 text-center">
        <p className="text-[8px] font-semibold uppercase tracking-[0.3em] text-[#D4AF37]/85">ELASHA · Studio</p>
        <p className="mt-2 max-w-[90%] text-center text-[9px] uppercase tracking-[0.16em] text-bone-muted/70">{name}</p>
      </div>
      <span className="absolute bottom-5 right-5 text-[7px] font-mono uppercase tracking-[0.2em] text-bone-muted/40">01 / Preview</span>
    </div>
  );
}
