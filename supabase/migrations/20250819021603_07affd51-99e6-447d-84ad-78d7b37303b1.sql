-- Add thumbnail_path, width, height to workspace_assets
ALTER TABLE public.workspace_assets ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;
ALTER TABLE public.workspace_assets ADD COLUMN IF NOT EXISTS width INT;
ALTER TABLE public.workspace_assets ADD COLUMN IF NOT EXISTS height INT;

-- Add width, height to user_library (thumbnail_path already exists)
ALTER TABLE public.user_library ADD COLUMN IF NOT EXISTS width INT;
ALTER TABLE public.user_library ADD COLUMN IF NOT EXISTS height INT;

-- Create index for fast library list queries
CREATE INDEX IF NOT EXISTS idx_user_library_user_created ON public.user_library (user_id, created_at DESC);

-- Drop foreign key constraint from jobs table first
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_workspace_session_id_fkey;

-- Drop unused tables
DROP TABLE IF EXISTS public.workspace_items;
DROP TABLE IF EXISTS public.workspace_sessions;