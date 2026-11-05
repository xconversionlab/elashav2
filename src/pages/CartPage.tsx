import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShoppingBag, Trash2, Minus, Plus, ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';

export function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="bg-dark min-h-screen text-bone flex items-center justify-center py-20 px-4">
        <EmptyState
          icon={<ShoppingBag className="h-12 w-12 text-crimson" />}
          title="Your Atelier Bag is Empty"
          description="Explore our premium clothing collection and choose pieces for your wardrobe."
          action={
            <Link to="/shop" className="bg-crimson px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-bone transition-colors hover:bg-crimson-light rounded-sm inline-block">
              Explore Catalogue
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="bg-dark min-h-screen text-bone py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-crimson-light">Atelier Selection</span>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-bone sm:text-5xl">Your Bag</h1>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {items.map((item, i) => (
              <Reveal key={item.id} delay={i * 60} className="group/cart-item flex gap-5 border-b border-charcoal-border/70 py-6">
                <div className="relative aspect-square w-24 sm:w-28 flex-shrink-0 overflow-hidden bg-charcoal border border-charcoal-border rounded-sm p-1">
                  {item.product_image && <img src={item.product_image} alt={item.product_name} className="h-full w-full object-contain" />}
                </div>
                <div className="flex-1">
                  <Link to={`/shop/${item.product_slug}`} className="font-display text-base sm:text-lg font-bold text-metallic-silver hover:brightness-125 transition-all tracking-wide">
                    {item.product_name}
                  </Link>
                  <p className="mt-1 text-xs text-bone-muted">
                    Size: {item.size_label}
                  </p>
                  {item.is_custom && item.artwork_url && (
                    <span className="mt-2 inline-block bg-crimson px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-bone rounded-sm">Custom Atelier</span>
                  )}
                  <p className="mt-2 font-mono text-sm text-bone">{formatPrice(item.price)}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center border border-charcoal-border bg-charcoal rounded-sm">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 text-bone-muted transition-colors hover:text-bone hover:bg-charcoal-light" aria-label="Decrease">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-4 py-1 text-xs font-mono text-bone">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 text-bone-muted transition-colors hover:text-bone hover:bg-charcoal-light" aria-label="Increase">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="flex items-center gap-1 text-xs font-semibold text-bone-muted transition-colors hover:text-crimson-light">
                      <Trash2 className="h-3.5 w-3.5 text-crimson" /> Remove
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-bone">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </Reveal>
            ))}
            <button onClick={clearCart} className="mt-6 text-xs font-bold uppercase tracking-wider text-bone-muted transition-colors hover:text-crimson-light">
              Empty Bag
            </button>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-charcoal p-7 border border-charcoal-border rounded-sm shadow-2xl">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-bone-muted">Order Summary</h2>
              <div className="mt-5 space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-bone-muted">Items subtotal</span>
                  <span className="font-mono font-semibold text-bone">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bone-muted">Shipping &amp; delivery</span>
                  <span className="font-mono text-bone-muted">Confirmed before payment</span>
                </div>
                <div className="mt-4 flex items-baseline justify-between border-t border-charcoal-border pt-5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-bone-muted">Subtotal before shipping</span>
                  <span className="font-mono text-2xl font-bold text-bone">{formatPrice(total)}</span>
                </div>
              </div>
              <Link to="/checkout" className="block mt-6">
                <Button className="w-full bg-crimson text-bone hover:bg-crimson-light font-bold text-xs uppercase tracking-widest py-4" size="lg">Proceed to Checkout</Button>
              </Link>
              <Link to="/shop" className="group mt-4 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-bone-muted hover:text-bone transition-colors">
                Explore More Pieces
                <ArrowRight className="h-3.5 w-3.5 text-crimson transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
