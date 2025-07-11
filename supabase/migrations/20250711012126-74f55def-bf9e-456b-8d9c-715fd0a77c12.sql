-- Phase 2: Function Security Enhancement - Set search_path for remaining public functions
-- This prevents search path injection and ensures consistent behavior

-- Set search_path for video-related functions
ALTER FUNCTION public.get_video_path_stats() SET search_path = public;
ALTER FUNCTION public.is_url_expired(expires_at timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.validate_completed_video_urls() SET search_path = public;
ALTER FUNCTION public.validate_video_path_consistency() SET search_path = public;

-- Add documentation comment
COMMENT ON SCHEMA public IS 'All public functions now have search_path = public for security and consistency';