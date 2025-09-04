# Database Schema Inventory - SQL Commands

**Last Updated:** August 30, 2025  
**Status:** ✅ Active - All 25 tables documented

## **Overview**

This file contains SQL commands to query and analyze the current Supabase database schema. Use these commands in the Supabase online SQL editor to get real-time schema information.

---

## **1. Complete Table Inventory**

```sql
-- Get all tables with column counts and basic info
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = t.table_name) as column_count,
    (SELECT COUNT(*) FROM information_schema.table_constraints 
     WHERE table_name = t.table_name AND constraint_type = 'FOREIGN KEY') as foreign_key_count,
    (SELECT COUNT(*) FROM information_schema.table_constraints 
     WHERE table_name = t.table_name AND constraint_type = 'PRIMARY KEY') as primary_key_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

---

## **2. Detailed Schema for Specific Tables**

```sql
-- Get detailed schema for any table (replace 'table_name' with actual table)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position,
    CASE 
        WHEN character_maximum_length IS NOT NULL 
        THEN data_type || '(' || character_maximum_length || ')'
        ELSE data_type 
    END as full_data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'  -- Change this to the table you want
ORDER BY ordinal_position;
```

---

## **3. Complete Schema Export (JSON)**

```sql
-- Get all tables with their complete schema in JSON format
SELECT 
    t.table_name,
    json_agg(
        json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default,
            'ordinal_position', c.ordinal_position,
            'full_data_type', 
                CASE 
                    WHEN c.character_maximum_length IS NOT NULL 
                    THEN c.data_type || '(' || c.character_maximum_length || ')'
                    ELSE c.data_type 
                END
        ) ORDER BY c.ordinal_position
    ) as columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON c.table_name = t.table_name 
    AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;
```

---

## **4. Foreign Key Relationships**

```sql
-- Get all foreign key relationships
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name,
    CASE 
        WHEN tc.delete_rule = 'CASCADE' THEN 'CASCADE'
        WHEN tc.delete_rule = 'SET NULL' THEN 'SET NULL'
        WHEN tc.delete_rule = 'RESTRICT' THEN 'RESTRICT'
        ELSE tc.delete_rule
    END as delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

---

## **5. Primary Keys and Unique Constraints**

```sql
-- Get primary keys and unique constraints
SELECT 
    tc.table_name,
    kcu.column_name,
    tc.constraint_type,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
    AND kcu.table_schema = tc.table_schema
WHERE tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, kcu.ordinal_position;
```

---

## **6. Indexes and Performance**

```sql
-- Get all indexes with their definitions
SELECT 
    tablename,
    indexname,
    indexdef,
    CASE 
        WHEN indexdef LIKE '%UNIQUE%' THEN 'UNIQUE'
        ELSE 'NON-UNIQUE'
    END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## **7. RLS Policies**

```sql
-- Get all Row Level Security policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## **8. Storage Buckets**

```sql
-- Get storage bucket information
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
ORDER BY name;
```

---

## **9. Table Size and Statistics**

```sql
-- Get table sizes and row counts
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    (SELECT reltuples::bigint FROM pg_class WHERE relname = tablename) as estimated_rows
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## **10. Data Type Analysis**

```sql
-- Get data type distribution across tables
SELECT 
    data_type,
    COUNT(*) as column_count,
    COUNT(DISTINCT table_name) as table_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY data_type
ORDER BY column_count DESC;
```

---

## **Usage Instructions**

### **For Documentation Updates:**
1. **Start with command #1** to see all tables and their basic info
2. **Use command #2** to get detailed schema for specific tables
3. **Use command #3** to export complete schema for documentation updates
4. **Use command #4** to understand table relationships
5. **Use command #7** to verify RLS policies

### **For Performance Analysis:**
1. **Use command #6** to review indexes
2. **Use command #9** to check table sizes and row counts
3. **Use command #10** to analyze data type usage

### **For Storage Management:**
1. **Use command #8** to review storage buckets
2. **Use command #9** to identify large tables

---

## **Documentation Integration**

After running these commands:

1. **Update individual table files** with current schema information
2. **Verify RLS policies** match documented policies
3. **Check foreign key relationships** for accuracy
4. **Update the main inventory** (`00-INVENTORY.md`) with any changes
5. **Review table sizes** for performance optimization opportunities

---

## **Quick Reference - Table Categories**

### **User Management (3 tables)**
- `profiles` - User profiles and authentication
- `user_roles` - Role-based access control
- `user_activity_log` - Activity tracking

### **Content Generation (3 tables)**
- `jobs` - Generation job queue
- `user_library` - Permanent content storage
- `workspace_assets` - Temporary workspace content

### **Character System (4 tables)**
- `characters` - Character definitions
- `character_scenes` - Character-scene relationships
- `scenes` - Scene definitions
- `projects` - Project management

### **Chat System (2 tables)**
- `conversations` - Chat sessions
- `messages` - Individual messages

### **System Configuration (7 tables)**
- `api_providers` - API provider config
- `api_models` - Model configurations
- `prompt_templates` - Prompt templates
- `negative_prompts` - Negative prompt presets
- `enhancement_presets` - Enhancement configurations
- `compel_configs` - Compel settings
- `system_config` - System configuration

### **Analytics & Monitoring (6 tables)**
- `usage_logs` - Usage analytics
- `model_performance_logs` - Performance metrics
- `model_config_history` - Configuration history
- `model_test_results` - Testing results
- `prompt_ab_tests` - A/B testing
- `admin_development_progress` - Development tracking

---

**Note**: All 25 tables are fully documented in individual files. This SQL inventory provides the tools to keep documentation current and accurate.
