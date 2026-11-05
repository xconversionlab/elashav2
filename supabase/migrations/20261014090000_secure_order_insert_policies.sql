-- ELASHA order integrity: customers must not create orders or order items directly.
-- Trusted checkout functions validate prices, stock and Razorpay state before writing.
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_own" ON public.order_items;
 
-- Customers may submit their own design, but cannot self-approve it, attach
-- admin notes, or alter the base garment price stored with the request.
DROP POLICY IF EXISTS "custom_designs_insert" ON public.custom_designs;
DROP POLICY IF EXISTS "custom_designs_insert_own_pending" ON public.custom_designs;
CREATE POLICY "custom_designs_insert_own_pending" ON public.custom_designs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND admin_notes IS NULL
    AND garment_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.garments AS g
      WHERE g.id = garment_id
        AND g.is_active = true
        AND g.base_price = price
    )
  );
