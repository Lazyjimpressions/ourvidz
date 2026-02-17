-- Step 1: Drop old constraints first
ALTER TABLE api_models DROP CONSTRAINT IF EXISTS api_models_modality_check;
ALTER TABLE api_models DROP CONSTRAINT IF EXISTS api_models_task_check;

-- Step 2: Migrate data while no constraints exist
UPDATE api_models SET modality = 'chat', task = 'reasoning'
WHERE modality = 'roleplay' AND task = 'chat';

UPDATE api_models SET modality = 'chat'
WHERE modality = 'roleplay' AND task = 'roleplay';

-- Step 3: Re-add tighter constraints
ALTER TABLE api_models ADD CONSTRAINT api_models_modality_check 
  CHECK (modality = ANY (ARRAY['image'::text, 'video'::text, 'chat'::text]));

ALTER TABLE api_models ADD CONSTRAINT api_models_task_check 
  CHECK (task = ANY (ARRAY['generation'::text, 'style_transfer'::text, 'upscale'::text, 'roleplay'::text, 'reasoning'::text, 'enhancement'::text, 'embedding'::text]));