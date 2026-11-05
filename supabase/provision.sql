-- ===== supabase/migrations/20261006052657_create_elasha_schema.sql =====
/*
# ELASHA Artware & Apparel — Full Schema

Creates the complete data model for the ELASHA storefront + admin dashboard + custom design tool.

## New Tables

1. `collections` — Product groupings
2. `products` — Individual products within collections
3. `product_variants` — Size + colour combinations with stock
4. `sizes` — Reference table of garment sizes
5. `colours` — Reference table of garment colours with hex values
6. `garments` — Garment types for custom design tool
7. `orders` — Customer orders with status tracking
8. `order_items` — Line items within an order
9. `custom_designs` — Custom artwork designs submitted by customers
10. `wishlists` — Per-customer wishlist
11. `profiles` — Customer profile data linked to auth.users
12. `admin_settings` — Key-value store for admin settings

## Security

- RLS enabled on every table.
- Public tables (collections, products, variants, sizes, colours, garments, admin_settings): public read, authenticated write.
- Owner-scoped tables (orders, order_items, custom_designs, wishlists, profiles): authenticated, auth.uid() = user_id.
*/

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  hero_image text,
  sort_order int DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sizes reference
CREATE TABLE IF NOT EXISTS sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text UNIQUE NOT NULL,
  sort_order int DEFAULT 0
);

-- Colours reference
CREATE TABLE IF NOT EXISTS colours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  hex text NOT NULL,
  sort_order int DEFAULT 0
);

-- Garments reference (for custom design tool)
CREATE TABLE IF NOT EXISTS garments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  placeholder_image text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  garment_type text,
  placeholder_image text,
  is_published boolean DEFAULT true,
  is_customizable boolean DEFAULT false,
  featured boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product variants (size + colour combinations)
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_id uuid NOT NULL REFERENCES sizes(id),
  colour_id uuid NOT NULL REFERENCES colours(id),
  sku text UNIQUE,
  stock int NOT NULL DEFAULT 0,
  price_override numeric(10,2),
  created_at timestamptz DEFAULT now()
);

-- Custom designs
CREATE TABLE IF NOT EXISTS custom_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  garment_id uuid REFERENCES garments(id),
  garment_name text,
  colour_name text,
  size_label text,
  artwork_url text NOT NULL,
  artwork_name text,
  transform jsonb DEFAULT '{"x":0.5,"y":0.4,"scale":1,"rotation":0}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','in_review')),
  admin_notes text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  total numeric(10,2) NOT NULL DEFAULT 0,
  shipping_address jsonb,
  customer_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  custom_design_id uuid REFERENCES custom_designs(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  size_label text,
  colour_name text,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  artwork_url text
);

-- Wishlists
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin settings
CREATE TABLE IF NOT EXISTS admin_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_custom_designs_user ON custom_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_designs_status ON custom_designs(status);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);

-- ============ RLS ============
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colours ENABLE ROW LEVEL SECURITY;
ALTER TABLE garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============

-- Collections: public read, authenticated write
DROP POLICY IF EXISTS "collections_select" ON collections;
CREATE POLICY "collections_select" ON collections FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "collections_insert" ON collections;
CREATE POLICY "collections_insert" ON collections FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "collections_update" ON collections;
CREATE POLICY "collections_update" ON collections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "collections_delete" ON collections;
CREATE POLICY "collections_delete" ON collections FOR DELETE TO authenticated USING (true);

-- Products: public read, authenticated write
DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "products_delete" ON products;
CREATE POLICY "products_delete" ON products FOR DELETE TO authenticated USING (true);

-- Product variants: public read, authenticated write
DROP POLICY IF EXISTS "variants_select" ON product_variants;
CREATE POLICY "variants_select" ON product_variants FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "variants_insert" ON product_variants;
CREATE POLICY "variants_insert" ON product_variants FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "variants_update" ON product_variants;
CREATE POLICY "variants_update" ON product_variants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "variants_delete" ON product_variants;
CREATE POLICY "variants_delete" ON product_variants FOR DELETE TO authenticated USING (true);

