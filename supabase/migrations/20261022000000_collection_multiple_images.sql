/*
# Add multiple images support to collections table

Adds images text[] column to collections table for multi-image gallery support.
*/

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
