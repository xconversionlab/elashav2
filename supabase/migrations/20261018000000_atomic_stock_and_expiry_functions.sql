-- Atomic stock reservation helper
CREATE OR REPLACE FUNCTION public.reserve_variant_stock(p_variant_id uuid, p_quantity int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.product_variants
  SET stock = stock - p_quantity
  WHERE id = p_variant_id AND stock >= p_quantity;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Atomic stock release helper
CREATE OR REPLACE FUNCTION public.release_variant_stock(p_variant_id uuid, p_quantity int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_quantity <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.product_variants
  SET stock = stock + p_quantity
  WHERE id = p_variant_id;
END;
$$;

-- Automatic cleanup of expired stock reservations with exactly-once stock release guarantee
CREATE OR REPLACE FUNCTION public.cleanup_expired_stock_reservations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_count int := 0;
BEGIN
  FOR v_order IN
    SELECT id FROM public.orders
    WHERE stock_reserved = true
      AND payment_status = 'pending'
      AND reservation_expires_at IS NOT NULL
      AND reservation_expires_at < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Atomically update status and check if row was updated to ensure stock is released at most once
    UPDATE public.orders
    SET stock_reserved = false,
        payment_status = 'failed',
        status = 'cancelled',
        updated_at = NOW()
    WHERE id = v_order.id
      AND stock_reserved = true
      AND payment_status = 'pending';

    IF FOUND THEN
      FOR v_item IN
        SELECT variant_id, quantity FROM public.order_items WHERE order_id = v_order.id AND variant_id IS NOT NULL
      LOOP
        UPDATE public.product_variants
        SET stock = stock + v_item.quantity
        WHERE id = v_item.variant_id;
      END LOOP;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Table for tracking orphaned or failed storage file deletions for reconciliation
CREATE TABLE IF NOT EXISTS public.storage_cleanup_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  object_path text NOT NULL,
  reason text,
  attempt_count int DEFAULT 1,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.storage_cleanup_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_cleanup_failures_admin_all" ON public.storage_cleanup_failures;
CREATE POLICY "storage_cleanup_failures_admin_all" ON public.storage_cleanup_failures
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Execution permissions: ONLY service_role (and postgres) can invoke stock RPCs.
-- Authenticated users (customers) and anon are strictly REVOKED to prevent direct inventory manipulation.
REVOKE EXECUTE ON FUNCTION public.reserve_variant_stock(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_variant_stock(uuid, int) TO service_role;

REVOKE EXECUTE ON FUNCTION public.release_variant_stock(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_variant_stock(uuid, int) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_stock_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_stock_reservations() TO service_role;

-- Idempotent, verifiable cron scheduling without silent exception swallowing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) OR EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-stock-reservations') THEN
      PERFORM cron.unschedule('cleanup-expired-stock-reservations');
    END IF;
    PERFORM cron.schedule('cleanup-expired-stock-reservations', '*/5 * * * *', 'SELECT public.cleanup_expired_stock_reservations()');
    RAISE NOTICE 'Scheduled cleanup job cleanup-expired-stock-reservations successfully.';
  ELSE
    RAISE NOTICE 'pg_cron extension is not available in this PostgreSQL environment.';
  END IF;
END $$;
