# Storage Bucket: workspace-temp

**Last Updated**: 8/24/25

Purpose: Temporary workspace assets during generation

Ownership: System/User

## Configuration
- **File Types**: image/jpeg, image/png, image/webp, video/mp4
- **Size Limit**: 50MB (52,428,800 bytes)
- **Access Control**: Private per user
- **Category**: Content Storage
- **Public**: false
- **Purpose**: Temporary storage for workspace assets during generation process

## Usage Patterns
- **Upload Sources**: 
  - Content generation workflows (jobs table)
  - Workspace asset creation during generation
  - Temporary file storage during processing
- **Access Patterns**: 
  - Workspace page for displaying temporary assets
  - Asset preview components during generation
  - Job status monitoring and progress tracking
- **Lifecycle**: 
  - Files are temporary and automatically cleaned up
  - Assets are moved to user-library when saved
  - Automatic expiration based on workspace session

## Integration Map
- **Pages/Components**
  - Workspace page (`src/pages/Workspace.tsx`)
  - Asset preview components (`src/components/AssetPreviewModal.tsx`)
  - Generation progress indicators (`src/components/GenerationProgressIndicator.tsx`)
  - Workspace asset management (`src/components/workspace/`)
- **Edge Functions**
  - Content generation workflows
  - Job processing and asset creation
  - Temporary file management
- **Services/Hooks**
  - `useWorkspaceAssets` hook
  - `useGeneration` hook
  - Asset service for temporary storage

## Security & Policies
- **RLS Policies**: 
  - Users can only access their own temporary workspace assets
  - Files are private and not shared between users
  - Admin access for system maintenance and cleanup
- **CORS Configuration**: 
  - Configured for authenticated user access
  - No public access (bucket is private)
- **Access Control**: 
  - Owner-based access control
  - Files are tied to user_id and job_id
  - Temporary nature means limited access window

## Example Operations
- **Upload**: 
  ```javascript
  // Upload temporary workspace asset
  const { data, error } = await supabase.storage
    .from('workspace-temp')
    .upload(`${userId}/${jobId}/${filename}`, file);
  ```
- **Download**: 
  ```javascript
  // Get temporary workspace asset URL
  const { data } = supabase.storage
    .from('workspace-temp')
    .getPublicUrl(`${userId}/${jobId}/${filename}`);
  ```
- **Delete**: 
  ```javascript
  // Delete temporary workspace asset
  const { error } = await supabase.storage
    .from('workspace-temp')
    .remove([`${userId}/${jobId}/${filename}`]);
  ```
- **Move to Library**: 
  ```javascript
  // Move asset from workspace-temp to user-library
  const { data, error } = await supabase.storage
    .from('user-library')
    .upload(`${userId}/${filename}`, workspaceFile);
  ```

## Notes
- **Temporary Storage**: Unlike user-library, files in workspace-temp are temporary and automatically cleaned up
- **Job Organization**: Files are organized by user_id and job_id for proper isolation
- **Content Types**: Supports both images and videos with appropriate MIME types
- **Size Management**: 50MB limit per file, suitable for temporary generation assets
- **Performance**: Temporary nature means faster access but limited retention
- **Storage Costs**: Temporary files contribute to short-term storage costs
- **Cleanup Strategy**: Automatic cleanup based on workspace session expiration
- **Asset Migration**: Successful generations are moved to user-library for permanent storage
