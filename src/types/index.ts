export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hero_image: string | null;
  images?: string[] | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  collection_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  garment_type: string | null;
  placeholder_image: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  is_published: boolean;
  is_customizable: boolean;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  collection?: Collection | null;
}

export interface Size {
  id: string;
  label: string;
  sort_order: number;
}

export interface Colour {
  id: string;
  name: string;
  hex: string;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size_id: string;
  colour_id: string;
  sku: string | null;
  stock: number;
  price_override: number | null;
  created_at: string;
  size?: Size;
  colour?: Colour;
}

export interface Garment {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  placeholder_image: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface DesignTransform {
  /** Horizontal artwork center within the printable area, normalized 0–1. */
  x: number;
  /** Vertical artwork center within the printable area, normalized 0–1. */
  y: number;
  /** Artwork size multiplier; 1 is the default size. */
  scale: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Optional mirror transforms for legacy saved designs. */
  flipX?: boolean;
  flipY?: boolean;
}

export interface CustomDesign {
  id: string;
  user_id: string;
  garment_id: string | null;
  garment_name: string | null;
  colour_name: string | null;
  size_label: string | null;
  artwork_url: string;
  artwork_name: string | null;
  front_artwork_url?: string | null;
  back_artwork_url?: string | null;
  transform: DesignTransform | { front: DesignTransform; back: DesignTransform };
  status: 'pending' | 'approved' | 'rejected' | 'in_review';
  admin_notes: string | null;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  shipping_amount?: number;
  shipping_address: Record<string, string> | null;
  customer_notes: string | null;
  razorpay_order_id?: string | null;
  payment_id?: string | null;
  payment_status?: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'requires_reconciliation' | null;
  stock_reserved?: boolean;
  reservation_expires_at?: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  custom_design_id: string | null;
  product_name: string;
  size_label: string | null;
  colour_name: string | null;
  quantity: number;
  unit_price: number;
  artwork_url: string | null;
}

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  variant_id: string;
  size_label: string;
  colour_name: string;
  colour_hex: string;
  price: number;
  quantity: number;
  is_custom: boolean;
  custom_design_id?: string;
  artwork_url?: string;
}
