import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, Palette, Users, FolderTree, Boxes, Settings, Menu, X, LogOut, ShieldCheck, ExternalLink, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/custom-orders', label: 'Custom Orders', icon: Palette },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/collections', label: 'Collections', icon: FolderTree },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', {
        replace: true,
        state: { from: { pathname: location.pathname, search: location.search, hash: location.hash } },
      });
    }
  }, [loading, user, navigate, location.pathname, location.search, location.hash]);

  // Fail closed: only a profile explicitly marked as admin may enter this area.
  const isAdmin = profile?.is_admin === true;


  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Loading dashboard...</div>;
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md border border-neutral-200 bg-white p-8 text-center">
          <ShieldCheck className="mx-auto h-9 w-9 text-neutral-500" />
          <h1 className="mt-4 font-display text-2xl font-medium text-ink">Admin access required</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">This account has not been granted store administrator access. Ask the project owner to enable your admin role in Supabase.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/" className="border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50">Back to store</Link>
            <button onClick={handleSignOut} className="bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={cn(
        'fixed lg:sticky top-0 z-40 h-screen w-64 flex-shrink-0 border-r border-neutral-200 bg-white transition-transform lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6">
          <Link to="/admin" aria-label="ELASHA admin" className="flex items-center gap-2">
            <img src="/logo-horizontal.png" alt="ELASHA" className="h-6 w-auto" />
            <span className="text-sm font-medium uppercase tracking-wider text-neutral-500">Admin</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-neutral-400"><X className="h-5 w-5" /></button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 p-4">
          <Link to="/" className="text-xs text-neutral-500 hover:text-neutral-900">← Back to Store</Link>
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open admin navigation" className="lg:hidden text-neutral-600"><Menu className="h-5 w-5" /></button>
            <div>
              <p className="text-sm font-medium text-neutral-900">Store control room</p>
              <p className="hidden text-[11px] text-neutral-500 sm:block">{user.email ?? 'Administrator account'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 sm:inline-flex">View store <ExternalLink className="h-3.5 w-3.5" /></Link>
            <button onClick={handleSignOut} className="inline-flex items-center gap-2 border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"><LogOut className="h-3.5 w-3.5" />Sign out</button>
          </div>
        </div>
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
