# Table: workspace_assets

**Last Updated:** August 30, 2025  
**Status:** ✅ Active  
**Purpose:** Temporary workspace assets for staging and job grouping

**Ownership:** User  
**RLS Enabled:** Yes

## **Schema**
```sql
-- Key columns with descriptions
- id (uuid, pk) - Primary key with auto-generated UUID
- user_id (uuid, NOT NULL) - Foreign key to profiles table
- asset_type (text, NOT NULL) - Type of asset (image, video, etc.)
- temp_storage_path (text, NOT NULL) - Temporary storage location
- file_size_bytes (bigint, NOT NULL) - File size in bytes
- mime_type (text, NOT NULL) - MIME type of the asset
- duration_seconds (numeric, nullable) - Duration for video assets
- job_id (uuid, NOT NULL) - Foreign key to jobs table
- asset_index (integer, NOT NULL, default: 0) - Index within the job
- generation_seed (bigint, NOT NULL) - Random seed used for generation
- original_prompt (text, NOT NULL) - Original prompt used for generation
- model_used (text, NOT NULL) - AI model used for generation
- generation_settings (jsonb, nullable, default: '{}') - Generation parameters
- created_at (timestamptz, default: now()) - Creation timestamp
- expires_at (timestamptz, default: now() + 7 days) - Expiration timestamp
- thumbnail_path (text, nullable) - Path to thumbnail image
- width (integer, nullable) - Asset width in pixels
- height (integer, nullable) - Asset height in pixels
```

## **RLS Policies**
```sql
-- Users can only access their own workspace assets
CREATE POLICY "Users can view own workspace assets" ON workspace_assets
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own workspace assets
CREATE POLICY "Users can insert own workspace assets" ON workspace_assets
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own workspace assets
CREATE POLICY "Users can update own workspace assets" ON workspace_assets
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own workspace assets
CREATE POLICY "Users can delete own workspace assets" ON workspace_assets
FOR DELETE TO authenticated
USING (user_id = auth.uid());
```

## **Integration Map**
- **Pages/Components**
  - Workspace Page - Displays temporary assets grouped by job_id
  - WorkspaceGrid - Grid display component for workspace assets
  - ContentCard - Individual asset display component
- **Edge Functions**
  - job-callback - Creates workspace assets when jobs complete
  - workspace-actions - Handles save/discard operations
  - delete-workspace-item - Removes assets from workspace
- **Services/Hooks**
  - useLibraryFirstWorkspace - Real-time subscriptions and asset management
  - AssetService - Generates signed URLs and manages asset metadata

## **Business Rules**
- **Temporary Storage**: Assets are stored temporarily and automatically expire after 7 days
- **Job Association**: Every asset must be associated with a job (job_id is NOT NULL)
- **User Ownership**: Every asset must belong to a user (user_id is NOT NULL)
- **Asset Indexing**: Multiple assets can be generated per job, indexed by asset_index
- **Generation Tracking**: All generation parameters (seed, prompt, model, settings) are preserved
- **Media Metadata**: Width/height for images, duration for videos, file size for all assets
- **Thumbnail Support**: Optional thumbnail generation for video assets

## **Example Data**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid-here",
  "asset_type": "image",
  "temp_storage_path": "workspace-temp/user-uuid-here/job-uuid-here/image1.jpg",
  "file_size_bytes": 2048576,
  "mime_type": "image/jpeg",
  "duration_seconds": null,
  "job_id": "job-uuid-here",
  "asset_index": 0,
  "generation_seed": 12345,
  "original_prompt": "A beautiful sunset over mountains",
  "model_used": "sdxl",
  "generation_settings": {
    "guidance_scale": 7.5,
    "num_inference_steps": 50,
    "reference_strength": 0.5,
    "exact_copy_mode": false
  },
  "created_at": "2025-08-30T10:00:00Z",
  "expires_at": "2025-09-06T10:00:00Z",
  "thumbnail_path": "workspace-temp/user-uuid-here/job-uuid-here/thumbnails/image1.jpg",
  "width": 1024,
  "height": 1024
}
```

## **Common Queries**
```sql
-- Get all assets for a specific user
SELECT * FROM workspace_assets 
WHERE user_id = auth.uid() 
ORDER BY created_at DESC;

-- Get assets from a specific job
SELECT * FROM workspace_assets 
WHERE job_id = 'job-uuid-here' 
ORDER BY asset_index;

-- Get assets that will expire soon
SELECT * FROM workspace_assets 
WHERE expires_at < now() + interval '1 day'
ORDER BY expires_at;

-- Get assets by type and model
SELECT * FROM workspace_assets 
WHERE asset_type = 'image' 
  AND model_used = 'sdxl'
  AND user_id = auth.uid()
ORDER BY created_at DESC;

-- Get asset statistics for a user
SELECT 
    asset_type,
    COUNT(*) as count,
    SUM(file_size_bytes) as total_size_bytes
FROM workspace_assets 
WHERE user_id = auth.uid()
GROUP BY asset_type;

-- Get workspace assets grouped by job
SELECT 
    job_id,
    COUNT(*) as asset_count,
    MIN(created_at) as job_start,
    MAX(created_at) as job_end
FROM workspace_assets 
WHERE user_id = auth.uid()
GROUP BY job_id
ORDER BY MIN(created_at) DESC;

-- Clean up expired assets
DELETE FROM workspace_assets 
WHERE expires_at < now();
```

## **Indexing Recommendations**
```sql
-- Primary indexes for performance
CREATE INDEX idx_workspace_assets_user_created ON workspace_assets(user_id, created_at DESC);
CREATE INDEX idx_workspace_assets_job_id ON workspace_assets(job_id);
CREATE INDEX idx_workspace_assets_expires ON workspace_assets(expires_at);
CREATE INDEX idx_workspace_assets_type_model ON workspace_assets(asset_type, model_used);

-- Index for cleanup operations
CREATE INDEX idx_workspace_assets_expiration ON workspace_assets(expires_at) WHERE expires_at < now();
```

## **Notes**
- **Temporary Nature**: This table stores temporary workspace assets that are automatically cleaned up after 7 days
- **Storage Strategy**: Assets are stored in workspace-temp bucket and moved to user-library when saved
- **Job Grouping**: Assets with same job_id are grouped for 1x3 image sets in workspace
- **Expiration**: The expires_at field enables automatic cleanup of unused workspace assets
- **Generation Tracking**: Preserves complete generation context for reproducibility and debugging
- **Media Support**: Handles both images (width/height) and videos (duration) with appropriate metadata
- **Performance**: Comprehensive metadata storage for generation workflow tracking
- **Cleanup Process**: Expired assets are automatically removed to manage storage costs
