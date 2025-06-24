
-- Update credits_consumed column to support decimal values
ALTER TABLE public.usage_logs 
ALTER COLUMN credits_consumed TYPE NUMERIC(10,2);

-- Update the default value to maintain consistency
ALTER TABLE public.usage_logs 
ALTER COLUMN credits_consumed SET DEFAULT 1.0;
