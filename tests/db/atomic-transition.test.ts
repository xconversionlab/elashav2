import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

// Genuine database tests for the atomic payment / reservation transition.
//
// These run the real PostgreSQL functions against a real PostgreSQL instance,
// so row locking, guarded updates, triggers and exactly-once stock release are
// exercised for real - not mocked. Set ELASHA_TEST_DATABASE_URL to point at a
// disposable PostgreSQL server (the default assumes a local trust-auth server
// on 127.0.0.1:5432). If no server is reachable the suite is skipped with an
// explicit message rather than silently passing.

const ADMIN_URL = process.env.ELASHA_TEST_DATABASE_URL || 'postgres://postgres@127.0.0.1:5432/postgres';
const TEST_DB = 'elasha_gate_test';
const TEST_URL = ADMIN_URL.replace(/\/[^/]*$/, `/${TEST_DB}`);

const VARIANT_ID = '33333333-3333-3333-3333-333333333333';
const PRODUCT_ID = '22222222-2222-2222-2222-222222222222';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const START_STOCK = 10;

const MIGRATIONS = [
  'tests/db/minimal-schema.sql',
  'supabase/migrations/20261017000000_add_order_payment_fields.sql',
  'supabase/migrations/20261018000000_atomic_stock_and_expiry_functions.sql',
  'supabase/migrations/20261019000000_atomic_payment_confirmation.sql',
];

let available = false;
let skipReason = '';

function newClient(): Client {
  return new Client({ connectionString: TEST_URL });
}

async function exec(client: Client, sql: string, params?: unknown[]) {
  return client.query(sql, params as never);
}

async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = newClient();
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function seedOrder(client: Client, id: string, opts: { expired: boolean; paymentStatus?: string; stockReserved?: boolean }) {
  const expiresAt = new Date(Date.now() + (opts.expired ? -60000 : 600000)).toISOString();
  await exec(
    client,
    `INSERT INTO public.orders
       (id, user_id, order_number, status, total, payment_status, stock_reserved, reservation_expires_at, razorpay_order_id)
     VALUES ($1,$2,$3,'pending',100,$4,$5,$6,$7)`,
    [id, USER_ID, 'EL' + id.slice(0, 8), opts.paymentStatus ?? 'pending', opts.stockReserved ?? true, expiresAt, 'rzp_' + id.slice(0, 8)]
  );
  await exec(
    client,
    `INSERT INTO public.order_items (order_id, variant_id, product_name, quantity, unit_price)
     VALUES ($1,$2,'Tee',2,100)`,
    [id, VARIANT_ID]
  );
}

async function stockOf(client: Client): Promise<number> {
  const r = await exec(client, `SELECT stock FROM public.product_variants WHERE id=$1`, [VARIANT_ID]);
  return r.rows[0].stock;
}

async function orderOf(client: Client, id: string) {
  const r = await exec(client, `SELECT payment_status, stock_reserved, status, payment_id FROM public.orders WHERE id=$1`, [id]);
  return r.rows[0] as { payment_status: string; stock_reserved: boolean; status: string; payment_id: string | null };
}

async function resetStock(client: Client) {
  await exec(client, `UPDATE public.product_variants SET stock=$1 WHERE id=$2`, [START_STOCK, VARIANT_ID]);
}

beforeAll(async () => {
  let admin: Client | null = null;
  try {
    admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await admin.query(`CREATE DATABASE ${TEST_DB}`);
  } catch (err) {
    skipReason = `No PostgreSQL server reachable at ${ADMIN_URL.replace(/:[^:@/]*@/, ':***@')}: ${(err as Error).message}`;
    if (admin) await admin.end().catch(() => undefined);
    if (process.env.CI === 'true') {
      throw new Error(`[atomic-transition] PostgreSQL is required in CI: ${skipReason}`);
    }
    return;
  }
  await admin.end();

  try {
    await withClient(async (c) => {
      for (const file of MIGRATIONS) {
        const sql = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
        await exec(c, sql);
      }
      await exec(c, `INSERT INTO auth.users (id) VALUES ($1)`, [USER_ID]);
      await exec(c, `INSERT INTO public.products (id, name, price) VALUES ($1,'Tee',100)`, [PRODUCT_ID]);
      await exec(c, `INSERT INTO public.product_variants (id, product_id, stock) VALUES ($1,$2,$3)`, [VARIANT_ID, PRODUCT_ID, START_STOCK]);
    });
    available = true;
  } catch (err) {
    skipReason = `Failed to apply migrations to ${TEST_DB}: ${(err as Error).message}`;
  }

  if (!available && process.env.CI === 'true') {
    throw new Error(`[atomic-transition] PostgreSQL setup failed in CI: ${skipReason}`);
  }
}, 60000);

