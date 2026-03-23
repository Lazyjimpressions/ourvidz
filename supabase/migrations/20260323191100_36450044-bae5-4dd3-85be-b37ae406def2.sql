
-- Step 1: Add new columns to user_library
ALTER TABLE public.user_library
  ADD COLUMN IF NOT EXISTS character_id uuid REFERENCES public.characters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS output_type text,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS label text;

-- Step 2: Create indexes for character-scoped queries
CREATE INDEX IF NOT EXISTS idx_user_library_character
  ON public.user_library(user_id, character_id)
  WHERE character_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_library_output_type
  ON public.user_library(user_id, character_id, output_type)
  WHERE character_id IS NOT NULL;

-- Step 3: Backfill from character_portraits (deduplicate by storage_path)
INSERT INTO public.user_library (
  user_id, asset_type, storage_path, file_size_bytes, mime_type,
  original_prompt, model_used, tags, created_at, updated_at,
  character_id, output_type, is_primary, sort_order, generation_metadata
)
SELECT
  c.user_id,
  'image',
  cp.image_url,
  0,
  'image/png',
  COALESCE(cp.prompt, ''),
  'fal',
  COALESCE(cp.tags, '{}'::text[]),
  cp.created_at,
  cp.updated_at,
  cp.character_id,
  'portrait',
  COALESCE(cp.is_primary, false),
  COALESCE(cp.sort_order, 0),
  COALESCE(cp.generation_metadata, '{}'::jsonb)
FROM public.character_portraits cp
JOIN public.characters c ON c.id = cp.character_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_library ul
  WHERE ul.storage_path = cp.image_url
    AND ul.user_id = c.user_id
);

-- Step 4: Backfill from character_canon (deduplicate by storage_path)
INSERT INTO public.user_library (
  user_id, asset_type, storage_path, file_size_bytes, mime_type,
  original_prompt, model_used, tags, created_at,
  character_id, output_type, is_primary, is_pinned, label,
  generation_metadata
)
SELECT
  c.user_id,
  'image',
  cc.output_url,
  0,
  'image/png',
  '',
  'fal',
  COALESCE(cc.tags, '{}'::text[]),
  cc.created_at,
  cc.character_id,
  cc.output_type,
  COALESCE(cc.is_primary, false),
  cc.is_pinned,
  cc.label,
  COALESCE(cc.metadata, '{}'::jsonb)
FROM public.character_canon cc
JOIN public.characters c ON c.id = cc.character_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_library ul
  WHERE ul.storage_path = cc.output_url
    AND ul.user_id = c.user_id
);

-- Step 5: For rows that already existed in user_library but lacked character_id,
-- update them from character_portraits data
UPDATE public.user_library ul
SET
  character_id = cp.character_id,
  output_type = 'portrait',
  is_primary = COALESCE(cp.is_primary, false),
  sort_order = COALESCE(cp.sort_order, 0),
  generation_metadata = COALESCE(cp.generation_metadata, '{}'::jsonb)
FROM public.character_portraits cp
JOIN public.characters c ON c.id = cp.character_id
WHERE ul.storage_path = cp.image_url
  AND ul.user_id = c.user_id
  AND ul.character_id IS NULL;

-- Step 6: Same for character_canon rows that matched existing user_library rows
UPDATE public.user_library ul
SET
  character_id = cc.character_id,
  output_type = cc.output_type,
  is_primary = COALESCE(cc.is_primary, false),
  is_pinned = cc.is_pinned,
  label = cc.label
FROM public.character_canon cc
JOIN public.characters c ON c.id = cc.character_id
WHERE ul.storage_path = cc.output_url
  AND ul.user_id = c.user_id
  AND ul.character_id IS NULL;

-- Step 7: Drop old trigger from character_portraits
DROP TRIGGER IF EXISTS update_portrait_count ON public.character_portraits;

-- Step 8: Rewrite trigger function to fire on user_library
CREATE OR REPLACE FUNCTION public.update_character_portrait_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.output_type = 'portrait' AND NEW.character_id IS NOT NULL THEN
      UPDATE public.characters
      SET portrait_count = COALESCE(portrait_count, 0) + 1
      WHERE id = NEW.character_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.output_type = 'portrait' AND OLD.character_id IS NOT NULL THEN
      UPDATE public.characters
      SET portrait_count = GREATEST(COALESCE(portrait_count, 0) - 1, 0)
      WHERE id = OLD.character_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle output_type or character_id changes
    IF OLD.output_type = 'portrait' AND OLD.character_id IS NOT NULL
       AND (NEW.output_type IS DISTINCT FROM 'portrait' OR NEW.character_id IS NULL) THEN
      UPDATE public.characters
      SET portrait_count = GREATEST(COALESCE(portrait_count, 0) - 1, 0)
      WHERE id = OLD.character_id;
    END IF;
    IF NEW.output_type = 'portrait' AND NEW.character_id IS NOT NULL
       AND (OLD.output_type IS DISTINCT FROM 'portrait' OR OLD.character_id IS NULL) THEN
      UPDATE public.characters
      SET portrait_count = COALESCE(portrait_count, 0) + 1
      WHERE id = NEW.character_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;

-- Step 9: Create new trigger on user_library
CREATE TRIGGER update_portrait_count_from_library
  AFTER INSERT OR DELETE OR UPDATE OF output_type, character_id
  ON public.user_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_character_portrait_count();
