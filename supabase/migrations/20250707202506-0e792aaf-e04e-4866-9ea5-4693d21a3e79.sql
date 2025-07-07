-- Phase 1: Database Title Population (handling validation constraints)

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
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'title' AND table_schema = 'public'
  ) THEN
    -- Add title column to videos table if it doesn't exist
    ALTER TABLE public.videos ADD COLUMN title TEXT;
  END IF;
END
$$;

-- Now populate video titles only for videos that won't trigger the validation constraint
UPDATE public.videos 
SET title = CASE 
  WHEN metadata IS NOT NULL AND metadata->>'prompt' IS NOT NULL THEN
    CASE 
      WHEN LENGTH(metadata->>'prompt') <= 60 THEN metadata->>'prompt'
      ELSE LEFT(metadata->>'prompt', 60) || '...'
    END
  ELSE 'Untitled Video'
END
WHERE (title IS NULL OR title = '') 
  AND (status != 'completed' OR (status = 'completed' AND video_url IS NOT NULL AND video_url != ''));