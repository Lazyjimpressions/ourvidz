# Table: characters

**Last Updated:** December 19, 2024  
**Status:** ✅ Active  
**Purpose:** Character profiles and definitions for roleplay and storyboard systems

**Ownership:** User  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions (26 total columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, nullable) - Foreign key to profiles table (creator)
- name (text, NOT NULL) - Character name
- description (text, NOT NULL) - Character description
- traits (text, nullable) - Character personality traits
- appearance_tags (text[], nullable) - Array of appearance tags
- image_url (text, nullable) - Character image URL
- created_at (timestamptz, default: now()) - Creation timestamp
- updated_at (timestamptz, default: now()) - Last update timestamp
- persona (text, nullable) - Character persona/personality
- system_prompt (text, nullable) - System prompt for character behavior
- voice_tone (varchar(50), nullable) - Character voice tone
- mood (varchar(50), nullable) - Character mood
- creator_id (uuid, nullable) - Foreign key to profiles table (original creator)
- likes_count (integer, default: 0) - Number of likes
- interaction_count (integer, default: 0) - Number of interactions
- reference_image_url (text, nullable) - Reference image for generation
- is_public (boolean, default: true) - Whether character is public
- gender (text, default: 'unspecified') - Character gender
- content_rating (varchar(10), NOT NULL, default: 'sfw') - Content rating (sfw/nsfw)
- role (text, default: 'ai') - Character role (ai/user)
- consistency_method (text, default: 'i2i_reference') - Method for maintaining consistency
- seed_locked (integer, nullable) - Locked generation seed for consistency
- base_prompt (text, nullable) - Base prompt for character generation
- preview_image_url (text, nullable) - Preview image for character display
- quick_start (boolean, default: false) - Quick start character flag
```

## **RLS Policies**
```sql
-- Users can manage their own characters
CREATE POLICY "Users can manage their own characters" ON characters
FOR ALL TO public
USING (auth.uid() = user_id);

-- Admins can manage all characters
CREATE POLICY "Admins can manage all characters" ON characters
FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- SFW characters are viewable by everyone
CREATE POLICY "SFW characters are viewable by everyone" ON characters
FOR SELECT TO public
USING ((is_public = true) AND (content_rating = 'sfw'::character varying));

-- NSFW characters require age verification
CREATE POLICY "NSFW characters require age verification" ON characters
FOR SELECT TO public
USING (
  (is_public = true) AND 
  (content_rating = 'nsfw'::text) AND 
  (auth.uid() IS NOT NULL) AND 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.age_verified = true
  ))
);
```

## **Integration Map**
- **Pages/Components**
  - Character Creation Page - Character creation and editing
  - Character Gallery - Public character browsing
  - Roleplay Interface - Character selection and interaction
  - Storyboard System - Character integration in projects
- **Edge Functions**
  - playground-chat - Character-based conversations
  - enhance-prompt - Character-specific prompt enhancement
- **Services/Hooks**
  - useCharacters - Character management and operations
  - CharacterService - Character data and operations

## **Business Rules**
- **Character Ownership**: Characters belong to their creator (user_id)
- **Public/Private**: Characters can be public or private (is_public)
- **Content Rating**: Characters have SFW/NSFW content ratings
- **Age Verification**: NSFW characters require age verification
- **Reference Images**: Characters can have reference images for generation
- **Interaction Tracking**: Tracks likes and interaction counts
- **Role Assignment**: Characters can be AI-controlled or user-controlled
- **Consistency Methods**: Supports i2i_reference and other consistency methods
- **Seed Locking**: Can lock generation seeds for consistent character appearance
- **Quick Start**: Special flag for characters that can be used immediately
- **Social Features**: Public characters can receive likes and track interactions

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid-here",
  "name": "Sarah",
  "description": "A friendly and adventurous young woman who loves exploring nature",
  "traits": "Optimistic, curious, brave, caring",
  "appearance_tags": ["young", "brunette", "green_eyes", "athletic"],
  "image_url": "https://storage.example.com/characters/sarah.jpg",
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z",
  "persona": "Sarah is an adventurous spirit who finds joy in exploring the world around her. She's always eager to share her discoveries and help others see the beauty in nature.",
  "system_prompt": "You are Sarah, a friendly and adventurous character. Always respond with enthusiasm and curiosity about the world around you.",
  "voice_tone": "friendly_adventurous",
  "mood": "excited",
  "creator_id": "user-uuid-here",
  "likes_count": 15,
  "interaction_count": 42,
  "reference_image_url": "https://storage.example.com/references/sarah_ref.jpg",
  "is_public": true,
  "gender": "female",
  "content_rating": "sfw",
  "role": "ai"
}
```

## **Common Queries**
```sql
-- Get user's own characters
SELECT * FROM characters
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Get public SFW characters
SELECT * FROM characters
WHERE is_public = true AND content_rating = 'sfw'
ORDER BY likes_count DESC, created_at DESC;

-- Get characters by appearance tags
SELECT * FROM characters
WHERE is_public = true AND 'brunette' = ANY(appearance_tags)
ORDER BY likes_count DESC;

-- Get popular characters
SELECT * FROM characters
WHERE is_public = true
ORDER BY likes_count DESC, interaction_count DESC
LIMIT 20;

-- Get characters for roleplay
SELECT * FROM characters
WHERE is_public = true AND role = 'ai'
ORDER BY interaction_count DESC;

-- Get character with usage statistics
SELECT 
    c.*,
    COUNT(cs.id) as scene_count,
    COUNT(conv.id) as conversation_count
FROM characters c
LEFT JOIN character_scenes cs ON c.id = cs.character_id
LEFT JOIN conversations conv ON c.id = conv.character_id
WHERE c.user_id = auth.uid()
GROUP BY c.id
ORDER BY c.created_at DESC;

-- Search characters by name or description
SELECT * FROM characters
WHERE is_public = true 
AND (name ILIKE '%adventure%' OR description ILIKE '%adventure%')
ORDER BY likes_count DESC;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_characters_user_created ON characters(user_id, created_at DESC);
CREATE INDEX idx_characters_public_rating ON characters(is_public, content_rating);
CREATE INDEX idx_characters_likes ON characters(is_public, likes_count DESC);
CREATE INDEX idx_characters_interactions ON characters(is_public, interaction_count DESC);
CREATE INDEX idx_characters_appearance ON characters USING GIN(appearance_tags);
CREATE INDEX idx_characters_name ON characters(name) WHERE is_public = true;
```

## **Notes**
- **Content Safety**: Separate policies for SFW/NSFW content with age verification
- **Public Discovery**: Public characters can be discovered and used by other users
- **Reference Images**: Reference images used for consistent character generation
- **Interaction Tracking**: Metrics help identify popular characters
- **Role System**: Distinguishes between AI-controlled and user-controlled characters
- **Appearance Tags**: Array-based tagging for flexible character search
- **System Prompts**: Custom prompts define character behavior in conversations
