-- Optimize queries for mobile performance

-- Index for quick start characters (featured characters in dashboard)
CREATE INDEX IF NOT EXISTS idx_characters_quick_start ON public.characters(quick_start) WHERE quick_start = true;

-- Index for roleplay content in user library (filter roleplay scenes)
CREATE INDEX IF NOT EXISTS idx_user_library_roleplay ON public.user_library(content_category) WHERE content_category = 'roleplay_scene';

-- Index for memory tier queries (conversation memory system)
CREATE INDEX IF NOT EXISTS idx_conversations_memory_tier ON public.conversations(memory_tier);

-- Composite index for user-specific character queries with quick start flag
CREATE INDEX IF NOT EXISTS idx_characters_user_quick_start ON public.characters(user_id, quick_start, is_public);

-- Index for roleplay metadata queries (JSONB GIN index for flexible metadata searches)
CREATE INDEX IF NOT EXISTS idx_user_library_roleplay_metadata ON public.user_library USING GIN(roleplay_metadata) WHERE content_category = 'roleplay_scene';