-- Sizes: public read, authenticated write
DROP POLICY IF EXISTS "sizes_select" ON sizes;
CREATE POLICY "sizes_select" ON sizes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sizes_insert" ON sizes;
CREATE POLICY "sizes_insert" ON sizes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sizes_update" ON sizes;
CREATE POLICY "sizes_update" ON sizes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sizes_delete" ON sizes;
CREATE POLICY "sizes_delete" ON sizes FOR DELETE TO authenticated USING (true);

-- Colours: public read, authenticated write
DROP POLICY IF EXISTS "colours_select" ON colours;
CREATE POLICY "colours_select" ON colours FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "colours_insert" ON colours;
CREATE POLICY "colours_insert" ON colours FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "colours_update" ON colours;
CREATE POLICY "colours_update" ON colours FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "colours_delete" ON colours;
CREATE POLICY "colours_delete" ON colours FOR DELETE TO authenticated USING (true);

-- Garments: public read, authenticated write
DROP POLICY IF EXISTS "garments_select" ON garments;
CREATE POLICY "garments_select" ON garments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "garments_insert" ON garments;
CREATE POLICY "garments_insert" ON garments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "garments_update" ON garments;
CREATE POLICY "garments_update" ON garments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "garments_delete" ON garments;
CREATE POLICY "garments_delete" ON garments FOR DELETE TO authenticated USING (true);

-- Orders: owner-scoped (but admin can update status)
DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "orders_insert" ON orders;
CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Order items: owner-scoped via order
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- Custom designs: owner-scoped (admin can update status)
DROP POLICY IF EXISTS "custom_designs_select" ON custom_designs;
CREATE POLICY "custom_designs_select" ON custom_designs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "custom_designs_insert" ON custom_designs;
CREATE POLICY "custom_designs_insert" ON custom_designs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "custom_designs_update" ON custom_designs;
CREATE POLICY "custom_designs_update" ON custom_designs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Wishlists: owner-scoped
DROP POLICY IF EXISTS "wishlists_select" ON wishlists;
CREATE POLICY "wishlists_select" ON wishlists FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wishlists_insert" ON wishlists;
CREATE POLICY "wishlists_insert" ON wishlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "wishlists_delete" ON wishlists;
CREATE POLICY "wishlists_delete" ON wishlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Profiles: owner-scoped
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin settings: public read, authenticated write
DROP POLICY IF EXISTS "settings_select" ON admin_settings;
CREATE POLICY "settings_select" ON admin_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "settings_insert" ON admin_settings;
CREATE POLICY "settings_insert" ON admin_settings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "settings_update" ON admin_settings;
CREATE POLICY "settings_update" ON admin_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ===== supabase/migrations/20261006052737_seed_elasha_data.sql =====
/*
# ELASHA Seed Data

Populates reference tables and initial catalog data.

1. Sizes: S, M, L, XL, XXL
2. Colours: Black, White, Grey, Navy, Olive, Cream
3. Garments: Tee, Long Sleeve, Hoodie, Zip Hoodie, Camp Shirt, Pants, Dress, Tote, Cap
4. Collections: Collision, Rust Mark, Void, Residual, Signal, Frequency, Fluid, Escape, Studio
5. Products: 18 products across collections with placeholder images
6. Admin settings: store_name
*/

-- Sizes
INSERT INTO sizes (label, sort_order) VALUES
  ('S', 1), ('M', 2), ('L', 3), ('XL', 4), ('XXL', 5)
ON CONFLICT (label) DO NOTHING;

-- Colours
INSERT INTO colours (name, hex, sort_order) VALUES
  ('Black', '#1a1a1a', 1),
  ('White', '#f5f5f0', 2),
  ('Grey', '#8a8a8a', 3),
  ('Navy', '#1e2a3a', 4),
  ('Olive', '#5a5e3a', 5),
  ('Cream', '#e8e0d0', 6)
