/*
# ELASHA Product Variants

Generates the size x colour variant (and stock) rows for every seeded product.

The base seed creates 28 products plus the 5 sizes and 6 colours reference rows,
but no `product_variants`. Without variants the product page has no size/colour
selectors, "Add to Cart" stays disabled and the inventory dashboard is empty.
This migration fills that gap: 28 x 5 x 6 = 840 variants.

Stock is deterministic (derived from a hash of the product/size/colour) so the
data is stable across runs; roughly one in twenty variants is left out of stock.

Idempotent: `ON CONFLICT (sku) DO NOTHING` makes a re-run a no-op.
*/

INSERT INTO product_variants (product_id, size_id, colour_id, sku, stock)
SELECT
  p.id,
  s.id,
  c.id,
  p.slug || '-' || lower(s.label) || '-' || lower(c.name),
  CASE WHEN abs(hashtext(p.slug || s.label || c.name)) % 20 = 0
       THEN 0
       ELSE 25 + (abs(hashtext(p.slug || s.label || c.name)) % 50)
  END
FROM products p
CROSS JOIN sizes s
CROSS JOIN colours c
ON CONFLICT (sku) DO NOTHING;
