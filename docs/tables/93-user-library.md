# Storage Bucket: user-library

Purpose: User's permanent content library

Ownership: User

## Configuration
- **File Types**: image/jpeg, image/png, image/webp, video/mp4
- **Size Limit**: 50MB (52,428,800 bytes)
- **Access Control**: Private per user
- **Category**: Content Storage
- **Public**: false
- **Purpose**: Permanent storage for user's saved content

## Usage Patterns
- **Upload Sources**: 
  - Library page when users save workspace assets
  - File upload components for user content
  - Content generation workflows when saving final results
- **Access Patterns**: 
  - Library page for displaying user's saved content
  - Asset preview components
  - Content sharing and export features
- **Lifecycle**: 
  - Files are permanent until user deletes them
  - No automatic cleanup (unlike workspace-temp)
  - Files persist across sessions and workspace changes

## Integration Map
- **Pages/Components**
  - Library page (`src/pages/Library.tsx`)
  - Asset preview components (`src/components/AssetPreviewModal.tsx`)
  - File upload components (`src/components/FileUpload.tsx`)
  - Asset management components (`src/components/library/`)
- **Edge Functions**
  - Content generation workflows
  - Asset processing and optimization
- **Services/Hooks**
  - `useLibraryAssets` hook
  - Asset service functions
  - Storage service for file operations

## Security & Policies
- **RLS Policies**: 
  - Users can only access their own library files
  - Files are private and not shared between users
  - Admin access for system maintenance
- **CORS Configuration**: 
  - Configured for authenticated user access
  - No public access (bucket is private)
- **Access Control**: 
  - Owner-based access control
  - Files are tied to user_id
  - No cross-user file sharing

## Example Operations
- **Upload**: 
  ```javascript
  // Upload file to user library
  const { data, error } = await supabase.storage
    .from('user-library')
    .upload(`${userId}/${filename}`, file);
  ```
- **Download**: 
  ```javascript
  // Get download URL for library file
  const { data } = supabase.storage
    .from('user-library')
    .getPublicUrl(`${userId}/${filename}`);
  ```
- **Delete**: 
  ```javascript
  // Delete file from user library
  const { error } = await supabase.storage
    .from('user-library')
    .remove([`${userId}/${filename}`]);
  ```

## Notes
- **Permanent Storage**: Unlike workspace-temp, files in user-library are permanent until explicitly deleted
- **User Organization**: Files are organized by user_id for proper isolation
- **Content Types**: Supports both images and videos with appropriate MIME types
- **Size Management**: 50MB limit per file, users should manage their storage usage
- **Performance**: Large files may impact loading times in library views
- **Storage Costs**: Files in this bucket contribute to long-term storage costs
- **Backup Strategy**: Consider backup policies for user content
