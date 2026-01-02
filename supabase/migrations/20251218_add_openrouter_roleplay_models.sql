-- Migration: Add recommended OpenRouter roleplay models for NSFW chat
-- Applied via Supabase MCP on 2025-12-31
--
-- PREREQUISITE: This migration requires a unique constraint on api_models.model_key
-- The constraint was added via migration: 20251231_add_unique_constraint_model_key

-- First, ensure OpenRouter provider exists
INSERT INTO api_providers (id, name, display_name, base_url, auth_scheme, is_active)
VALUES (
  gen_random_uuid(),
  'openrouter',
  'OpenRouter',
  'https://openrouter.ai/api/v1',
  'bearer',
  true
)
ON CONFLICT (name) DO UPDATE SET
  is_active = true,
  updated_at = now();

-- Get the OpenRouter provider ID for inserting models
DO $$
DECLARE
  openrouter_id uuid;
BEGIN
  SELECT id INTO openrouter_id FROM api_providers WHERE name = 'openrouter';

  -- Reset all existing roleplay models to non-default
  UPDATE api_models
  SET is_default = false
  WHERE modality = 'roleplay';

  -- Insert/update recommended OpenRouter roleplay models
  -- 1. Dolphin Mistral 24B Venice (Free) - PRIMARY DEFAULT
  INSERT INTO api_models (
    id, provider_id, model_key, display_name, modality, task, model_family,
    is_active, is_default, priority, capabilities
  )
  VALUES (
    gen_random_uuid(),
    openrouter_id,
    'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    'Dolphin Mistral 24B Venice (Free)',
    'roleplay',
    'chat',
    'dolphin',
    true,
    true, -- This is the default
    1,
    '{"nsfw": true, "speed": "medium", "cost": "free", "quality": "high"}'::jsonb
  )
  ON CONFLICT (model_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_active = true,
    is_default = true,
    priority = 1,
    capabilities = EXCLUDED.capabilities,
    updated_at = now();

  -- 2. Dolphin 3.0 Mistral 24B (Free)
  INSERT INTO api_models (
    id, provider_id, model_key, display_name, modality, task, model_family,
    is_active, is_default, priority, capabilities
  )
  VALUES (
    gen_random_uuid(),
    openrouter_id,
    'cognitivecomputations/dolphin3.0-mistral-24b:free',
    'Dolphin 3.0 Mistral 24B (Free)',
    'roleplay',
    'chat',
    'dolphin',
    true,
    false,
    2,
    '{"nsfw": true, "speed": "medium", "cost": "free", "quality": "high"}'::jsonb
  )
  ON CONFLICT (model_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_active = true,
    priority = 2,
    capabilities = EXCLUDED.capabilities,
    updated_at = now();

  -- 3. Mistral Nemo 12B Celeste (Free)
  INSERT INTO api_models (
    id, provider_id, model_key, display_name, modality, task, model_family,
    is_active, is_default, priority, capabilities
  )
  VALUES (
    gen_random_uuid(),
    openrouter_id,
    'nothingiisreal/mn-celeste-12b',
    'Mistral Nemo 12B Celeste (Free)',
    'roleplay',
    'chat',
    'mistral',
    true,
    false,
    3,
    '{"nsfw": true, "speed": "fast", "cost": "free", "quality": "medium"}'::jsonb
  )
  ON CONFLICT (model_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_active = true,
    priority = 3,
    capabilities = EXCLUDED.capabilities,
    updated_at = now();

  -- 4. Llama 3 Lumimaid 70B (Paid - Premium)
  INSERT INTO api_models (
    id, provider_id, model_key, display_name, modality, task, model_family,
    is_active, is_default, priority, capabilities
  )
  VALUES (
    gen_random_uuid(),
    openrouter_id,
    'neversleep/llama-3-lumimaid-70b',
    'Llama 3 Lumimaid 70B (Premium)',
    'roleplay',
    'chat',
    'llama',
    true,
    false,
    4,
    '{"nsfw": true, "speed": "slow", "cost": "medium", "quality": "high"}'::jsonb
  )
  ON CONFLICT (model_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_active = true,
    priority = 4,
    capabilities = EXCLUDED.capabilities,
    updated_at = now();

END $$;

-- Ensure default Replicate image model is set
UPDATE api_models
SET is_default = true
WHERE modality = 'image'
  AND model_key LIKE '%realistic-vision%'
  AND EXISTS (
    SELECT 1 FROM api_providers ap
    WHERE ap.id = api_models.provider_id AND ap.name = 'replicate'
  )
  AND NOT EXISTS (
    SELECT 1 FROM api_models am2
    WHERE am2.modality = 'image' AND am2.is_default = true
  );

-- If no Replicate image model found, set first active one as default
UPDATE api_models
SET is_default = true
WHERE id = (
  SELECT am.id
  FROM api_models am
  JOIN api_providers ap ON am.provider_id = ap.id
  WHERE am.modality = 'image'
    AND am.is_active = true
    AND ap.name = 'replicate'
  ORDER BY am.priority
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM api_models WHERE modality = 'image' AND is_default = true
);
