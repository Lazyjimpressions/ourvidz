-- Character Hub V2 Schema Extensions
-- This migration adds support for:
-- 1. Character anchors (for visual consistency)
-- 2. Character canon outputs (pinned reference outputs)
-- 3. Extended character metadata (style, traits, media defaults)

-- ============================================================================
-- 1. Create character_anchors table (renamed from character_portraits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.character_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.character_anchors ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access anchors for their own characters
CREATE POLICY "Users can view their own character anchors"
  ON public.character_anchors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_anchors.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert anchors for their own characters"
  ON public.character_anchors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_anchors.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own character anchors"
  ON public.character_anchors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_anchors.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own character anchors"
  ON public.character_anchors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_anchors.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_character_anchors_character_id ON public.character_anchors(character_id);
CREATE INDEX idx_character_anchors_primary ON public.character_anchors(character_id, is_primary) WHERE is_primary = true;

-- ============================================================================
-- 2. Create character_canon table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.character_canon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  output_url TEXT NOT NULL,
  output_type TEXT NOT NULL CHECK (output_type IN ('image', 'video')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.character_canon ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access canon outputs for their own characters
CREATE POLICY "Users can view their own character canon"
  ON public.character_canon
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_canon.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert canon for their own characters"
  ON public.character_canon
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_canon.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own character canon"
  ON public.character_canon
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_canon.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own character canon"
  ON public.character_canon
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_canon.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_character_canon_character_id ON public.character_canon(character_id);
CREATE INDEX idx_character_canon_pinned ON public.character_canon(character_id, is_pinned) WHERE is_pinned = true;

-- ============================================================================
-- 3. Extend characters table with new columns
-- ============================================================================

-- Style preset (realistic, anime, cinematic, etc.)
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS style_preset TEXT DEFAULT 'realistic';

-- Locked traits for consistency (must-keep and avoid traits)
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS locked_traits TEXT[] DEFAULT '{}';

-- Media defaults (video framing, motion intensity, loop-safe, voice)
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS media_defaults JSONB DEFAULT '{}'::jsonb;

-- Personality traits (slider values for personality dimensions)
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS personality_traits JSONB DEFAULT '{}'::jsonb;

-- Physical traits (structured appearance data)
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS physical_traits JSONB DEFAULT '{}'::jsonb;

-- Outfit defaults (signature outfit description)
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS outfit_defaults TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.characters.style_preset IS 'Default rendering style: realistic, anime, cinematic, 3d, sketch';
COMMENT ON COLUMN public.characters.locked_traits IS 'Array of must-keep traits for consistency';
COMMENT ON COLUMN public.characters.media_defaults IS 'Video framing, motion intensity, loop-safe, voice settings';
COMMENT ON COLUMN public.characters.personality_traits IS 'Personality slider values (e.g., serious-playful, bold-cautious)';
COMMENT ON COLUMN public.characters.physical_traits IS 'Structured appearance data (age, hair, eyes, build, etc.)';
COMMENT ON COLUMN public.characters.outfit_defaults IS 'Signature outfit description for consistency';

-- ============================================================================
-- 4. Add trigger for updated_at on character_anchors
-- ============================================================================
CREATE OR REPLACE FUNCTION update_character_anchors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_character_anchors_updated_at
  BEFORE UPDATE ON public.character_anchors
  FOR EACH ROW
  EXECUTE FUNCTION update_character_anchors_updated_at();

-- ============================================================================
-- Migration complete
-- ============================================================================
-- This migration is backward compatible and does not break existing functionality.
-- Existing characters will have default values for new columns.
-- New tables are isolated and only affect Character Hub V2 features.
