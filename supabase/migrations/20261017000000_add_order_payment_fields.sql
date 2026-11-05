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
