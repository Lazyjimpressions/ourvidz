-- Fix numeric field overflow for qwen_expansion_percentage and other potential overflow fields
-- Increase precision from numeric(5,2) to numeric(7,2) to accommodate larger values

-- Update jobs table
ALTER TABLE public.jobs 
ALTER COLUMN qwen_expansion_percentage TYPE numeric(7,2);

-- Update images table  
ALTER TABLE public.images
ALTER COLUMN qwen_expansion_percentage TYPE numeric(7,2);

-- Also increase precision for other potentially large numeric fields
ALTER TABLE public.jobs
ALTER COLUMN quality_rating TYPE numeric(7,2),
ALTER COLUMN quality_improvement TYPE numeric(7,2);

ALTER TABLE public.images
ALTER COLUMN quality_rating TYPE numeric(7,2),
ALTER COLUMN quality_improvement TYPE numeric(7,2),
ALTER COLUMN reference_strength TYPE numeric(7,2);