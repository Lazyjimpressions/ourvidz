
-- Add format and quality columns to images table to match what GenerationService expects
ALTER TABLE public.images 
ADD COLUMN format text DEFAULT 'png',
ADD COLUMN quality text DEFAULT 'fast';

-- Update existing records to have default values
UPDATE public.images 
SET format = 'png', quality = 'fast' 
WHERE format IS NULL OR quality IS NULL;
