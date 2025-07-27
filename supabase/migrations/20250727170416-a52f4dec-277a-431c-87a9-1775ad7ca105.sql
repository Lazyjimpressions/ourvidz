-- Add chat worker URL to system config
UPDATE system_config 
SET config = config || jsonb_build_object(
  'chatWorkerUrl', null,
  'chatWorkerRegistrationInfo', jsonb_build_object(
    'auto_registered', false,
    'last_health_check', null,
    'health_status', 'unknown',
    'last_updated', null
  ),
  'workerHealthCache', jsonb_build_object(
    'chatWorker', jsonb_build_object(
      'isHealthy', false,
      'lastChecked', null,
      'responseTimeMs', null
    ),
    'wanWorker', jsonb_build_object(
      'isHealthy', false, 
      'lastChecked', null,
      'responseTimeMs', null
    )
  )
)
WHERE id = 1;

-- Ensure system_config record exists
INSERT INTO system_config (id, config) 
SELECT 1, jsonb_build_object(
  'chatWorkerUrl', null,
  'chatWorkerRegistrationInfo', jsonb_build_object(
    'auto_registered', false,
    'last_health_check', null,
    'health_status', 'unknown',
    'last_updated', null
  ),
  'workerHealthCache', jsonb_build_object(
    'chatWorker', jsonb_build_object(
      'isHealthy', false,
      'lastChecked', null,
      'responseTimeMs', null
    ),
    'wanWorker', jsonb_build_object(
      'isHealthy', false,
      'lastChecked', null, 
      'responseTimeMs', null
    )
  )
)
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE id = 1);