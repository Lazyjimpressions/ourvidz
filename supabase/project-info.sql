-- Supabase Project Information Queries
-- Run these in your Supabase SQL Editor (not terminal)

-- 1. Basic Database Information
SELECT 
    'Database Info' as category,
    'PostgreSQL Version' as item,
    version() as value
UNION ALL
SELECT 
    'Database Info',
    'Current Database',
    current_database()
UNION ALL
SELECT 
    'Database Info',
    'Current User',
    current_user
UNION ALL
SELECT 
    'Database Info',
    'Current Schema',
    current_schema()
UNION ALL
SELECT 
    'Database Info',
    'Current Timezone',
    current_setting('timezone');

-- 2. Supabase Extensions
SELECT 
    'Extensions' as category,
    extname as item,
    extversion as value
FROM pg_extension
ORDER BY extname;

-- 3. Storage Buckets Configuration
SELECT 
    'Storage' as category,
    'Bucket: ' || name as item,
    'Public: ' || public::text || 
    ', Size Limit: ' || 
    CASE 
        WHEN file_size_limit IS NULL THEN 'No limit'
        ELSE (file_size_limit / 1024 / 1024)::text || 'MB'
    END ||
    ', MIME Types: ' || array_to_string(allowed_mime_types, ', ') as value
FROM storage.buckets
ORDER BY name;

-- 4. Realtime Configuration
SELECT 
    'Realtime' as category,
    'Tables with Realtime' as item,
    string_agg(relname, ', ' ORDER BY relname) as value
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
    AND replica_identity IS NOT NULL
UNION ALL
SELECT 
    'Realtime',
    'Realtime Publication',
    'supabase_realtime' as value;

-- 5. RLS Policies Summary
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

-- 6. Edge Functions Status (from database perspective)
SELECT 
    'Edge Functions' as category,
    'Functions Available' as item,
    'queue-job, job-callback, generate-admin-image' as value
UNION ALL
SELECT 
    'Edge Functions',
    'JWT Verification',
    'queue-job: enabled, job-callback: disabled, generate-admin-image: disabled' as value;

-- 7. Migration History
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
FROM supabase_migrations.schema_migrations
UNION ALL
SELECT 
    'Migrations',
    'Migration Files',
    string_agg(version, ', ' ORDER BY created_at DESC) as value
FROM supabase_migrations.schema_migrations;

-- 8. Current Data Statistics
SELECT 
    'Data Stats' as category,
    'Images Count' as item,
    COUNT(*)::text as value
FROM images
UNION ALL
SELECT 
    'Data Stats',
    'Videos Count',
    COUNT(*)::text
FROM videos
UNION ALL
SELECT 
    'Data Stats',
    'Jobs Count',
    COUNT(*)::text
FROM jobs
UNION ALL
SELECT 
    'Data Stats',
    'Users Count',
    COUNT(*)::text
FROM profiles
UNION ALL
SELECT 
    'Data Stats',
    'Projects Count',
    COUNT(*)::text
FROM projects;

-- 9. Job Types Currently in Use
SELECT 
    'Job System' as category,
    'Active Job Types' as item,
    string_agg(job_type, ', ' ORDER BY job_type) as value
FROM (
    SELECT DISTINCT job_type 
    FROM jobs 
    ORDER BY job_type
) job_types;

-- 10. Performance Indexes
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

-- 11. Test query to see available columns
SELECT 
    'Debug' as category,
    'pg_policies columns' as item,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as value
FROM information_schema.columns 
WHERE table_name = 'pg_policies' 
    AND table_schema = 'pg_catalog'; 