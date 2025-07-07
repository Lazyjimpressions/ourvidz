-- Phase 1: Database Title Population and Bucket Mapping Fixes

-- First, let's populate NULL titles for images using prompts
UPDATE public.images 
SET title = CASE 
  WHEN prompt IS NOT NULL AND LENGTH(prompt) > 0 THEN 
    CASE 
      WHEN LENGTH(prompt) <= 60 THEN prompt
      ELSE LEFT(prompt, 60) || '...'
    END
  ELSE 'Untitled Image'
END
WHERE title IS NULL OR title = '';

-- Check if videos table has title column first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'title' AND table_schema = 'public'
  ) THEN
    -- Populate NULL titles for videos using job metadata
    UPDATE public.videos 
    SET title = CASE 
      WHEN metadata IS NOT NULL AND metadata->>'prompt' IS NOT NULL THEN
        CASE 
          WHEN LENGTH(metadata->>'prompt') <= 60 THEN metadata->>'prompt'
          ELSE LEFT(metadata->>'prompt', 60) || '...'
        END
      ELSE 'Untitled Video'
    END
    WHERE title IS NULL OR title = '';
  ELSE
    -- Add title column to videos table if it doesn't exist
    ALTER TABLE public.videos ADD COLUMN title TEXT;
    
    -- Then populate titles
    UPDATE public.videos 
    SET title = CASE 
      WHEN metadata IS NOT NULL AND metadata->>'prompt' IS NOT NULL THEN
        CASE 
          WHEN LENGTH(metadata->>'prompt') <= 60 THEN metadata->>'prompt'
          ELSE LEFT(metadata->>'prompt', 60) || '...'
        END
      ELSE 'Untitled Video'
    END;
  END IF;
END
$$;