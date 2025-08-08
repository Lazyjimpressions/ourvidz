-- Add content_rating to characters table with default and validation
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS content_rating VARCHAR(10) NOT NULL DEFAULT 'sfw';

-- Ensure only allowed values are used
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'characters_content_rating_check'
  ) THEN
    ALTER TABLE public.characters
    ADD CONSTRAINT characters_content_rating_check
    CHECK (content_rating IN ('sfw','nsfw'));
  END IF;
END $$;

-- Optional: backfill nulls to default (safety)
UPDATE public.characters SET content_rating = 'sfw' WHERE content_rating IS NULL;