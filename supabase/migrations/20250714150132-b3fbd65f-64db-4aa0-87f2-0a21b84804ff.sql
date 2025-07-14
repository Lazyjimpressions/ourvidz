-- Phase 1: Add image_index column to images table
ALTER TABLE public.images 
ADD COLUMN image_index INTEGER;

-- Add comment for clarity
COMMENT ON COLUMN public.images.image_index IS 'Index of image in batch (0-based), used for SDXL multi-image jobs';