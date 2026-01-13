-- Backfill fal.ai costs using static pricing for historical records with NULL cost_usd
-- This updates existing api_usage_logs entries that were logged before cost tracking was deployed

UPDATE api_usage_logs l
SET 
  cost_usd = CASE 
    WHEN m.model_key LIKE '%seedream%v4.5%edit%' OR m.model_key LIKE '%seedream/v4.5/edit%' THEN 0.035
    WHEN m.model_key LIKE '%seedream%v4%' OR m.model_key LIKE '%seedream/v4%' THEN 0.025
    WHEN m.model_key LIKE '%wan%i2v%' OR m.model_key LIKE '%wan-i2v%' OR m.model_key LIKE '%wan/i2v%' THEN 0.25
    ELSE 0.03
  END,
  provider_metadata = COALESCE(l.provider_metadata, '{}'::jsonb) || 
    jsonb_build_object(
      'cost_source', 'backfill_static_pricing',
      'backfilled_at', NOW()::text
    )
FROM api_models m
JOIN api_providers p ON m.provider_id = p.id
WHERE l.model_id = m.id
  AND l.cost_usd IS NULL
  AND p.name = 'fal';