ON CONFLICT (name) DO NOTHING;

-- Garments
INSERT INTO garments (name, slug, base_price, placeholder_image, sort_order) VALUES
  ('T-Shirt', 'tee', 45.00, '/placeholders/blank-tee-a.svg', 1),
  ('Long Sleeve', 'longsleeve', 55.00, '/placeholders/longsleeve-a.svg', 2),
  ('Hoodie', 'hoodie', 85.00, '/placeholders/studio-hoodie-a.svg', 3),
  ('Zip Hoodie', 'zip-hoodie', 90.00, '/placeholders/zip-hoodie-a.svg', 4),
  ('Camp Shirt', 'camp-shirt', 65.00, '/placeholders/camp-shirt-a.svg', 5),
  ('Pants', 'pants', 95.00, '/placeholders/pants-a.svg', 6),
  ('Dress', 'dress', 110.00, '/placeholders/fluid-dress-a.svg', 7),
  ('Tote Bag', 'tote', 35.00, '/placeholders/tote-a.svg', 8),
  ('Cap', 'cap', 40.00, '/placeholders/cap-a.svg', 9)
ON CONFLICT (slug) DO NOTHING;

-- Collections
INSERT INTO collections (name, slug, description, sort_order) VALUES
  ('Collision', 'collision', 'Where opposing forces meet. Graphic tees exploring friction and impact.', 1),
  ('Rust Mark', 'rust-mark', 'Decay as design. Pieces that embrace imperfection and patina.', 2),
  ('Void', 'void', 'Negative space as statement. Minimalist garments for maximum presence.', 3),
  ('Residual', 'residual', 'What remains after the process. Textured pieces with raw edge.', 4),
  ('Signal', 'signal', 'Communication through cloth. Bold graphics that transmit intent.', 5),
  ('Frequency', 'frequency', 'Oscillating patterns and rhythmic repetition in wearable form.', 6),
  ('Fluid', 'fluid', 'Form follows flow. Draped silhouettes that move with you.', 7),
  ('Escape', 'escape', 'Garments for the departure. Utility pieces for the journey outward.', 8),
  ('Studio', 'studio', 'The workshop wardrobe. Clean essentials for the creative space.', 9)
ON CONFLICT (slug) DO NOTHING;

