-- Create character_portraits table for storing multiple portrait versions per character
CREATE TABLE public.character_portraits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT,
  enhanced_prompt TEXT,
  generation_metadata JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure only one primary portrait per character
CREATE UNIQUE INDEX idx_character_portraits_primary 
ON public.character_portraits(character_id) 
WHERE is_primary = true;

-- Index for efficient queries
CREATE INDEX idx_character_portraits_character_id ON public.character_portraits(character_id);
CREATE INDEX idx_character_portraits_sort_order ON public.character_portraits(character_id, sort_order);

-- Enable Row Level Security
ALTER TABLE public.character_portraits ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage portraits of their own characters
CREATE POLICY "Users can view portraits of their own characters"
ON public.character_portraits
FOR SELECT
USING (
  character_id IN (
    SELECT id FROM public.characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view portraits of public characters"
ON public.character_portraits
FOR SELECT
USING (
  character_id IN (
    SELECT id FROM public.characters WHERE is_public = true
  )
);

CREATE POLICY "Users can create portraits for their own characters"
ON public.character_portraits
FOR INSERT
WITH CHECK (
  character_id IN (
    SELECT id FROM public.characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update portraits of their own characters"
ON public.character_portraits
FOR UPDATE
USING (
  character_id IN (
    SELECT id FROM public.characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete portraits of their own characters"
ON public.character_portraits
FOR DELETE
USING (
  character_id IN (
    SELECT id FROM public.characters WHERE user_id = auth.uid()
  )
);

-- Add portrait_count and scene_count to characters table for quick access
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS portrait_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS scene_count INTEGER DEFAULT 0;

-- Create function to update portrait count
CREATE OR REPLACE FUNCTION public.update_character_portrait_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.characters 
    SET portrait_count = COALESCE(portrait_count, 0) + 1
    WHERE id = NEW.character_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.characters 
    SET portrait_count = GREATEST(COALESCE(portrait_count, 0) - 1, 0)
    WHERE id = OLD.character_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for portrait count
CREATE TRIGGER trigger_update_character_portrait_count
AFTER INSERT OR DELETE ON public.character_portraits
FOR EACH ROW
EXECUTE FUNCTION public.update_character_portrait_count();

-- Create updated_at trigger for character_portraits
CREATE TRIGGER update_character_portraits_updated_at
BEFORE UPDATE ON public.character_portraits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();