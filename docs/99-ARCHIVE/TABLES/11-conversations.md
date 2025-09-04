# Table: conversations

**Last Updated:** December 19, 2024  
**Status:** ✅ Active  
**Purpose:** Chat session management and organization for playground and roleplay

**Ownership:** User  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions (12 total columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- project_id (uuid, nullable) - Foreign key to projects table
- title (text, NOT NULL, default: 'New Conversation') - Conversation title/name
- conversation_type (text, NOT NULL, default: 'general') - Type of conversation (general, roleplay, character_roleplay, admin, creative)
- status (text, NOT NULL, default: 'active') - Conversation status (active, archived, deleted)
- created_at (timestamptz, NOT NULL) - Creation timestamp
- updated_at (timestamptz, NOT NULL) - Last update timestamp
- character_id (uuid, nullable) - Foreign key to characters table
- user_character_id (uuid, nullable) - Foreign key to characters table (user's character)
- memory_tier (text, default: 'conversation') - Memory tier for conversation context
- memory_data (jsonb, default: '{}') - Memory data for conversation context
```

## **RLS Policies**
```sql
-- Users can view their own conversations
CREATE POLICY "Users can view their own conversations" ON conversations
FOR SELECT TO public
USING (auth.uid() = user_id);

-- Users can create their own conversations
CREATE POLICY "Users can create their own conversations" ON conversations
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update their own conversations" ON conversations
FOR UPDATE TO public
USING (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete their own conversations" ON conversations
FOR DELETE TO public
USING (auth.uid() = user_id);
```

## **Integration Map**
- **Pages/Components**
  - Playground Page - Main chat interface
  - ConversationList - Conversation history display
  - ChatInterface - General chat interface
- **Edge Functions**
  - playground-chat - Handles conversation management and message processing
- **Services/Hooks**
  - PlaygroundContext.tsx - React Query loaders & mutations
  - useConversations - Conversation management hook

## **Business Rules**
- **Conversation Ownership**: Each conversation must belong to a user (user_id is NOT NULL)
- **Type Classification**: conversation_type guides template selection and behavior
- **Character Integration**: character_id enables character-specific conversations
- **Project Linking**: project_id links conversations to storyboard projects
- **Status Management**: Conversations can be active, archived, or deleted
- **Auto-Timestamping**: updated_at is automatically updated when messages are added
- **Memory System**: memory_tier and memory_data support conversation context and memory
- **Memory Tiers**: Different memory levels (conversation, session, long-term) for context management

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid-here",
  "project_id": "project-uuid-here",
  "title": "Adventure with Sarah",
  "conversation_type": "character_roleplay",
  "status": "active",
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:15:00Z",
  "character_id": "character-uuid-here",
  "user_character_id": null,
  "memory_tier": "conversation",
  "memory_data": {
    "context": "Adventure in a magical forest",
    "key_events": ["met Sarah", "found ancient map"],
    "character_goals": "find the hidden treasure"
  }
}
```

## **Common Queries**
```sql
-- Get all conversations for current user
SELECT * FROM conversations
WHERE user_id = auth.uid()
ORDER BY updated_at DESC;

-- Get conversations by type
SELECT * FROM conversations
WHERE user_id = auth.uid() AND conversation_type = 'character_roleplay'
ORDER BY updated_at DESC;

-- Get conversations with character details
SELECT c.*, ch.name as character_name, ch.personality
FROM conversations c
LEFT JOIN characters ch ON c.character_id = ch.id
WHERE c.user_id = auth.uid()
ORDER BY c.updated_at DESC;

-- Get conversations for a specific project
SELECT * FROM conversations
WHERE user_id = auth.uid() AND project_id = 'project-uuid-here'
ORDER BY created_at DESC;

-- Get conversation statistics
SELECT 
    conversation_type,
    COUNT(*) as conversation_count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
FROM conversations
WHERE user_id = auth.uid() AND status = 'active'
GROUP BY conversation_type;

-- Update conversation timestamp when new message added
UPDATE conversations 
SET updated_at = now()
WHERE id = 'conversation-uuid-here';
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_conversations_character ON conversations(user_id, character_id);
CREATE INDEX idx_conversations_project ON conversations(user_id, project_id);
CREATE INDEX idx_conversations_type ON conversations(user_id, conversation_type);
```

## **Notes**
- **Template Integration**: conversation_type guides template selection for AI responses
- **Character Roleplay**: character_id enables character-specific conversations and responses
- **Project Integration**: project_id links conversations to storyboard projects
- **Real-time Updates**: WebSocket subscriptions provide live conversation updates
- **Status Management**: Conversations can be archived or deleted while preserving history
- **Performance**: Optimized for user-specific queries and chronological access
