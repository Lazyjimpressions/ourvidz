# Database Tables – Reference & Integration Map

This folder documents the key tables powering prompting, chat, and the library-first workspace. Each table doc includes: schema overview, integration map (pages/components/edge functions), behavior rules, and example queries.

## Index
- prompt_templates: docs/tables/prompt_templates.md
- system_config (cache JSON): docs/tables/system_config_cache.md
- conversations & messages: docs/tables/conversations_messages.md
- jobs: docs/tables/jobs.md
- images & videos (library): docs/tables/images_videos.md
- characters (roleplay): docs/tables/characters.md
- character_scenes (roleplay): docs/tables/character_scenes.md

## Manual schema snapshot (run in Supabase SQL editor)
Paste the output into the specific table doc when updating schema. Replace `<table>`.

- Columns
```sql
select
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = '<table>'
order by c.ordinal_position;
```

- Primary/foreign keys and constraints
```sql
select
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name as foreign_table,
  ccu.column_name as foreign_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name = '<table>'
order by tc.constraint_type, tc.constraint_name, kcu.ordinal_position;
```

- Indexes
```sql
select
  tablename as table_name,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = '<table>'
order by indexname;
```

- Row-level security policies (if used)
```sql
select
  c.relname as table_name,
  p.polname as policy_name,
  p.polroles,
  pg_get_expr(p.polqual, p.polrelid) as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr,
  p.polcmd as command
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = '<table>'
order by policy_name;
```

## Full project snapshots
- Supabase docs: supabase/schema-documentation.sql
- Project info: supabase/project-info.sql, supabase/project-info-simple.sql

## Conventions
- All prompts/templates flow from DB → edge functions (pure inference) → workers.
- Never hardcode prompts in workers; use DB + cache only.
- Document variable placeholders (e.g., `{{character_name}}`) in the table doc where applicable.