-- Products (with placeholder images matching the original project)
INSERT INTO products (collection_id, name, slug, description, price, garment_type, placeholder_image, sort_order, featured)
SELECT c.id, p.name, p.slug, p.description, p.price, p.garment_type, p.image, p.sort_order, p.featured
FROM (VALUES
  -- Collision collection
  ('collision', 'Collision Tee — Impact', 'collision-tee-impact', 'Heavyweight tee with collision impact graphic on front and back.', 55.00, 'T-Shirt', '/placeholders/collision-a.svg', 1, true),
  ('collision', 'Collision Tee — Aftermath', 'collision-tee-aftermath', 'Aftermath variant with offset print and distressed collar.', 55.00, 'T-Shirt', '/placeholders/collision-b.svg', 2, false),
  -- Rust Mark
  ('rust-mark', 'Rust Mark Tee — Patina', 'rust-mark-tee-patina', 'Garment-dyed tee with rust mark print that ages with wear.', 58.00, 'T-Shirt', '/placeholders/rust-mark-a.svg', 3, true),
  ('rust-mark', 'Rust Mark Long Sleeve — Oxide', 'rust-mark-ls-oxide', 'Long sleeve with oxide gradient print and raw hem.', 68.00, 'Long Sleeve', '/placeholders/rust-mark-b.svg', 4, false),
  -- Void
  ('void', 'Void Tee — Absence', 'void-tee-absence', 'Minimalist tee with void graphic. Black on black with subtle texture.', 50.00, 'T-Shirt', '/placeholders/void-tee-a.svg', 5, false),
  ('void', 'Void Tee — Null', 'void-tee-null', 'Null variant with inverted colorway and ghost print.', 50.00, 'T-Shirt', '/placeholders/void-tee-b.svg', 6, false),
  -- Residual
  ('residual', 'Residual Tee — Trace', 'residual-tee-trace', 'Trace elements of process visible in the final piece.', 52.00, 'T-Shirt', '/placeholders/residual-a.svg', 7, false),
  ('residual', 'Residual Long Sleeve — Remnant', 'residual-ls-remnant', 'Remnant print with leftover marks from the studio floor.', 62.00, 'Long Sleeve', '/placeholders/residual-b.svg', 8, false),
  -- Signal
  ('signal', 'Signal Shirt — Transmit', 'signal-shirt-transmit', 'Camp collar shirt with signal pattern and open weave.', 75.00, 'Camp Shirt', '/placeholders/signal-shirt-a.svg', 9, true),
  ('signal', 'Signal Shirt — Receive', 'signal-shirt-receive', 'Receive variant with mirrored pattern and contrast piping.', 75.00, 'Camp Shirt', '/placeholders/signal-shirt-b.svg', 10, false),
  -- Frequency
  ('frequency', 'Frequency Tee — Wave', 'frequency-tee-wave', 'Oscillating wave pattern printed on organic cotton tee.', 52.00, 'T-Shirt', '/placeholders/frequency-a.svg', 11, false),
  ('frequency', 'Frequency Tee — Pulse', 'frequency-tee-pulse', 'Pulse variant with heartbeat rhythm print and tonal gradient.', 52.00, 'T-Shirt', '/placeholders/frequency-b.svg', 12, false),
  -- Fluid
  ('fluid', 'Fluid Dress — Flow', 'fluid-dress-flow', 'Draped midi dress in fluid jersey with abstract print.', 125.00, 'Dress', '/placeholders/fluid-dress-a.svg', 13, true),
  ('fluid', 'Fluid Dress — Current', 'fluid-dress-current', 'Current variant with asymmetric drape and tonal shift.', 125.00, 'Dress', '/placeholders/fluid-dress-b.svg', 14, false),
  -- Escape
  ('escape', 'Escape Hoodie — Departure', 'escape-hoodie-departure', 'Heavyweight escape hoodie with departure coordinates print.', 95.00, 'Hoodie', '/placeholders/escape-hoodie-a.svg', 15, true),
  ('escape', 'Escape Hoodie — Return', 'escape-hoodie-return', 'Return variant with inverted colorway and hidden pocket.', 95.00, 'Hoodie', '/placeholders/escape-hoodie-b.svg', 16, false),
  ('escape', 'Escape Tee — North', 'escape-tee-north', 'Escape tee with directional graphic and reflective ink.', 55.00, 'T-Shirt', '/placeholders/escape-tee-a.svg', 17, false),
  ('escape', 'Escape Tee — South', 'escape-tee-south', 'South variant with compass rose and weathered finish.', 55.00, 'T-Shirt', '/placeholders/escape-tee-b.svg', 18, false),
  -- Studio
  ('studio', 'Studio Hoodie — Workshop', 'studio-hoodie-workshop', 'Clean studio hoodie in heavyweight fleece. The workshop essential.', 88.00, 'Hoodie', '/placeholders/studio-hoodie-a.svg', 19, true),
  ('studio', 'Studio Hoodie — Atelier', 'studio-hoodie-atelier', 'Atelier variant with tonal embroidery and brushed interior.', 88.00, 'Hoodie', '/placeholders/studio-hoodie-b.svg', 20, false),
  ('studio', 'Studio Tote — Carryall', 'studio-tote-carryall', 'Heavyweight canvas tote with studio mark print.', 38.00, 'Tote Bag', '/placeholders/tote-a.svg', 21, false),
  ('studio', 'Studio Tote — Utility', 'studio-tote-utility', 'Utility variant with reinforced base and interior pocket.', 38.00, 'Tote Bag', '/placeholders/tote-b.svg', 22, false),
  ('studio', 'Studio Cap — Emblem', 'studio-cap-emblem', 'Six-panel cap with embroidered studio emblem.', 42.00, 'Cap', '/placeholders/cap-a.svg', 23, false),
  ('studio', 'Studio Cap — Mark', 'studio-cap-mark', 'Mark variant with woven label and contrast brim.', 42.00, 'Cap', '/placeholders/cap-b.svg', 24, false),
  ('studio', 'Studio Pants — Workshop', 'studio-pants-workshop', 'Relaxed workshop pants in heavyweight twill.', 98.00, 'Pants', '/placeholders/pants-a.svg', 25, false),
  ('studio', 'Studio Pants — Cargo', 'studio-pants-cargo', 'Cargo variant with utility pockets and tapered leg.', 98.00, 'Pants', '/placeholders/pants-b.svg', 26, false),
  ('studio', 'Studio LS — Layer', 'studio-ls-layer', 'Layering long sleeve in midweight cotton with studio mark.', 58.00, 'Long Sleeve', '/placeholders/longsleeve-a.svg', 27, false),
  ('studio', 'Studio LS — Base', 'studio-ls-base', 'Base variant with clean finish and ribbed cuff.', 58.00, 'Long Sleeve', '/placeholders/longsleeve-b.svg', 28, false)
) AS p(collection_slug, name, slug, description, price, garment_type, image, sort_order, featured)
JOIN collections c ON c.slug = p.collection_slug
ON CONFLICT (slug) DO NOTHING;

