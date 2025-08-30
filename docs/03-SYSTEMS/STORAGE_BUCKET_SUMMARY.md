# Storage Bucket Structure Summary

## Overview

The OurVidz application uses 6 active storage buckets for different content types and purposes. There are also 4 legacy buckets that are no longer utilized.

## Active Buckets

### 🔥 High Priority (Core Functionality)

#### **user-library** (93-user-library.md) ✅ Documented
- **Purpose**: Permanent storage for user's saved content
- **Access**: Private per user
- **Size Limit**: 50MB per file
- **File Types**: image/jpeg, image/png, image/webp, video/mp4
- **Status**: ✅ Documented

#### **workspace-temp** (95-workspace-temp.md) ✅ Documented
- **Purpose**: Temporary workspace assets during generation
- **Access**: Private per user
- **Size Limit**: 50MB per file
- **File Types**: image/jpeg, image/png, image/webp, video/mp4
- **Status**: ✅ Documented

### 🔶 Medium Priority (Important Features)

#### **avatars** (90-avatars.md)
- **Purpose**: Character avatar images for roleplay system
- **Access**: Public read/write
- **Size Limit**: No limit
- **File Types**: image/jpeg, image/png, image/webp
- **Status**: ❌ Template only

#### **reference_images** (91-reference_images.md) ✅ Documented
- **Purpose**: User reference images for content generation
- **Access**: Private per user
- **Size Limit**: 10MB per file
- **File Types**: image/jpeg, image/png, image/webp, image/gif
- **Status**: ✅ Documented

#### **system_assets** (92-system_assets.md)
- **Purpose**: System-wide assets and placeholders
- **Access**: Public read/write
- **Size Limit**: 5MB per file
- **File Types**: image/png, image/jpeg, image/webp, image/svg+xml
- **Status**: ❌ Template only

#### **videos** (93-videos.md)
- **Purpose**: Public video content
- **Access**: Public read/write
- **Size Limit**: No limit
- **File Types**: video/mp4, video/mpeg, video/webm, video/quicktime
- **Status**: ❌ Template only

## Legacy Buckets (Not Utilized)

These buckets are no longer used in the current system:

- **image_high** - Legacy high-quality image storage
- **sdxl_image_fast** - Legacy SDXL fast image storage  
- **sdxl_image_high** - Legacy SDXL high-quality image storage
- **video_high** - Legacy high-quality video storage

## Storage Strategy

### Content Flow
1. **Generation**: Content is generated and stored in `workspace-temp`
2. **Review**: Users review content in workspace
3. **Save**: Selected content is moved to `user-library` for permanent storage
4. **Reference**: Users can upload reference images to `reference_images`
5. **System**: System assets are stored in `system_assets`
6. **Public**: Public content is stored in `avatars` and `videos`

### Access Patterns
- **Private Buckets**: user-library, workspace-temp, reference_images
- **Public Buckets**: avatars, system_assets, videos
- **User Isolation**: Private buckets are organized by user_id
- **System Access**: System buckets are accessible to all users

### Size Management
- **Large Files**: user-library, workspace-temp (50MB limit)
- **Medium Files**: reference_images (10MB limit)
- **Small Files**: system_assets (5MB limit)
- **No Limit**: avatars, videos

## Next Steps

### Immediate (This Week)
1. ✅ Document user-library bucket (completed)
2. ✅ Document workspace-temp bucket (completed)
3. Document avatars bucket (medium priority)

### Short Term (Next 2 Weeks)
1. Document remaining active buckets
2. Add integration maps and security policies
3. Update bucket documentation with actual usage patterns

### Long Term (Ongoing)
1. Monitor storage usage and costs
2. Optimize file sizes and formats
3. Implement cleanup policies for temporary content
4. Consider archiving strategies for legacy buckets

## Success Metrics

- [x] 3 of 6 active buckets documented
- [ ] All 6 active buckets have complete documentation
- [ ] Integration maps are accurate and complete
- [ ] Security policies are documented and validated
- [ ] Storage costs are monitored and optimized
- [ ] Legacy bucket cleanup is planned and executed
