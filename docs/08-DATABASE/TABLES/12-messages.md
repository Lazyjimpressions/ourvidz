# Table: messages

**Last Updated:** December 19, 2024  
**Status:** ✅ Active  
**Purpose:** Individual message storage within conversations for chat and roleplay

**Ownership:** User (via conversation ownership)  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions (6 total columns - simplified structure)
- id (uuid, pk) - Primary key with auto-generated UUID
- conversation_id (uuid, NOT NULL) - Foreign key to conversations table
- sender (text, NOT NULL) - Message sender ('user' | 'assistant')
- content (text, NOT NULL) - Message content
- message_type (text, NOT NULL, default: 'text') - Message type (text, image, system)
- created_at (timestamptz, NOT NULL) - Message timestamp
```

## **RLS Policies**
```sql
-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations" ON messages
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- Users can create messages in their conversations
CREATE POLICY "Users can create messages in their conversations" ON messages
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);
```

## **Integration Map**
- **Pages/Components**
  - Playground Page - Main chat interface
  - RoleplayChat.tsx - Roleplay-specific chat component
  - ChatInterface.tsx - General chat interface
- **Edge Functions**
  - playground-chat - Handles message processing, template selection, and AI responses
  - enhance-prompt - Enhances user messages using templates
- **Services/Hooks**
  - PlaygroundContext.tsx - React Query loaders & mutations
  - useMessages - Message management hook

## **Business Rules**
- **Message Ownership**: Each message must belong to a conversation (conversation_id is NOT NULL)
- **Sender Types**: Messages can be from 'user' or 'assistant' only
- **Message Types**: Support for text, image, and system messages
- **Chronological Order**: Messages are ordered by created_at for conversation flow
- **Conversation Access**: Users can only access messages in their own conversations
- **Simplified Structure**: Streamlined schema focuses on core message functionality
- **No Editing**: Messages cannot be edited once created (immutable design)

## **Example Data**
```json
{
  "id": "msg-uuid-1",
  "conversation_id": "conversation-uuid-here",
  "sender": "user",
  "content": "Hello Sarah, how are you today?",
  "message_type": "text",
  "created_at": "2025-08-30T10:00:00Z"
}
```

## **Common Queries**
```sql
-- Get recent messages for a conversation
SELECT sender, content, created_at 
FROM messages
WHERE conversation_id = 'conversation-uuid-here'
ORDER BY created_at ASC
LIMIT 50;

-- Get message history with conversation details
SELECT m.*, c.conversation_type, c.character_id
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE c.user_id = auth.uid() AND m.conversation_id = 'conversation-uuid-here'
ORDER BY m.created_at ASC;

-- Get messages by sender type
SELECT * FROM messages
WHERE conversation_id = 'conversation-uuid-here' AND sender = 'assistant'
ORDER BY created_at DESC;

-- Get message statistics for a conversation
SELECT 
    sender,
    COUNT(*) as message_count,
    AVG(LENGTH(content)) as avg_message_length
FROM messages
WHERE conversation_id = 'conversation-uuid-here'
GROUP BY sender;

-- Get recent messages across all user conversations
SELECT m.*, c.title as conversation_title
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE c.user_id = auth.uid()
ORDER BY m.created_at DESC
LIMIT 20;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_sender ON messages(conversation_id, sender);
CREATE INDEX idx_messages_type ON messages(conversation_id, message_type);
```

## **Notes**
- **Message History**: Limited to ~20 messages for context to manage token usage
- **Real-time Updates**: WebSocket subscriptions provide live message updates
- **Template Context**: Edge functions use conversation metadata for appropriate template selection
- **Performance**: Message history queries optimized for chronological access
- **Security**: Users can only access messages in their own conversations
