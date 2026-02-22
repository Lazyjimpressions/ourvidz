
-- Step 1: Add new tasks column as text array
ALTER TABLE public.api_models ADD COLUMN tasks text[] NOT NULL DEFAULT '{}';

-- Step 2: Migrate existing data — copy single task value into array
UPDATE public.api_models SET tasks = ARRAY[task];

-- Step 2b: Fix Grok 4.1 Fast — has default_for_tasks=['enhancement'] but task='reasoning'
-- Add enhancement to its tasks array so the subset constraint is satisfied
UPDATE public.api_models
SET tasks = ARRAY['reasoning', 'enhancement']
WHERE id = '3f85f607-c472-44e7-a518-2e41d4a73749';

-- Step 3: Drop the old constraint on the single task column
ALTER TABLE public.api_models DROP CONSTRAINT IF EXISTS api_models_task_check;

-- Step 4: Drop the old task column
ALTER TABLE public.api_models DROP COLUMN task;

-- Step 5: Add CHECK constraint that validates all elements in the tasks array
CREATE OR REPLACE FUNCTION public.check_valid_tasks(arr text[])
RETURNS boolean AS $$
DECLARE
  elem text;
  valid_tasks text[] := ARRAY['t2i', 'i2i', 'i2i_multi', 't2v', 'i2v', 'extend', 'multi', 'upscale', 'roleplay', 'reasoning', 'enhancement', 'embedding', 'vision'];
BEGIN
  IF arr IS NULL OR array_length(arr, 1) IS NULL OR array_length(arr, 1) = 0 THEN
    RETURN false;
  END IF;
  FOREACH elem IN ARRAY arr LOOP
    IF NOT (elem = ANY(valid_tasks)) THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

ALTER TABLE public.api_models ADD CONSTRAINT api_models_tasks_check CHECK (check_valid_tasks(tasks));

-- Step 6: Add constraint ensuring default_for_tasks is a subset of tasks
ALTER TABLE public.api_models ADD CONSTRAINT api_models_defaults_subset_tasks CHECK (default_for_tasks <@ tasks);

-- Step 7: Create GIN index for efficient array containment queries
CREATE INDEX idx_api_models_tasks_gin ON public.api_models USING GIN (tasks);

-- Step 8: Drop old B-tree index on task if it exists
DROP INDEX IF EXISTS idx_api_models_modality_task;

-- Step 9: Update Seedream v4 Edit to be default for both i2i and i2i_multi
UPDATE public.api_models
SET tasks = ARRAY['i2i', 'i2i_multi'],
    default_for_tasks = ARRAY['i2i', 'i2i_multi']
WHERE model_key = 'fal-ai/bytedance/seedream/v4/edit';

-- Step 10: Update Seedream v4.5 Edit to support i2i_multi
UPDATE public.api_models
SET tasks = ARRAY['i2i', 'i2i_multi']
WHERE model_key = 'fal-ai/bytedance/seedream/v4.5/edit';

-- Step 11: Update Flux-2 Flash i2i to support i2i_multi
UPDATE public.api_models
SET tasks = ARRAY['i2i', 'i2i_multi']
WHERE model_key = 'fal-ai/flux-2/flash/edit';
