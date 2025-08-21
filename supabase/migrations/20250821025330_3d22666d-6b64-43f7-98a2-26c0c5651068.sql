-- First, let's see what constraint exists and update it to allow the new values
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_model_type_check;

-- Add a new constraint that allows the proper model types
ALTER TABLE jobs ADD CONSTRAINT jobs_model_type_check 
CHECK (model_type IN ('sdxl', 'wan', 'flux', 'rv51', 'default'));

-- Now update existing jobs with 'default' model_type based on metadata
UPDATE jobs 
SET model_type = CASE
  WHEN metadata->>'model_type' = 'replicate_flux' OR metadata->>'actual_model' LIKE '%flux%' THEN 'flux'
  WHEN metadata->>'model_type' = 'replicate_rv51' OR metadata->>'actual_model' LIKE '%realistic%' THEN 'rv51'
  WHEN job_type LIKE 'wan_%' THEN 'wan'  
  WHEN job_type LIKE 'sdxl_%' THEN 'sdxl'
  ELSE model_type -- Keep existing value if we can't determine
END
WHERE model_type = 'default' OR model_type IS NULL;