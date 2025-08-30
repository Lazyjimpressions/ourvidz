
-- 1) Character consistency, previews, and quick start flags
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS consistency_method TEXT DEFAULT 'i2i_reference',
  ADD COLUMN IF NOT EXISTS seed_locked INTEGER,
  ADD COLUMN IF NOT EXISTS base_prompt TEXT,
  ADD COLUMN IF NOT EXISTS preview_image_url TEXT,
  ADD COLUMN IF NOT EXISTS quick_start BOOLEAN DEFAULT false;

-- 2) Conversations memory system (three-tier memory and JSONB payload)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS memory_tier TEXT DEFAULT 'conversation',
  ADD COLUMN IF NOT EXISTS memory_data JSONB DEFAULT '{}'::jsonb;
