# Supabase Inventory – Single Command

Run this one SQL in Supabase online to generate the definitive inventory (one row per base table in `public`) with aggregated columns, primary keys, foreign keys, unique and check constraints, and indexes.

```sql
with base_tables as (
  select table_name
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
),
column_info as (
  select
    c.table_name,
    json_agg(
      json_build_object(
        'ordinal_position', c.ordinal_position,
        'column_name', c.column_name,
        'data_type', c.data_type,
        'udt', c.udt_name,
        'is_nullable', c.is_nullable,
        'column_default', c.column_default
      ) order by c.ordinal_position
    ) as columns
  from information_schema.columns c
  where c.table_schema = 'public'
  group by c.table_name
),
pk_info as (
  select
    tc.table_name,
    json_agg(kcu.column_name order by kcu.ordinal_position) as primary_key
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
    and kcu.table_schema = tc.table_schema
  where tc.table_schema = 'public' and tc.constraint_type = 'PRIMARY KEY'
  group by tc.table_name
),
fk_info as (
  select
    tc.table_name,
    json_agg(
      json_build_object(
        'column', kcu.column_name,
        'foreign_table', ccu.table_name,
        'foreign_column', ccu.column_name,
        'constraint_name', tc.constraint_name
      ) order by kcu.ordinal_position
    ) as foreign_keys
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
    and kcu.table_schema = tc.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
    and ccu.table_schema = tc.table_schema
  where tc.table_schema = 'public' and tc.constraint_type = 'FOREIGN KEY'
  group by tc.table_name
),
unique_info as (
  select
    tc.table_name,
    json_agg(
      json_build_object(
        'constraint_name', tc.constraint_name,
        'columns', (
          select json_agg(k2.column_name order by k2.ordinal_position)
          from information_schema.key_column_usage k2
          where k2.constraint_name = tc.constraint_name
            and k2.table_schema = tc.table_schema
        )
      ) order by tc.constraint_name
    ) as unique_constraints
  from information_schema.table_constraints tc
  where tc.table_schema = 'public' and tc.constraint_type = 'UNIQUE'
  group by tc.table_name
),
check_info as (
  select
    tc.table_name,
    json_agg(
      json_build_object(
        'constraint_name', tc.constraint_name,
        'definition', pg_get_constraintdef(pc.oid, true)
      ) order by tc.constraint_name
    ) as check_constraints
  from information_schema.table_constraints tc
  join pg_constraint pc on pc.conname = tc.constraint_name
  join pg_class rel on rel.oid = pc.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where tc.table_schema = 'public' and tc.constraint_type = 'CHECK' and n.nspname = 'public'
  group by tc.table_name
),
index_info as (
  select
    tablename as table_name,
    json_agg(
      json_build_object(
        'index_name', indexname,
        'indexdef', indexdef
      ) order by indexname
    ) as indexes
  from pg_indexes
  where schemaname = 'public'
  group by tablename
)
select
  t.table_name,
  coalesce(ci.columns, '[]'::json) as columns,
  coalesce(pk.primary_key, '[]'::json) as primary_key,
  coalesce(fk.foreign_keys, '[]'::json) as foreign_keys,
  coalesce(uq.unique_constraints, '[]'::json) as unique_constraints,
  coalesce(ch.check_constraints, '[]'::json) as check_constraints,
  coalesce(ix.indexes, '[]'::json) as indexes
from base_tables t
left join column_info ci on ci.table_name = t.table_name
left join pk_info pk on pk.table_name = t.table_name
left join fk_info fk on fk.table_name = t.table_name
left join unique_info uq on uq.table_name = t.table_name
left join check_info ch on ch.table_name = t.table_name
left join index_info ix on ix.table_name = t.table_name
order by t.table_name;
```
