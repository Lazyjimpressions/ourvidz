
-- Step 1: Drop old constraint first
ALTER TABLE api_models DROP CONSTRAINT IF EXISTS api_models_task_check;

-- Step 2: Migrate image tasks
UPDATE api_models SET task = 't2i' WHERE modality = 'image' AND task = 'generation';
UPDATE api_models SET task = 'i2i' WHERE modality = 'image' AND task = 'style_transfer';

-- Step 3: Migrate image enhancement -> i2i (grok-image i2i is really an edit model)
UPDATE api_models SET task = 'i2i' WHERE modality = 'image' AND task = 'enhancement';

-- Step 4: Migrate video tasks using model_key patterns
UPDATE api_models SET task = 't2v' WHERE modality = 'video' AND task = 'generation' AND model_key LIKE '%distilled' AND model_key NOT LIKE '%image-to-video' AND model_key NOT LIKE '%extend' AND model_key NOT LIKE '%multiconditioning';
UPDATE api_models SET task = 'i2v' WHERE modality = 'video' AND task = 'generation' AND (model_key LIKE '%image-to-video' OR model_key LIKE '%i2v');
UPDATE api_models SET task = 'extend' WHERE modality = 'video' AND task = 'generation' AND model_key LIKE '%extend';
UPDATE api_models SET task = 'multi' WHERE modality = 'video' AND task = 'generation' AND model_key LIKE '%multiconditioning';

-- Step 5: Re-add constraint with new values
ALTER TABLE api_models ADD CONSTRAINT api_models_task_check 
  CHECK (task = ANY (ARRAY[
    't2i', 'i2i', 't2v', 'i2v', 'extend', 'multi',
    'upscale', 'roleplay', 'reasoning', 'enhancement', 'embedding', 'vision'
  ]));

-- Step 6: Update default_for_tasks arrays
UPDATE api_models SET default_for_tasks = array_replace(default_for_tasks, 'generation', 't2i')
WHERE 'generation' = ANY(default_for_tasks) AND modality = 'image';

UPDATE api_models SET default_for_tasks = array_replace(default_for_tasks, 'style_transfer', 'i2i')
WHERE 'style_transfer' = ANY(default_for_tasks) AND modality = 'image';

UPDATE api_models SET default_for_tasks = array_replace(default_for_tasks, 'generation', 'i2v')
WHERE 'generation' = ANY(default_for_tasks) AND modality = 'video';

-- Step 7: Set specific video model defaults
UPDATE api_models SET default_for_tasks = ARRAY['t2v'] WHERE id = '0ef21712-53a8-4476-a165-1f4b519e72b0';
UPDATE api_models SET default_for_tasks = ARRAY['i2v'] WHERE id = '291624c7-acf8-41d5-b2d7-008aeb1c244d';
UPDATE api_models SET default_for_tasks = ARRAY['extend'] WHERE id = '666c70c8-e35f-4bed-a2cf-5081d088b3e3';
