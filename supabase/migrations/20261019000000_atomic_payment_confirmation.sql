-- Atomic payment confirmation, reservation expiry and stock release.
--
-- Problem this migration solves:
--   Payment verification previously read the order, checked expiry, released
--   stock and updated the order in *separate* operations. The expiry cleanup
--   job did the same in parallel. Two writers could therefore both release the
--   same reserved stock, or a paid order could be downgraded to failed by a
--   cleanup that ran a moment later.
--
-- Design:
--   * public.confirm_razorpay_payment() is the single authoritative transition
--     for a captured payment. It locks the order row (FOR UPDATE) and decides
--     the winning transition inside the database.
--   * public.fail_razorpay_payment() is the single transition for a rejected
--     signature.
--   * Reserved stock is released by exactly one mechanism: the
--     orders_release_reserved_stock trigger, which fires when an order flips
--     stock_reserved true -> false and is *not* being confirmed as paid. Every
--     release path therefore goes through the same guarded, row-locked update.
--   * orders_guard_state_transition makes payment_status = 'paid' terminal and
--     restricts payment/reservation columns to the trusted server-side
--     transition, so no retry, cleanup or client update can corrupt them.

-- ---------------------------------------------------------------------------
-- 1. Exactly-once stock release, driven by the stock_reserved transition
-- ---------------------------------------------------------------------------
-- Any path that clears stock_reserved releases the physical stock here, in the
-- same transaction and under the caller's order-row lock. A confirmed payment
-- keeps the stock consumed, so the paid transition never releases.
CREATE OR REPLACE FUNCTION public.fn_orders_release_reserved_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  IF OLD.stock_reserved IS TRUE
     AND NEW.stock_reserved IS FALSE
     AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
    FOR v_item IN
      SELECT variant_id, quantity
      FROM public.order_items
      WHERE order_id = NEW.id AND variant_id IS NOT NULL
    LOOP
      UPDATE public.product_variants
      SET stock = stock + v_item.quantity
      WHERE id = v_item.variant_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_release_reserved_stock ON public.orders;
CREATE TRIGGER orders_release_reserved_stock
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_orders_release_reserved_stock();

-- ---------------------------------------------------------------------------
-- 2. Guarded state transitions
-- ---------------------------------------------------------------------------
-- (a) paid is terminal: a legitimately paid order must never be downgraded to
--     failed, cancelled, pending or requires_reconciliation by a retry, the
--     expiry cleanup job, or any other path. A refund is the only permitted
--     move away from paid.
-- (b) payment/reservation columns (payment_status, payment_id,
--     razorpay_order_id, stock_reserved, reservation_expires_at) may only be
--     changed by the trusted server-side transition. The base schema's
--     `orders_update` policy is permissive, so without this a signed-in client
--     could mark its own order paid or release reserved stock directly.
-- SECURITY INVOKER on purpose: the guard must see the role that is actually
-- issuing the UPDATE. A SECURITY DEFINER trigger would report the function
-- owner (postgres) as current_user and could never block a client update.
CREATE OR REPLACE FUNCTION public.fn_orders_guard_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_payment_cols_changed boolean;
  v_trusted boolean;
BEGIN
  IF OLD.payment_status = 'paid'
     AND NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NEW.payment_status <> 'refunded' THEN
    RAISE EXCEPTION
      'payment_status % cannot be changed away from paid to % (order %)',
      OLD.payment_status, NEW.payment_status, NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  v_payment_cols_changed :=
    NEW.payment_status IS DISTINCT FROM OLD.payment_status
    OR NEW.payment_id IS DISTINCT FROM OLD.payment_id
    OR NEW.razorpay_order_id IS DISTINCT FROM OLD.razorpay_order_id
    OR NEW.stock_reserved IS DISTINCT FROM OLD.stock_reserved
    OR NEW.reservation_expires_at IS DISTINCT FROM OLD.reservation_expires_at;

  IF v_payment_cols_changed THEN
    v_trusted :=
      coalesce(current_setting('elasha.payment_transition', true), '') = 'on'
      OR current_user IN ('postgres', 'supabase_admin', 'service_role');

    IF NOT v_trusted THEN
      RAISE EXCEPTION
        'payment and reservation fields may only be changed by the server-side payment handler (order %)',
        NEW.id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_state_transition ON public.orders;
CREATE TRIGGER orders_guard_state_transition
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_orders_guard_state_transition();

