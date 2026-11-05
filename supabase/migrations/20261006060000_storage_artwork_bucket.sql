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
-- Limits mirror the client validation in src/lib/artwork.ts (PNG/JPG, max 5 MB).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('artwork', 'artwork', true, 5242880, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 5242880,
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
