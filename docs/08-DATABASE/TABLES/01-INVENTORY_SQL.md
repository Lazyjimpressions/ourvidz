# Supabase Inventory – Working SQL Commands

Run these SQL commands in Supabase online SQL editor to get current schema information.

## 1. Simple Table List (Start Here)

```sql
-- Get all tables in public schema
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

## 2. Detailed Table Information

```sql
-- Get detailed information for a specific table (replace 'table_name' with actual table)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'  -- Change this to the table you want
ORDER BY ordinal_position;
```

## 3. All Tables with Column Counts

```sql
-- Get all tables with their column information
SELECT 
    t.table_name,
    json_agg(
        json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default,
            'ordinal_position', c.ordinal_position
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

## 4. Foreign Key Relationships

```sql
-- Get foreign key relationships
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

## 5. Primary Keys

```sql
-- Get primary keys
SELECT 
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
    AND kcu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;
```

## 6. Indexes

```sql
-- Get indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## 7. Storage Buckets

```sql
-- Get storage bucket information
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
ORDER BY name;
```

## Usage Instructions

1. **Start with command #1** to see all your tables
2. **Use command #2** to get details for specific tables (change the table name)
3. **Use command #3** to get all tables with their columns in JSON format
4. **Use commands #4-6** to get relationships, keys, and indexes
5. **Use command #7** to get storage bucket information

## For Documentation Updates

After running these commands, you can:
1. Copy the results and update the individual table documentation files
2. Use the JSON output from command #3 to populate schema sections
3. Use the foreign key information to document relationships
4. Use the bucket information to update bucket documentation files
