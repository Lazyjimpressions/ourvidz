# Table: workspace_assets

Purpose: Assets associated with workspaces

Ownership: User

## Schema (key columns)
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

## Integration Map
- Pages/Components
  - [List relevant pages/components]
- Edge Functions
  - [List relevant edge functions]
- Services/Hooks
  - [List relevant services/hooks]

## Business Rules
- **Temporary Storage**: Assets are stored temporarily and automatically expire after 7 days
- **Job Association**: Every asset must be associated with a job (job_id is NOT NULL)
- **User Ownership**: Every asset must belong to a user (user_id is NOT NULL)
- **Asset Indexing**: Multiple assets can be generated per job, indexed by asset_index
- **Generation Tracking**: All generation parameters (seed, prompt, model, settings) are preserved
- **Media Metadata**: Width/height for images, duration for videos, file size for all assets
- **Thumbnail Support**: Optional thumbnail generation for video assets

## Example Queries
- Get all assets for a specific user
```sql
SELECT * FROM workspace_assets 
WHERE user_id = 'user-uuid-here' 
ORDER BY created_at DESC;
```

- Get assets from a specific job
```sql
SELECT * FROM workspace_assets 
WHERE job_id = 'job-uuid-here' 
ORDER BY asset_index;
```

- Get assets that will expire soon
```sql
SELECT * FROM workspace_assets 
WHERE expires_at < now() + interval '1 day'
ORDER BY expires_at;
```

- Get assets by type and model
```sql
SELECT * FROM workspace_assets 
WHERE asset_type = 'image' 
  AND model_used = 'sdxl'
ORDER BY created_at DESC;
```

- Get asset statistics for a user
```sql
SELECT 
    asset_type,
    COUNT(*) as count,
    SUM(file_size_bytes) as total_size_bytes
FROM workspace_assets 
WHERE user_id = 'user-uuid-here'
GROUP BY asset_type;
```

## Notes
- **Temporary Nature**: This table stores temporary workspace assets that are automatically cleaned up after 7 days
- **Storage Strategy**: Assets are stored in temporary storage and moved to permanent storage (user_library) when saved
- **Performance**: Large number of columns (18) suggests this table captures comprehensive generation metadata
- **Expiration**: The expires_at field enables automatic cleanup of unused workspace assets
- **Generation Tracking**: Preserves complete generation context for reproducibility and debugging
- **Media Support**: Handles both images (width/height) and videos (duration) with appropriate metadata
- **Job Integration**: Tightly coupled with the jobs table for generation workflow tracking
