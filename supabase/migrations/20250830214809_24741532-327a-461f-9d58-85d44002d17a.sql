-- Enforce invoker security on public view(s)
ALTER VIEW public.profiles_public SET (security_invoker = true);

COMMENT ON VIEW public.profiles_public IS 'Security-invoker view: enforces permissions and RLS of the querying user.';