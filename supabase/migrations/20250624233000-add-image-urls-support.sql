
-- Add image_urls column to store multiple generated image URLs
ALTER TABLE public.images 
ADD COLUMN image_urls JSONB;

-- Add index for better performance when querying image_urls
CREATE INDEX IF NOT EXISTS idx_images_image_urls ON public.images USING GIN (image_urls);

-- Update existing records to use image_urls array format if they have image_url
UPDATE public.images 
SET image_urls = jsonb_build_array(image_url::text)
WHERE image_url IS NOT NULL AND image_urls IS NULL;
