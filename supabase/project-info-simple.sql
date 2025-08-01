-- Simple Supabase Project Information
-- Run this in your Supabase SQL Editor

-- 1. Basic Database Information
SELECT 'Database Info' as category, 'PostgreSQL Version' as item, version() as value
UNION ALL
SELECT 'Database Info', 'Current Database', current_database()
UNION ALL
SELECT 'Database Info', 'Current User', current_user
UNION ALL
SELECT 'Database Info', 'Current Schema', current_schema();

-- 2. Storage Buckets
SELECT 
    'Storage' as category,
    'Bucket: ' || name as item,
    'Public: ' || public::text || 
    ', Size Limit: ' || 
    CASE 
        WHEN file_size_limit IS NULL THEN 'No limit'
        ELSE (file_size_limit / 1024 / 1024)::text || 'MB'
    END as value
FROM storage.buckets
ORDER BY name;

-- 3. Table Counts
SELECT 
    'Tables' as category,
    'Total Tables' as item,
    COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    'Tables',
    'Tables with RLS',
    COUNT(*)::text
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- 4. Functions Count
SELECT 
    'Functions' as category,
    'Total Functions' as item,
    COUNT(*)::text as value
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- 5. Triggers Count
SELECT 
    'Triggers' as category,
    'Total Triggers' as item,
    COUNT(*)::text as value
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- 6. Migration History
SELECT 
    'Migrations' as category,
    'Total Migrations' as item,
    COUNT(*)::text as value
FROM supabase_migrations.schema_migrations
UNION ALL
SELECT 
    'Migrations',
    'Migration Files',
    string_agg(version, ', ' ORDER BY version) as value
FROM supabase_migrations.schema_migrations;

-- 7. Data Statistics
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
FROM profiles;

-- 8. Job Types
SELECT 
    'Job System' as category,
    'Active Job Types' as item,
    string_agg(job_type, ', ' ORDER BY job_type) as value
FROM (
    SELECT DISTINCT job_type 
    FROM jobs 
    ORDER BY job_type
) job_types;

-- 9. Indexes Count
SELECT 
    'Performance' as category,
    'Indexes Count' as item,
    COUNT(*)::text as value
FROM pg_indexes 
WHERE schemaname = 'public';

-- 10. Extensions
SELECT 
    'Extensions' as category,
    extname as item,
    extversion as value
FROM pg_extension
ORDER BY extname; 