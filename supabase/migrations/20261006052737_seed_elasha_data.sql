/*
# ELASHA Seed Data

Populates reference tables and initial catalog data.

1. Sizes: S, M, L, XL, XXL
2. Colours: Black, White, Grey, Navy, Olive, Cream
3. Garments: Tee, Long Sleeve, Hoodie, Zip Hoodie, Camp Shirt, Pants, Dress, Tote, Cap
4. Collections: Collision, Rust Mark, Void, Residual, Signal, Frequency, Fluid, Escape, Studio
5. Products: 18 products across collections with placeholder images
6. Admin settings: store_name
*/

-- Sizes
INSERT INTO sizes (label, sort_order) VALUES
  ('S', 1), ('M', 2), ('L', 3), ('XL', 4), ('XXL', 5)
ON CONFLICT (label) DO NOTHING;

-- Colours
INSERT INTO colours (name, hex, sort_order) VALUES
  ('Black', '#1a1a1a', 1),
  ('White', '#f5f5f0', 2),
  ('Grey', '#8a8a8a', 3),
  ('Navy', '#1e2a3a', 4),
  ('Olive', '#5a5e3a', 5),
  ('Cream', '#e8e0d0', 6)
ON CONFLICT (name) DO NOTHING;

-- Garments
INSERT INTO garments (name, slug, base_price, placeholder_image, sort_order) VALUES
  ('T-Shirt', 'tee', 45.00, '/placeholders/blank-tee-a.svg', 1),
  ('Long Sleeve', 'longsleeve', 55.00, '/placeholders/longsleeve-a.svg', 2),
  ('Hoodie', 'hoodie', 85.00, '/placeholders/studio-hoodie-a.svg', 3),
  ('Zip Hoodie', 'zip-hoodie', 90.00, '/placeholders/zip-hoodie-a.svg', 4),
  ('Camp Shirt', 'camp-shirt', 65.00, '/placeholders/camp-shirt-a.svg', 5),
  ('Pants', 'pants', 95.00, '/placeholders/pants-a.svg', 6),
  ('Dress', 'dress', 110.00, '/placeholders/fluid-dress-a.svg', 7),
  ('Tote Bag', 'tote', 35.00, '/placeholders/tote-a.svg', 8),
  ('Cap', 'cap', 40.00, '/placeholders/cap-a.svg', 9)
ON CONFLICT (slug) DO NOTHING;

-- Collections
INSERT INTO collections (name, slug, description, sort_order) VALUES
  ('Collision', 'collision', 'Where opposing forces meet. Graphic tees exploring friction and impact.', 1),
  ('Rust Mark', 'rust-mark', 'Decay as design. Pieces that embrace imperfection and patina.', 2),
  ('Void', 'void', 'Negative space as statement. Minimalist garments for maximum presence.', 3),
  ('Residual', 'residual', 'What remains after the process. Textured pieces with raw edge.', 4),
  ('Signal', 'signal', 'Communication through cloth. Bold graphics that transmit intent.', 5),
  ('Frequency', 'frequency', 'Oscillating patterns and rhythmic repetition in wearable form.', 6),
  ('Fluid', 'fluid', 'Form follows flow. Draped silhouettes that move with you.', 7),
  ('Escape', 'escape', 'Garments for the departure. Utility pieces for the journey outward.', 8),
  ('Studio', 'studio', 'The workshop wardrobe. Clean essentials for the creative space.', 9)
ON CONFLICT (slug) DO NOTHING;

