
-- Update the videos status check constraint to include 'queued' and 'processing'
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_status_check;

-- Add the updated constraint with all necessary status values
ALTER TABLE public.videos ADD CONSTRAINT videos_status_check 
CHECK (status IN ('draft', 'queued', 'processing', 'generating', 'completed', 'failed', 'cancelled'));
