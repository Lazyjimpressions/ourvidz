-- Supabase Environment Information
-- Run this in your Supabase SQL editor and save the results

-- 1. Project Information
SELECT 
    'Project Info' as category,
    'Database Version' as item,
    version() as value
UNION ALL
SELECT 
    'Project Info',
    'Current Database',
    current_database()
UNION ALL
SELECT 
    'Project Info',
    'Current User',
    current_user
UNION ALL
SELECT 
    'Project Info',
    'Current Schema',
    current_schema();

-- 2. Table Counts and Sizes
SELECT 
    'Database Stats' as category,
    'Total Tables' as item,
    COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    'Database Stats',
    'Total Functions',
    COUNT(*)::text
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
UNION ALL
SELECT 
    'Database Stats',
    'Total Triggers',
    COUNT(*)::text
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
UNION ALL
SELECT 
    'Database Stats',
    'Total Storage Buckets',
    COUNT(*)::text
FROM storage.buckets;

-- 3. RLS Policy Summary
SELECT 
    'Security' as category,
    'Tables with RLS' as item,
    COUNT(DISTINCT tablename)::text as value
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Security',
    'Total RLS Policies',
    COUNT(*)::text
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Security',
    'Storage Policies',
    COUNT(*)::text
FROM pg_policies 
WHERE schemaname = 'storage';

-- 4. Job Types Supported
SELECT 
    'Job System' as category,
    'Supported Job Types' as item,
    string_agg(job_type, ', ' ORDER BY job_type) as value
FROM (
    SELECT DISTINCT job_type 
    FROM jobs 
    ORDER BY job_type
) job_types;

-- 5. Storage Bucket Configuration
SELECT 
    'Storage' as category,
    'Bucket: ' || name as item,
    'Size Limit: ' || 
    CASE 
        WHEN file_size_limit IS NULL THEN 'No limit'
        ELSE (file_size_limit / 1024 / 1024)::text || 'MB'
    END ||
    ', Public: ' || public::text as value
FROM storage.buckets
ORDER BY name;

-- 6. Recent Migration Activity
SELECT 
    'Migrations' as category,
    'Latest Migration' as item,
    MAX(created_at)::text as value
FROM supabase_migrations.schema_migrations
UNION ALL
SELECT 
    'Migrations',
    'Total Migrations',
    COUNT(*)::text
FROM supabase_migrations.schema_migrations;

-- 7. Edge Functions Status
SELECT 
    'Edge Functions' as category,
    'Functions Available' as item,
    'queue-job, job-callback, generate-admin-image' as value;

-- 8. Realtime Configuration
SELECT 
    'Realtime' as category,
    'Tables with Realtime' as item,
    string_agg(tablename, ', ' ORDER BY tablename) as value
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
    AND replica_identity IS NOT NULL;

-- 9. Performance Indexes
SELECT 
    'Performance' as category,
    'Indexes Count' as item,
    COUNT(*)::text as value
FROM pg_indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Performance',
    'Tables with Indexes',
    COUNT(DISTINCT tablename)::text
FROM pg_indexes 
WHERE schemaname = 'public';

-- 10. Current Data Volume (Sample)
SELECT 
    'Data Volume' as category,
    'Images Count' as item,
    COUNT(*)::text as value
FROM images
UNION ALL
SELECT 
    'Data Volume',
    'Videos Count',
    COUNT(*)::text
FROM videos
UNION ALL
SELECT 
    'Data Volume',
    'Jobs Count',
    COUNT(*)::text
FROM jobs
UNION ALL
SELECT 
    'Data Volume',
    'Users Count',
    COUNT(*)::text
FROM profiles; 