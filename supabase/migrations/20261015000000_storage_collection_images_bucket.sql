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
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
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
