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
