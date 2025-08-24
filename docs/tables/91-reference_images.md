# Storage Bucket: reference_images

**Last Updated**: 8/24/25

Purpose: User reference images for content generation

Ownership: User

## Configuration
- **File Types**: image/jpeg, image/png, image/webp, image/gif
- **Size Limit**: 10MB (10,485,760 bytes)
- **Access Control**: Private per user
- **Category**: Content Storage
- **Public**: false
- **Purpose**: Store user-uploaded reference images for AI content generation

## Usage Patterns
- **Upload Sources**: 
  - File upload components for reference image selection
  - Workspace reference image upload functionality
  - Character creation reference image uploads
  - Content generation reference material uploads
- **Access Patterns**: 
  - Workspace page for displaying reference images
  - Character creation and editing interfaces
  - Content generation prompts with reference images
  - Library management for reference materials
- **Lifecycle**: 
  - Files persist until user manually deletes them
  - No automatic cleanup (unlike workspace-temp)
  - Users can organize reference images by project/character
  - Reference images are used across multiple generation sessions

## Integration Map
- **Pages/Components**
  - Workspace page (`src/pages/Workspace.tsx`)
  - File upload components (`src/components/FileUpload.tsx`)
  - Character creation interfaces (`src/components/roleplay/`)
  - Reference image selection components
  - Library management interfaces
- **Edge Functions**
  - Content generation workflows that use reference images
  - File upload processing and validation
  - Reference image optimization and processing
- **Services/Hooks**
  - `useAssets` hook for reference image management
  - File upload services
  - Reference image URL generation services

## Security & Policies
- **RLS Policies**: 
  - Users can only access their own reference images
  - Files are organized by user_id for proper isolation
  - No cross-user access allowed
  - Admin access for system maintenance and support
- **CORS Configuration**: 
  - Configured for authenticated user access
  - No public access (bucket is private)
  - File type validation on upload
- **Access Control**: 
  - Owner-based access control
  - Files are tied to user_id
  - Reference images are private and not shared between users

## Example Operations
- **Upload**: 
  ```javascript
  // Upload reference image for content generation
  const { data, error } = await supabase.storage
    .from('reference_images')
    .upload(`${userId}/${filename}`, file, {
      cacheControl: '3600',
      upsert: false
    });
  ```
- **Download**: 
  ```javascript
  // Get reference image URL for display
  const { data } = supabase.storage
    .from('reference_images')
    .getPublicUrl(`${userId}/${filename}`);
  ```
- **Delete**: 
  ```javascript
  // Delete reference image
  const { error } = await supabase.storage
    .from('reference_images')
    .remove([`${userId}/${filename}`]);
  ```
- **List User Images**: 
  ```javascript
  // List all reference images for a user
  const { data, error } = await supabase.storage
    .from('reference_images')
    .list(`${userId}/`, {
      limit: 100,
      offset: 0
    });
  ```

## Notes
- **Reference Material**: Unlike generated content, reference images are user-provided materials used to guide AI generation
- **Persistence**: Reference images persist indefinitely until manually deleted by the user
- **Organization**: Files are organized by user_id for proper isolation and management
- **File Types**: Supports common image formats (JPEG, PNG, WebP, GIF) for maximum compatibility
- **Size Management**: 10MB limit per file, suitable for high-quality reference images
- **Performance**: Reference images are loaded on-demand and cached for better performance
- **Storage Costs**: Unlike temporary files, reference images contribute to ongoing storage costs
- **Integration**: Tightly integrated with content generation workflows and character creation
- **Security**: Private access ensures user reference materials remain confidential
