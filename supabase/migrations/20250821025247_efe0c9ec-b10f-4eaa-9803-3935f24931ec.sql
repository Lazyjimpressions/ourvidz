-- Update existing jobs with 'default' model_type based on metadata
UPDATE jobs 
SET model_type = CASE
  WHEN metadata->>'model_type' = 'replicate_flux' OR metadata->>'actual_model' LIKE '%flux%' THEN 'flux'
  WHEN metadata->>'model_type' = 'replicate_rv51' OR metadata->>'actual_model' LIKE '%realistic%' THEN 'rv51'
  WHEN job_type LIKE 'wan_%' THEN 'wan'
  WHEN job_type LIKE 'sdxl_%' THEN 'sdxl'
  ELSE model_type -- Keep existing value if we can't determine
END
WHERE model_type = 'default' OR model_type IS NULL;