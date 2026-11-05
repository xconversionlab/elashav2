import { X, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Link } from 'react-router-dom';
import { formatPrice, cn } from '@/lib/utils';

export function CartDrawer() {
  const { items, isOpen, setOpen, removeItem, updateQuantity, total } = useCart();

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-500',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-dark text-bone border-l border-charcoal-border shadow-2xl transition-transform duration-500 ease-out-expo',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden={!isOpen}
      >
        <header className="flex items-center justify-between border-b border-charcoal-border bg-charcoal px-6 py-5">
          <h2 className="flex items-center gap-3 font-display text-lg font-bold text-bone">
            <ShoppingBag className="h-5 w-5 text-crimson" strokeWidth={1.5} /> Your Atelier Bag
          </h2>
          <button onClick={() => setOpen(false)} aria-label="Close cart" className="text-bone-muted transition-colors hover:text-bone">
            <X className="h-5 w-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="h-10 w-10 text-charcoal-border" strokeWidth={1.2} />
            <p className="mt-4 text-xs font-mono text-bone-muted">Your bag is currently empty.</p>
            <Link
              to="/shop"
              onClick={() => setOpen(false)}
              className="group mt-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-crimson-light hover:text-bone"
            >
              Explore Catalogue
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {items.map(item => (
                <div key={item.id} className="group/cart-item flex gap-4 border-b border-charcoal-border/60 py-5">
                  <div className="relative aspect-square w-20 flex-shrink-0 overflow-hidden bg-charcoal border border-charcoal-border rounded-sm p-1">
                    {item.product_image && (
                      <img src={item.product_image} alt={item.product_name} className="h-full w-full object-contain" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-sm font-bold tracking-wide text-metallic-silver">{item.product_name}</p>
                    <p className="mt-0.5 text-xs text-bone-muted">
                      Size: {item.size_label}
                    </p>
                    {item.artwork_url && (
                      <p className="mt-1 inline-block bg-crimson px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-bone rounded-sm">
                        Custom Atelier
                      </p>
                    )}
                    <p className="mt-1.5 font-mono text-sm text-bone">{formatPrice(item.price)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center border border-charcoal-border bg-charcoal rounded-sm">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 text-bone-muted transition-colors hover:text-bone hover:bg-charcoal-light" aria-label="Decrease">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 py-1 text-xs font-mono text-bone">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 text-bone-muted transition-colors hover:text-bone hover:bg-charcoal-light" aria-label="Increase">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-xs text-bone-muted transition-colors hover:text-crimson-light">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <footer className="border-t border-charcoal-border bg-charcoal/50 px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-bone-muted">Subtotal</span>
                <span className="font-mono text-xl font-bold text-bone">{formatPrice(total)}</span>
              </div>
              <Link
                to="/cart"
                onClick={() => setOpen(false)}
                className="mt-5 block bg-charcoal border border-charcoal-border px-6 py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-bone transition-colors hover:border-crimson"
              >
                View Full Bag
              </Link>
              <Link
                to="/checkout"
                onClick={() => setOpen(false)}
                className="mt-2 block bg-crimson px-6 py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-bone transition-colors hover:bg-crimson-light"
              >
                Proceed to Checkout
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
