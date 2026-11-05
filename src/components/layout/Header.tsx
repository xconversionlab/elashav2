import { Link, NavLink, useLocation } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, Menu, X } from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { ScrollProgress } from '@/components/motion/ScrollProgress';

export function Header() {
  const { count, setOpen } = useCart();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { to: '/shop', label: 'T-Shirts' },
    { to: '/collections', label: 'Collections' },
    { to: '/custom', label: 'Custom Design' },
    { to: '/about', label: 'About' },
  ];

  const iconClass = 'text-bone-muted hover:text-bone transition-colors';

  const IconLink = ({ to, label, children }: { to: string; label: string; children: ReactNode }) => (
    <Link to={to} aria-label={label} className={iconClass}>
      {children}
    </Link>
  );

  return (
    <>
      <header
        className={cn(
          'fixed left-0 right-0 top-0 z-50 transition-all duration-500 ease-out-expo',
          scrolled ? 'border-b border-charcoal-border/70 bg-dark/95 backdrop-blur-md shadow-2xl' : 'bg-dark/60 backdrop-blur-sm'
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={cn('flex items-center justify-between transition-all duration-500', scrolled ? 'h-16' : 'h-20')}>
            <div className="flex items-center gap-10">
              <Link to="/" aria-label="ELASHA home" className="flex items-center gap-3 group">
                <img
                  src="/logo-horizontal-light.png"
                  alt="ELASHA"
                  className="h-8 w-auto sm:h-9 transition-transform duration-300 group-hover:scale-105"
                />
              </Link>
              <nav className="hidden items-center gap-8 md:flex">
                {navLinks.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        'font-display text-[12px] font-semibold uppercase tracking-[0.22em] transition-all duration-300 py-1 relative',
                        isActive
                          ? 'text-bone after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-crimson'
                          : 'text-bone-muted hover:text-bone'
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-5">
              <IconLink to="/search" label="Search"><Search className="h-[18px] w-[18px]" strokeWidth={1.6} /></IconLink>
              <IconLink to="/account/wishlist" label="Wishlist"><Heart className="h-[18px] w-[18px]" strokeWidth={1.6} /></IconLink>
              <IconLink to={user ? '/account' : '/login'} label="Account"><User className="h-[18px] w-[18px]" strokeWidth={1.6} /></IconLink>
              <button onClick={() => setOpen(true)} aria-label="Cart" className={cn('relative', iconClass)}>
                <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.6} />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-bold text-bone">
                    {count}
                  </span>
                )}
              </button>
              <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu" className={cn('md:hidden', iconClass)}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {scrolled && <ScrollProgress />}

        <div
          className={cn(
            'overflow-hidden border-charcoal-border bg-charcoal transition-[max-height,opacity] duration-500 ease-out-expo md:hidden',
            mobileOpen ? 'max-h-80 border-t opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <nav className="space-y-1 px-4 py-4">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'font-display block py-2.5 text-base font-semibold uppercase tracking-[0.18em] transition-colors',
                    isActive ? 'text-bone border-l-2 border-crimson pl-3' : 'text-bone-muted hover:text-bone'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div className={cn('transition-all duration-500', scrolled ? 'h-16' : 'h-20')} />
    </>
  );
}
