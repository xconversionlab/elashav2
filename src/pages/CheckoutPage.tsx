import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ShoppingBag, Clock3, CreditCard, AlertTriangle } from 'lucide-react';

type PreparedPayment = {
  key_id: string;
  razorpay_order_id: string;
  internal_order_id: string;
  order_number: string;
  amount: number;
  total: number;
  items_subtotal: number;
  shipping_fee: number;
  currency: 'INR';
  reservation_expires_at: string;
  prefill: { name: string; email: string; contact: string };
};

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailure = { error?: { description?: string; reason?: string } };
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  notes: { order_number: string };
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void | Promise<void>;
  modal: { ondismiss: () => void };
};
type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayFailure) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve(undefined);
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay checkout could not be loaded. Check your connection and retry.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay checkout could not be loaded. Check your connection and retry.'));
    document.head.appendChild(script);
  }).then(() => {
    if (!window.Razorpay) throw new Error('Razorpay checkout loaded without its payment handler. Refresh and retry.');
  });
}

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PreparedPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGatewayUnavailable, setIsGatewayUnavailable] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [shippingFeeInr, setShippingFeeInr] = useState<number | null>(null);
  const [shippingSettingsLoaded, setShippingSettingsLoaded] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '', country: 'India',
    notes: '',
  });

  useEffect(() => {
    let active = true;
    void supabase.from('admin_settings').select('value').eq('key', 'shipping_fee_inr').maybeSingle().then(({ data, error: settingsError }) => {
      if (!active) return;
      const raw = data?.value;
      const fee = raw === null || raw === undefined || String(raw).trim() === '' ? Number.NaN : Number(raw);
      setShippingFeeInr(!settingsError && Number.isFinite(fee) && fee >= 0 ? fee : null);
      setShippingSettingsLoaded(true);
    });
    return () => { active = false; };
  }, []);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) { setError('Please log in before checkout.'); return; }
    if (items.length === 0) return;
    if (!shippingSettingsLoaded || shippingFeeInr === null) {
      setError('Checkout is unavailable because the store shipping fee has not been configured. Please contact support.');
      return;
    }

    // Address & Phone validation
    const phoneClean = form.phone.trim().replace(/\D/g, '');
    if (!/^\d{10,12}$/.test(phoneClean)) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    if (!form.first_name.trim() || !form.last_name.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim()) {
      setError('Please complete all required shipping address fields.');
      return;
    }

    if (pendingPayment) {
      setNotice('Your secure checkout is already prepared. Continue using the Pay securely button below.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    setIsGatewayUnavailable(false);

    try {
      const requestedItems = items.map(item => ({
        product_id: item.is_custom ? null : item.product_id,
        variant_id: item.is_custom ? null : item.variant_id,
        custom_design_id: item.is_custom ? item.custom_design_id ?? null : null,
        quantity: item.quantity,
      }));

      const { data, error: prepareError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          items: requestedItems,
          shipping_address: {
            name: [form.first_name, form.last_name].map(value => value.trim()).filter(Boolean).join(' '),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            zip: form.zip.trim(),
            country: form.country.trim(),
          },
          customer_notes: form.notes,
        },
      });

      if (prepareError) {
        let serverMessage = prepareError.message || 'Could not prepare secure checkout.';
        let gatewayUnavailable = serverMessage.includes('PAYMENT_GATEWAY_UNAVAILABLE') || serverMessage.toLowerCase().includes('merchant credentials');
        const errorContext = (prepareError as typeof prepareError & { context?: Response }).context;
        if (errorContext instanceof Response) {
          try {
            const payload = await errorContext.clone().json() as { error?: unknown; code?: unknown };
            if (typeof payload.error === 'string') serverMessage = payload.error;
            gatewayUnavailable = gatewayUnavailable || payload.code === 'PAYMENT_GATEWAY_UNAVAILABLE'
              || serverMessage.toLowerCase().includes('merchant credentials');
          } catch {
            // Keep the original SDK error when the response body is not JSON.
          }
        }
        if (gatewayUnavailable) {
          setIsGatewayUnavailable(true);
          throw new Error('Online payment gateway is currently unavailable because Razorpay is not configured. Orders cannot be processed right now. Please contact support.');
        }
        throw new Error(serverMessage);
      }
      if (!data || typeof data.internal_order_id !== 'string' || typeof data.razorpay_order_id !== 'string') {
        throw new Error('The server returned an incomplete checkout. No payment was opened; please retry.');
      }
      const prepared = data as PreparedPayment;
      if (prepared.currency !== 'INR' || !Number.isFinite(prepared.total) || prepared.amount !== Math.round(prepared.total * 100)) {
        throw new Error('The server checkout amount was invalid. No payment was opened; please retry.');
      }

      setPendingPayment(prepared);
      setNotice('Price and inventory have been verified by ELASHA. Review the confirmed total below, then continue to Razorpay. Your stock reservation expires at ' + new Date(prepared.reservation_expires_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + '.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not prepare checkout. Please retry.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayNow() {
    if (!pendingPayment || submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error('Razorpay checkout is unavailable. Refresh and retry.');

      const prepared = pendingPayment;
      const checkout = new window.Razorpay({
        key: prepared.key_id,
        amount: prepared.amount,
        currency: prepared.currency,
        name: 'ELASHA Artware & Apparel',
        description: 'Order ' + prepared.order_number,
        order_id: prepared.razorpay_order_id,
        prefill: prepared.prefill,
        notes: { order_number: prepared.order_number },
        theme: { color: '#9e2638' },
        handler: async (response: RazorpaySuccess) => {
          setSubmitting(true);
          setError(null);
          try {
            const { data, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                internal_order_id: prepared.internal_order_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            if (verifyError) {
              throw new Error('Payment details were returned, but server verification is pending. Do not pay again. Retry verification shortly or contact ELASHA.');
            }
            if (data?.payment_received && data?.review_required) {
              clearCart();
              navigate('/account/orders/' + prepared.internal_order_id, {
                replace: true,
                state: { paymentReviewRequired: true, message: data.message },
              });
              return;
            }
            if (data?.verified && data?.payment_status === 'paid') {
              clearCart();
              navigate('/account/orders/' + prepared.internal_order_id, { replace: true });
              return;
            }
            setNotice(data?.message || 'Razorpay has not confirmed a captured payment yet. Do not pay again; you can retry this same checkout.');
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Payment verification is pending. Do not pay again; retry verification shortly.');
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setNotice('Payment window closed. Your prepared order is still available until the reservation expiry. You can reopen the same Razorpay checkout below.');
          },
        },
      });

      checkout.on('payment.failed', (response: RazorpayFailure) => {
        setSubmitting(false);
        setError(response.error?.description || 'Payment failed. Your cart and the prepared checkout are preserved so you can retry without creating another reservation.');
      });
      checkout.open();
    } catch (caught) {
      setSubmitting(false);
      setError(caught instanceof Error ? caught.message : 'Could not open Razorpay checkout.');
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-dark min-h-screen text-bone flex items-center justify-center py-20 px-4">
        <div className="text-center max-w-md">
          <ShoppingBag className="mx-auto h-12 w-12 text-crimson" />
          <h1 className="mt-4 text-xl font-bold text-bone">Your Bag is Empty</h1>
          <Link to="/shop" className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-crimson-light hover:text-bone">Return to Catalogue</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark min-h-screen text-bone py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-crimson-light">Atelier Checkout</span>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-bone sm:text-4xl">Shipping &amp; Payment</h1>
          </div>
          <span className="border border-crimson/50 bg-crimson/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-crimson-light">
            Prepaid Only
          </span>
        </div>

        {!user && (
          <div className="mt-6 border border-crimson/40 bg-crimson/10 p-4 text-xs font-bold text-bone rounded-sm">
            Please <Link to="/login" className="underline font-bold text-crimson-light hover:text-bone">log in</Link> or <Link to="/register" className="underline font-bold text-crimson-light hover:text-bone">create an account</Link> before paying.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-bone border-b border-charcoal-border pb-2.5">Shipping Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First Name" required value={form.first_name} disabled={!!pendingPayment} onChange={e => update('first_name', e.target.value)} placeholder="e.g. Rahul" />
              <Input label="Last Name" required value={form.last_name} disabled={!!pendingPayment} onChange={e => update('last_name', e.target.value)} placeholder="e.g. Sharma" />
            </div>
            <Input label="Email Address" type="email" required value={form.email} disabled={!!pendingPayment} onChange={e => update('email', e.target.value)} placeholder="e.g. rahul@example.com" />
            <Input label="10-Digit Mobile Number" required value={form.phone} disabled={!!pendingPayment} onChange={e => update('phone', e.target.value)} placeholder="10-digit phone number (e.g. 9876543210)" />
            <Input label="Street Address & Flat / House No." required value={form.address} disabled={!!pendingPayment} onChange={e => update('address', e.target.value)} placeholder="Door no., building, street" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="City" required value={form.city} disabled={!!pendingPayment} onChange={e => update('city', e.target.value)} placeholder="City" />
              <Input label="State" required value={form.state} disabled={!!pendingPayment} onChange={e => update('state', e.target.value)} placeholder="State" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="PIN Code" required value={form.zip} disabled={!!pendingPayment} onChange={e => update('zip', e.target.value)} placeholder="6-digit PIN code" />
              <Input label="Country" required value={form.country} disabled={!!pendingPayment} onChange={e => update('country', e.target.value)} />
            </div>
            <Textarea label="Special Studio Instructions (optional)" rows={3} value={form.notes} disabled={!!pendingPayment} onChange={e => update('notes', e.target.value)} placeholder="Delivery landmarks or special requests..." />

            <div className="border border-charcoal-border bg-charcoal/50 p-4 text-xs leading-relaxed text-bone-muted space-y-2 rounded-sm">
              <p className="flex items-center gap-2 font-bold uppercase tracking-wider text-bone"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Prepaid Payment Guaranteed</p>
              <p>Cash on Delivery (COD) is unavailable. Online payment will be offered at checkout once the payment gateway is configured.</p>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-charcoal p-6 border border-charcoal-border rounded-sm shadow-2xl sticky top-24 space-y-5">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-bone border-b border-charcoal-border/80 pb-3">Order Summary</h2>
              <div className="max-h-64 space-y-3.5 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-xs border-b border-charcoal-border/40 pb-3">
                    <div className="flex-1 pr-3">
                      <p className="font-display font-semibold text-sm text-bone">{item.product_name}</p>
                      <p className="mt-0.5 text-xs text-bone-muted">Size: <span className="text-bone font-medium">{item.size_label}</span> × {item.quantity}</p>
                    </div>
                    <p className="font-mono font-bold text-sm text-bone">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 border-t border-charcoal-border/80 pt-3 text-xs">
                <div className="flex justify-between text-bone-muted">
                  <span className="uppercase tracking-wider">Items Subtotal</span>
                  <span className="font-mono text-bone text-sm">{formatPrice(pendingPayment?.items_subtotal ?? total)}</span>
                </div>
                <div className="flex justify-between text-bone-muted">
                  <span className="uppercase tracking-wider">Standard Shipping</span>
                  <span className="font-mono text-bone text-sm">{pendingPayment ? formatPrice(pendingPayment.shipping_fee) : shippingFeeInr === null ? 'Not configured' : formatPrice(shippingFeeInr)}</span>
                </div>
              </div>

              {!pendingPayment ? (
                <div className="flex items-center justify-between border-t border-charcoal-border pt-4">
                  <span className="font-display text-xs font-bold uppercase tracking-widest text-bone-muted">Total Amount</span>
                  <span className="font-mono text-xl font-bold text-metallic-silver">{shippingFeeInr === null ? 'Unavailable' : formatPrice(total + shippingFeeInr)}</span>
                </div>
              ) : (
                <div className="border-t border-charcoal-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-xs font-bold uppercase tracking-widest text-bone-muted">Final Total</span>
                    <span className="font-mono text-2xl font-bold text-metallic-silver">{formatPrice(pendingPayment.total)}</span>
                  </div>
                  <p className="mt-2.5 flex items-center gap-2 text-xs font-medium text-amber-300"><Clock3 className="h-4 w-4 shrink-0" /> Stock reserved until {new Date(pendingPayment.reservation_expires_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}

              {shippingSettingsLoaded && shippingFeeInr === null && <p role="status" className="mt-4 border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200 rounded-sm">Shipping is not configured yet. The store administrator must enter the actual shipping fee in Admin → Settings before checkout can proceed. Enter ₹0 only if free shipping is intended.</p>}
              {error && <p role="alert" className="mt-4 text-xs font-bold text-crimson-light bg-crimson/10 border border-crimson/30 p-3 rounded-sm">{error}</p>}
              {notice && <p role="status" className="mt-4 text-xs leading-relaxed text-bone-muted bg-black/30 border border-charcoal-border p-3 rounded-sm">{notice}</p>}

              {isGatewayUnavailable ? (
                <div className="mt-6 p-4 border border-amber-500/30 bg-amber-500/10 rounded-sm text-center">
                  <AlertTriangle className="mx-auto h-6 w-6 text-amber-400 mb-2" />
                  <p className="text-xs font-bold text-amber-200 uppercase tracking-wider">Payment Gateway Unavailable</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-bone-muted">
                    Online payment is not configured yet. Please contact ELASHA support before placing an order.
                  </p>
                </div>
              ) : !pendingPayment ? (
                <Button type="submit" disabled={submitting || !user || !shippingSettingsLoaded || shippingFeeInr === null} className="mt-6 w-full bg-crimson text-bone hover:bg-crimson-light font-bold text-xs uppercase tracking-[0.2em] py-4 transition-all duration-300 shadow-lg shadow-crimson/25 rounded-sm" size="lg">
                  {submitting ? 'Securing checkout…' : 'Verify Price & Reserve Stock'}
                </Button>
              ) : (
                <Button type="button" onClick={() => void handlePayNow()} disabled={submitting} className="mt-6 w-full bg-crimson text-bone hover:bg-crimson-light font-bold text-xs uppercase tracking-[0.2em] py-4 transition-all duration-300 shadow-lg shadow-crimson/25 rounded-sm" size="lg">
                  <CreditCard className="mr-2 h-4 w-4" /> {submitting ? 'Connecting to Razorpay…' : 'Pay ' + formatPrice(pendingPayment.total) + ' with Razorpay'}
                </Button>
              )}
              {!pendingPayment && !isGatewayUnavailable && <p className="mt-3 text-center text-[10px] leading-relaxed text-bone-muted">Your final total is recalculated by ELASHA's secure checkout before payment opens.</p>}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
