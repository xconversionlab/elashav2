-- Replace legacy custom-garment options with the five current T-shirt styles.
-- Historical designs keep their garment_id; old garment rows are deactivated, not deleted.
DO $$
DECLARE
  existing_tshirt_price numeric(10,2);
BEGIN
  SELECT base_price
    INTO existing_tshirt_price
    FROM public.garments
   WHERE slug = 'tee'
   LIMIT 1;

  IF existing_tshirt_price IS NULL THEN
    RAISE EXCEPTION 'Cannot seed custom T-shirt styles: the existing tee price is missing.';
  END IF;

  UPDATE public.garments
     SET is_active = false
   WHERE slug IN ('tee', 'longsleeve')
     AND is_active = true;

  INSERT INTO public.garments (name, slug, base_price, placeholder_image, sort_order, is_active)
  VALUES
    ('Tank Top', 'tank-top', existing_tshirt_price, '/custom-tshirts/Tank-front.webp', 1, true),
    ('Crop Top', 'crop-top', existing_tshirt_price, '/custom-tshirts/Crop-top.webp', 2, true),
    ('Acid Wash T-Shirt', 'acid-wash', existing_tshirt_price, '/custom-tshirts/Acid-front.webp', 3, true),
    ('Beige T-Shirt', 'beige-tee', existing_tshirt_price, '/custom-tshirts/Beige-front.webp', 4, true),
    ('Oversized T-Shirt', 'oversized-tee', existing_tshirt_price, '/custom-tshirts/Oversized-front.webp', 5, true)
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        placeholder_image = EXCLUDED.placeholder_image,
        base_price = EXCLUDED.base_price,
        sort_order = EXCLUDED.sort_order,
        is_active = true;
END $$;
