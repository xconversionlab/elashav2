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