-- Admin settings
INSERT INTO admin_settings (key, value) VALUES
  ('store_name', 'ELASHA'),
  ('store_tagline', 'Artware & Apparel')
ON CONFLICT (key) DO NOTHING;

-- ===== supabase/migrations/20261006052800_seed_product_variants.sql =====
/*
# ELASHA Product Variants

Generates the size x colour variant (and stock) rows for every seeded product.

The base seed creates 28 products plus the 5 sizes and 6 colours reference rows,
but no `product_variants`. Without variants the product page has no size/colour
selectors, "Add to Cart" stays disabled and the inventory dashboard is empty.
This migration fills that gap: 28 x 5 x 6 = 840 variants.

Stock is deterministic (derived from a hash of the product/size/colour) so the
data is stable across runs; roughly one in twenty variants is left out of stock.

Idempotent: `ON CONFLICT (sku) DO NOTHING` makes a re-run a no-op.
*/

INSERT INTO product_variants (product_id, size_id, colour_id, sku, stock)
SELECT
  p.id,
  s.id,
  c.id,
  p.slug || '-' || lower(s.label) || '-' || lower(c.name),
  CASE WHEN abs(hashtext(p.slug || s.label || c.name)) % 20 = 0
       THEN 0
       ELSE 25 + (abs(hashtext(p.slug || s.label || c.name)) % 50)
  END
FROM products p
CROSS JOIN sizes s
CROSS JOIN colours c
ON CONFLICT (sku) DO NOTHING;

-- ===== supabase/migrations/20261006053000_profile_on_signup.sql =====
/*
# ELASHA Profile On Signup

Creates a `profiles` row for every new auth user.

Nothing populated `profiles` before: the client insert in `signUp` only works
when a session is returned, which is not the case while email confirmation is
enabled. Without a profile row, the account page and admin customer list have no
name for the user.

The trigger runs as the function owner (SECURITY DEFINER) so it can write to
`profiles` regardless of the caller's RLS context.

Idempotent: `ON CONFLICT (id) DO NOTHING` and `DROP TRIGGER IF EXISTS`.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== supabase/migrations/20261006060000_storage_artwork_bucket.sql =====
/*
# ELASHA Artwork Storage Bucket

Enables custom-design artwork uploads for the `artwork` bucket.

The bucket exists in the project but has no `storage.objects` policies, so every
authenticated upload is rejected with "new row violates row-level security policy".
The client falls back to an inline compressed image when upload fails, but applying
this migration restores the intended Supabase Storage path.

Apply with the Supabase SQL editor or `supabase db push` (needs elevated access).
*/

