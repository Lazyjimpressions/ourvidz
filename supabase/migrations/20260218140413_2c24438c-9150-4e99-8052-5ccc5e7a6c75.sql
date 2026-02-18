
-- Add default_for_tasks array column
ALTER TABLE api_models 
  ADD COLUMN default_for_tasks text[] NOT NULL DEFAULT '{}';

-- Migrate existing defaults: copy the task value into the array
UPDATE api_models 
  SET default_for_tasks = ARRAY[task] 
  WHERE is_default = true;

-- Create GIN index for contains queries
CREATE INDEX idx_api_models_default_for_tasks ON api_models USING GIN(default_for_tasks);
