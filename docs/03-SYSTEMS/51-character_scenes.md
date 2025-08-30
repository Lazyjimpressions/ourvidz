# Table: character_scenes

Purpose: Store generated scene images tied to a character and conversation for Roleplay Chat.

Ownership: Users (via character ownership) and Admins. RLS restricts access to owner/public.

## Schema (from Supabase)
- id uuid pk default gen_random_uuid()
- character_id uuid null fk → characters.id
- conversation_id uuid null fk → conversations.id
- image_url text not null
- scene_prompt text not null
- generation_metadata jsonb default '{}'::jsonb
- job_id uuid null fk → jobs.id
- created_at timestamptz default now()
- updated_at timestamptz default now()

Constraints
- NOT NULL checks on id, image_url, scene_prompt
- PK (id); FKs: character_id → characters.id, conversation_id → conversations.id, job_id → jobs.id

Indexes
- character_scenes_pkey on (id)
- idx_character_scenes_character_id on (character_id)
- idx_character_scenes_conversation_id on (conversation_id)
- idx_character_scenes_created_at on (created_at desc)

Row-Level Security (RLS)
- Create: allowed when character_id belongs to auth.uid()
- Update/Delete/Read: allowed when character_id belongs to auth.uid(); read additionally allows characters.is_public = true

(Policies)
- "Users can create scenes for their characters" (INSERT, with_check on ownership)
- "Users can update their character scenes" (UPDATE, using ownership)
- "Users can delete their character scenes" (DELETE, using ownership)
- "Users can view scenes for their characters" (SELECT, using ownership or public)

## Integration Map
- Pages/Components
  - RoleplayChat.tsx: displays scene gallery; triggers scene generation via `SceneImageGenerator`.
- Hooks/Services
  - useCharacterScenes: fetch scenes for a character.
- Edge Functions
  - Generation callbacks may populate rows; job_id links to workspace grouping.

## Example Queries
- Latest scenes for a character (owned or public)
```sql
select id, image_url, scene_prompt, created_at
from character_scenes
where character_id = :character_id
order by created_at desc
limit 50;
```

- Scenes by conversation (for context)
```sql
select id, image_url, scene_prompt
from character_scenes
where conversation_id = :conversation_id
order by created_at asc;
```
