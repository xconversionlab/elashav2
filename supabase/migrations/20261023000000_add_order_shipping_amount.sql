ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_amount numeric(10,2) NOT NULL DEFAULT 0
  CHECK (shipping_amount >= 0);