-- ---------------------------------------------------------------------------
-- 3. Authoritative captured-payment transition
-- ---------------------------------------------------------------------------
-- Called by the verify-razorpay-payment Edge Function only after the Razorpay
-- signature and the server-side payment lookup have both confirmed a captured
-- payment. The database still decides the transition:
--   confirmed             -> unexpired reservation, stock stays consumed
--   reconciliation        -> captured but reservation expired/already released
--   already_paid          -> idempotent retry on a paid order
--   already_reconciliation-> idempotent retry on a reconciled order
--   payment_mismatch      -> a different payment id is already recorded
--   order_mismatch        -> razorpay_order_id does not match the stored order
--   amount_mismatch       -> amount/currency does not match the stored total
--   not_capturable        -> order is refunded
--   not_found             -> unknown order id
CREATE OR REPLACE FUNCTION public.confirm_razorpay_payment(
  p_order_id uuid,
  p_payment_id text,
  p_amount_paise int DEFAULT NULL,
  p_razorpay_order_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_outcome text;
  v_reservation_valid boolean;
BEGIN
  PERFORM set_config('elasha.payment_transition', 'on', true);

  -- Row lock serialises this transition against expiry cleanup and concurrent
  -- verification retries for the same order.
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  IF p_razorpay_order_id IS NOT NULL
     AND v_order.razorpay_order_id IS DISTINCT FROM p_razorpay_order_id THEN
    RETURN jsonb_build_object('outcome', 'order_mismatch');
  END IF;

  IF p_amount_paise IS NOT NULL
     AND p_amount_paise <> round(v_order.total * 100)::int THEN
    RETURN jsonb_build_object('outcome', 'amount_mismatch');
  END IF;

  IF v_order.payment_status = 'paid' THEN
    IF v_order.payment_id IS NOT NULL AND v_order.payment_id <> p_payment_id THEN
      RETURN jsonb_build_object('outcome', 'payment_mismatch');
    END IF;
    RETURN jsonb_build_object('outcome', 'already_paid');
  END IF;

  IF v_order.payment_status = 'requires_reconciliation' THEN
    IF v_order.payment_id IS NOT NULL AND v_order.payment_id <> p_payment_id THEN
      RETURN jsonb_build_object('outcome', 'payment_mismatch');
    END IF;
    RETURN jsonb_build_object('outcome', 'already_reconciliation');
  END IF;

  IF v_order.payment_status = 'refunded' THEN
    RETURN jsonb_build_object('outcome', 'not_capturable');
  END IF;

  -- Admin cancelled an unpaid order (cleanup sets payment_status = 'failed',
  -- which is handled above as a reconciliation case).
  IF v_order.status = 'cancelled' AND v_order.payment_status = 'pending' THEN
    RETURN jsonb_build_object('outcome', 'not_capturable');
  END IF;

  v_reservation_valid :=
    v_order.stock_reserved IS TRUE
    AND v_order.reservation_expires_at IS NOT NULL
    AND v_order.reservation_expires_at > now();

  IF v_reservation_valid THEN
    -- Valid reservation: consume the stock and confirm the order.
    UPDATE public.orders
    SET payment_status = 'paid',
        status = 'processing',
        payment_id = p_payment_id,
        stock_reserved = false,
        updated_at = now()
    WHERE id = p_order_id;

    v_outcome := 'confirmed';
  ELSE
    -- Reservation expired, or the stock was already released by cleanup. If the
    -- order still claims to hold stock, the release trigger releases it exactly
    -- once as part of this same update; otherwise nothing is released again.
    UPDATE public.orders
    SET payment_status = 'requires_reconciliation',
        payment_id = p_payment_id,
        stock_reserved = false,
        updated_at = now()
    WHERE id = p_order_id;

    v_outcome := 'reconciliation';
  END IF;

  RETURN jsonb_build_object('outcome', v_outcome);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Authoritative rejected-payment transition
-- ---------------------------------------------------------------------------
-- Used when the Razorpay signature does not verify. Never downgrades a paid
-- or reconciled order; releases any still-held reservation exactly once via
-- the trigger.
CREATE OR REPLACE FUNCTION public.fail_razorpay_payment(
  p_order_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  PERFORM set_config('elasha.payment_transition', 'on', true);

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('outcome', 'already_paid');
  END IF;

  IF v_order.payment_status = 'requires_reconciliation' THEN
    RETURN jsonb_build_object('outcome', 'already_reconciliation');
  END IF;

  IF v_order.payment_status IN ('failed', 'cancelled', 'refunded') THEN
    RETURN jsonb_build_object('outcome', 'already_terminal');
  END IF;

  UPDATE public.orders
  SET payment_status = 'failed',
      status = 'cancelled',
      stock_reserved = false,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('outcome', 'failed', 'reason', p_reason);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Expiry cleanup now uses the same trigger-driven, exactly-once release
-- ---------------------------------------------------------------------------
-- Replaces the previous implementation, which released stock with a manual
-- per-item loop that could race the payment handler.
CREATE OR REPLACE FUNCTION public.cleanup_expired_stock_reservations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_count int := 0;
BEGIN
  PERFORM set_config('elasha.payment_transition', 'on', true);

  FOR v_order IN
    SELECT id FROM public.orders
    WHERE stock_reserved = true
      AND payment_status = 'pending'
      AND reservation_expires_at IS NOT NULL
      AND reservation_expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Guarded transition: only a still-pending, still-reserved order is failed.
    -- The stock release happens inside the release trigger, exactly once, and
    -- a concurrently confirmed paid order is skipped by the guard + row lock.
    UPDATE public.orders
    SET stock_reserved = false,
        payment_status = 'failed',
        status = 'cancelled',
        updated_at = now()
    WHERE id = v_order.id
      AND stock_reserved = true
      AND payment_status = 'pending';

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Least-privilege execution
-- ---------------------------------------------------------------------------
-- Only the trusted server-side role may drive these transitions. Clients and
-- anonymous callers must never reach them.
REVOKE EXECUTE ON FUNCTION public.confirm_razorpay_payment(uuid, text, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_razorpay_payment(uuid, text, int, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.fail_razorpay_payment(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_razorpay_payment(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_stock_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_stock_reservations() TO service_role;

REVOKE EXECUTE ON FUNCTION public.fn_orders_release_reserved_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_orders_guard_state_transition() FROM PUBLIC, anon, authenticated;
