
-- Tighten RLS for api_providers: restrict reads to authenticated users only

-- 1) Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.api_providers ENABLE ROW LEVEL SECURITY;

-- 2) Drop the broad public read policy (if it exists)
DROP POLICY IF EXISTS "Active providers readable (public fields only)" ON public.api_providers;

-- 3) Create authenticated-only read policy
CREATE POLICY "Active providers readable (authenticated only)"
ON public.api_providers
FOR SELECT
USING (
  is_active = true
  AND auth.uid() IS NOT NULL
);

-- Note:
-- - The existing admin policy "Admins can manage providers" (ALL) remains in place,
--   so admins keep full access to manage (and read) providers.