-- Public bucket so artwork URLs render in the storefront and admin review.
-- Limits mirror the client validation in src/lib/artwork.ts (PNG/JPG, max 25 MB).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('artwork', 'artwork', true, 26214400, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 26214400,
      allowed_mime_types = ARRAY['image/png', 'image/jpeg'];

-- Anyone can view artwork (public bucket read).
DROP POLICY IF EXISTS "artwork_read" ON storage.objects;
CREATE POLICY "artwork_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'artwork');

-- Customers may upload artwork into their own folder: <user_id>/<file>.
DROP POLICY IF EXISTS "artwork_insert_own" ON storage.objects;
CREATE POLICY "artwork_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artwork'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Customers may replace or remove their own artwork.
DROP POLICY IF EXISTS "artwork_update_own" ON storage.objects;
CREATE POLICY "artwork_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'artwork' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'artwork' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "artwork_delete_own" ON storage.objects;
CREATE POLICY "artwork_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'artwork' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ===== supabase/migrations/20261006070000_admin_rls_policies.sql =====
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

-- ===== supabase/migrations/20261009090000_refine_premium_collection_copy.sql =====
-- Replace theme-led collection descriptions with premium fashion positioning.
-- This migration updates existing Supabase collection rows as well as future catalog reads.
UPDATE collections
SET description = CASE slug
  WHEN 'collision' THEN 'Contrast-led graphics and considered placements bring a confident edge to everyday staples.'
  WHEN 'rust-mark' THEN 'Rich tonal finishes and textured details lend each piece a distinctive, lived-in character.'
  WHEN 'void' THEN 'Clean lines and quiet detailing create modern essentials with a confident, understated presence.'
  WHEN 'residual' THEN 'Textural finishes and subtle graphic details give these pieces a considered, individual character.'
  WHEN 'signal' THEN 'Bold graphic placement and considered color balance make a clear, confident statement.'
  WHEN 'frequency' THEN 'Repeating motifs and rhythmic graphic patterns bring energy to refined everyday silhouettes.'
  WHEN 'fluid' THEN 'Fluid silhouettes and soft drape create pieces designed to move naturally with you.'
  WHEN 'escape' THEN 'Versatile utility-inspired pieces designed for movement, comfort, and everyday wear.'
  WHEN 'studio' THEN 'Reliable wardrobe essentials with clean finishes, refined details, and creative studio versatility.'
  ELSE description
END
WHERE slug IN ('collision', 'rust-mark', 'void', 'residual', 'signal', 'frequency', 'fluid', 'escape', 'studio');

-- ===== supabase/migrations/20261010100000_admin_dashboard_permissions.sql =====
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

-- ===== supabase/migrations/20261010120000_product_front_back_images.sql =====
/*
# ELASHA product front/back photography and upload storage

Adds explicit front/back image URLs to products, plus an admin-managed public
storage bucket for product photography. Existing product_image/placeholder_image
values remain valid as a front-image fallback.
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS front_image_url text,
  ADD COLUMN IF NOT EXISTS back_image_url text;

-- Product photography is public to shoppers but writable only by store admins.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

-- ===== supabase/migrations/20261011100000_custom_design_front_back_artwork.sql =====
/*
# ELASHA custom designer front/back artwork

Keep the legacy artwork_url/artwork_name fields for existing orders while
recording separate artwork for front and back views.
*/
ALTER TABLE public.custom_designs
  ADD COLUMN IF NOT EXISTS front_artwork_url text,
  ADD COLUMN IF NOT EXISTS back_artwork_url text;

-- ===== supabase/migrations/20261014090000_secure_order_insert_policies.sql =====
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

-- ===== supabase/migrations/20261015000000_storage_collection_images_bucket.sql =====
/*
# ELASHA Collection Images Storage Bucket

Enables collection hero image uploads in the `collection-images` bucket.
Public viewable for storefront collection banners and cards.
Writable, updatable, and deletable by authenticated store administrators.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'collection-images',
  'collection-images',
  true,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "collection_images_public_read" ON storage.objects;
CREATE POLICY "collection_images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'collection-images');

DROP POLICY IF EXISTS "collection_images_admin_insert" ON storage.objects;
CREATE POLICY "collection_images_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'collection-images' AND public.is_admin());

DROP POLICY IF EXISTS "collection_images_admin_update" ON storage.objects;
CREATE POLICY "collection_images_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'collection-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'collection-images' AND public.is_admin());

DROP POLICY IF EXISTS "collection_images_admin_delete" ON storage.objects;
CREATE POLICY "collection_images_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'collection-images' AND public.is_admin());

-- ===== supabase/migrations/20261016000000_security_definer_least_privilege.sql =====
/*
# ELASHA Security Advisor Remediation — Least-Privilege SECURITY DEFINER Functions

Restricts execution of SECURITY DEFINER functions so untrusted or anonymous roles cannot invoke internal helper functions directly.

- Revokes execution of `public.is_admin()` and `public.handle_new_user()` from `PUBLIC` / `anon`.
- Grants execution of `public.is_admin()` to `authenticated` and `service_role`.
- `handle_new_user()` is triggered on `auth.users` insert and does not need direct client execution permissions.
*/

-- Revoke default PUBLIC execution privileges
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ===== supabase/migrations/20261017000000_add_order_payment_fields.sql =====
-- Add payment and reservation tracking fields to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS stock_reserved boolean DEFAULT false;

-- Ensure check constraint includes requires_reconciliation
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled', 'requires_reconciliation'));

-- Index razorpay_order_id for fast lookup during payment verification
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders (razorpay_order_id);

-- ===== supabase/migrations/20261018000000_atomic_stock_and_expiry_functions.sql =====
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

-- Automatic cleanup of expired stock reservations
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

-- Automated cron scheduling if pg_cron extension is available on Supabase PostgreSQL
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

-- ===== supabase/migrations/20261019000000_atomic_payment_confirmation.sql =====
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

-- ===== supabase/migrations/20261021000000_create_reviews_table.sql =====
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

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read_approved" ON public.reviews;
CREATE POLICY "reviews_public_read_approved" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS "reviews_admin_read_all" ON public.reviews;
CREATE POLICY "reviews_admin_read_all" ON public.reviews
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "reviews_insert_pending" ON public.reviews;
CREATE POLICY "reviews_insert_pending" ON public.reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "reviews_admin_update" ON public.reviews;
CREATE POLICY "reviews_admin_update" ON public.reviews
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "reviews_admin_delete" ON public.reviews;
CREATE POLICY "reviews_admin_delete" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ===== supabase/migrations/20261022000000_collection_multiple_images.sql =====
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- ===== supabase/migrations/20261023000000_add_order_shipping_amount.sql =====
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_amount numeric(10,2) NOT NULL DEFAULT 0
  CHECK (shipping_amount >= 0);
-- ===== supabase/migrations/20261024000000_allow_webp_artwork.sql =====
-- Keep storage validation aligned with src/lib/artwork.ts.
-- Customer artwork uploads accept PNG, JPEG, and WebP, up to 25 MiB.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'artwork';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'artwork') THEN
    RAISE EXCEPTION 'The artwork storage bucket is missing; cannot align allowed MIME types.';
  END IF;
END $$;
-- ===== supabase/migrations/20261025000000_remove_xs_size.sql =====
-- Remove XS from the selectable size catalog and its stock variants.
-- The order_items.variant_id foreign key uses ON DELETE SET NULL, so completed
-- order item snapshots (including their original size_label) remain intact.
BEGIN;

DELETE FROM public.product_variants AS variant
USING public.sizes AS size
WHERE variant.size_id = size.id
  AND upper(btrim(size.label)) = 'XS';

DELETE FROM public.sizes
WHERE upper(btrim(label)) = 'XS';

COMMIT;
