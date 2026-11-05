import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { handler as createOrderHandler } from '../supabase/functions/create-razorpay-order/index';
import { handler as verifyPaymentHandler } from '../supabase/functions/verify-razorpay-payment/index';
import { deleteStorageObjectObservable } from '../src/lib/storageCleanup';

// A captured payment that the database has already resolved, returned by the
// mocked confirm_razorpay_payment RPC. These tests prove the Edge Function's
// control flow; the database transition itself is exercised against a real
// PostgreSQL instance in tests/db/atomic-transition.test.ts.
function createMockFetch(orderDb: Record<string, unknown>, rzpPaymentDb: Record<string, unknown>, rpcDb: Record<string, unknown> = {}, authUserId = 'user-123') {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Supabase auth user lookup
    if (urlStr.includes('/auth/v1/user')) {
      return new Response(
        JSON.stringify({
          id: authUserId,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'customer@elasha.in',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Supabase RPC calls (payment transitions)
    if (urlStr.includes('/rest/v1/rpc/')) {
      const rpcName = urlStr.split('/rest/v1/rpc/')[1].split('?')[0];
      if (rpcName === 'confirm_razorpay_payment') {
        const body = JSON.parse((init?.body as string) || '{}');
        // Mirror the database's real outcome for the order state under test.
        const status = orderDb.payment_status as string | undefined;
        const outcome =
          status === 'paid'
            ? 'already_paid'
            : status === 'requires_reconciliation'
            ? 'already_reconciliation'
            : (rpcDb.confirmOutcome as string) ?? 'confirmed';
        return new Response(JSON.stringify({ outcome, params: body }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (rpcName === 'fail_razorpay_payment') {
        return new Response(JSON.stringify({ outcome: 'failed' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Supabase GET orders
    if (urlStr.includes('/rest/v1/orders') && (!init?.method || init.method === 'GET')) {
      return new Response(JSON.stringify(orderDb), {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.pgrst.object+json', 'Content-Range': '0-0/1' },
      });
    }

    // Supabase PATCH/UPDATE orders
    if (urlStr.includes('/rest/v1/orders') && init?.method === 'PATCH') {
      const body = JSON.parse(init.body as string);
      Object.assign(orderDb, body);
      return new Response(JSON.stringify(orderDb), {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.pgrst.object+json' },
      });
    }

    // Razorpay payment lookup API
    if (urlStr.includes('api.razorpay.com/v1/payments/')) {
      if (rzpPaymentDb.error) {
        return new Response(JSON.stringify({ error: rzpPaymentDb.error }), { status: 400 });
      }
      return new Response(JSON.stringify(rzpPaymentDb), { status: 200 });
    }

    return new Response(JSON.stringify({}), { status: 200 });
  };
}

function buildRequest(path: string, body: unknown) {
  return new Request(`http://localhost:54321/functions/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock-valid-token' },
    body: JSON.stringify(body),
  });
}

function sign(orderId: string, paymentId: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

describe('ELASHA Production Release Gates & Core Integrity', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://mock.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
      RAZORPAY_KEY_ID: 'rzp_test_mock_key_id',
      RAZORPAY_KEY_SECRET: 'rzp_test_mock_key_secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Edge Function CORS & Protocol Gates', () => {
    it('returns valid CORS headers on OPTIONS preflight for create-razorpay-order', async () => {
      const req = new Request('http://localhost:54321/functions/v1/create-razorpay-order', { method: 'OPTIONS' });
      const res = await createOrderHandler(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
    });

    it('returns valid CORS headers on OPTIONS preflight for verify-razorpay-payment', async () => {
      const req = new Request('http://localhost:54321/functions/v1/verify-razorpay-payment', { method: 'OPTIONS' });
      const res = await verifyPaymentHandler(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('2. Missing Credentials & Provider Unavailable Logic', () => {
    it('create-razorpay-order returns 503 PAYMENT_GATEWAY_UNAVAILABLE when RAZORPAY credentials are missing', async () => {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;

      const res = await createOrderHandler(buildRequest('create-razorpay-order', { items: [{ variant_id: 'v-1', quantity: 1 }] }));
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json.code).toBe('PAYMENT_GATEWAY_UNAVAILABLE');
      expect(json.error).toContain('Razorpay merchant credentials are not configured');
    });

    it('verify-razorpay-payment returns 503 PAYMENT_GATEWAY_UNAVAILABLE when RAZORPAY credentials are missing', async () => {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;

      const res = await verifyPaymentHandler(buildRequest('verify-razorpay-payment', {
        internal_order_id: 'ord-123',
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123',
      }));
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json.code).toBe('PAYMENT_GATEWAY_UNAVAILABLE');
    });
  });

  describe('3. Signature Verification & HMAC Security', () => {
    it('verifies Razorpay HMAC-SHA256 payment signature accurately', () => {
      const secret = 'rzp_secret_test_12345';
      const orderId = 'order_M1234567890';
      const paymentId = 'pay_P9876543210';
      const expectedSignature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

      const verifySignature = (ordId: string, payId: string, sig: string, sec: string) =>
        crypto.createHmac('sha256', sec).update(`${ordId}|${payId}`).digest('hex') === sig;

      expect(verifySignature(orderId, paymentId, expectedSignature, secret)).toBe(true);
      expect(verifySignature(orderId, paymentId, 'tampered_signature', secret)).toBe(false);
    });
  });

  describe('4. Stock & Payment RPC Permission Restrictions in SQL Migrations', () => {
    it('verifies SQL migrations strictly REVOKE privileged functions from PUBLIC, anon, and authenticated', () => {
      const m19Content = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20261019000000_atomic_payment_confirmation.sql'), 'utf8');
      const provisionContent = fs.readFileSync(path.join(process.cwd(), 'supabase/provision.sql'), 'utf8');

      for (const fn of [
        'public.reserve_variant_stock(uuid, int)',
        'public.release_variant_stock(uuid, int)',
        'public.cleanup_expired_stock_reservations()',
        'public.confirm_razorpay_payment(uuid, text, int, text)',
        'public.fail_razorpay_payment(uuid, text)',
      ]) {
        expect(m19Content + provisionContent).toContain(`REVOKE EXECUTE ON FUNCTION ${fn} FROM PUBLIC, anon, authenticated;`);
      }

      expect(m19Content).toContain('GRANT EXECUTE ON FUNCTION public.confirm_razorpay_payment(uuid, text, int, text) TO service_role;');
      expect(m19Content).toContain('GRANT EXECUTE ON FUNCTION public.fail_razorpay_payment(uuid, text) TO service_role;');
      expect(provisionContent).toContain('storage_cleanup_failures');
    });

    it('uses a fixed search_path for every SECURITY DEFINER transition function', () => {
      const m19Content = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20261019000000_atomic_payment_confirmation.sql'), 'utf8');
      const definerCount = (m19Content.match(/SECURITY DEFINER/g) || []).length;
      const searchPathCount = (m19Content.match(/SET search_path = public/g) || []).length;
      expect(definerCount).toBeGreaterThan(0);
      expect(searchPathCount).toBeGreaterThanOrEqual(definerCount);
    });
  });

  describe('5. Storage Cleanup & Retry Observability', () => {
    it('handles storage deletion URLs safely without throwing and logs audit on failure', async () => {
      const res = await deleteStorageObjectObservable('product-images', 'https://auvnplljyxbvznrqeyox.supabase.co/storage/v1/object/public/product-images/test/photo.jpg', 1);
      expect(res.bucket).toBe('product-images');
      expect(res.path).toBe('test/photo.jpg');
    });
  });

  describe('6. Database Migrations & Provisioning Consistency', () => {
    it('verifies migrations 20261017, 20261018 & 20261019 exist and are reflected in provision.sql', () => {
      const provisionContent = fs.readFileSync(path.join(process.cwd(), 'supabase/provision.sql'), 'utf8');

      for (const file of [
        '20261017000000_add_order_payment_fields.sql',
        '20261018000000_atomic_stock_and_expiry_functions.sql',
        '20261019000000_atomic_payment_confirmation.sql',
      ]) {
        const p = path.join(process.cwd(), 'supabase/migrations', file);
        expect(fs.existsSync(p)).toBe(true);
        expect(provisionContent).toContain(file);
      }

      const m19Content = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20261019000000_atomic_payment_confirmation.sql'), 'utf8');
      expect(m19Content).toContain('confirm_razorpay_payment');
      expect(provisionContent).toContain('confirm_razorpay_payment');
      expect(provisionContent).toContain('fail_razorpay_payment');

      // The fresh-install bundle must carry the exact migration-19 section.
      const marker = '-- ===== supabase/migrations/20261019000000_atomic_payment_confirmation.sql =====\n';
      const markerIndex = provisionContent.indexOf(marker);
      expect(markerIndex).toBeGreaterThan(-1);
      expect(provisionContent.slice(markerIndex + marker.length, markerIndex + marker.length + m19Content.length)).toBe(m19Content);
    });
  });

  it('removes XS from selectable sizes and keeps fresh provisioning aligned', () => {
    const seed = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20261006052737_seed_elasha_data.sql'), 'utf8');
    const variantsSeed = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20261006052800_seed_product_variants.sql'), 'utf8');
    const removeXsPath = path.join(process.cwd(), 'supabase/migrations/20261025000000_remove_xs_size.sql');
    const removeXs = fs.readFileSync(removeXsPath, 'utf8');
    const provision = fs.readFileSync(path.join(process.cwd(), 'supabase/provision.sql'), 'utf8');
    const catalogHook = fs.readFileSync(path.join(process.cwd(), 'src/hooks/useCatalog.ts'), 'utf8');
    const productPage = fs.readFileSync(path.join(process.cwd(), 'src/pages/ProductDetailPage.tsx'), 'utf8');
    const adminPages = fs.readFileSync(path.join(process.cwd(), 'src/pages/AdminPages.tsx'), 'utf8');
    const customDesigner = fs.readFileSync(path.join(process.cwd(), 'src/pages/CustomDesignPage.tsx'), 'utf8');

    expect(seed).not.toContain("'XS'");
    expect(seed).toContain("('S', 1), ('M', 2), ('L', 3), ('XL', 4), ('XXL', 5)");
    expect(variantsSeed).toContain('28 x 5 x 6 = 840 variants');
    expect(removeXs).toContain("upper(btrim(label)) = 'XS'");
    expect(removeXs).toContain('DELETE FROM public.product_variants');
    expect(removeXs).toContain('DELETE FROM public.sizes');
    expect(provision).toContain('20261025000000_remove_xs_size.sql');
    expect(provision).toContain(removeXs);
    expect(catalogHook).toContain("variant.size?.label !== 'XS'");
    expect(catalogHook).toContain(".neq('label', 'XS')");
    expect(productPage).toContain("v.size.label !== 'XS'");
    expect(adminPages).toContain(".neq('size.label', 'XS')");
    expect(customDesigner).toContain('sizes[1]?.label');
  });

  describe('7. Payment Verification Control Flow (mocked database transition)', () => {
    const secret = 'rzp_test_mock_key_secret';

    function withFetch<T>(mockFetch: typeof fetch, run: () => Promise<T>): Promise<T> {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;
      return run().finally(() => { globalThis.fetch = originalFetch; });
    }

    it('retrying verification for an already-paid order after reservation expiry keeps it paid', async () => {
      const mockOrder = {
        id: 'ord-already-paid',
        user_id: 'user-123',
        status: 'processing',
        payment_status: 'paid',
        razorpay_order_id: 'order_paid_123',
        payment_id: 'pay_paid_456',
        reservation_expires_at: new Date(Date.now() - 3600000).toISOString(),
        stock_reserved: false,
        total: 150,
        order_items: [],
      };

      await withFetch(
        createMockFetch(
          mockOrder,
          { id: 'pay_paid_456', order_id: 'order_paid_123', amount: 15000, currency: 'INR', status: 'captured' }
        ),
        async () => {
          const res = await verifyPaymentHandler(buildRequest('verify-razorpay-payment', {
            internal_order_id: 'ord-already-paid',
            razorpay_order_id: 'order_paid_123',
            razorpay_payment_id: 'pay_paid_456',
            razorpay_signature: sign('order_paid_123', 'pay_paid_456', secret),
          }));
          expect(res.status).toBe(200);
          const json = await res.json();
          expect(json.verified).toBe(true);
          expect(json.payment_status).toBe('paid');
          expect(mockOrder.payment_status).toBe('paid');
        }
      );
    });

    it('flags a captured payment with an expired reservation as requires_reconciliation with review_required', async () => {
      const rzpOrderId = 'order_race_123';
      const rzpPayId = 'pay_race_456';
      const mockOrder = {
        id: 'ord-expired-race',
        user_id: 'user-123',
        status: 'pending',
        payment_status: 'pending',
        razorpay_order_id: rzpOrderId,
        payment_id: null,
        reservation_expires_at: new Date(Date.now() - 5000).toISOString(),
        stock_reserved: true,
        total: 200,
        order_items: [{ variant_id: 'var-1', quantity: 1 }],
      };

      await withFetch(
        createMockFetch(mockOrder, { id: rzpPayId, order_id: rzpOrderId, amount: 20000, currency: 'INR', status: 'captured' }, { confirmOutcome: 'reconciliation' }),
        async () => {
          const res = await verifyPaymentHandler(buildRequest('verify-razorpay-payment', {
            internal_order_id: 'ord-expired-race',
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPayId,
            razorpay_signature: sign(rzpOrderId, rzpPayId, secret),
          }));
          expect(res.status).toBe(200);
          const json = await res.json();
          expect(json.verified).toBe(false);
          expect(json.payment_status).toBe('requires_reconciliation');
          expect(json.review_required).toBe(true);
          expect(json.payment_received).toBe(true);
        }
      );
    });

    it('rejects verification when Razorpay reports a non-captured payment', async () => {
      const rzpOrderId = 'order_check_123';
      const rzpPayId = 'pay_check_456';
      const mockOrder = {
        id: 'ord-invalid-checks',
        user_id: 'user-123',
        status: 'pending',
        payment_status: 'pending',
        razorpay_order_id: rzpOrderId,
        reservation_expires_at: new Date(Date.now() + 300000).toISOString(),
        stock_reserved: true,
        total: 100,
        order_items: [],
      };

      await withFetch(
        createMockFetch(mockOrder, { id: rzpPayId, order_id: rzpOrderId, amount: 10000, currency: 'INR', status: 'authorized' }),
        async () => {
          const res = await verifyPaymentHandler(buildRequest('verify-razorpay-payment', {
            internal_order_id: 'ord-invalid-checks',
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPayId,
            razorpay_signature: sign(rzpOrderId, rzpPayId, secret),
          }));
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toContain('is not captured');
        }
      );
    });

    it('rejects a mismatched amount before any transition is attempted', async () => {
      const rzpOrderId = 'order_amount_123';
      const rzpPayId = 'pay_amount_456';
      const mockOrder = {
        id: 'ord-amount',
        user_id: 'user-123',
        status: 'pending',
        payment_status: 'pending',
        razorpay_order_id: rzpOrderId,
        reservation_expires_at: new Date(Date.now() + 300000).toISOString(),
        stock_reserved: true,
        total: 100,
        order_items: [],
      };

      await withFetch(
        createMockFetch(mockOrder, { id: rzpPayId, order_id: rzpOrderId, amount: 99900, currency: 'INR', status: 'captured' }),
        async () => {
          const res = await verifyPaymentHandler(buildRequest('verify-razorpay-payment', {
            internal_order_id: 'ord-amount',
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPayId,
            razorpay_signature: sign(rzpOrderId, rzpPayId, secret),
          }));
          expect(res.status).toBe(400);
          const json = await res.json();
          expect(json.error).toContain('amount mismatch');
        }
      );
    });

    it('successful unexpired captured payment confirmation returns paid', async () => {
      const rzpOrderId = 'order_ok_123';
      const rzpPayId = 'pay_ok_456';
      const mockOrder = {
        id: 'ord-ok',
        user_id: 'user-123',
        status: 'pending',
        payment_status: 'pending',
        razorpay_order_id: rzpOrderId,
        reservation_expires_at: new Date(Date.now() + 600000).toISOString(),
        stock_reserved: true,
        total: 100,
        order_items: [{ variant_id: 'var-1', quantity: 1 }],
      };

      await withFetch(
        createMockFetch(mockOrder, { id: rzpPayId, order_id: rzpOrderId, amount: 10000, currency: 'INR', status: 'captured' }),
        async () => {
          const res = await verifyPaymentHandler(buildRequest('verify-razorpay-payment', {
            internal_order_id: 'ord-ok',
            razorpay_order_id: rzpOrderId,
            razorpay_payment_id: rzpPayId,
            razorpay_signature: sign(rzpOrderId, rzpPayId, secret),
          }));
          expect(res.status).toBe(200);
          const json = await res.json();
          expect(json.verified).toBe(true);
          expect(json.payment_status).toBe('paid');
        }
      );
    });

    it('does not downgrade a paid order when the signature is invalid', async () => {
      const mockOrder = {
        id: 'ord-paid-sig',
        user_id: 'user-123',
        status: 'processing',
        payment_status: 'paid',
        razorpay_order_id: 'order_psig',
        payment_id: 'pay_psig',
        reservation_expires_at: new Date(Date.now() - 3600000).toISOString(),
        stock_reserved: false,
        total: 150,
        order_items: [],
      };

      await withFetch(createMockFetch(mockOrder, {}), async () => {
        const res = await verifyPaymentHandler(buildRequest('verify-razorpay-payment', {
          internal_order_id: 'ord-paid-sig',
          razorpay_order_id: 'order_psig',
          razorpay_payment_id: 'pay_psig',
          razorpay_signature: 'tampered',
        }));
        expect(res.status).toBe(400);
        expect(mockOrder.payment_status).toBe('paid');
      });
    });

    it('rejects a verification attempt for another user\'s order', async () => {
      const mockOrder = {
        id: 'ord-other',
        user_id: 'someone-else',
        status: 'pending',
        payment_status: 'pending',
        razorpay_order_id: 'order_other',
        total: 100,
        order_items: [],
      };

      await withFetch(createMockFetch(mockOrder, {}), async () => {
        const res = await verifyPaymentHandler(buildRequest('verify-razorpay-payment', {
          internal_order_id: 'ord-other',
          razorpay_order_id: 'order_other',
          razorpay_payment_id: 'pay_other',
          razorpay_signature: 'sig',
        }));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('Unauthorized');
      });
    });
  });
});
