-- Remove XS from the selectable size catalog and its stock variants.
-- The order_items.variant_id foreign key uses ON DELETE SET NULL, so completed
-- order item snapshots (including their original size_label) remain intact.
BEGIN;

DELETE FROM public.product_variants AS variant
USING public.sizes AS size
WHERE variant.size_id = size.id
  AND upper(btrim(size.label)) = 'XS';

DELETE FROM public.sizes
WHERE upper(btrim(label)) = 'XS';

COMMIT;
