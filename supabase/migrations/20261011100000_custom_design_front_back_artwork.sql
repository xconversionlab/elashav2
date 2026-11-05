/*
# ELASHA custom designer front/back artwork

Keep the legacy artwork_url/artwork_name fields for existing orders while
recording separate artwork for front and back views.
*/
ALTER TABLE public.custom_designs
  ADD COLUMN IF NOT EXISTS front_artwork_url text,
  ADD COLUMN IF NOT EXISTS back_artwork_url text;
