-- Replace theme-led collection descriptions with premium fashion positioning.
-- This migration updates existing Supabase collection rows as well as future catalog reads.
UPDATE collections
SET description = CASE slug
  WHEN 'collision' THEN 'Contrast-led graphics and considered placements bring a confident edge to everyday staples.'
  WHEN 'rust-mark' THEN 'Rich tonal finishes and textured details lend each piece a distinctive, lived-in character.'
  WHEN 'void' THEN 'Clean lines and quiet detailing create modern essentials with a confident, understated presence.'
  WHEN 'residual' THEN 'Textural finishes and subtle graphic details give these pieces a considered, individual character.'
  WHEN 'signal' THEN 'Bold graphic placement and considered color balance make a clear, confident statement.'
  WHEN 'frequency' THEN 'Repeating motifs and rhythmic graphic patterns bring energy to refined everyday silhouettes.'
  WHEN 'fluid' THEN 'Fluid silhouettes and soft drape create pieces designed to move naturally with you.'
  WHEN 'escape' THEN 'Versatile utility-inspired pieces designed for movement, comfort, and everyday wear.'
  WHEN 'studio' THEN 'Reliable wardrobe essentials with clean finishes, refined details, and creative studio versatility.'
  ELSE description
END
WHERE slug IN ('collision', 'rust-mark', 'void', 'residual', 'signal', 'frequency', 'fluid', 'escape', 'studio');
