/*
# Create Customer Reviews Table and RLS Policies

Creates public.reviews table with pending/approved moderation workflow.
*/

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews
DROP POLICY IF EXISTS "reviews_public_read_approved" ON public.reviews;
CREATE POLICY "reviews_public_read_approved" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

-- Admins can read all reviews
DROP POLICY IF EXISTS "reviews_admin_read_all" ON public.reviews;
CREATE POLICY "reviews_admin_read_all" ON public.reviews
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Customers / Users can insert reviews (must default to status = 'pending')
DROP POLICY IF EXISTS "reviews_insert_pending" ON public.reviews;
CREATE POLICY "reviews_insert_pending" ON public.reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Admins can update reviews (to approve / reject)
DROP POLICY IF EXISTS "reviews_admin_update" ON public.reviews;
CREATE POLICY "reviews_admin_update" ON public.reviews
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete reviews
DROP POLICY IF EXISTS "reviews_admin_delete" ON public.reviews;
CREATE POLICY "reviews_admin_delete" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.is_admin());
