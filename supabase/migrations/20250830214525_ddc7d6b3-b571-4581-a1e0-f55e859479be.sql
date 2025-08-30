-- Force refresh the linter cache by making a minimal schema change
-- Add a comment to trigger linter refresh
COMMENT ON SCHEMA public IS 'Public schema - updated to refresh linter cache';