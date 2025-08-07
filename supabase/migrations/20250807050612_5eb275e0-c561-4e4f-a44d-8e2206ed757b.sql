-- Update job-callback edge function to save character scenes when jobs complete
-- This will be handled by edge function logic, but we need to ensure proper relations exist

-- Add job_id foreign key constraint to character_scenes if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'character_scenes_job_id_fkey'
    ) THEN
        ALTER TABLE character_scenes 
        ADD CONSTRAINT character_scenes_job_id_fkey 
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
    END IF;
END $$;