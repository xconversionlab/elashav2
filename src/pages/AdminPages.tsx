import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { deleteStorageObjectObservable } from '@/lib/storageCleanup';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { Package, ClipboardList, Users, Palette, AlertTriangle, TrendingUp, ArrowUpRight, RefreshCw, Search, Boxes, ShoppingBag, CircleDollarSign, Plus, ImagePlus, UploadCloud } from 'lucide-react';
import type { Order, Product, ProductVariant, Collection, CustomDesign, OrderItem } from '@/types';

// ============ OVERVIEW ============
export function AdminOverviewPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [designs, setDesigns] = useState<CustomDesign[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [customers, setCustomers] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError('');
    const [ordersRes, productsRes, designsRes, variantsRes, customersRes, xsSizesRes] = await Promise.all([
      supabase.from('orders').select('id,user_id,order_number,status,total,created_at,updated_at,shipping_address,customer_notes').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('sort_order'),
      supabase.from('custom_designs').select('*').order('created_at', { ascending: false }),
      supabase.from('product_variants').select('id,product_id,size_id,colour_id,sku,stock,price_override,created_at').order('created_at'),
      supabase.from('profiles').select('id,first_name,last_name').order('created_at', { ascending: false }),
      supabase.from('sizes').select('id').eq('label', 'XS'),
    ]);
    const errors = [ordersRes.error, productsRes.error, designsRes.error, variantsRes.error, customersRes.error, xsSizesRes.error].filter(Boolean);
    if (errors.length) setLoadError(errors.map(error => error?.message).join(' · '));
    setOrders((ordersRes.data as Order[]) ?? []);
    setProducts((productsRes.data as Product[]) ?? []);
    setDesigns((designsRes.data as CustomDesign[]) ?? []);
    const xsSizeIds = new Set((xsSizesRes.data ?? []).map(size => size.id));
    setVariants(((variantsRes.data as ProductVariant[]) ?? []).filter(variant => !xsSizeIds.has(variant.size_id)));
    setCustomers((customersRes.data as { id: string; first_name: string | null; last_name: string | null }[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { void loadDashboard(); }, []);

  const metrics = useMemo(() => {
    const activeOrders = orders.filter(order => order.status !== 'cancelled');
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const todayOrders = orders.filter(order => new Date(order.created_at).getTime() >= todayStart);
    const monthOrders = activeOrders.filter(order => new Date(order.created_at).getTime() >= monthStart);
    return {
      revenue: activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      monthRevenue: monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      todayOrders: todayOrders.length,
      openOrders: orders.filter(order => ['pending', 'processing', 'shipped'].includes(order.status)).length,
      products: products.length,
      publishedProducts: products.filter(product => product.is_published).length,
      customers: customers.length,
      pendingDesigns: designs.filter(design => design.status === 'pending').length,
      inReviewDesigns: designs.filter(design => design.status === 'in_review').length,
      lowStock: variants.filter(variant => variant.stock > 0 && variant.stock < 5).length,
      outOfStock: variants.filter(variant => variant.stock <= 0).length,
    };
  }, [orders, products, designs, variants, customers]);

  const customerNames = useMemo(() => new Map(customers.map(customer => [
    customer.id,
    [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Customer',
  ])), [customers]);

  const recentOrders = orders.filter(order => {
    const q = query.trim().toLowerCase();
    return !q || order.order_number.toLowerCase().includes(q) || (customerNames.get(order.user_id) ?? '').toLowerCase().includes(q);
  }).slice(0, 8);

  const lastSevenDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index));
      const key = date.toDateString();
      const total = orders.filter(order => order.status !== 'cancelled' && new Date(order.created_at).toDateString() === key)
        .reduce((sum, order) => sum + Number(order.total || 0), 0);
      return { label: date.toLocaleDateString('en-IN', { weekday: 'short' }), total };
    });
  }, [orders]);
  const maxDayRevenue = Math.max(1, ...lastSevenDays.map(day => day.total));

  if (loading) {
    return <div className="space-y-6"><div className="h-8 w-64 animate-pulse bg-neutral-200" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-28 animate-pulse border border-neutral-200 bg-white" />)}</div></div>;
  }

  const metricCards = [
    { label: 'All-time revenue', value: formatPrice(metrics.revenue), note: `${formatPrice(metrics.monthRevenue)} this month`, icon: CircleDollarSign, tint: 'text-emerald-700', to: '/admin/orders' },
    { label: 'Open orders', value: metrics.openOrders, note: `${metrics.todayOrders} placed today`, icon: ClipboardList, tint: 'text-blue-700', to: '/admin/orders' },
    { label: 'Live products', value: metrics.publishedProducts, note: `${metrics.products} products total`, icon: ShoppingBag, tint: 'text-neutral-900', to: '/admin/products' },
    { label: 'Customers', value: metrics.customers, note: 'Registered profiles', icon: Users, tint: 'text-violet-700', to: '/admin/customers' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">ELASHA / CONTROL ROOM</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tightest text-ink sm:text-4xl">Store overview</h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-500">A live view of orders, sales, inventory and custom artwork across your store.</p>
        </div>
        <Button variant="outline" onClick={() => void loadDashboard(true)} disabled={refreshing}>
          <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing…' : 'Refresh data'}
        </Button>
      </div>

      {loadError && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>Some dashboard data could not load.</strong><p className="mt-1 break-words">{loadError}</p><p className="mt-1 text-xs">Check the admin account and the Supabase admin policies before relying on these figures.</p></div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(card => (
          <Link key={card.label} to={card.to} className="group border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-400">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{card.label}</p>
                <p className="mt-3 break-words font-display text-2xl font-medium text-ink sm:text-3xl">{card.value}</p>
                <p className="mt-2 text-xs text-neutral-500">{card.note}</p>
              </div>
              <card.icon className={cn('h-5 w-5 shrink-0', card.tint)} />
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              <span>View details</span><ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-display text-xl font-medium text-ink">Sales pulse</h2><p className="mt-1 text-xs text-neutral-500">Non-cancelled order totals by day · last 7 days</p></div>
            <TrendingUp className="h-5 w-5 text-neutral-500" />
          </div>
          <div className="mt-6 flex h-40 items-end gap-3 sm:gap-5">
            {lastSevenDays.map(day => (
              <div key={day.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <span className="max-w-full truncate text-center text-[9px] text-neutral-500">{day.total > 0 ? formatPrice(day.total) : '—'}</span>
                <div className="flex h-24 w-full items-end"><div className="w-full bg-neutral-900 transition-all" style={{ height: `${day.total > 0 ? Math.max(8, day.total / maxDayRevenue * 100) : 2}%` }} /></div>
                <span className="text-[10px] uppercase text-neutral-500">{day.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-medium text-ink">Needs attention</h2><p className="mt-1 text-xs text-neutral-500">Queues and stock alerts</p></div><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
          <div className="mt-5 space-y-2">
            <Link to="/admin/orders" className="flex items-center justify-between gap-3 border border-neutral-100 p-3 hover:border-neutral-300"><span className="flex items-center gap-3 text-sm"><ClipboardList className="h-4 w-4 text-neutral-500" />Orders to process</span><Badge variant={metrics.openOrders ? 'warning' : 'success'}>{metrics.openOrders}</Badge></Link>
            <Link to="/admin/custom-orders" className="flex items-center justify-between gap-3 border border-neutral-100 p-3 hover:border-neutral-300"><span className="flex items-center gap-3 text-sm"><Palette className="h-4 w-4 text-neutral-500" />Artwork awaiting review</span><Badge variant={metrics.pendingDesigns ? 'warning' : 'success'}>{metrics.pendingDesigns}</Badge></Link>
            <Link to="/admin/inventory" className="flex items-center justify-between gap-3 border border-neutral-100 p-3 hover:border-neutral-300"><span className="flex items-center gap-3 text-sm"><Boxes className="h-4 w-4 text-neutral-500" />Low stock variants</span><Badge variant={metrics.lowStock ? 'warning' : 'success'}>{metrics.lowStock}</Badge></Link>
            <Link to="/admin/inventory" className="flex items-center justify-between gap-3 border border-neutral-100 p-3 hover:border-neutral-300"><span className="flex items-center gap-3 text-sm"><Package className="h-4 w-4 text-neutral-500" />Out of stock variants</span><Badge variant={metrics.outOfStock ? 'error' : 'success'}>{metrics.outOfStock}</Badge></Link>
          </div>
        </section>
      </div>

      <section className="border border-neutral-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 p-5 sm:flex-row sm:items-center sm:px-6">
          <div><h2 className="font-display text-xl font-medium text-ink">Recent orders</h2><p className="mt-1 text-xs text-neutral-500">Search by order number or customer name</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search recent orders" className="w-full border border-neutral-300 py-2 pl-9 pr-3 text-sm sm:w-64" /></div>
            <Button variant="outline" onClick={() => { setQuery(''); void loadDashboard(true); }}><RefreshCw className="mr-2 h-3.5 w-3.5" />Reset</Button>
          </div>
        </div>
        {recentOrders.length === 0 ? <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="No matching orders" description="New customer orders will appear here." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50"><tr>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Order</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Customer</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Placed</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Total</th>
              </tr></thead>
              <tbody>{recentOrders.map(order => (
                <tr key={order.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-5 py-4 font-medium text-neutral-900">{order.order_number}</td>
                  <td className="px-5 py-4 text-neutral-600">{customerNames.get(order.user_id) ?? 'Customer'}</td>
                  <td className="px-5 py-4 text-neutral-500">{formatDate(order.created_at)}</td>
                  <td className="px-5 py-4"><Badge variant={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'info'}>{order.status}</Badge></td>
                  <td className="px-5 py-4 text-right font-medium text-neutral-900">{formatPrice(order.total)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end border-t border-neutral-100 p-4"><Link to="/admin/orders" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:text-black">All orders <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
      </section>
    </div>
  );
}

// ============ PRODUCTS ============
export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [stockTotals, setStockTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState('');

  async function load() {
    setLoading(true);
    const [productResult, stockResult, collectionResult] = await Promise.all([
      supabase.from('products').select('*, collection:collections(*)').order('sort_order'),
      supabase.from('product_variants').select('product_id,stock'),
      supabase.from('collections').select('*').order('name'),
    ]);
    if (productResult.error || stockResult.error || collectionResult.error) {
      setLoadError([productResult.error?.message, stockResult.error?.message, collectionResult.error?.message].filter(Boolean).join(' · '));
    } else {
      setLoadError('');
    }
    const rows = (productResult.data as Product[]) ?? [];
    setProducts(rows);
    setCollections((collectionResult.data as Collection[]) ?? []);
    const totals: Record<string, number> = {};
    (stockResult.data as { product_id: string; stock: number }[] | null)?.forEach(row => {
      totals[row.product_id] = (totals[row.product_id] ?? 0) + Number(row.stock || 0);
    });
    setStockTotals(totals);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleDelete(product: Product) {
    if (!confirm('Delete "' + product.name + '" from the catalogue? This also removes its variant inventory.')) return;
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) {
      setLoadError(error.message);
      return;
    }
    if (product.front_image_url) await deleteStorageObjectObservable('product-images', product.front_image_url);
    if (product.back_image_url) await deleteStorageObjectObservable('product-images', product.back_image_url);
    await load();
  }

  if (showForm || editing) {
    return <ProductEditor product={editing} collections={collections} onClose={() => { setShowForm(false); setEditing(null); void load(); }} />;
  }

  const filteredProducts = products.filter(product => {
    const q = query.trim().toLowerCase();
    return !q || [product.name, product.slug, product.garment_type ?? '', product.collection?.name ?? '', product.description ?? ''].some(value => value.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Catalogue studio</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tightest text-ink">Products</h1>
          <p className="mt-2 text-sm text-neutral-500">Create a piece, add front and back photography, set pricing and manage live stock.</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Add new product</Button>
      </div>

      {loadError && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</div>}

      <div className="flex flex-col gap-3 border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search product, collection or description…" className="w-full border border-neutral-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-neutral-600" />
        </div>
        <p className="text-xs text-neutral-500">{filteredProducts.length} of {products.length} products · stock totals count all sizes and colours</p>
      </div>

      {loading ? <div className="space-y-3">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 animate-pulse border border-neutral-200 bg-white" />)}</div>
        : filteredProducts.length === 0 ? <div className="border border-neutral-200 bg-white p-8"><EmptyState icon={<Package className="h-10 w-10" />} title="No products found" description="Add your first T-shirt or try another search." /></div>
        : (
          <div className="overflow-x-auto border border-neutral-200 bg-white">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Piece / views</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Collection</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Price</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Units in stock</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const front = product.front_image_url || product.placeholder_image;
                  const back = product.back_image_url || null;
                  return (
                    <tr key={product.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-20 w-28 shrink-0 grid-cols-2 gap-1 bg-neutral-100 p-1">
                            <div className="relative overflow-hidden bg-white">
                              {front ? <img src={front} alt={product.name + ' front'} className="h-full w-full object-contain p-1" /> : <ImagePlus className="m-auto h-5 w-5 text-neutral-300" />}
                              <span className="absolute bottom-0 left-0 right-0 bg-black/70 py-0.5 text-center text-[8px] font-bold tracking-wider text-white">FRONT</span>
                            </div>
                            <div className="relative overflow-hidden bg-white">
                              {back ? <img src={back} alt={product.name + ' back'} className="h-full w-full object-contain p-1" /> : <div className="flex h-full flex-col items-center justify-center text-center"><ImagePlus className="h-4 w-4 text-neutral-300" /><span className="mt-1 text-[7px] font-bold tracking-wider text-neutral-400">ADD BACK</span></div>}
                              <span className="absolute bottom-0 left-0 right-0 bg-black/70 py-0.5 text-center text-[8px] font-bold tracking-wider text-white">BACK</span>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900">{product.name}</p>
                            <p className="mt-1 line-clamp-2 max-w-sm text-xs text-neutral-500">{product.description || 'No product description yet.'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{product.collection?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-900">{formatPrice(product.price)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{stockTotals[product.id] ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <Badge variant={product.is_published ? 'success' : 'default'}>{product.is_published ? 'Published' : 'Draft'}</Badge>
                          {!back && <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Back photo missing</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setEditing(product)} className="font-semibold text-xs text-neutral-800 underline underline-offset-4 hover:text-red-700">Edit piece</button>
                        <button onClick={() => void handleDelete(product)} className="ml-3 text-xs text-red-700 hover:underline">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      <div className="flex items-start gap-3 border border-neutral-200 bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-600">
        <ImagePlus className="mt-0.5 h-4 w-4 shrink-0" />
        <p><strong>Studio tip:</strong> upload clean front and back product photos on a plain or transparent background. Shoppers see both views together on catalogue cards and the product page.</p>
      </div>
    </div>
  );
}

function ProductEditor({ product, collections, onClose }: { product: Product | null; collections: Collection[]; onClose: () => void }) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    price: product?.price ?? 0,
    garment_type: product?.garment_type ?? 'T-Shirt',
    placeholder_image: product?.placeholder_image ?? '',
    front_image_url: product?.front_image_url ?? product?.placeholder_image ?? '',
    back_image_url: product?.back_image_url ?? '',
    collection_id: product?.collection_id ?? '',
    is_published: product?.is_published ?? false,
    is_customizable: product?.is_customizable ?? false,
    featured: product?.featured ?? false,
    sort_order: product?.sort_order ?? 0,
  });
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sizes, setSizes] = useState<{ id: string; label: string; sort_order: number }[]>([]);
  const [colours, setColours] = useState<{ id: string; name: string; hex: string; sort_order: number }[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColours, setSelectedColours] = useState<string[]>([]);
  const [initialStock, setInitialStock] = useState(0);
  const isTShirt = /t-?shirt|tee|long sleeve/i.test([form.garment_type, form.name].join(' '));

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from('sizes').select('id,label,sort_order').neq('label', 'XS').order('sort_order'),
      supabase.from('colours').select('id,name,hex,sort_order').order('sort_order'),
    ]).then(([sizeResult, colourResult]) => {
      if (!alive) return;
      const availableSizes = ((sizeResult.data as { id: string; label: string; sort_order: number }[]) ?? []).filter(size => size.label !== 'XS');
      const availableSizeIds = new Set(availableSizes.map(size => size.id));
      setSizes(availableSizes);
      setColours((colourResult.data as { id: string; name: string; hex: string; sort_order: number }[]) ?? []);
      if (!product) {
        setSelectedSizes(availableSizes.map(item => item.id));
        setSelectedColours((colourResult.data as { id: string }[] ?? []).map(item => item.id));
      } else {
        supabase.from('product_variants').select('size_id,colour_id').eq('product_id', product.id).then(({ data }) => {
          if (!alive) return;
          setSelectedSizes(Array.from(new Set((data ?? []).map(item => item.size_id))).filter(sizeId => availableSizeIds.has(sizeId)));
          setSelectedColours(Array.from(new Set((data ?? []).map(item => item.colour_id))));
        });
      }
    });
    return () => { alive = false; };
  }, [product]);

  useEffect(() => {
    if (!frontFile) { setFrontPreview(''); return; }
    const url = URL.createObjectURL(frontFile);
    setFrontPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [frontFile]);

  useEffect(() => {
    if (!backFile) { setBackPreview(''); return; }
    const url = URL.createObjectURL(backFile);
    setBackPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [backFile]);

  async function uploadProductImage(file: File, side: 'front' | 'back', slug: string): Promise<{ url: string; path: string }> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) throw new Error('Use a JPG, PNG or WebP image for the ' + side + ' view.');
    if (file.size > 25 * 1024 * 1024) throw new Error('Each product photo must be 25 MB or smaller.');
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = slug + '/' + Date.now() + '-' + side + '-' + crypto.randomUUID() + '.' + extension;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error('Could not upload ' + side + ' photo: ' + uploadError.message + '. Check that the product-images Supabase migration has been applied.');
    const url = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    return { url, path };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    let uploadedFrontPath: string | null = null;
    let uploadedBackPath: string | null = null;

    try {
      const name = form.name.trim();
      const slug = (form.slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-+|-+$/g, '');
      if (!name || !slug) throw new Error('Enter a product name so a product URL can be created.');
      if (!product && (!selectedSizes.length || !selectedColours.length)) throw new Error('Choose at least one size and one colour for inventory.');

      const frontExisting = form.front_image_url.trim() || form.placeholder_image.trim();
      let frontUrl = frontExisting;
      let backUrl = form.back_image_url.trim() || null;

      if (frontFile) {
        const res = await uploadProductImage(frontFile, 'front', slug);
        frontUrl = res.url;
        uploadedFrontPath = res.path;
      }
      if (backFile) {
        const res = await uploadProductImage(backFile, 'back', slug);
        backUrl = res.url;
        uploadedBackPath = res.path;
      }

      if (!frontUrl) throw new Error('Add a front photo before saving the product.');
      if (isTShirt && !backUrl) throw new Error('T-shirts need both a front and a back photo before they can be saved.');

      const data = {
        name,
        slug,
        description: form.description.trim() || null,
        price: Number(form.price),
        garment_type: form.garment_type.trim() || 'T-Shirt',
        placeholder_image: frontUrl,
        front_image_url: frontUrl,
        back_image_url: backUrl,
        collection_id: form.collection_id || null,
        is_published: form.is_published,
        is_customizable: form.is_customizable,
        featured: form.featured,
        sort_order: Number(form.sort_order),
      };

      try {
        let productId = product?.id;
        if (product) {
          const { error: updateError } = await supabase.from('products').update(data).eq('id', product.id);
          if (updateError) throw updateError;

          if (frontFile && product.front_image_url) {
            await deleteStorageObjectObservable('product-images', product.front_image_url);
          }
          if (backFile && product.back_image_url) {
            await deleteStorageObjectObservable('product-images', product.back_image_url);
          }
        } else {
          const { data: inserted, error: insertError } = await supabase.from('products').insert(data).select('id').single();
          if (insertError || !inserted) throw insertError || new Error('Could not create the product.');
          productId = inserted.id;

          const variants = selectedSizes.flatMap(sizeId => selectedColours.map(colourId => ({
            product_id: productId,
            size_id: sizeId,
            colour_id: colourId,
            stock: Math.max(0, Math.floor(Number(initialStock) || 0)),
          })));
          const { error: variantsError } = await supabase.from('product_variants').insert(variants);
          if (variantsError) {
            await supabase.from('products').delete().eq('id', productId);
            throw new Error('Product setup was rolled back because inventory could not be created: ' + variantsError.message);
          }
        }
      } catch (dbErr) {
        if (uploadedFrontPath) {
          await deleteStorageObjectObservable('product-images', uploadedFrontPath);
        }
        if (uploadedBackPath) {
          await deleteStorageObjectObservable('product-images', uploadedBackPath);
        }
        throw dbErr;
      }

      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong while saving the product.');
    } finally {
      setSaving(false);
    }
  }

  function toggleSize(id: string) {
    setSelectedSizes(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }
  function toggleColour(id: string) {
    setSelectedColours(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-neutral-900 text-white"><Package className="h-5 w-5" /></div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Catalogue studio</p>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-tightest text-ink">{product ? 'Edit piece' : 'Create a new piece'}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">Set the story and price, upload two clean product angles, then create the size × colour stock matrix.</p>
        </div>
      </div>

      {error && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center bg-neutral-900 text-xs font-bold text-white">01</span><div><h2 className="font-display text-xl font-medium text-ink">The piece</h2><p className="text-xs text-neutral-500">Name, story, collection and price</p></div></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Product name" required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="e.g. Collision Tee — Impact" />
            <Input label="URL slug" value={form.slug} onChange={event => setForm(current => ({ ...current, slug: event.target.value }))} placeholder="Auto-generated from product name" />
            <Input label="Price (₹)" type="number" min="0" step="0.01" required value={form.price} onChange={event => setForm(current => ({ ...current, price: Number(event.target.value) }))} />
            <Input label="Garment type" required value={form.garment_type} onChange={event => setForm(current => ({ ...current, garment_type: event.target.value }))} placeholder="T-Shirt, Long Sleeve T-Shirt…" />
          </div>
          <div className="mt-4"><Textarea label="Product description" rows={4} required value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Tell the story: fabric, fit, print placement and what makes this piece distinct." /></div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select label="Collection" value={form.collection_id} onChange={event => setForm(current => ({ ...current, collection_id: event.target.value }))}>
              <option value="">No collection</option>
              {collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
            </Select>
            <Input label="Catalogue order" type="number" min="0" value={form.sort_order} onChange={event => setForm(current => ({ ...current, sort_order: Number(event.target.value) }))} />
          </div>
          <div className="mt-5 flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.is_published} onChange={event => setForm(current => ({ ...current, is_published: event.target.checked }))} /> Publish on storefront</label>
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.is_customizable} onChange={event => setForm(current => ({ ...current, is_customizable: event.target.checked }))} /> Customisable</label>
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.featured} onChange={event => setForm(current => ({ ...current, featured: event.target.checked }))} /> Featured / limited</label>
          </div>
        </section>

        <section className="border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center bg-neutral-900 text-xs font-bold text-white">02</span><div><h2 className="font-display text-xl font-medium text-ink">Front + back photography</h2><p className="text-xs text-neutral-500">JPG, PNG or WebP · up to 25 MB per photo</p></div></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {([
              { side: 'front' as const, title: 'Front view', file: frontFile, preview: frontPreview || form.front_image_url, setFile: setFrontFile, inputId: 'product-front-upload' },
              { side: 'back' as const, title: 'Back view', file: backFile, preview: backPreview || form.back_image_url, setFile: setBackFile, inputId: 'product-back-upload' },
            ]).map(imageField => (
              <div key={imageField.side} className="border border-neutral-200 bg-neutral-50 p-3">
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border border-neutral-200 bg-white">
                  {imageField.preview ? <img src={imageField.preview} alt={imageField.title} className="h-full w-full object-contain p-4" /> : <div className="flex flex-col items-center text-neutral-300"><ImagePlus className="h-10 w-10" /><span className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em]">Add {imageField.side} photo</span></div>}
                  <span className="absolute left-3 top-3 bg-black px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white">{imageField.title}</span>
                </div>
                <label htmlFor={imageField.inputId} className="mt-3 flex cursor-pointer items-center justify-center gap-2 border border-neutral-300 bg-white px-3 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-800 transition-colors hover:border-neutral-900">
                  <UploadCloud className="h-4 w-4" /> {imageField.file ? 'Choose a different photo' : 'Choose photo'}
                </label>
                <input id={imageField.inputId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => imageField.setFile(event.target.files?.[0] ?? null)} />
                {imageField.file && <p className="mt-2 truncate text-[10px] text-neutral-500">{imageField.file.name}</p>}
                <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Or paste an image URL</label>
                <input value={imageField.side === 'front' ? form.front_image_url : form.back_image_url} onChange={event => setForm(current => imageField.side === 'front' ? { ...current, front_image_url: event.target.value, placeholder_image: event.target.value } : { ...current, back_image_url: event.target.value })} placeholder="https://…" className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-xs outline-none focus:border-neutral-600" />
              </div>
            ))}
          </div>
          {isTShirt && <p className="mt-4 border-l-2 border-neutral-900 bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-600">T-shirts cannot be saved without both views. The shop will show the front and back together, so customers can inspect the whole print design before buying.</p>}
        </section>

        {!product && (
          <section className="border border-neutral-200 bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center bg-neutral-900 text-xs font-bold text-white">03</span><div><h2 className="font-display text-xl font-medium text-ink">Size × colour stock</h2><p className="text-xs text-neutral-500">Choose which variants to create for this piece.</p></div></div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Sizes</p>
              <div className="flex flex-wrap gap-2">{sizes.map(size => <button type="button" key={size.id} onClick={() => toggleSize(size.id)} className={cn('min-w-12 border px-3 py-2 text-xs font-semibold transition-colors', selectedSizes.includes(size.id) ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-600 hover:border-neutral-600')}>{size.label}</button>)}</div>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Colours</p>
              <div className="flex flex-wrap gap-2">{colours.map(colour => <button type="button" key={colour.id} onClick={() => toggleColour(colour.id)} className={cn('flex items-center gap-2 border px-3 py-2 text-xs font-semibold transition-colors', selectedColours.includes(colour.id) ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-600 hover:border-neutral-600')}><span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: colour.hex }} />{colour.name}</button>)}</div>
            </div>
            <div className="mt-5 grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
              <Input label="Initial stock for each selected variant" type="number" min="0" step="1" value={initialStock} onChange={event => setInitialStock(Math.max(0, Math.floor(Number(event.target.value) || 0)))} />
              <p className="text-xs leading-relaxed text-neutral-500">Creates {selectedSizes.length * selectedColours.length} size/colour combinations. You can adjust every stock quantity independently in Inventory after saving.</p>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>{saving ? 'Saving product…' : product ? 'Save product changes' : 'Create product and inventory'}</Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

// ============ INVENTORY ============
export function AdminInventoryPage() {
  type InventoryRow = ProductVariant & {
    product?: Pick<Product, 'name' | 'slug' | 'placeholder_image' | 'front_image_url' | 'back_image_url'>;
    size?: { label: string };
    colour?: { name: string };
  };
  const [variants, setVariants] = useState<InventoryRow[]>([]);
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('product_variants')
      .select('*, product:products(name, slug, placeholder_image, front_image_url, back_image_url), size:sizes!inner(label), colour:colours(name)')
       .neq('size.label', 'XS')
       .order('created_at');
    if (loadError) setError(loadError.message);
    const rows = ((data as InventoryRow[]) ?? []).filter(row => row.size?.label !== 'XS');
    setVariants(rows);
    setStockDrafts(Object.fromEntries(rows.map(row => [row.id, String(row.stock)])));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStock(row: InventoryRow) {
    const parsed = Number(stockDrafts[row.id]);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('Stock must be a whole number greater than or equal to zero.');
      return;
    }
    setError('');
    setSavedMessage('');
    const { error: updateError } = await supabase.from('product_variants').update({ stock: parsed }).eq('id', row.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSavedMessage('Stock saved for ' + (row.product?.name ?? 'product') + ' · ' + (row.size?.label ?? '') + ' · ' + (row.colour?.name ?? ''));
    await load();
  }

  const filtered = variants.filter(row => {
    const text = [row.product?.name ?? '', row.product?.slug ?? '', row.size?.label ?? '', row.colour?.name ?? '', row.sku ?? ''].join(' ').toLowerCase();
    if (query.trim() && !text.includes(query.trim().toLowerCase())) return false;
    if (filter === 'low') return row.stock > 0 && row.stock < 5;
    if (filter === 'out') return row.stock <= 0;
    return true;
  });

  const totalUnits = variants.reduce((sum, row) => sum + row.stock, 0);
  const lowStock = variants.filter(row => row.stock > 0 && row.stock < 5).length;
  const outOfStock = variants.filter(row => row.stock <= 0).length;

  if (loading) return <div className="space-y-3"><div className="h-8 w-56 animate-pulse bg-neutral-200" /><div className="h-40 animate-pulse border border-neutral-200 bg-white" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Stockroom</p><h1 className="mt-2 font-display text-3xl font-medium tracking-tightest text-ink">Inventory</h1><p className="mt-2 text-sm text-neutral-500">Update stock by exact product, size and colour combination.</p></div>
        <Link to="/admin/products" className="inline-flex items-center gap-2 border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-800 hover:border-neutral-900"><Plus className="h-4 w-4" /> Add product</Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total units', value: totalUnits, note: 'All variants' },
          { label: 'Low stock', value: lowStock, note: '1–4 units remaining' },
          { label: 'Out of stock', value: outOfStock, note: 'Variants unavailable' },
        ].map(metric => <div key={metric.label} className="border border-neutral-200 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{metric.label}</p><p className="mt-2 font-display text-2xl text-ink">{metric.value}</p><p className="mt-1 text-xs text-neutral-500">{metric.note}</p></div>)}
      </div>

      {error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {savedMessage && <div role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{savedMessage}</div>}

      <div className="flex flex-col gap-3 border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search product, size, colour or SKU…" className="w-full border border-neutral-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-neutral-600" /></div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'low', 'out'] as const).map(value => <button key={value} onClick={() => setFilter(value)} className={cn('border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider', filter === value ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-600')}>{value === 'all' ? 'All variants' : value === 'low' ? 'Low stock' : 'Out of stock'}</button>)}
        </div>
      </div>

      {filtered.length === 0 ? <div className="border border-neutral-200 bg-white p-8"><EmptyState icon={<Boxes className="h-10 w-10" />} title="No inventory variants found" description="Create a product with sizes and colours, or clear the search filters." /></div> : (
        <div className="overflow-x-auto border border-neutral-200 bg-white">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50"><tr>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Product</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Size</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Colour</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">SKU</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Available stock</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Save</th>
            </tr></thead>
            <tbody>{filtered.map(row => (
              <tr key={row.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80">
                <td className="px-4 py-3"><div className="flex items-center gap-3">{(row.product?.front_image_url || row.product?.placeholder_image) ? <img src={row.product?.front_image_url || row.product?.placeholder_image || ''} alt="" className="h-12 w-10 bg-neutral-100 object-contain p-1" /> : <div className="flex h-12 w-10 items-center justify-center bg-neutral-100"><Package className="h-4 w-4 text-neutral-300" /></div>}<div><p className="font-medium text-neutral-900">{row.product?.name ?? 'Unknown product'}</p><p className="text-[10px] text-neutral-500">{row.product?.slug ?? ''}</p></div></div></td>
                <td className="px-4 py-3 text-neutral-600">{row.size?.label ?? '—'}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-neutral-700"><span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: (row.colour as { hex?: string } | undefined)?.hex ?? '#ccc' }} />{row.colour?.name ?? '—'}</span></td>
                <td className="px-4 py-3 text-neutral-500">{row.sku ?? '—'}</td>
                <td className="px-4 py-3 text-right"><input aria-label={'Stock for ' + (row.product?.name ?? '') + ' ' + (row.size?.label ?? '') + ' ' + (row.colour?.name ?? '')} type="number" min="0" step="1" value={stockDrafts[row.id] ?? String(row.stock)} onChange={event => setStockDrafts(current => ({ ...current, [row.id]: event.target.value }))} className="w-24 border border-neutral-300 px-2 py-2 text-right tabular-nums outline-none focus:border-neutral-600" /></td>
                <td className="px-4 py-3 text-right"><Button size="sm" onClick={() => void updateStock(row)} disabled={Number(stockDrafts[row.id]) === row.stock}>{'Save stock'}</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ ORDERS ============
export function AdminOrdersPage() {
  type CustomerSummary = { id: string; first_name: string | null; last_name: string | null; phone: string | null };
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setActionError('');
    const [ordersRes, customersRes] = await Promise.all([
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,first_name,last_name,phone'),
    ]);
    if (ordersRes.error || customersRes.error) {
      setActionError([ordersRes.error?.message, customersRes.error?.message].filter(Boolean).join(' · '));
    }
    setOrders((ordersRes.data as Order[]) ?? []);
    setCustomers((customersRes.data as CustomerSummary[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setActionError('');
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) {
      setActionError(error.message);
      return;
    }
    await load();
  }

  const customerMap = new Map(customers.map(customer => [
    customer.id,
    {
      name: [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Customer',
      phone: customer.phone,
    },
  ]));

  const reconciliationCount = orders.filter(order => order.payment_status === 'requires_reconciliation').length;

  const filtered = orders.filter(order => {
    const customer = customerMap.get(order.user_id);
    const itemText = (order.order_items ?? []).map(item => item.product_name).join(' ');
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'requires_reconciliation'
        ? order.payment_status === 'requires_reconciliation'
        : order.status === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [
      order.order_number,
      order.razorpay_order_id ?? '',
      order.payment_id ?? '',
      customer?.name ?? '',
      customer?.phone ?? '',
      order.user_id,
      itemText,
    ].some(value => value.toLowerCase().includes(q));
    return matchesFilter && matchesQuery;
  });
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (loading) return <div className="text-sm text-neutral-500">Loading orders...</div>;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Fulfilment</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tightest text-ink">Orders</h1>
          <p className="mt-2 text-sm text-neutral-500">{orders.length} orders · Update status and review shipping details.</p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search order, customer, phone, item…" className="w-full border border-neutral-300 bg-white py-2.5 pl-9 pr-3 text-sm" />
        </div>
      </div>
      {actionError && <div role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</div>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={cn('px-3 py-2 text-[10px] font-semibold uppercase tracking-wider', filter === 'all' ? 'bg-neutral-900 text-white' : 'border border-neutral-300 bg-white text-neutral-600')}>All ({orders.length})</button>
        {reconciliationCount > 0 && (
          <button
            onClick={() => setFilter('requires_reconciliation')}
            className={cn(
              'px-3 py-2 text-[10px] font-semibold uppercase tracking-wider',
              filter === 'requires_reconciliation'
                ? 'bg-amber-800 text-white'
                : 'border border-amber-300 bg-amber-50 text-amber-900 font-bold'
            )}
          >
            Requires Reconciliation ({reconciliationCount})
          </button>
        )}
        {statuses.map(status => {
          const count = orders.filter(order => order.status === status).length;
          return <button key={status} onClick={() => setFilter(status)} className={cn('px-3 py-2 text-[10px] font-semibold uppercase tracking-wider', filter === status ? 'bg-neutral-900 text-white' : 'border border-neutral-300 bg-white text-neutral-600')}>{status} ({count})</button>;
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="mt-6 border border-neutral-200 bg-white p-8"><EmptyState icon={<ClipboardList className="h-10 w-10" />} title="No matching orders" description="Try another status or search term." /></div>
      ) : (
        <div className="mt-6 space-y-4">
          {filtered.map(order => {
            const customer = customerMap.get(order.user_id);
            const address = Object.entries(order.shipping_address ?? {}).filter(([, value]) => value && value.trim());
            return (
              <article key={order.id} className="border border-neutral-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-lg font-medium text-ink">{order.order_number}</h2>
                      <Badge variant={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'info'}>{order.status}</Badge>
                      {order.payment_status === 'requires_reconciliation' && (
                        <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-950">
                          Reconciliation Required
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">Placed {formatDate(order.created_at)}</p>
                    <p className="mt-3 text-sm font-medium text-neutral-900">{customer?.name ?? 'Customer'}</p>
                    {customer?.phone && <p className="mt-1 text-xs text-neutral-500">{customer.phone}</p>}
                    <p className="mt-1 break-all text-[10px] text-neutral-400">Customer ID: {order.user_id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-2xl font-medium text-ink">{formatPrice(order.total)}</span>
                    <Select value={order.status} onChange={e => void updateStatus(order.id, e.target.value)} className="w-40 text-xs">
                      {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                    </Select>
                  </div>
                </div>
                {order.payment_status === 'requires_reconciliation' && (
                  <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                    <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-amber-900">
                      <span>⚠️ Payment Reconciliation Required</span>
                    </div>
                    <p className="mt-1 text-amber-800">
                      A captured payment was received after stock reservation expired. Staff must manually fulfill or issue a refund.
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-1.5 font-mono text-[11px] text-amber-950 sm:grid-cols-2">
                      {order.razorpay_order_id && <div>Razorpay Order ID: <span className="font-bold">{order.razorpay_order_id}</span></div>}
                      {order.payment_id && <div>Razorpay Payment ID: <span className="font-bold">{order.payment_id}</span></div>}
                      <div>Payment Amount: <span className="font-bold">{formatPrice(order.total)}</span></div>
                      <div>Payment Status: <span className="font-bold text-amber-900">{order.payment_status}</span></div>
                    </div>
                  </div>
                )}
                {address.length > 0 && <div className="mt-4 border-t border-neutral-100 pt-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Shipping address</p><div className="mt-1 grid grid-cols-1 gap-x-5 gap-y-1 text-xs text-neutral-600 sm:grid-cols-2">{address.map(([key, value]) => <p key={key}><span className="capitalize text-neutral-400">{key.replace(/_/g, ' ')}: </span>{value}</p>)}</div></div>}
                {order.customer_notes && <div className="mt-3 border-l-2 border-neutral-300 pl-3 text-xs text-neutral-600"><span className="font-semibold">Customer note: </span>{order.customer_notes}</div>}
                {order.order_items && order.order_items.length > 0 && <div className="mt-4 border-t border-neutral-100 pt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Items ({order.order_items.reduce((sum, item) => sum + item.quantity, 0)})</p>
                  {order.order_items.map((item: OrderItem) => <div key={item.id} className="flex flex-col justify-between gap-1 py-2 text-xs sm:flex-row sm:items-center"><span className="text-neutral-700">{item.product_name}{item.size_label ? ` — ${item.size_label}` : ''}{item.colour_name ? ` · ${item.colour_name}` : ''} × {item.quantity}</span><span className="font-medium text-neutral-900">{formatPrice(item.unit_price * item.quantity)}</span></div>)}
                </div>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ CUSTOM ORDERS ============
export function AdminCustomOrdersPage() {
  const [designs, setDesigns] = useState<CustomDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('custom_designs').select('*').order('created_at', { ascending: false });
    if (error) setActionError(error.message);
    setDesigns((data as CustomDesign[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: CustomDesign['status']) {
    setActionError('');
    const current = designs.find(design => design.id === id);
    const { error } = await supabase.from('custom_designs').update({
      status,
      admin_notes: notes[id] ?? current?.admin_notes ?? null,
    }).eq('id', id);
    if (error) {
      setActionError(error.message);
      return;
    }
    await load();
  }

  const filtered = designs.filter(design => {
    const matchesStatus = statusFilter === 'all' || design.status === statusFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [design.garment_name ?? '', design.artwork_name ?? '', design.colour_name ?? '', design.size_label ?? '', design.user_id].some(value => value.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });
  const statuses: CustomDesign['status'][] = ['pending', 'in_review', 'approved', 'rejected'];

  if (loading) return <div className="text-sm text-neutral-500">Loading custom orders...</div>;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Artwork queue</p><h1 className="mt-2 font-display text-3xl font-medium tracking-tightest text-ink">Custom orders</h1><p className="mt-2 text-sm text-neutral-500">Review uploaded artwork, add production notes and track approval.</p></div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search artwork, T-shirt, customer ID…" className="w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm sm:max-w-sm" />
      </div>
      {actionError && <div role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</div>}
      <div className="mt-5 flex flex-wrap gap-2">{['all', ...statuses].map(status => <button key={status} onClick={() => setStatusFilter(status)} className={cn('px-3 py-2 text-[10px] font-semibold uppercase tracking-wider', statusFilter === status ? 'bg-neutral-900 text-white' : 'border border-neutral-300 bg-white text-neutral-600')}>{status === 'all' ? 'All' : status} ({status === 'all' ? designs.length : designs.filter(design => design.status === status).length})</button>)}</div>
      {filtered.length === 0 ? <div className="mt-6 border border-neutral-200 bg-white p-8"><EmptyState icon={<Palette className="h-10 w-10" />} title="No matching custom orders" description="Submissions will appear here when customers upload artwork." /></div> : (
        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filtered.map(design => (
            <article key={design.id} className="border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex gap-4">
                <div className="grid h-36 w-44 shrink-0 grid-cols-2 gap-1 bg-neutral-100 p-1">
                  <div className="relative flex min-w-0 items-center justify-center overflow-hidden bg-white">
                    {(design.front_artwork_url || (!design.back_artwork_url && design.artwork_url)) ? (
                      <a href={design.front_artwork_url || design.artwork_url} target="_blank" rel="noreferrer" title="Open front artwork" className="flex h-full w-full items-center justify-center">
                        <img src={design.front_artwork_url || design.artwork_url} alt={(design.garment_name || 'T-shirt') + ' front artwork'} className="h-full w-full object-contain" />
                      </a>
                    ) : <span className="px-1 text-center text-[8px] font-semibold uppercase tracking-wider text-neutral-400">No front art</span>}
                    <span className="absolute bottom-0 left-0 right-0 bg-black/75 py-1 text-center text-[8px] font-bold uppercase tracking-wider text-white">Front</span>
                  </div>
                  <div className="relative flex min-w-0 items-center justify-center overflow-hidden bg-white">
                    {design.back_artwork_url ? (
                      <a href={design.back_artwork_url} target="_blank" rel="noreferrer" title="Open back artwork" className="flex h-full w-full items-center justify-center">
                        <img src={design.back_artwork_url} alt={(design.garment_name || 'T-shirt') + ' back artwork'} className="h-full w-full object-contain" />
                      </a>
                    ) : <span className="px-1 text-center text-[8px] font-semibold uppercase tracking-wider text-neutral-400">No back art</span>}
                    <span className="absolute bottom-0 left-0 right-0 bg-black/75 py-1 text-center text-[8px] font-bold uppercase tracking-wider text-white">Back</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-medium text-ink">{design.garment_name || 'Custom T-Shirt'}</h2><Badge variant={design.status === 'approved' ? 'success' : design.status === 'rejected' ? 'error' : design.status === 'in_review' ? 'info' : 'warning'}>{design.status}</Badge></div>
                  <p className="mt-1 break-words text-xs text-neutral-500">{design.artwork_name || 'Artwork upload'}</p>
                  <p className="mt-1 text-xs text-neutral-500">{design.colour_name || 'Colour not specified'} · {design.size_label || 'Size not specified'}</p>
                  <p className="mt-1 text-xs text-neutral-500">Submitted {formatDate(design.created_at)}</p>
                  <p className="mt-2 font-medium text-neutral-900">{formatPrice(design.price)}</p>
                  <p className="mt-1 break-all text-[10px] text-neutral-400">Customer ID: {design.user_id}</p>
                  {design.artwork_url && <a href={design.artwork_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-neutral-700 underline">Open original artwork ↗</a>}
                </div>
              </div>
              <div className="mt-4">
                <Textarea label="Production / admin notes" rows={2} value={notes[design.id] ?? design.admin_notes ?? ''} onChange={event => setNotes(current => ({ ...current, [design.id]: event.target.value }))} placeholder="Print placement, artwork checks, customer follow-up…" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void updateStatus(design.id, 'approved')}>Approve</Button>
                <Button size="sm" variant="danger" onClick={() => void updateStatus(design.id, 'rejected')}>Reject</Button>
                <Button size="sm" variant="outline" onClick={() => void updateStatus(design.id, 'in_review')}>Mark in review</Button>
                <Button size="sm" variant="outline" onClick={() => void updateStatus(design.id, design.status)}>Save notes</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ CUSTOMERS ============
export function AdminCustomersPage() {
  type CustomerProfile = { id: string; first_name: string | null; last_name: string | null; phone: string | null; created_at: string };
  const [profiles, setProfiles] = useState<(CustomerProfile & { order_count?: number; total_spent?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id,first_name,last_name,phone,created_at').order('created_at', { ascending: false }),
      supabase.from('orders').select('user_id,total,status'),
    ]).then(([profilesRes, ordersRes]) => {
      if (profilesRes.error || ordersRes.error) setLoadError([profilesRes.error?.message, ordersRes.error?.message].filter(Boolean).join(' · '));
      const orderMap = new Map<string, { count: number; total: number }>();
      (ordersRes.data as { user_id: string; total: number; status: string }[] | null)?.forEach(order => {
        const existing = orderMap.get(order.user_id) ?? { count: 0, total: 0 };
        existing.count++;
        if (order.status !== 'cancelled') existing.total += Number(order.total || 0);
        orderMap.set(order.user_id, existing);
      });
      const customerProfiles = (profilesRes.data as CustomerProfile[]) ?? [];
      setProfiles(customerProfiles.map(profile => ({
        ...profile,
        order_count: orderMap.get(profile.id)?.count ?? 0,
        total_spent: orderMap.get(profile.id)?.total ?? 0,
      })));
      setLoading(false);
    });
  }, []);

  const filtered = profiles.filter(profile => {
    const q = query.trim().toLowerCase();
    return !q || [
      profile.first_name ?? '',
      profile.last_name ?? '',
      profile.phone ?? '',
      profile.id,
    ].some(value => value.toLowerCase().includes(q));
  });

  if (loading) return <div className="text-sm text-neutral-500">Loading customers...</div>;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Customer directory</p><h1 className="mt-2 font-display text-3xl font-medium tracking-tightest text-ink">Customers</h1><p className="mt-2 text-sm text-neutral-500">{profiles.length} customer profiles in the store.</p></div>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, phone or customer ID…" className="w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm sm:max-w-sm" />
      </div>
      {loadError && <div role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</div>}
      {filtered.length === 0 ? <div className="mt-6 border border-neutral-200 bg-white p-8"><EmptyState icon={<Users className="h-10 w-10" />} title="No matching customers" description="Try a different search term." /></div> : (
        <div className="mt-6 overflow-x-auto border border-neutral-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50"><tr>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Customer</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Phone</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Joined</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Orders</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Lifetime spend</th>
            </tr></thead>
            <tbody>{filtered.map(profile => (
              <tr key={profile.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-4"><p className="font-medium text-neutral-900">{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Customer'}</p><p className="mt-1 break-all text-[10px] text-neutral-400">{profile.id}</p></td>
                <td className="px-4 py-4 text-neutral-600">{profile.phone || '—'}</td>
                <td className="px-4 py-4 text-neutral-500">{formatDate(profile.created_at)}</td>
                <td className="px-4 py-4 text-right text-neutral-900">{profile.order_count ?? 0}</td>
                <td className="px-4 py-4 text-right font-medium text-neutral-900">{formatPrice(profile.total_spent ?? 0)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ CUSTOMER REVIEWS ============
type AdminReview = {
  id: string;
  product_id: string | null;
  author_name: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  product: { name: string } | null;
};

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase
      .from('reviews')
      .select('id, product_id, author_name, rating, comment, status, created_at, product:products(name)')
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setReviews([]);
    } else {
      setReviews((data ?? []) as unknown as AdminReview[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadReviews(); }, [loadReviews]);

  async function setReviewStatus(id: string, status: AdminReview['status']) {
    setSavingId(id);
    setError('');
    setNotice('');
    const { error: updateError } = await supabase.from('reviews').update({ status }).eq('id', id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setReviews(current => current.map(review => review.id === id ? { ...review, status } : review));
      setNotice(status === 'approved' ? 'Review approved and published.' : status === 'rejected' ? 'Review rejected and hidden.' : 'Review returned to pending.');
    }
    setSavingId(null);
  }

  const pendingCount = reviews.filter(review => review.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">ELASHA / COMMUNITY</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tightest text-ink">Customer Reviews</h1>
          <p className="mt-2 text-sm text-neutral-500">New reviews remain unpublished until an administrator approves them.</p>
        </div>
        <Button variant="outline" onClick={() => void loadReviews()} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(['pending', 'approved', 'rejected'] as const).map(status => (
          <div key={status} className="border border-neutral-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{status === 'pending' ? 'Awaiting moderation' : status}</p>
            <p className="mt-2 font-display text-2xl font-medium text-ink">{reviews.filter(review => review.status === status).length}</p>
          </div>
        ))}
      </div>

      {error && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="border border-neutral-200 bg-white p-4 text-sm text-neutral-700">{notice}</div>}

      {loading ? <p className="text-sm text-neutral-500">Loading reviews…</p> : reviews.length === 0 ? (
        <div className="border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="font-medium text-neutral-800">No customer reviews yet</p>
          <p className="mt-2 text-sm text-neutral-500">Submitted reviews will appear here for moderation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <article key={review.id} className="border border-neutral-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-neutral-900">{review.author_name}</h2>
                  <p className="mt-1 text-xs text-neutral-500">{review.product?.name ?? 'Product no longer available'} · {formatDate(review.created_at)}</p>
                </div>
                <Badge variant={review.status === 'approved' ? 'success' : review.status === 'rejected' ? 'error' : 'warning'}>{review.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-amber-600" aria-label={review.rating + ' out of 5 stars'}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} <span className="text-xs text-neutral-500">{review.rating}/5</span></p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{review.comment}</p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
                <Button size="sm" onClick={() => void setReviewStatus(review.id, 'approved')} disabled={savingId === review.id || review.status === 'approved'}>Approve &amp; Publish</Button>
                <Button size="sm" variant="outline" onClick={() => void setReviewStatus(review.id, 'rejected')} disabled={savingId === review.id || review.status === 'rejected'}>Reject</Button>
                {review.status !== 'pending' && <Button size="sm" variant="outline" onClick={() => void setReviewStatus(review.id, 'pending')} disabled={savingId === review.id}>Return to Pending</Button>}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="text-xs text-neutral-500">{pendingCount} review(s) awaiting moderation.</p>
    </div>
  );
}

// ============ COLLECTIONS ============
export function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase.from('collections').select('*').order('sort_order');
    if (loadError) {
      setError(loadError.message);
    } else {
      setCollections((data as Collection[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleDelete(collection: Collection) {
    if (!confirm(`Delete collection "${collection.name}"? Products will be unassigned.`)) return;
    setError('');
    const { error: deleteError } = await supabase.from('collections').delete().eq('id', collection.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (collection.hero_image) {
      await deleteStorageObjectObservable('collection-images', collection.hero_image);
    }
    await load();
  }

  if (showForm || editing) {
    return <CollectionEditor collection={editing} onClose={() => { setShowForm(false); setEditing(null); void load(); }} />;
  }

  const filtered = collections.filter(c => {
    const q = query.trim().toLowerCase();
    return !q || [c.name, c.slug, c.description ?? ''].some(val => val.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Catalogue Studio</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tightest text-ink">Collections</h1>
          <p className="mt-2 text-sm text-neutral-500">Organise your apparel lines and artwork series into curated collections.</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Add Collection</Button>
      </div>

      {error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="flex flex-col gap-3 border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search collection name or description…" className="w-full border border-neutral-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-neutral-600" />
        </div>
        <p className="text-xs text-neutral-500">{filtered.length} of {collections.length} collections</p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-20 animate-pulse border border-neutral-200 bg-white" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="border border-neutral-200 bg-white p-8"><EmptyState icon={<Package className="h-10 w-10" />} title="No collections found" description="Create your first collection or clear search filters." /></div>
      ) : (
        <div className="overflow-x-auto border border-neutral-200 bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Collection Image</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Name / Description</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Slug</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Order</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80">
                  <td className="px-4 py-3">
                    <div className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden border border-neutral-200 bg-neutral-100">
                      {c.hero_image ? (
                        <img src={c.hero_image} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-neutral-400">
                          <ImagePlus className="h-5 w-5" />
                          <span className="text-[8px] font-semibold uppercase tracking-wider">No Hero</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-neutral-900">{c.name}</p>
                    <p className="mt-0.5 line-clamp-1 max-w-sm text-xs text-neutral-500">{c.description || 'No description provided.'}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-600">{c.slug}</td>
                  <td className="px-4 py-3"><Badge variant={c.is_published ? 'success' : 'default'}>{c.is_published ? 'Published' : 'Draft'}</Badge></td>
                  <td className="px-4 py-3 text-center tabular-nums text-neutral-600">{c.sort_order}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(c)} className="font-semibold text-xs text-neutral-800 underline underline-offset-4 hover:text-red-700">Edit</button>
                    <button onClick={() => void handleDelete(c)} className="ml-3 text-xs text-red-700 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CollectionEditor({ collection, onClose }: { collection: Collection | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: collection?.name ?? '',
    slug: collection?.slug ?? '',
    description: collection?.description ?? '',
    sort_order: collection?.sort_order ?? 0,
    is_published: collection?.is_published ?? true,
    hero_image: collection?.hero_image ?? '',
  });
  const [galleryUrls, setGalleryUrls] = useState<string[]>(collection?.images ?? (collection?.hero_image ? [collection.hero_image] : []));
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageRemoved, setImageRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function uploadCollectionImage(file: File, slug: string): Promise<{ url: string; path: string }> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Collection image must be a JPG, PNG or WebP file.');
    }
    if (file.size > 25 * 1024 * 1024) {
      throw new Error('Collection image must be 25 MB or smaller.');
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${slug}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('collection-images').upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      throw new Error('Could not upload collection artwork: ' + uploadError.message + '. Ensure the collection-images bucket migration has been applied.');
    }
    const url = supabase.storage.from('collection-images').getPublicUrl(path).data.publicUrl;
    return { url, path };
  }

  async function handleAddGalleryFile(file: File) {
    setUploading(true);
    setError('');
    try {
      const name = form.name.trim() || 'collection';
      const slug = (form.slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-+|-+$/g, '');
      const { url } = await uploadCollectionImage(file, slug);
      setGalleryUrls(prev => [...prev, url]);
      if (!form.hero_image) setForm(p => ({ ...p, hero_image: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleAddGalleryUrl() {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    setGalleryUrls(prev => [...prev, url]);
    if (!form.hero_image) setForm(p => ({ ...p, hero_image: url }));
    setNewImageUrl('');
  }

  function handleRemoveGalleryImage(index: number) {
    setGalleryUrls(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (form.hero_image === prev[index]) {
        setForm(p => ({ ...p, hero_image: next[0] ?? '' }));
      }
      return next;
    });
  }

  function handleReorderGallery(index: number, direction: 'up' | 'down') {
    setGalleryUrls(prev => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    let uploadedPath: string | null = null;

    try {
      const name = form.name.trim();
      if (!name) throw new Error('Enter a collection name.');
      const slug = (form.slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-+|-+$/g, '');

      let finalHeroImage: string | null = form.hero_image.trim() || null;

      if (imageFile) {
        const { url, path } = await uploadCollectionImage(imageFile, slug);
        finalHeroImage = url;
        uploadedPath = path;
      } else if (imageRemoved) {
        finalHeroImage = galleryUrls[0] ?? null;
      }

      if (!finalHeroImage && galleryUrls.length > 0) {
        finalHeroImage = galleryUrls[0];
      }

      // Preserve the gallery's explicit order. Prepend only a hero image not already in that ordered list.
      const orderedGallery = Array.from(new Set(galleryUrls.map(url => url.trim()).filter(Boolean)));
      const finalGallery = finalHeroImage && !orderedGallery.includes(finalHeroImage)
        ? [finalHeroImage, ...orderedGallery]
        : orderedGallery;

      const payload = {
        name,
        slug,
        description: form.description.trim() || null,
        sort_order: Number(form.sort_order),
        is_published: form.is_published,
        hero_image: finalHeroImage,
        images: finalGallery,
      };

      const oldHeroImage = collection?.hero_image;

      try {
        if (collection) {
          const { error: updateError } = await supabase.from('collections').update(payload).eq('id', collection.id);
          if (updateError) throw new Error(updateError.message);
        } else {
          const { error: insertError } = await supabase.from('collections').insert(payload);
          if (insertError) throw new Error(insertError.message);
        }

        if (oldHeroImage && oldHeroImage !== finalHeroImage && !finalGallery.includes(oldHeroImage)) {
          await deleteStorageObjectObservable('collection-images', oldHeroImage);
        }
      } catch (dbErr) {
        if (uploadedPath) {
          await deleteStorageObjectObservable('collection-images', uploadedPath);
        }
        throw dbErr;
      }

      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save collection.');
    } finally {
      setSaving(false);
    }
  }

  const currentDisplayedImage = previewUrl || (!imageRemoved ? form.hero_image : (galleryUrls[0] ?? ''));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Catalogue Studio</p>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tightest text-ink">{collection ? 'Edit Collection' : 'Add Collection'}</h1>
        <p className="mt-2 text-sm text-neutral-500">Configure collection details, hero banner image, and publishing status.</p>
      </div>

      {error && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="space-y-4">
          <Input label="Collection Name" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Noir Atelier" />
          <Input label="Slug" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="auto-generated from name if left empty" />
          <Textarea label="Description" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Inspiration, themes, and details about this line…" />
          <Input label="Sort Order" type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} />

          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} /> Published on Storefront
          </label>
        </div>

        <div className="border-t border-neutral-200 pt-5 space-y-4">
          <div>
            <h3 className="font-display text-lg font-medium text-ink">Collection Hero Artwork</h3>
            <p className="text-xs text-neutral-500">Upload high-resolution header image for collection cards and detail banners (JPG, PNG or WebP up to 25 MB).</p>
          </div>

          <div className="border border-neutral-200 bg-neutral-50 p-4">
            <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden border border-neutral-200 bg-white">
              {currentDisplayedImage ? (
                <img src={currentDisplayedImage} alt="Collection hero preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-neutral-400">
                  <ImagePlus className="h-10 w-10" />
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em]">No image selected</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <label htmlFor="collection-image-upload" className="flex cursor-pointer items-center justify-center gap-2 border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-800 hover:border-neutral-900">
                <UploadCloud className="h-4 w-4" /> {imageFile ? 'Change selected photo' : 'Upload image'}
              </label>
              <input id="collection-image-upload" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => {
                const file = e.target.files?.[0] ?? null;
                if (file) {
                  setImageFile(file);
                  setImageRemoved(false);
                }
              }} />

              {currentDisplayedImage && (
                <Button type="button" variant="outline" onClick={() => {
                  setImageFile(null);
                  setImageRemoved(true);
                  setForm(p => ({ ...p, hero_image: '' }));
                }} className="text-xs text-red-700 hover:bg-red-50">
                  Remove Image
                </Button>
              )}
            </div>

            {imageFile && <p className="mt-2 text-xs text-neutral-600">Selected file: <strong>{imageFile.name}</strong> ({(imageFile.size / (1024 * 1024)).toFixed(2)} MB)</p>}

            <div className="mt-4">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Or paste an Image URL</label>
              <input value={form.hero_image} onChange={e => {
                setForm(p => ({ ...p, hero_image: e.target.value }));
                setImageRemoved(false);
              }} placeholder="https://…" className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-xs outline-none focus:border-neutral-600" />
            </div>
          </div>
        </div>

        {/* Gallery Multi-Image Manager */}
        <div className="border-t border-neutral-200 pt-5 space-y-4">
          <div>
            <h3 className="font-display text-lg font-medium text-ink">Collection Gallery Images ({galleryUrls.length})</h3>
            <p className="text-xs text-neutral-500">Upload multiple photos or add URLs for the storefront collection gallery. Reorder or set as hero image as needed.</p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {galleryUrls.map((url, index) => (
                <div key={index} className="group relative border border-neutral-200 bg-neutral-50 p-1.5 rounded-sm">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-white">
                    <img src={url} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
                    {form.hero_image === url && (
                      <span className="absolute left-1 top-1 bg-black text-white text-[9px] px-1.5 py-0.5 uppercase font-bold tracking-wider">
                        Hero
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] gap-1">
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, hero_image: url }))}
                      className="text-xs text-neutral-700 hover:text-black font-semibold"
                    >
                      Make Hero
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleReorderGallery(index, 'up')}
                        className="px-1 text-neutral-500 hover:text-black disabled:opacity-30"
                        title="Move left"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={index === galleryUrls.length - 1}
                        onClick={() => handleReorderGallery(index, 'down')}
                        className="px-1 text-neutral-500 hover:text-black disabled:opacity-30"
                        title="Move right"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(index)}
                        className="px-1 font-bold text-red-600 hover:text-red-800"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:border-neutral-900 shrink-0">
                <UploadCloud className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Add Gallery Photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void handleAddGalleryFile(file);
                  }}
                />
              </label>
              <div className="flex flex-1 items-center gap-2">
                <input
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  placeholder="Or paste gallery image URL (https://…)"
                  className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs outline-none focus:border-neutral-600"
                />
                <Button type="button" variant="outline" onClick={handleAddGalleryUrl} className="text-xs shrink-0">
                  Add URL
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-t border-neutral-200 pt-5">
          <Button type="submit" disabled={saving}>{saving ? 'Saving collection…' : 'Save Collection'}</Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

// ============ SETTINGS ============
export function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cleanupFailures, setCleanupFailures] = useState<Array<{ id: string; bucket_id: string; object_path: string; reason: string; attempt_count: number }>>([]);
  const [loadingFailures, setLoadingFailures] = useState(true);

  useEffect(() => {
    supabase.from('admin_settings').select('*').then(({ data }) => {
      const map: Record<string, string> = {};
      (data as { key: string; value: string }[])?.forEach(s => { map[s.key] = s.value; });
      setSettings(map);
    });

    loadCleanupFailures();
  }, []);

  async function loadCleanupFailures() {
    setLoadingFailures(true);
    const { data } = await supabase
      .from('storage_cleanup_failures')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false });
    setCleanupFailures(data || []);
    setLoadingFailures(false);
  }

  async function handleMarkResolved(id: string) {
    await supabase.from('storage_cleanup_failures').update({ resolved: true, updated_at: new Date().toISOString() }).eq('id', id);
    loadCleanupFailures();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('admin_settings').upsert({ key, value });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tightest text-ink">Settings</h1>
        <form onSubmit={handleSave} className="mt-6 max-w-lg space-y-4">
          <Input label="Store Name" value={settings.store_name ?? ''} onChange={e => setSettings(p => ({ ...p, store_name: e.target.value }))} />
          <Input label="Store Tagline" value={settings.store_tagline ?? ''} onChange={e => setSettings(p => ({ ...p, store_tagline: e.target.value }))} />
          <Input label="Standard Shipping Fee (INR)" type="number" value={settings.shipping_fee_inr ?? ''} onChange={e => setSettings(p => ({ ...p, shipping_fee_inr: e.target.value }))} />
          <p className="text-xs text-neutral-500">Enter the actual flat shipping fee charged per order. Leave blank until confirmed; enter 0 only if free shipping is intentionally configured. Checkout stays blocked while this field is blank or invalid.</p>
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
            {saved && <span className="text-xs text-green-600">Saved</span>}
          </div>
        </form>
      </div>

      <div className="border-t border-line/10 pt-8">
        <h2 className="font-display text-lg font-medium text-ink">Storage Cleanup Audit</h2>
        <p className="mt-1 text-xs text-muted">Unresolved orphaned storage file deletion failures requiring manual reconciliation.</p>

        {loadingFailures ? (
          <p className="mt-4 text-xs text-muted">Loading audit log...</p>
        ) : cleanupFailures.length === 0 ? (
          <p className="mt-4 text-xs text-muted">No unresolved storage cleanup failures recorded.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded border border-line/20">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line/20 bg-surface text-muted">
                <tr>
                  <th className="px-3 py-2">Bucket</th>
                  <th className="px-3 py-2">Path</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Attempts</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/10">
                {cleanupFailures.map((fail) => (
                  <tr key={fail.id}>
                    <td className="px-3 py-2 font-mono">{fail.bucket_id}</td>
                    <td className="px-3 py-2 font-mono truncate max-w-xs">{fail.object_path}</td>
                    <td className="px-3 py-2 text-red-400">{fail.reason}</td>
                    <td className="px-3 py-2">{fail.attempt_count}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleMarkResolved(fail.id)}
                        className="rounded bg-line/10 px-2 py-1 text-[10px] text-muted hover:bg-line/20 hover:text-ink"
                      >
                        Mark Resolved
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
