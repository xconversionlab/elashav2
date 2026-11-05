import { useEffect, useState } from 'react';
import { Link, Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { User, Package, Heart, Palette, LogOut } from 'lucide-react';
import type { Order, CustomDesign, Product } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/product/ProductCard';

export function AccountLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  if (!loading && !user) return null;

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-xs font-mono text-bone-muted bg-dark">Loading Account...</div>;

  const links = [
    { to: '/account', label: 'Profile Details', icon: User, end: true },
    { to: '/account/orders', label: 'Order History', icon: Package },
    { to: '/account/designs', label: 'Custom Designs', icon: Palette },
    { to: '/account/wishlist', label: 'Wishlist Vault', icon: Heart },
  ];

  return (
    <div className="bg-dark min-h-screen text-bone py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-crimson-light">Atelier Account</span>
        <h1 className="mt-2 mb-8 font-display text-4xl font-bold tracking-tight text-bone">Account Dashboard</h1>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="bg-charcoal p-5 border border-charcoal-border rounded-sm shadow-xl">
              <p className="text-sm font-bold text-bone">{profile?.first_name} {profile?.last_name}</p>
              <p className="text-xs font-mono text-bone-muted mt-1 break-all">{user?.email}</p>
            </div>
            <nav className="mt-4 space-y-1">
              {links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors rounded-sm',
                    isActive ? 'bg-crimson text-bone shadow-md' : 'text-bone-muted hover:bg-charcoal hover:text-bone'
                  )}
                >
                  <link.icon className="h-4 w-4 text-crimson-light" /> {link.label}
                </NavLink>
              ))}
              <button onClick={() => { signOut(); navigate('/'); }} className="flex w-full items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider text-bone-muted hover:bg-charcoal hover:text-crimson-light transition-colors rounded-sm">
                <LogOut className="h-4 w-4 text-crimson" /> Sign Out
              </button>
            </nav>
          </aside>
          <div className="lg:col-span-3 bg-charcoal p-8 border border-charcoal-border rounded-sm shadow-2xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').upsert({ id: user.id, first_name: firstName, last_name: lastName, phone });
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-neutral-900">Profile Details</h2>
      <form onSubmit={handleSave} className="mt-6 max-w-md space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <Input label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
        </div>
        <Input label="Email" value={user?.email ?? ''} disabled />
        <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          {saved && <span className="text-xs text-green-600">Saved successfully</span>}
        </div>
      </form>
    </div>
  );
}

export function AccountOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="text-sm text-neutral-500">Loading orders...</div>;

  if (orders.length === 0) {
    return <EmptyState icon={<Package className="h-12 w-12" />} title="No orders yet" description="When you place an order, it will appear here." action={<Link to="/shop" className="text-xs font-medium uppercase tracking-wider underline">Start Shopping</Link>} />;
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-neutral-900">Order History</h2>
      <div className="mt-6 space-y-4">
        {orders.map(order => (
          <Link key={order.id} to={`/account/orders/${order.id}`} className="block border border-neutral-200 p-4 transition-colors hover:border-neutral-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900">{order.order_number}</p>
                <p className="text-xs text-neutral-500">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'info'}>{order.status}</Badge>
                <p className="text-sm font-medium text-neutral-900">{formatPrice(order.total)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setOrder(data as Order | null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="text-sm text-neutral-500">Loading...</div>;
  if (!order) return <div className="text-sm text-neutral-500">Order not found.</div>;

  return (
    <div>
      <Link to="/account/orders" className="mb-4 inline-block text-xs text-neutral-500 hover:text-neutral-900">← Back to Orders</Link>
      <h2 className="font-display text-xl font-bold text-neutral-900">Order {order.order_number}</h2>
      <div className="mt-4 flex items-center gap-4">
        <Badge variant="info">{order.status}</Badge>
        <span className="text-xs text-neutral-500">{formatDate(order.created_at)}</span>
      </div>
      <div className="mt-6 space-y-3">
        {order.order_items?.map(item => (
          <div key={item.id} className="flex justify-between border-b border-neutral-100 py-3 text-sm">
            <div>
              <p className="font-medium text-neutral-900">{item.product_name}</p>
              <p className="text-xs text-neutral-500">{item.size_label} · {item.colour_name} × {item.quantity}</p>
            </div>
            <p className="text-neutral-900">{formatPrice(item.unit_price * item.quantity)}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-between border-t border-neutral-200 pt-4">
        <span className="font-medium text-neutral-900">Total</span>
        <span className="font-medium text-neutral-900">{formatPrice(order.total)}</span>
      </div>
    </div>
  );
}

export function AccountWishlistPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('wishlists')
      .select('product:products(*)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setProducts((data as { product: Product }[] | null)?.map(d => d.product) ?? []);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="text-sm text-neutral-500">Loading...</div>;

  if (products.length === 0) {
    return <EmptyState icon={<Heart className="h-12 w-12" />} title="Your wishlist is empty" description="Save items you love by tapping the heart icon." action={<Link to="/shop" className="text-xs font-medium uppercase tracking-wider underline">Browse Products</Link>} />;
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-bone">Wishlist Vault</h2>
      <p className="mt-1 text-xs text-bone-muted">Your saved pieces, presented with the same studio imagery as the catalogue.</p>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

export function AccountDesignsPage() {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<CustomDesign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('custom_designs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDesigns((data as CustomDesign[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="text-sm text-neutral-500">Loading...</div>;

  if (designs.length === 0) {
    return <EmptyState icon={<Palette className="h-12 w-12" />} title="No custom designs yet" description="Create your own custom artware." action={<Link to="/custom" className="text-xs font-medium uppercase tracking-wider underline">Start Designing</Link>} />;
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-neutral-900">My Custom Designs</h2>
      <div className="mt-6 space-y-4">
        {designs.map(d => (
          <div key={d.id} className="flex gap-4 border border-neutral-200 p-4">
            <div className="h-24 w-20 flex-shrink-0 bg-neutral-100">
              {d.artwork_url && <img src={d.artwork_url} alt={d.artwork_name ?? 'Design'} className="h-full w-full object-contain" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900">{d.garment_name} — {d.colour_name}, {d.size_label}</p>
              <p className="text-xs text-neutral-500">{formatDate(d.created_at)}</p>
              <Badge variant={d.status === 'approved' ? 'success' : d.status === 'rejected' ? 'error' : 'warning'}>{d.status}</Badge>
            </div>
            <p className="text-sm font-medium text-neutral-900">{formatPrice(d.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


