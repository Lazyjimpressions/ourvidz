# Table: characters

Purpose: Store user-created/public roleplay characters used across Roleplay Dashboard and Roleplay Chat.

Ownership: Users (own characters) and Admins. RLS enforces access.

## Schema (from Supabase)
- id uuid pk default gen_random_uuid()
- user_id uuid (owner; fk → profiles.id)
- creator_id uuid (optional; fk → profiles.id)
- name text not null
- description text not null
- persona text null
- system_prompt text null
- traits text null (comma-separated; legacy)
- appearance_tags text[] null
- image_url text null
- reference_image_url text null
- voice_tone varchar null
- mood varchar null
- likes_count int default 0
- interaction_count int default 0
- is_public boolean default true
- gender text default 'unspecified'
- content_rating varchar not null default 'sfw'
- created_at timestamptz default now()
- updated_at timestamptz default now()

Checks/Constraints
- CHECK characters_gender_check (enum-like validation)
- CHECK characters_content_rating_check (enum-like validation)
- PK (id), FKs: (user_id → profiles.id), (creator_id → profiles.id)

Indexes
- characters_pkey on (id)
- idx_characters_user_id on (user_id)

Row-Level Security (RLS)
- Policy "Characters access policy": allow admin role, owner (auth.uid() = user_id), or rows with user_id IS NULL; applies to all commands (*).

## Integration Map
- Pages/Components
  - RoleplayDashboard.tsx: browse/filter public characters (`is_public = true`), display cards, start chat.
  - RoleplayChat.tsx: loads character by id; displays traits/tags, scenes, and allows like/interaction increments.
- Hooks/Services
  - usePublicCharacters: list public characters with stats.
  - useCharacterData: fetch single character; like interaction.
  - useCharacterScenes (via character_scenes relation).
- Edge Functions
  - None direct; `playground-chat` reads characters to apply roleplay templates and increments `interaction_count`.

## Example Queries
- Public characters for dashboard
```sql
select * from characters
where is_public = true
order by likes_count desc, interaction_count desc
limit 50;
```

- Increment interaction on chat start
```sql
update characters
set interaction_count = interaction_count + 1,
    updated_at = now()
where id = :character_id
returning interaction_count;
```

- Like a character
```sql
update characters
set likes_count = likes_count + 1,
    updated_at = now()
where id = :character_id
returning likes_count;
```
