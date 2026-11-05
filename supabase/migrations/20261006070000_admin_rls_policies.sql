/*
# ELASHA Admin Access Policies

The dashboard currently has no database-level notion of an administrator. Every
table is scoped to the signed-in owner, so an admin can only see their own orders,
custom designs and profile. This migration makes the admin dashboard see store-wide
data without weakening customer isolation.

Apply with the Supabase SQL editor or `supabase db push` (needs elevated access).

## What it does

1. Adds `profiles.is_admin` (default false).
2. Adds a `SECURITY DEFINER` helper `public.is_admin()` that reads the flag without
   triggering recursive RLS on `profiles`.
3. Adds permissive SELECT policies so admins can read every order, order item,
   custom design and profile. Customer owner-scoped policies are left untouched.

## Granting admin

    UPDATE public.profiles SET is_admin = true WHERE id = '<auth-user-uuid>';
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Admins read every order.
DROP POLICY IF EXISTS "orders_select_admin" ON orders;
CREATE POLICY "orders_select_admin" ON orders
  FOR SELECT TO authenticated USING (public.is_admin());

-- Admins read every order item.
DROP POLICY IF EXISTS "order_items_select_admin" ON order_items;
CREATE POLICY "order_items_select_admin" ON order_items
  FOR SELECT TO authenticated USING (public.is_admin());

-- Admins read every custom design (design review queue).
DROP POLICY IF EXISTS "custom_designs_select_admin" ON custom_designs;
CREATE POLICY "custom_designs_select_admin" ON custom_designs
  FOR SELECT TO authenticated USING (public.is_admin());

-- Admins read every customer profile.
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT TO authenticated USING (public.is_admin());

-- Prevent self-promotion. The owner-scoped UPDATE policy has no column
-- restriction, so without this a user could set their own is_admin flag.
-- RLS policies are OR'd, so the older permissive "profiles_update" policy has to
-- be dropped explicitly — otherwise it would still grant every user UPDATE on
-- their own row and the checks below would be bypassed.
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id AND NOT public.is_admin())
  WITH CHECK (
    auth.uid() = id
    AND NOT public.is_admin()
    AND is_admin = false
  );

DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
