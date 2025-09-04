# Table: user_library

**Last Updated:** December 19, 2024  
**Status:** ✅ Active  
**Purpose:** Permanent user content storage for images, videos, and other generated assets

**Ownership:** User  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions (22 total columns)
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- asset_type (text, NOT NULL) - Type of asset (image, video, etc.)
- storage_path (text, NOT NULL) - Permanent storage location in user-library bucket
- file_size_bytes (bigint, NOT NULL) - File size in bytes
- mime_type (text, NOT NULL) - MIME type of the asset
- duration_seconds (numeric, nullable) - Duration for video assets
- original_prompt (text, NOT NULL) - Original user prompt used for generation
- model_used (text, NOT NULL) - AI model used for generation
- generation_seed (bigint, nullable) - Random seed used for generation
- collection_id (uuid, nullable) - Foreign key to user_collections table
- custom_title (text, nullable) - User-defined title for the asset
- tags (text[], nullable) - Array of user-defined tags
- is_favorite (boolean, default: false) - Whether asset is marked as favorite
- visibility (text, default: 'private') - Asset visibility (private, public, shared)
- created_at (timestamptz, default: now()) - Creation timestamp
- updated_at (timestamptz, default: now()) - Last update timestamp
- thumbnail_path (text, nullable) - Path to thumbnail image
- width (integer, nullable) - Asset width in pixels (for images)
- height (integer, nullable) - Asset height in pixels (for images)
- content_category (text, default: 'general') - Content category classification
- roleplay_metadata (jsonb, default: '{}') - Roleplay-specific metadata and context
```

## **RLS Policies**
```sql
-- Users can only access their own library
CREATE POLICY "library_policy" ON user_library
FOR ALL TO public
USING (auth.uid() = user_id);
```

## **Integration Map**
- **Pages/Components**
  - Library Page - Displays all user assets with filtering and organization
  - Workspace Page - Shows assets when saved from workspace
  - Collection Management - Organizes assets into collections
- **Edge Functions**
  - workspace-actions - Moves assets from workspace to library
  - job-callback - Creates library entries when jobs complete
- **Services/Hooks**
  - AssetService - Generates signed URLs and manages asset metadata
  - useImageLibrary - Library management and operations

## **Business Rules**
- **User Ownership**: Each asset must belong to a user (user_id is NOT NULL)
- **Permanent Storage**: Assets are stored permanently in user-library bucket
- **Metadata Preservation**: All generation metadata (prompt, model, seed) is preserved
- **Collection Support**: Assets can be organized into user-defined collections
- **Tagging System**: Users can add custom tags for organization
- **Visibility Control**: Assets can be private, public, or shared
- **Favorite System**: Users can mark assets as favorites for quick access
- **Content Categorization**: Assets are automatically categorized by content type
- **Roleplay Integration**: Roleplay metadata stores character and scene context

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid-here",
  "asset_type": "image",
  "storage_path": "user-uuid-here/images/beautiful-sunset.jpg",
  "file_size_bytes": 2048576,
  "mime_type": "image/jpeg",
  "duration_seconds": null,
  "original_prompt": "A beautiful sunset over mountains",
  "model_used": "sdxl",
  "generation_seed": 12345,
  "collection_id": "collection-uuid-here",
  "custom_title": "Mountain Sunset",
  "tags": ["landscape", "sunset", "mountains", "nature"],
  "is_favorite": true,
  "visibility": "private",
  "created_at": "2025-08-30T10:00:00Z",
  "updated_at": "2025-08-30T10:00:00Z",
  "thumbnail_path": "user-uuid-here/thumbnails/beautiful-sunset.jpg",
  "width": 1024,
  "height": 1024,
  "content_category": "landscape",
  "roleplay_metadata": {
    "character_id": "character-uuid-here",
    "scene_context": "Mountain adventure scene",
    "roleplay_session": "session-uuid-here"
  }
}
```

## **Common Queries**
```sql
-- Get all assets for current user
SELECT * FROM user_library 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Get assets by type
SELECT * FROM user_library 
WHERE user_id = auth.uid() AND asset_type = 'image'
ORDER BY created_at DESC;

-- Get favorite assets
SELECT * FROM user_library 
WHERE user_id = auth.uid() AND is_favorite = true
ORDER BY updated_at DESC;

-- Get assets in a collection
SELECT * FROM user_library 
WHERE user_id = auth.uid() AND collection_id = 'collection-uuid-here'
ORDER BY created_at DESC;

-- Get assets by tags
SELECT * FROM user_library 
WHERE user_id = auth.uid() AND 'landscape' = ANY(tags)
ORDER BY created_at DESC;

-- Get asset statistics
SELECT 
    asset_type,
    COUNT(*) as total_assets,
    SUM(file_size_bytes) as total_size_bytes,
    AVG(file_size_bytes) as avg_file_size
FROM user_library 
WHERE user_id = auth.uid()
GROUP BY asset_type;

-- Get recent assets with collection info
SELECT ul.*, uc.name as collection_name
FROM user_library ul
LEFT JOIN user_collections uc ON ul.collection_id = uc.id
WHERE ul.user_id = auth.uid()
ORDER BY ul.created_at DESC
LIMIT 20;
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_user_library_user_created ON user_library(user_id, created_at DESC);
CREATE INDEX idx_user_library_asset_type ON user_library(user_id, asset_type);
CREATE INDEX idx_user_library_collection ON user_library(user_id, collection_id);
CREATE INDEX idx_user_library_favorites ON user_library(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_user_library_tags ON user_library USING GIN(tags);
```

## **Notes**
- **Permanent Storage**: Unlike workspace_assets, library assets are permanent and don't expire
- **Collection Organization**: Assets can be organized into user-defined collections
- **Tagging System**: Flexible tagging allows for detailed organization
- **Metadata Preservation**: Complete generation context is preserved for reproducibility
- **Visibility Control**: Users control who can see their assets
- **Storage Management**: Files stored in user-library bucket with organized paths
- **Performance**: Optimized for user-specific queries and collection management
