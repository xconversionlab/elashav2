import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Product, Collection, ProductVariant, Size, Colour, Garment } from '@/types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from('products')
      .select('*, collection:collections(*)')
      .eq('is_published', true)
      .order('sort_order')
      .then(({ data }) => {
        setProducts((data as Product[]) ?? []);
        setLoading(false);
      });
  }, []);
  return { products, loading };
}

export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from('products')
      .select('*, collection:collections(*)')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        setProduct(data as Product);
        supabase
          .from('product_variants')
          .select('*, size:sizes(*), colour:colours(*)')
          .eq('product_id', (data as Product).id)
          .order('created_at')
          .then(({ data: vData }) => {
            setVariants(((vData as ProductVariant[]) ?? []).filter(variant => variant.size?.label !== 'XS'));
            setLoading(false);
          });
      });
  }, [slug]);
  return { product, variants, loading };
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from('collections')
      .select('*')
      .eq('is_published', true)
      .order('sort_order')
      .then(({ data }) => {
        setCollections((data as Collection[]) ?? []);
        setLoading(false);
      });
  }, []);
  return { collections, loading };
}

export function useCollectionProducts(collectionSlug: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from('collections')
      .select('*')
      .eq('slug', collectionSlug)
      .maybeSingle()
      .then(({ data }) => {
        setCollection((data as Collection) ?? null);
        if (data) {
          supabase
            .from('products')
            .select('*, collection:collections(*)')
            .eq('collection_id', (data as Collection).id)
            .eq('is_published', true)
            .order('sort_order')
            .then(({ data: pData }) => {
              setProducts((pData as Product[]) ?? []);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }, [collectionSlug]);
  return { products, collection, loading };
}

export function useGarments() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from('garments')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setGarments((data as Garment[]) ?? []);
        setLoading(false);
      });
  }, []);
  return { garments, loading };
}

export function useSizesAndColours() {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      supabase.from('sizes').select('*').neq('label', 'XS').order('sort_order'),
      supabase.from('colours').select('*').order('sort_order'),
    ]).then(([sRes, cRes]) => {
      setSizes(((sRes.data as Size[]) ?? []).filter(size => size.label !== 'XS'));
      setColours((cRes.data as Colour[]) ?? []);
      setLoading(false);
    });
  }, []);
  return { sizes, colours, loading };
}
