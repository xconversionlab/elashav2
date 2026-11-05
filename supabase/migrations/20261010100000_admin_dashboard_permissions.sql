/*
# ELASHA admin dashboard permissions

Locks catalog and store-management writes to profiles explicitly marked as admins.
Public catalog reads and customer-owned order/design policies remain available.
Apply this migration in Supabase before using the admin dashboard.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles AS p WHERE p.id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Catalog: public read, admin-only writes.
DROP POLICY IF EXISTS "collections_insert" ON public.collections;
DROP POLICY IF EXISTS "collections_update" ON public.collections;
DROP POLICY IF EXISTS "collections_delete" ON public.collections;
CREATE POLICY "collections_insert_admin" ON public.collections
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "collections_update_admin" ON public.collections
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "collections_delete_admin" ON public.collections
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "products_delete_admin" ON public.products
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "variants_insert" ON public.product_variants;
DROP POLICY IF EXISTS "variants_update" ON public.product_variants;
DROP POLICY IF EXISTS "variants_delete" ON public.product_variants;
CREATE POLICY "variants_insert_admin" ON public.product_variants
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "variants_update_admin" ON public.product_variants
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "variants_delete_admin" ON public.product_variants
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "sizes_insert" ON public.sizes;
DROP POLICY IF EXISTS "sizes_update" ON public.sizes;
DROP POLICY IF EXISTS "sizes_delete" ON public.sizes;
CREATE POLICY "sizes_insert_admin" ON public.sizes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "sizes_update_admin" ON public.sizes
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "sizes_delete_admin" ON public.sizes
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "colours_insert" ON public.colours;
DROP POLICY IF EXISTS "colours_update" ON public.colours;
DROP POLICY IF EXISTS "colours_delete" ON public.colours;
CREATE POLICY "colours_insert_admin" ON public.colours
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "colours_update_admin" ON public.colours
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "colours_delete_admin" ON public.colours
  FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "garments_insert" ON public.garments;
DROP POLICY IF EXISTS "garments_update" ON public.garments;
DROP POLICY IF EXISTS "garments_delete" ON public.garments;
CREATE POLICY "garments_insert_admin" ON public.garments
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "garments_update_admin" ON public.garments
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "garments_delete_admin" ON public.garments
  FOR DELETE TO authenticated USING (public.is_admin());

-- Orders: only admins may change order status or order-level details.
DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Custom designs: customers may create/read their own; only admins may change review status/notes.
DROP POLICY IF EXISTS "custom_designs_update" ON public.custom_designs;
CREATE POLICY "custom_designs_update_admin" ON public.custom_designs
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Store settings: only admins can modify values.
DROP POLICY IF EXISTS "settings_insert" ON public.admin_settings;
DROP POLICY IF EXISTS "settings_update" ON public.admin_settings;
DROP POLICY IF EXISTS "settings_delete" ON public.admin_settings;
CREATE POLICY "settings_insert_admin" ON public.admin_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "settings_update_admin" ON public.admin_settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "settings_delete_admin" ON public.admin_settings
  FOR DELETE TO authenticated USING (public.is_admin());

-- Admins need to view customer profiles but do not need unrestricted profile writes
-- from this dashboard. Role changes should be granted deliberately by the owner.
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
