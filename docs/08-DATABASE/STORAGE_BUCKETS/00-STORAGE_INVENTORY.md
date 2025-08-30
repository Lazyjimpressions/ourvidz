# Storage Buckets Inventory

**Last Updated:** August 30, 2025  
**Status:** ✅ Active - All buckets operational

## **Overview**

This inventory provides a comprehensive overview of all Supabase storage buckets in the OurVidz platform. Each bucket serves specific purposes in content storage and management.

---

## **Active Storage Buckets**

### **Content Storage Buckets**

#### **01-avatars.md** - Character Avatar Images
- **Purpose**: Character avatar images for roleplay system
- **Access**: Public
- **Size Limit**: No limit
- **MIME Types**: image/*
- **Usage**: Character profile pictures, avatar storage
- **Integration**: Character system, roleplay interface

#### **02-reference_images.md** - User Reference Images
- **Purpose**: User-uploaded reference images for generation
- **Access**: Private (user-specific)
- **Size Limit**: 10MB
- **MIME Types**: image/*
- **Usage**: I2I reference images, style references
- **Integration**: Workspace system, I2I functionality

#### **03-system_assets.md** - System-Wide Assets
- **Purpose**: Platform-wide system assets and resources
- **Access**: Public
- **Size Limit**: 5MB
- **MIME Types**: image/*, video/*
- **Usage**: UI assets, system images, placeholders
- **Integration**: All system components

#### **04-user-library.md** - User Permanent Content Library
- **Purpose**: User's permanent content storage (images, videos)
- **Access**: Private (user-specific)
- **Size Limit**: 50MB
- **MIME Types**: image/*, video/*
- **Usage**: Saved content, final generated assets
- **Integration**: Library page, workspace save operations

#### **05-videos.md** - Public Video Content
- **Purpose**: Public video content and shared videos
- **Access**: Public
- **Size Limit**: No limit
- **MIME Types**: video/*
- **Usage**: Public video sharing, community content
- **Integration**: Video sharing, community features

#### **06-workspace-temp.md** - Temporary Workspace Assets
- **Purpose**: Temporary workspace content for staging
- **Access**: Private (user-specific)
- **Size Limit**: 50MB
- **MIME Types**: image/*, video/*
- **Usage**: Staging area, temporary job assets
- **Integration**: Workspace system, job system

---

## **Legacy Buckets (Not Utilized)**

### **Deprecated Storage Buckets**
- **image_high** - Legacy high-quality image storage
- **sdxl_image_fast** - Legacy SDXL fast image storage
- **sdxl_image_high** - Legacy SDXL high-quality image storage
- **video_high** - Legacy high-quality video storage

---

## **Bucket Access Patterns**

### **Public Buckets**
- **avatars**: Read-only for all users, write for character owners
- **system_assets**: Read-only for all users, write for admins
- **videos**: Read/write for authenticated users

### **Private Buckets**
- **reference_images**: User-specific access only
- **user-library**: User-specific access only
- **workspace-temp**: User-specific access with expiration

---

## **Storage Workflow**

### **Content Generation Flow**
```
1. User uploads reference image → reference_images bucket
2. Generation job creates temp asset → workspace-temp bucket
3. User saves content → user-library bucket
4. User shares content → videos bucket (if public)
```

### **Character System Flow**
```
1. User creates character → avatars bucket (if avatar uploaded)
2. Character scenes generated → workspace-temp bucket
3. Final character assets → user-library bucket
```

---

## **RLS Policies**

### **Public Bucket Policies**
```sql
-- Avatars bucket
CREATE POLICY "Avatars are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

-- System assets bucket
CREATE POLICY "System assets are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'system_assets');

CREATE POLICY "Admins can manage system assets" ON storage.objects
FOR ALL USING (bucket_id = 'system_assets' AND has_role(auth.uid(), 'admin'));

-- Videos bucket
CREATE POLICY "Videos are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.uid() IS NOT NULL);
```

### **Private Bucket Policies**
```sql
-- Reference images bucket
CREATE POLICY "Users can access their own reference images" ON storage.objects
FOR ALL USING (bucket_id = 'reference_images' AND auth.uid() = owner);

-- User library bucket
CREATE POLICY "Users can access their own library" ON storage.objects
FOR ALL USING (bucket_id = 'user-library' AND auth.uid() = owner);

-- Workspace temp bucket
CREATE POLICY "Users can access their own workspace" ON storage.objects
FOR ALL USING (bucket_id = 'workspace-temp' AND auth.uid() = owner);
```

---

## **Maintenance and Cleanup**

### **Automatic Cleanup**
- **workspace-temp**: Assets automatically expire after 24 hours
- **reference_images**: No automatic cleanup (user-managed)
- **user-library**: No automatic cleanup (user-managed)

### **Manual Cleanup Tasks**
- **Legacy buckets**: Should be removed when no longer needed
- **Orphaned assets**: Clean up assets not referenced in database
- **Large files**: Monitor and optimize large file storage

---

## **Performance Considerations**

### **File Size Limits**
- **Small files (< 1MB)**: Optimized for fast access
- **Medium files (1-10MB)**: Standard storage with compression
- **Large files (> 10MB)**: Consider CDN for delivery

### **Access Patterns**
- **Frequent reads**: Public buckets cached at CDN level
- **User-specific**: Private buckets with user-based caching
- **Temporary**: Workspace assets with short TTL

---

## **Integration Map**

### **Pages Using Storage Buckets**
- **Workspace**: workspace-temp, reference_images
- **Library**: user-library, videos
- **Character System**: avatars, user-library
- **Admin**: system_assets, all buckets for management

### **Edge Functions Using Storage Buckets**
- **workspace-actions**: workspace-temp, user-library
- **generate-content**: workspace-temp, reference_images
- **queue-job**: workspace-temp, user-library
- **system-metrics**: All buckets for analytics

---

## **SQL Commands for Bucket Management**

### **Get Bucket Information**
```sql
-- Get all buckets with their configurations
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
ORDER BY name;
```

### **Get Object Statistics**
```sql
-- Get object counts and sizes by bucket
SELECT 
    bucket_id,
    COUNT(*) as object_count,
    SUM(metadata->>'size')::bigint as total_size_bytes,
    AVG(metadata->>'size')::bigint as avg_size_bytes
FROM storage.objects
GROUP BY bucket_id
ORDER BY total_size_bytes DESC;
```

### **Get User Storage Usage**
```sql
-- Get storage usage by user
SELECT 
    owner,
    bucket_id,
    COUNT(*) as file_count,
    SUM(metadata->>'size')::bigint as total_size_bytes
FROM storage.objects
WHERE owner IS NOT NULL
GROUP BY owner, bucket_id
ORDER BY total_size_bytes DESC;
```

---

**Note**: Each bucket has specific use cases and access patterns. This inventory provides the high-level overview and management guidelines for all storage buckets in the system.
