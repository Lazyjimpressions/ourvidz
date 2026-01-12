-- Scheduled Job Setup for sync-provider-balances
-- Note: Supabase may not support pg_cron directly. Use one of the options below:

-- Option 1: If pg_cron extension is available (Supabase Pro/Enterprise)
-- Uncomment the following lines:

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 
-- SELECT cron.schedule(
--   'sync-provider-balances',
--   '0 */6 * * *', -- Every 6 hours
--   $$
--   SELECT net.http_post(
--     url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/sync-provider-balances',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer [YOUR-SERVICE-ROLE-KEY]',
--       'Content-Type', 'application/json'
--     )
--   );
--   $$
-- );

-- Option 2: Use external cron service (Recommended for Supabase Free/Pro)
-- Set up a cron job on an external service (e.g., cron-job.org, GitHub Actions) to call:
-- POST https://[YOUR-PROJECT-REF].supabase.co/functions/v1/sync-provider-balances
-- Headers: Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]
-- 
-- Recommended schedule: Every 6 hours (0 */6 * * *)
-- 
-- Example curl command for testing:
-- curl -X POST https://[YOUR-PROJECT-REF].supabase.co/functions/v1/sync-provider-balances \
--   -H "Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]" \
--   -H "Content-Type: application/json"

-- Option 3: Manual sync via admin UI
-- The sync-provider-balances function can also be called manually from the admin dashboard
