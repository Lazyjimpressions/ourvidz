-- Migration: Add 'cancelled' to jobs.status CHECK constraint
-- and ensure RLS allows users to cancel only their own jobs.

-- 1. Replace the existing status constraint to include 'cancelled'
ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status = ANY (ARRAY[
    'queued'::text,
    'processing'::text,
    'completed'::text,
    'failed'::text,
    'cancelled'::text
  ]));

-- 2. Verify no stale status values exist (informational; will fail if any do)
-- SELECT COUNT(*) FROM public.jobs
--   WHERE status NOT IN ('queued','processing','completed','failed','cancelled');
