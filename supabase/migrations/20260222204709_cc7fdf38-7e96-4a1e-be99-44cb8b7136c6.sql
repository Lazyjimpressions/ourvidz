
-- Add columns to character_canon for the unified reference image system
ALTER TABLE public.character_canon 
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS label text;

-- Index for fast tag filtering
CREATE INDEX IF NOT EXISTS idx_character_canon_tags ON public.character_canon USING GIN(tags);

-- Index for primary lookup
CREATE INDEX IF NOT EXISTS idx_character_canon_primary ON public.character_canon (character_id, is_primary) WHERE is_primary = true;

-- RLS policies (character_canon should already have RLS enabled, add user-scoped policies)
-- First check if policies exist, drop and recreate for clean state

DO $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Users can view their own character canon" ON public.character_canon;
  DROP POLICY IF EXISTS "Users can insert their own character canon" ON public.character_canon;
  DROP POLICY IF EXISTS "Users can update their own character canon" ON public.character_canon;
  DROP POLICY IF EXISTS "Users can delete their own character canon" ON public.character_canon;
END $$;

-- Enable RLS
ALTER TABLE public.character_canon ENABLE ROW LEVEL SECURITY;

-- Users can view canon for characters they own
CREATE POLICY "Users can view their own character canon"
  ON public.character_canon FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_canon.character_id
      AND c.user_id = auth.uid()
    )
  );

-- Users can insert canon for characters they own
CREATE POLICY "Users can insert their own character canon"
  ON public.character_canon FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_canon.character_id
      AND c.user_id = auth.uid()
    )
  );

-- Users can update canon for characters they own
CREATE POLICY "Users can update their own character canon"
  ON public.character_canon FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_canon.character_id
      AND c.user_id = auth.uid()
    )
  );

-- Users can delete canon for characters they own
CREATE POLICY "Users can delete their own character canon"
  ON public.character_canon FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_canon.character_id
      AND c.user_id = auth.uid()
    )
  );
