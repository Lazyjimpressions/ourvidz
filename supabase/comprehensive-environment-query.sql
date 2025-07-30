-- Comprehensive Supabase Environment Query
-- Run this in the Supabase SQL Editor to get complete environment information

-- ========================================
-- COMBINED ENVIRONMENT QUERY
-- ========================================

-- 1. DATABASE INFORMATION
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

-- 2. TABLES AND SCHEMAS
SELECT 
    'Tables' as category,
    'Total Tables' as item,
    COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'

UNION ALL

-- 3. TABLE DETAILS WITH COLUMNS
SELECT 
    'Table Details' as category,
    table_name || ' - ' || column_name as item,
    data_type || 
    CASE 
        WHEN char_length IS NOT NULL 
        THEN '(' || char_length || ')'
        ELSE ''
    END ||
    CASE 
        WHEN is_nullable = 'NO' THEN ' NOT NULL'
        ELSE ''
    END as value
FROM (
    SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.character_maximum_length as char_length,
        c.is_nullable,
        c.ordinal_position
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.table_schema = 'public'
    ORDER BY t.table_name, c.ordinal_position
) table_details

UNION ALL

-- 4. ROW LEVEL SECURITY (RLS)
SELECT 
    'RLS' as category,
    schemaname || '.' || tablename as item,
    CASE 
        WHEN rowsecurity THEN 'Enabled'
        ELSE 'Disabled'
    END as value
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

-- 5. RLS POLICIES
SELECT 
    'RLS Policies' as category,
    schemaname || '.' || tablename || ' - ' || policyname as item,
    permissive || ' ' || array_to_string(roles, ',') || ' ' || cmd || ' ' || COALESCE(qual, '') as value
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

-- 6. INDEXES
SELECT 
    'Indexes' as category,
    schemaname || '.' || tablename || ' - ' || indexname as item,
    indexdef as value
FROM pg_indexes 
WHERE schemaname = 'public'

UNION ALL

-- 7. FUNCTIONS
SELECT 
    'Functions' as category,
    'Total Functions' as item,
    COUNT(*)::text as value
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'

UNION ALL

-- 8. FUNCTION DETAILS
SELECT 
    'Function Details' as category,
    routine_name as item,
    routine_definition as value
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'

UNION ALL

-- 9. EXTENSIONS
SELECT 
    'Extensions' as category,
    extname as item,
    extversion as value
FROM pg_extension

UNION ALL

-- 10. STORAGE BUCKETS
SELECT 
    'Storage' as category,
    'Bucket: ' || name as item,
    'Public: ' || public::text || ', Size Limit: ' || 
    CASE 
        WHEN file_size_limit IS NULL THEN 'No limit'
        ELSE file_size_limit::text || 'B'
    END || ', Allowed MIME Types: ' || 
    CASE 
        WHEN allowed_mime_types IS NULL THEN 'All'
        ELSE array_to_string(allowed_mime_types, ',')
    END as value
FROM storage.buckets

UNION ALL

-- 11. MIGRATIONS
SELECT 
    'Migrations' as category,
    'Total Migrations' as item,
    COUNT(*)::text as value
FROM supabase_migrations.schema_migrations

UNION ALL

-- 12. MIGRATION DETAILS
SELECT 
    'Migration Details' as category,
    version as item,
    array_to_string(statements, '; ') as value
FROM supabase_migrations.schema_migrations

UNION ALL

-- 13. DATA STATISTICS
SELECT 
    'Data Stats' as category,
    'Images Count' as item,
    COUNT(*)::text as value
FROM images
UNION ALL
SELECT 
    'Data Stats',
    'Videos Count',
    COUNT(*)::text as value
FROM videos
UNION ALL
SELECT 
    'Data Stats',
    'Jobs Count',
    COUNT(*)::text as value
FROM jobs
UNION ALL
SELECT 
    'Data Stats',
    'Users Count',
    COUNT(*)::text as value
FROM auth.users
UNION ALL
SELECT 
    'Data Stats',
    'Projects Count',
    COUNT(*)::text as value
FROM projects
UNION ALL
SELECT 
    'Data Stats',
    'Characters Count',
    COUNT(*)::text as value
FROM characters
UNION ALL
SELECT 
    'Data Stats',
    'Conversations Count',
    COUNT(*)::text as value
FROM conversations
UNION ALL
SELECT 
    'Data Stats',
    'Messages Count',
    COUNT(*)::text as value
FROM messages
UNION ALL
SELECT 
    'Data Stats',
    'Scenes Count',
    COUNT(*)::text as value
FROM scenes
UNION ALL
SELECT 
    'Data Stats',
    'Profiles Count',
    COUNT(*)::text as value
FROM profiles
UNION ALL
SELECT 
    'Data Stats',
    'Model Test Results Count',
    COUNT(*)::text as value
FROM model_test_results
UNION ALL
SELECT 
    'Data Stats',
    'Usage Logs Count',
    COUNT(*)::text as value
FROM usage_logs
UNION ALL
SELECT 
    'Data Stats',
    'User Activity Logs Count',
    COUNT(*)::text as value
FROM user_activity_log

UNION ALL

-- 14. JOB SYSTEM STATISTICS
SELECT 
    'Job System' as category,
    'Active Job Types' as item,
    STRING_AGG(DISTINCT job_type, ', ') as value
FROM jobs
WHERE status IN ('pending', 'processing', 'queued')

UNION ALL

-- 15. RECENT JOBS (last 10)
SELECT 
    'Recent Jobs' as category,
    'Job: ' || id || ' - ' || job_type as item,
    'Status: ' || status || ', Created: ' || created_at::text as value
FROM (
    SELECT id, job_type, status, created_at
    FROM jobs
    ORDER BY created_at DESC
    LIMIT 10
) recent_jobs

UNION ALL

-- 16. TABLE ROW COUNTS
SELECT 
    'Table Row Counts' as category,
    schemaname || '.' || relname as item,
    n_tup_ins::text as value
FROM pg_stat_user_tables
WHERE schemaname = 'public'

UNION ALL

-- 17. PERFORMANCE STATISTICS
SELECT 
    'Performance' as category,
    'Indexes Count' as item,
    COUNT(*)::text as value
FROM pg_indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Performance',
    'Tables Count',
    COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'

UNION ALL

-- 18. SECURITY OVERVIEW
SELECT 
    'Security' as category,
    'Tables with RLS' as item,
    COUNT(*)::text as value
FROM pg_tables 
WHERE schemaname = 'public' 
    AND rowsecurity = true
UNION ALL
SELECT 
    'Security',
    'Total RLS Policies',
    COUNT(*)::text as value
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

-- 19. EDGE FUNCTIONS
SELECT 
    'Edge Functions' as category,
    'Available Functions' as item,
    'queue-job, job-callback, enhance-prompt, generate-admin-image, get-active-worker-url, register-chat-worker, update-worker-url, playground-chat, validate-enhancement-fix' as value

ORDER BY category, item; 