
-- 1. Drop legacy trigger on character_portraits that references rewritten function
DROP TRIGGER IF EXISTS trigger_update_character_portrait_count ON public.character_portraits;

-- 2. Backfill orphan portrait rows in user_library (only where character still exists)
UPDATE public.user_library ul
SET 
  character_id = (ul.roleplay_metadata->>'character_id')::uuid,
  output_type = 'portrait'
FROM public.characters c
WHERE 
  ul.roleplay_metadata->>'type' = 'character_portrait'
  AND ul.roleplay_metadata->>'character_id' IS NOT NULL
  AND (ul.character_id IS NULL OR ul.output_type IS NULL)
  AND c.id = (ul.roleplay_metadata->>'character_id')::uuid;

-- 3. Clean up orphan rows referencing deleted characters (set metadata but leave character_id null)
UPDATE public.user_library
SET output_type = 'portrait'
WHERE 
  roleplay_metadata->>'type' = 'character_portrait'
  AND character_id IS NULL
  AND output_type IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.characters WHERE id = (roleplay_metadata->>'character_id')::uuid
  );

-- 4. Deduplicate: keep newest row per (user_id, storage_path, character_id, output_type='portrait')
DELETE FROM public.user_library a
USING public.user_library b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.storage_path = b.storage_path
  AND a.character_id IS NOT DISTINCT FROM b.character_id
  AND a.output_type = 'portrait'
  AND b.output_type = 'portrait';
