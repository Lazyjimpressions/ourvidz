-- =====================================================
-- NEW DATABASE ARCHITECTURE MIGRATION
-- =====================================================

-- Step 1: Create user_collections table first (referenced by user_library)
CREATE TABLE user_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    asset_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create workspace_assets table (temporary staging)
CREATE TABLE workspace_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Asset basics
    asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video')),
    temp_storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    duration_seconds DECIMAL(10,3), -- For videos
    
    -- Generation context
    job_id UUID NOT NULL,
    asset_index INTEGER NOT NULL DEFAULT 0,
    generation_seed BIGINT NOT NULL,
    original_prompt TEXT NOT NULL,
    model_used TEXT NOT NULL,
    generation_settings JSONB DEFAULT '{}',
    
    -- Auto-cleanup
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    UNIQUE(user_id, job_id, asset_index)
);

-- Step 3: Create user_library table (permanent storage)
CREATE TABLE user_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Asset basics (copied from workspace)
    asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video')),
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    duration_seconds DECIMAL(10,3),
    
    -- Generation metadata
    original_prompt TEXT NOT NULL,
    model_used TEXT NOT NULL,
    generation_seed BIGINT,
    
    -- Organization
    collection_id UUID REFERENCES user_collections(id) ON DELETE SET NULL,
    custom_title TEXT,
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT FALSE,
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Performance indexes
CREATE INDEX idx_workspace_user_created ON workspace_assets(user_id, created_at DESC);
CREATE INDEX idx_workspace_job ON workspace_assets(job_id, asset_index);
CREATE INDEX idx_workspace_expires ON workspace_assets(expires_at);
CREATE INDEX idx_library_user_created ON user_library(user_id, created_at DESC);
CREATE INDEX idx_library_collection ON user_library(collection_id, created_at DESC);
CREATE INDEX idx_collections_user ON user_collections(user_id, created_at DESC);

-- Step 5: Row Level Security
ALTER TABLE workspace_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_policy" ON workspace_assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "library_policy" ON user_library FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "collections_policy" ON user_collections FOR ALL USING (auth.uid() = user_id);

-- Step 6: Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'workspace-temp',
    'workspace-temp',
    false,
    1073741824, -- 1GB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-library',
    'user-library',
    false,
    1073741824, -- 1GB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
);

-- Step 7: Storage policies
CREATE POLICY "workspace_temp_access" ON storage.objects
FOR ALL USING (
    bucket_id = 'workspace-temp' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "user_library_access" ON storage.objects
FOR ALL USING (
    bucket_id = 'user-library' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 8: Auto-cleanup function for expired workspace assets
CREATE OR REPLACE FUNCTION cleanup_expired_workspace_assets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete expired workspace assets
  DELETE FROM workspace_assets 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Step 9: Collection asset count trigger
CREATE OR REPLACE FUNCTION update_collection_asset_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_collections 
    SET asset_count = asset_count + 1 
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_collections 
    SET asset_count = asset_count - 1 
    WHERE id = OLD.collection_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle collection changes
    IF OLD.collection_id IS DISTINCT FROM NEW.collection_id THEN
      IF OLD.collection_id IS NOT NULL THEN
        UPDATE user_collections 
        SET asset_count = asset_count - 1 
        WHERE id = OLD.collection_id;
      END IF;
      IF NEW.collection_id IS NOT NULL THEN
        UPDATE user_collections 
        SET asset_count = asset_count + 1 
        WHERE id = NEW.collection_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_collection_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_library
  FOR EACH ROW EXECUTE FUNCTION update_collection_asset_count();