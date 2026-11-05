-- Raise ELASHA image storage buckets to 25 MiB (26,214,400 bytes).
-- Keep the bucket-level limit aligned with client-side checks for customer
-- artwork, product photography, and collection hero images.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('artwork', 'artwork', true, 26214400, ARRAY['image/png', 'image/jpeg']),
  ('product-images', 'product-images', true, 26214400, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('collection-images', 'collection-images', true, 26214400, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure the collection image bucket remains publicly readable and admin-writable,
-- including in environments where its older bucket migration has not been applied.
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

DO $$
DECLARE
  bucket_count integer;
  incorrect_count integer;
BEGIN
  SELECT count(*)
    INTO bucket_count
    FROM storage.buckets
   WHERE id IN ('artwork', 'product-images', 'collection-images');

  SELECT count(*)
    INTO incorrect_count
    FROM storage.buckets
   WHERE id IN ('artwork', 'product-images', 'collection-images')
     AND file_size_limit IS DISTINCT FROM 26214400;

  IF bucket_count <> 3 OR incorrect_count <> 0 THEN
    RAISE EXCEPTION 'Expected artwork, product-images, and collection-images buckets to exist with 25 MiB limit; found % buckets, % with incorrect limits.',
      bucket_count, incorrect_count;
  END IF;
END $$;
