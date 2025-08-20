
-- Ensure Realtime publishes full row data and tables are in the supabase_realtime publication

-- 1) Enable REPLICA IDENTITY FULL (safe to run repeatedly)
ALTER TABLE public.workspace_assets REPLICA IDENTITY FULL;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

-- 2) Add tables to the supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'workspace_assets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_assets;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;
END
$$;
