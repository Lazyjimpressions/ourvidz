# Tables: conversations & messages

Purpose: Persist chat sessions and message history for Playground/Roleplay.

## conversations (key columns)
- id (uuid, pk)
- user_id (uuid)
- project_id (uuid|null)
- character_id (uuid|null)
- title (text)
- conversation_type (text) – general | roleplay | character_roleplay | admin | creative
- status (text)
- created_at, updated_at (timestamptz)

## messages (key columns)
- id (uuid, pk)
- conversation_id (uuid, fk)
- sender (text) – 'user' | 'assistant'
- content (text)
- message_type (text)
- created_at (timestamptz)

## Integration Map
- Pages/Components
  - RoleplayChat.tsx (reads/writes via PlaygroundContext)
  - Playground ChatInterface.tsx (reads/writes via PlaygroundContext)
- Edge Functions
  - playground-chat (auth, ownership checks; inserts user message; fetches history; inserts assistant reply; updates `conversations.updated_at`)
- Services/Hooks
  - src/contexts/PlaygroundContext.tsx (React Query loaders & mutations)

## Behavior
- Message history ordered by created_at ascending; typical limit ~20 for context.
- `conversation_type` guides template context selection in edge function.

## Example Queries
- Load conversations for user
```sql
select * from conversations
where user_id = auth.uid()
order by updated_at desc;
```

- Load recent messages for a conversation
```sql
select sender, content, created_at from messages
where conversation_id = :conversation_id
order by created_at asc
limit 50;
```
