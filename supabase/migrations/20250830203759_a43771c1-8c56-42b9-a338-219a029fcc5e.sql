-- Add roleplay content categorization to user library
ALTER TABLE public.user_library 
  ADD COLUMN IF NOT EXISTS content_category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS roleplay_metadata JSONB DEFAULT '{}'::jsonb;