-- Products (with placeholder images matching the original project)
INSERT INTO products (collection_id, name, slug, description, price, garment_type, placeholder_image, sort_order, featured)
SELECT c.id, p.name, p.slug, p.description, p.price, p.garment_type, p.image, p.sort_order, p.featured
FROM (VALUES
  -- Collision collection
  ('collision', 'Collision Tee — Impact', 'collision-tee-impact', 'Heavyweight tee with collision impact graphic on front and back.', 55.00, 'T-Shirt', '/placeholders/collision-a.svg', 1, true),
  ('collision', 'Collision Tee — Aftermath', 'collision-tee-aftermath', 'Aftermath variant with offset print and distressed collar.', 55.00, 'T-Shirt', '/placeholders/collision-b.svg', 2, false),
  -- Rust Mark
  ('rust-mark', 'Rust Mark Tee — Patina', 'rust-mark-tee-patina', 'Garment-dyed tee with rust mark print that ages with wear.', 58.00, 'T-Shirt', '/placeholders/rust-mark-a.svg', 3, true),
  ('rust-mark', 'Rust Mark Long Sleeve — Oxide', 'rust-mark-ls-oxide', 'Long sleeve with oxide gradient print and raw hem.', 68.00, 'Long Sleeve', '/placeholders/rust-mark-b.svg', 4, false),
  -- Void
  ('void', 'Void Tee — Absence', 'void-tee-absence', 'Minimalist tee with void graphic. Black on black with subtle texture.', 50.00, 'T-Shirt', '/placeholders/void-tee-a.svg', 5, false),
  ('void', 'Void Tee — Null', 'void-tee-null', 'Null variant with inverted colorway and ghost print.', 50.00, 'T-Shirt', '/placeholders/void-tee-b.svg', 6, false),
  -- Residual
  ('residual', 'Residual Tee — Trace', 'residual-tee-trace', 'Trace elements of process visible in the final piece.', 52.00, 'T-Shirt', '/placeholders/residual-a.svg', 7, false),
  ('residual', 'Residual Long Sleeve — Remnant', 'residual-ls-remnant', 'Remnant print with leftover marks from the studio floor.', 62.00, 'Long Sleeve', '/placeholders/residual-b.svg', 8, false),
  -- Signal
  ('signal', 'Signal Shirt — Transmit', 'signal-shirt-transmit', 'Camp collar shirt with signal pattern and open weave.', 75.00, 'Camp Shirt', '/placeholders/signal-shirt-a.svg', 9, true),
  ('signal', 'Signal Shirt — Receive', 'signal-shirt-receive', 'Receive variant with mirrored pattern and contrast piping.', 75.00, 'Camp Shirt', '/placeholders/signal-shirt-b.svg', 10, false),
  -- Frequency
  ('frequency', 'Frequency Tee — Wave', 'frequency-tee-wave', 'Oscillating wave pattern printed on organic cotton tee.', 52.00, 'T-Shirt', '/placeholders/frequency-a.svg', 11, false),
  ('frequency', 'Frequency Tee — Pulse', 'frequency-tee-pulse', 'Pulse variant with heartbeat rhythm print and tonal gradient.', 52.00, 'T-Shirt', '/placeholders/frequency-b.svg', 12, false),
  -- Fluid
  ('fluid', 'Fluid Dress — Flow', 'fluid-dress-flow', 'Draped midi dress in fluid jersey with abstract print.', 125.00, 'Dress', '/placeholders/fluid-dress-a.svg', 13, true),
  ('fluid', 'Fluid Dress — Current', 'fluid-dress-current', 'Current variant with asymmetric drape and tonal shift.', 125.00, 'Dress', '/placeholders/fluid-dress-b.svg', 14, false),
  -- Escape
  ('escape', 'Escape Hoodie — Departure', 'escape-hoodie-departure', 'Heavyweight escape hoodie with departure coordinates print.', 95.00, 'Hoodie', '/placeholders/escape-hoodie-a.svg', 15, true),
  ('escape', 'Escape Hoodie — Return', 'escape-hoodie-return', 'Return variant with inverted colorway and hidden pocket.', 95.00, 'Hoodie', '/placeholders/escape-hoodie-b.svg', 16, false),
  ('escape', 'Escape Tee — North', 'escape-tee-north', 'Escape tee with directional graphic and reflective ink.', 55.00, 'T-Shirt', '/placeholders/escape-tee-a.svg', 17, false),
  ('escape', 'Escape Tee — South', 'escape-tee-south', 'South variant with compass rose and weathered finish.', 55.00, 'T-Shirt', '/placeholders/escape-tee-b.svg', 18, false),
  -- Studio
  ('studio', 'Studio Hoodie — Workshop', 'studio-hoodie-workshop', 'Clean studio hoodie in heavyweight fleece. The workshop essential.', 88.00, 'Hoodie', '/placeholders/studio-hoodie-a.svg', 19, true),
  ('studio', 'Studio Hoodie — Atelier', 'studio-hoodie-atelier', 'Atelier variant with tonal embroidery and brushed interior.', 88.00, 'Hoodie', '/placeholders/studio-hoodie-b.svg', 20, false),
  ('studio', 'Studio Tote — Carryall', 'studio-tote-carryall', 'Heavyweight canvas tote with studio mark print.', 38.00, 'Tote Bag', '/placeholders/tote-a.svg', 21, false),
  ('studio', 'Studio Tote — Utility', 'studio-tote-utility', 'Utility variant with reinforced base and interior pocket.', 38.00, 'Tote Bag', '/placeholders/tote-b.svg', 22, false),
  ('studio', 'Studio Cap — Emblem', 'studio-cap-emblem', 'Six-panel cap with embroidered studio emblem.', 42.00, 'Cap', '/placeholders/cap-a.svg', 23, false),
  ('studio', 'Studio Cap — Mark', 'studio-cap-mark', 'Mark variant with woven label and contrast brim.', 42.00, 'Cap', '/placeholders/cap-b.svg', 24, false),
  ('studio', 'Studio Pants — Workshop', 'studio-pants-workshop', 'Relaxed workshop pants in heavyweight twill.', 98.00, 'Pants', '/placeholders/pants-a.svg', 25, false),
  ('studio', 'Studio Pants — Cargo', 'studio-pants-cargo', 'Cargo variant with utility pockets and tapered leg.', 98.00, 'Pants', '/placeholders/pants-b.svg', 26, false),
  ('studio', 'Studio LS — Layer', 'studio-ls-layer', 'Layering long sleeve in midweight cotton with studio mark.', 58.00, 'Long Sleeve', '/placeholders/longsleeve-a.svg', 27, false),
  ('studio', 'Studio LS — Base', 'studio-ls-base', 'Base variant with clean finish and ribbed cuff.', 58.00, 'Long Sleeve', '/placeholders/longsleeve-b.svg', 28, false)
) AS p(collection_slug, name, slug, description, price, garment_type, image, sort_order, featured)
JOIN collections c ON c.slug = p.collection_slug
ON CONFLICT (slug) DO NOTHING;

-- Admin settings
INSERT INTO admin_settings (key, value) VALUES
  ('store_name', 'ELASHA'),
  ('store_tagline', 'Artware & Apparel')
ON CONFLICT (key) DO NOTHING;
