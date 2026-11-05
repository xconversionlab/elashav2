import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Product } from '@/types';

interface WishlistContextValue {
  productIds: Set<string>;
  toggle: (productId: string) => Promise<void>;
  has: (productId: string) => boolean;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProductIds(new Set());
      setLoading(false);
      return;
    }
    supabase
      .from('wishlists')
      .select('product_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setProductIds(new Set((data as { product_id: string }[] | null)?.map(d => d.product_id) ?? []));
        setLoading(false);
      });
  }, [user]);

  async function toggle(productId: string) {
    if (!user) return;
    if (productIds.has(productId)) {
      await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      setProductIds(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    } else {
      await supabase
        .from('wishlists')
        .insert({ user_id: user.id, product_id: productId });
      setProductIds(prev => new Set(prev).add(productId));
    }
  }

  function has(productId: string) {
    return productIds.has(productId);
  }

  return (
    <WishlistContext.Provider value={{ productIds, toggle, has, loading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

export async function fetchWishlistProducts(user: import('@supabase/supabase-js').User): Promise<Product[]> {
  const { data } = await supabase
    .from('wishlists')
    .select('product:products(*)')
    .eq('user_id', user.id);
  return (data as { product: Product }[] | null)?.map(d => d.product) ?? [];
}