afterAll(async () => {
  if (!available) return;
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`).catch(() => undefined);
  await admin.end().catch(() => undefined);
});

describe('Atomic payment / reservation transition (real PostgreSQL)', () => {
  beforeAll(() => {
    if (!available) {
      // Surface the reason in the run output instead of a silent pass.
      console.warn(`[atomic-transition] SKIPPED: ${skipReason}`);
    }
  });

  it('confirms a captured, unexpired payment and keeps the stock consumed', async ({ skip }) => {
    if (!available) return skip(skipReason);
    await withClient(async (c) => {
      await resetStock(c);
      await seedOrder(c, 'aaaaaaaa-0000-0000-0000-000000000001', { expired: false });
      const r = await exec(c, `SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, [
        'aaaaaaaa-0000-0000-0000-000000000001', 'pay_1', 10000, 'rzp_aaaaaaaa',
      ]);
      expect(r.rows[0].o.outcome).toBe('confirmed');
      const o = await orderOf(c, 'aaaaaaaa-0000-0000-0000-000000000001');
      expect(o.payment_status).toBe('paid');
      expect(o.status).toBe('processing');
      expect(o.stock_reserved).toBe(false);
      expect(await stockOf(c)).toBe(START_STOCK); // not released
    });
  });

  it('returns requires_reconciliation and releases stock exactly once for a captured payment after expiry', async ({ skip }) => {
    if (!available) return skip(skipReason);
    await withClient(async (c) => {
      await resetStock(c);
      await seedOrder(c, 'bbbbbbbb-0000-0000-0000-000000000002', { expired: true });
      const r = await exec(c, `SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, [
        'bbbbbbbb-0000-0000-0000-000000000002', 'pay_2', 10000, 'rzp_bbbbbbbb',
      ]);
      expect(r.rows[0].o.outcome).toBe('reconciliation');
      const o = await orderOf(c, 'bbbbbbbb-0000-0000-0000-000000000002');
      expect(o.payment_status).toBe('requires_reconciliation');
      expect(o.stock_reserved).toBe(false);
      expect(await stockOf(c)).toBe(START_STOCK + 2); // released once
    });
  });

  it('does not release stock again when the captured payment arrives after cleanup already released it', async ({ skip }) => {
    if (!available) return skip(skipReason);
    await withClient(async (c) => {
      await resetStock(c);
      await seedOrder(c, 'cccccccc-0000-0000-0000-000000000003', { expired: true });
      await exec(c, `SELECT public.cleanup_expired_stock_reservations()`);
      expect(await stockOf(c)).toBe(START_STOCK + 2); // cleanup released once
      const r = await exec(c, `SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, [
        'cccccccc-0000-0000-0000-000000000003', 'pay_3', 10000, 'rzp_cccccccc',
      ]);
      expect(r.rows[0].o.outcome).toBe('reconciliation');
      expect(await stockOf(c)).toBe(START_STOCK + 2); // NOT released a second time
      const o = await orderOf(c, 'cccccccc-0000-0000-0000-000000000003');
      expect(o.payment_status).toBe('requires_reconciliation');
    });
  });

  it('never downgrades a paid order on retry, even after its reservation expiry', async ({ skip }) => {
    if (!available) return skip(skipReason);
    await withClient(async (c) => {
      await resetStock(c);
      await seedOrder(c, 'dddddddd-0000-0000-0000-000000000004', { expired: true, paymentStatus: 'paid', stockReserved: false });
      const r = await exec(c, `SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, [
        'dddddddd-0000-0000-0000-000000000004', 'pay_4', 10000, 'rzp_dddddddd',
      ]);
      expect(r.rows[0].o.outcome).toBe('already_paid');
      const o = await orderOf(c, 'dddddddd-0000-0000-0000-000000000004');
      expect(o.payment_status).toBe('paid');
      expect(await stockOf(c)).toBe(START_STOCK);
    });
  });

  it('never overwrites a requires_reconciliation order when fail_razorpay_payment is called', async ({ skip }) => {
    if (!available) return skip(skipReason);
    await withClient(async (c) => {
      await resetStock(c);
      await seedOrder(c, '66666666-0000-0000-0000-00000000000c', { expired: true, paymentStatus: 'requires_reconciliation', stockReserved: false });
      await exec(c, `UPDATE public.orders SET payment_id='pay_rec_existing' WHERE id=$1`, ['66666666-0000-0000-0000-00000000000c']);

      const initialStock = await stockOf(c);
      const r = await exec(c, `SELECT public.fail_razorpay_payment($1,$2) AS o`, [
        '66666666-0000-0000-0000-00000000000c', 'invalid_signature',
      ]);
      expect(r.rows[0].o.outcome).toBe('already_reconciliation');

      const o = await orderOf(c, '66666666-0000-0000-0000-00000000000c');
      expect(o.payment_status).toBe('requires_reconciliation');
      expect(o.payment_id).toBe('pay_rec_existing');
      expect(o.status).toBe('pending');
      expect(o.stock_reserved).toBe(false);
      expect(await stockOf(c)).toBe(initialStock); // no second stock release
    });
  });

  it('defensively preserves requires_reconciliation order state and stock even if stock_reserved was true', async ({ skip }) => {
    if (!available) return skip(skipReason);
    await withClient(async (c) => {
      await resetStock(c);
      await seedOrder(c, '77777777-0000-0000-0000-00000000000d', { expired: false, paymentStatus: 'requires_reconciliation', stockReserved: true });
      await exec(c, `UPDATE public.orders SET payment_id='pay_rec_defensive' WHERE id=$1`, ['77777777-0000-0000-0000-00000000000d']);

      const initialStock = await stockOf(c);
      const r = await exec(c, `SELECT public.fail_razorpay_payment($1,$2) AS o`, [
        '77777777-0000-0000-0000-00000000000d', 'invalid_signature',
      ]);
      expect(r.rows[0].o.outcome).toBe('already_reconciliation');

      const o = await orderOf(c, '77777777-0000-0000-0000-00000000000d');
      expect(o.payment_status).toBe('requires_reconciliation');
      expect(o.payment_id).toBe('pay_rec_defensive');
      expect(o.status).toBe('pending');
      expect(o.stock_reserved).toBe(true); // stock_reserved unmutated
      expect(await stockOf(c)).toBe(initialStock); // no stock mutation or release
    });
  });

  it('does not double-release when confirmation holds the lock and cleanup runs concurrently', async ({ skip }) => {
    if (!available) return skip(skipReason);

    const confirmer = newClient();
    const cleaner = newClient();
    await confirmer.connect();
    await cleaner.connect();
    try {
      await resetStock(confirmer);
      await seedOrder(confirmer, 'eeeeeeee-0000-0000-0000-000000000005', { expired: true });

      // Confirmation locks the expired order and releases its stock once.
      await confirmer.query('BEGIN');
      const confirmed = await confirmer.query(`SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, [
        'eeeeeeee-0000-0000-0000-000000000005', 'pay_5', 10000, 'rzp_eeeeeeee',
      ]);
      expect(confirmed.rows[0].o.outcome).toBe('reconciliation');

      // Concurrent cleanup must SKIP LOCKED, so it neither blocks nor releases
      // the stock a second time.
      const cleaned = await cleaner.query(`SELECT public.cleanup_expired_stock_reservations() AS n`);
      await confirmer.query('COMMIT');

      expect(cleaned.rows[0].n).toBe(0);
      const o = await orderOf(cleaner, 'eeeeeeee-0000-0000-0000-000000000005');
      expect(o.payment_status).toBe('requires_reconciliation');
      expect(await stockOf(cleaner)).toBe(START_STOCK + 2); // released exactly once
    } finally {
      await confirmer.end();
      await cleaner.end();
    }
  });

  it('releases stock exactly once when cleanup wins the race and confirmation then blocks on the row lock', async ({ skip }) => {
    if (!available) return skip(skipReason);
    const cleaner = newClient();
    const confirmer = newClient();
    await cleaner.connect();
    await confirmer.connect();
    try {
      await resetStock(cleaner);
      await seedOrder(cleaner, 'ffffffff-0000-0000-0000-000000000006', { expired: true });

      // Cleanup locks the row, fails the order and releases stock, but stays
      // in an open transaction.
      await cleaner.query('BEGIN');
      const cleaned = await cleaner.query(`SELECT public.cleanup_expired_stock_reservations() AS n`);
      expect(cleaned.rows[0].n).toBe(1);

      // Confirmation starts and must wait on the row lock held by cleanup.
      const confirmPromise = confirmer.query(`SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, [
        'ffffffff-0000-0000-0000-000000000006', 'pay_6', 10000, 'rzp_ffffffff',
      ]);

      await new Promise((r) => setTimeout(r, 300)); // let the confirmation reach the lock
      await cleaner.query('COMMIT');

      const confirmed = await confirmPromise;
      // The reservation was already released, so this is a reconciliation, not
      // a second release.
      expect(confirmed.rows[0].o.outcome).toBe('reconciliation');
      expect(await stockOf(confirmer)).toBe(START_STOCK + 2); // released exactly once
      const o = await orderOf(confirmer, 'ffffffff-0000-0000-0000-000000000006');
      expect(o.payment_status).toBe('requires_reconciliation');
    } finally {
      await cleaner.end();
      await confirmer.end();
    }
  });

  it('stays paid with a single stock consumption under concurrent verification retries', async ({ skip }) => {
    if (!available) return skip(skipReason);
    const a = newClient();
    const b = newClient();
    await a.connect();
    await b.connect();
    try {
      await resetStock(a);
      await seedOrder(a, '11111111-0000-0000-0000-000000000007', { expired: false });

      const [ra, rb] = await Promise.all([
        a.query(`SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, ['11111111-0000-0000-0000-000000000007', 'pay_7', 10000, 'rzp_11111111']),
        b.query(`SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, ['11111111-0000-0000-0000-000000000007', 'pay_7', 10000, 'rzp_11111111']),
      ]);

      const outcomes = [ra.rows[0].o.outcome, rb.rows[0].o.outcome].sort();
      expect(outcomes).toEqual(['already_paid', 'confirmed']);
      const o = await orderOf(a, '11111111-0000-0000-0000-000000000007');
      expect(o.payment_status).toBe('paid');
      expect(await stockOf(a)).toBe(START_STOCK); // consumed exactly once
    } finally {
      await a.end();
      await b.end();
    }
  });

  it('marks a captured payment on an admin-cancelled order as not capturable', async ({ skip }) => {
    if (!available) return skip(skipReason);
    await withClient(async (c) => {
      await resetStock(c);
      await seedOrder(c, '22222222-0000-0000-0000-000000000008', { expired: false, stockReserved: false });
      await exec(c, `UPDATE public.orders SET status='cancelled' WHERE id=$1`, ['22222222-0000-0000-0000-000000000008']);
      const r = await exec(c, `SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, [
        '22222222-0000-0000-0000-000000000008', 'pay_8', 10000, 'rzp_22222222',
      ]);
      expect(r.rows[0].o.outcome).toBe('not_capturable');
    });
  });

  it('rejects a mismatched amount and a mismatched Razorpay order id', async ({ skip }) => {
    if (!available) return skip(skipReason);
    await withClient(async (c) => {
      await resetStock(c);
      await seedOrder(c, '33333333-0000-0000-0000-000000000009', { expired: false });
      const wrongAmount = await exec(c, `SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, [
        '33333333-0000-0000-0000-000000000009', 'pay_9', 1, 'rzp_33333333',
      ]);
      expect(wrongAmount.rows[0].o.outcome).toBe('amount_mismatch');
      const wrongOrder = await exec(c, `SELECT public.confirm_razorpay_payment($1,$2,$3,$4) AS o`, [
        '33333333-0000-0000-0000-000000000009', 'pay_9', 10000, 'rzp_wrong',
      ]);
      expect(wrongOrder.rows[0].o.outcome).toBe('order_mismatch');
      const o = await orderOf(c, '33333333-0000-0000-0000-000000000009');
      expect(o.payment_status).toBe('pending');
      expect(await stockOf(c)).toBe(START_STOCK);
    });
  });

  it('blocks an unauthorized caller from invoking the privileged transitions', async ({ skip }) => {
    if (!available) return skip(skipReason);
    await withClient(async (c) => {
      await resetStock(c);
      await seedOrder(c, '44444444-0000-0000-0000-00000000000a', { expired: true });

      await c.query('SET ROLE authenticated');
      await expect(c.query(`SELECT public.confirm_razorpay_payment($1,$2,$3,$4)`, [
        '44444444-0000-0000-0000-00000000000a', 'pay_a', 10000, 'rzp_44444444',
      ])).rejects.toMatchObject({ code: '42501' });
      await expect(c.query(`SELECT public.fail_razorpay_payment($1,$2)`, ['44444444-0000-0000-0000-00000000000a', 'x']))
        .rejects.toMatchObject({ code: '42501' });
      await expect(c.query(`SELECT public.cleanup_expired_stock_reservations()`))
        .rejects.toMatchObject({ code: '42501' });
      await c.query('RESET ROLE');
    });
  });

  it('blocks a client role from updating payment/reservation columns directly', async ({ skip }) => {
    if (!available) return skip(skipReason);
    await withClient(async (c) => {
      await resetStock(c);
      await seedOrder(c, '55555555-0000-0000-0000-00000000000b', { expired: false });

      await c.query('SET ROLE authenticated');
      await expect(c.query(`UPDATE public.orders SET payment_status='paid' WHERE id=$1`, ['55555555-0000-0000-0000-00000000000b']))
        .rejects.toMatchObject({ code: '42501' });
      await expect(c.query(`UPDATE public.orders SET stock_reserved=false WHERE id=$1`, ['55555555-0000-0000-0000-00000000000b']))
        .rejects.toMatchObject({ code: '42501' });
      // A non-payment column update is still permitted for admins.
      await c.query(`UPDATE public.orders SET status='shipped' WHERE id=$1`, ['55555555-0000-0000-0000-00000000000b']);
      await c.query('RESET ROLE');

      const o = await orderOf(c, '55555555-0000-0000-0000-00000000000b');
      expect(o.payment_status).toBe('pending');
      expect(o.stock_reserved).toBe(true);
      expect(o.status).toBe('shipped');
    });
  });
});
