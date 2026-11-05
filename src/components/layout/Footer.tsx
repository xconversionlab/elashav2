import { Link } from 'react-router-dom';
import { Instagram, Twitter, Mail, ArrowUp } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';

export function Footer() {
  return (
    <footer className="mt-auto bg-dark border-t border-charcoal-border/80 text-bone-muted">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link to="/" className="inline-block">
              <img src="/logo-horizontal-light.png" alt="ELASHA" className="h-9 w-auto" />
            </Link>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-bone-muted">
              ELASHA Artware &amp; Apparel Studio. Premium clothing defined by distinctive design, considered details, and made-to-order prints.
            </p>
            <div className="mt-4 text-xs space-y-1.5 text-bone-muted">
              <p className="font-semibold text-bone">Atelier Address:</p>
              <p>146/2, MG Road, Srinivasa Nagar, Avarampalayam, Coimbatore – 641006</p>
              <a
                href="https://maps.app.goo.gl/gCWAee18JJwys5MWA"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[11px] font-bold uppercase tracking-wider text-crimson-light hover:underline"
              >
                View on Google Maps →
              </a>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-bone-muted">
              <p>Phone: <a href="tel:7022180410" className="text-bone hover:text-crimson-light font-medium">7022180410</a></p>
              <p>Email: <a href="mailto:support@elasha.in" className="text-bone hover:text-crimson-light font-medium">support@elasha.in</a></p>
            </div>
            <div className="mt-5 flex gap-4">
              <a href="#" className="text-bone-muted transition-colors hover:text-crimson-light" aria-label="Instagram">
                <Instagram className="h-5 w-5" strokeWidth={1.5} />
              </a>
              <a href="#" className="text-bone-muted transition-colors hover:text-crimson-light" aria-label="Twitter">
                <Twitter className="h-5 w-5" strokeWidth={1.5} />
              </a>
              <a href="mailto:support@elasha.in" className="text-bone-muted transition-colors hover:text-crimson-light" aria-label="Email support@elasha.in">
                <Mail className="h-5 w-5" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="md:col-span-2 md:col-start-7">
            <h4 className="font-display text-[12px] font-bold uppercase tracking-[0.25em] text-bone">Catalogue</h4>
            <ul className="mt-4 space-y-3">
              <li><Link to="/shop" className="text-xs text-bone-muted transition-colors hover:text-bone">All Products</Link></li>
              <li><Link to="/collections" className="text-xs text-bone-muted transition-colors hover:text-bone">Collections</Link></li>
              <li><Link to="/custom" className="text-xs text-bone-muted transition-colors hover:text-bone">Custom Atelier</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-display text-[12px] font-bold uppercase tracking-[0.25em] text-bone">Account</h4>
            <ul className="mt-4 space-y-3">
              <li><Link to="/account" className="text-xs text-bone-muted transition-colors hover:text-bone">My Account</Link></li>
              <li><Link to="/account/orders" className="text-xs text-bone-muted transition-colors hover:text-bone">Order History</Link></li>
              <li><Link to="/account/wishlist" className="text-xs text-bone-muted transition-colors hover:text-bone">Wishlist</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-display text-[12px] font-bold uppercase tracking-[0.25em] text-bone">Studio</h4>
            <ul className="mt-4 space-y-3">
              <li><Link to="/about" className="text-xs text-bone-muted transition-colors hover:text-bone">Brand Story</Link></li>
              <li><Link to="/returns" className="text-xs text-bone-muted transition-colors hover:text-bone">Returns &amp; Exchanges</Link></li>
              <li><Link to="/search" className="text-xs text-bone-muted transition-colors hover:text-bone">Search</Link></li>
              <li><Link to="/cart" className="text-xs text-bone-muted transition-colors hover:text-bone">Bag</Link></li>
            </ul>
          </div>
        </Reveal>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-charcoal-border/60 pt-8 sm:flex-row">
          <p className="text-xs tracking-wider text-bone-dark">
            © {new Date().getFullYear()} ELASHA ARTWARE &amp; APPAREL. ALL RIGHTS RESERVED.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-bone-muted transition-colors hover:text-bone"
          >
            Back to top
            <ArrowUp className="h-3.5 w-3.5 text-crimson transition-transform duration-500 ease-out-expo group-hover:-translate-y-1" />
          </button>
        </div>
      </div>
    </footer>
  );
}
