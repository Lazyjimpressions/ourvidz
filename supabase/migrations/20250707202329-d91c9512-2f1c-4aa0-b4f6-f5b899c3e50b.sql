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

-- Populate NULL titles for videos using job metadata or prompts
UPDATE public.videos 
SET title = CASE 
  WHEN v.metadata IS NOT NULL AND v.metadata->>'prompt' IS NOT NULL THEN
    CASE 
      WHEN LENGTH(v.metadata->>'prompt') <= 60 THEN v.metadata->>'prompt'
      ELSE LEFT(v.metadata->>'prompt', 60) || '...'
    END
  ELSE 'Untitled Video'
END
FROM public.videos v
LEFT JOIN public.jobs j ON j.video_id = v.id
WHERE v.title IS NULL OR v.title = '';