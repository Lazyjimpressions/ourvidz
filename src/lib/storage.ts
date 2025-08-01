import { supabase } from '@/integrations/supabase/client';

// URL Cache with TTL and smart invalidation
interface CachedUrl {
  url: string;
  expiresAt: number;
  generatedAt: number;
}

class UrlCache {
  private cache = new Map<string, CachedUrl>();
  private readonly DEFAULT_TTL = 24 * 3600 * 1000; // 24 hours (optimized)
  private readonly VIDEO_TTL = 24 * 3600 * 1000; // 24 hours (optimized)

  private getCacheKey(bucket: string, path: string): string {
    return `${bucket}:${path}`;
  }

  get(bucket: string, path: string): string | null {
    const key = this.getCacheKey(bucket, path);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.url;
  }

  set(bucket: string, path: string, url: string, ttlSeconds: number = 86400): void { // 24 hours default
    const key = this.getCacheKey(bucket, path);
    const now = Date.now();
    
    this.cache.set(key, {
      url,
      expiresAt: now + (ttlSeconds * 1000),
      generatedAt: now
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats(): { size: number; expired: number; valid: number } {
    const now = Date.now();
    let expired = 0;
    let valid = 0;
    
    for (const cached of this.cache.values()) {
      if (now > cached.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return { size: this.cache.size, expired, valid };
  }
}

const urlCache = new UrlCache();

// Cleanup cache every 10 minutes
setInterval(() => {
  urlCache.cleanup();
  console.log('🧹 URL cache cleanup completed:', urlCache.getStats());
}, 10 * 60 * 1000);

export type StorageBucket = 
  | 'image_fast' 
  | 'image_high' 
  | 'video_fast' 
  | 'video_high' 
  | 'sdxl_image_fast'
  | 'sdxl_image_high'
  | 'image7b_fast_enhanced'
  | 'image7b_high_enhanced'
  | 'video7b_fast_enhanced'
  | 'video7b_high_enhanced'
  | 'system_assets'
  | 'reference_images';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  data: { path: string; fullPath: string } | null;
  error: Error | null;
}

// Generic upload function with progress tracking
export const uploadFile = async (
  bucket: StorageBucket,
  filePath: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to upload files');
    }

    // Create user-scoped path for private buckets
    const userScopedPath = bucket === 'system_assets' 
      ? filePath 
      : `${user.id}/${filePath}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(userScopedPath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    return {
      data: data ? { 
        path: data.path, 
        fullPath: data.fullPath 
      } : null,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Upload failed')
    };
  }
};

// PHASE 2 FIX: Simplified signed URL generation that trusts the database paths
export const getSignedUrl = async (
  bucket: StorageBucket,
  filePath: string,
  expiresIn: number = 86400 // 24 hours default
): Promise<{ data: { signedUrl: string } | null; error: Error | null }> => {
  try {
    console.log(`🔐 Direct signed URL generation:`, { bucket, path: filePath.slice(0, 40) + '...' });
    
    // Validate inputs
    if (!bucket || !filePath) {
      throw new Error(`Missing required params - bucket: ${bucket}, filePath: ${filePath}`);
    }

    // Check cache first
    const cachedUrl = urlCache.get(bucket, filePath);
    if (cachedUrl) {
      console.log(`✅ Cache hit for: ${bucket}/${filePath.slice(0, 30)}...`);
      return { data: { signedUrl: cachedUrl }, error: null };
    }

    // PHASE 2: Direct Supabase call with exact bucket+path from database
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error(`❌ Supabase error for ${bucket}/${filePath.slice(0, 30)}...:`, error.message);
      return { data: null, error };
    }

    if (!data?.signedUrl) {
      console.error(`❌ No signed URL returned for ${bucket}/${filePath.slice(0, 30)}...`);
      return { data: null, error: new Error('No signed URL returned') };
    }

    // Cache successful result
    urlCache.set(bucket, filePath, data.signedUrl, expiresIn);
    console.log(`✅ Generated signed URL for: ${bucket}/${filePath.slice(0, 30)}...`);
    
    return { data, error: null };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ getSignedUrl failed:`, { bucket, path: filePath.slice(0, 30) + '...', error: errorMessage });
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get signed URL')
    };
  }
};

// ENHANCED PATH RESOLUTION: Generate multiple path variants to try
function generatePathVariants(originalPath: string, userId?: string): string[] {
  const variants: string[] = [];
  
  // 1. Original path as-is
  variants.push(originalPath);
  
  // 2. User-prefixed path (most common for private buckets)
  if (userId) {
    if (!originalPath.startsWith(`${userId}/`)) {
      variants.push(`${userId}/${originalPath}`);
    }
  }
  
  // 3. Strip user prefix if it exists
  if (originalPath.includes('/')) {
    const pathParts = originalPath.split('/');
    if (pathParts.length > 1) {
      const withoutPrefix = pathParts.slice(1).join('/');
      variants.push(withoutPrefix);
    }
  }
  
  // 4. For videos, try common video path patterns
  if (originalPath.includes('.mp4') || originalPath.includes('.webm')) {
    const fileName = originalPath.split('/').pop() || originalPath;
    if (userId) {
      variants.push(`${userId}/videos/${fileName}`);
      variants.push(`${userId}/video/${fileName}`);
    }
    variants.push(`videos/${fileName}`);
    variants.push(`video/${fileName}`); 
  }
  
  // 5. For images, try common image path patterns
  if (originalPath.includes('.png') || originalPath.includes('.jpg') || originalPath.includes('.jpeg')) {
    const fileName = originalPath.split('/').pop() || originalPath;
    if (userId) {
      variants.push(`${userId}/images/${fileName}`);
      variants.push(`${userId}/image/${fileName}`);
    }
    variants.push(`images/${fileName}`);
    variants.push(`image/${fileName}`);
  }
  
  // Remove duplicates while preserving order
  return [...new Set(variants)];
}

// Batch URL generation with caching
export const getBatchSignedUrls = async (
  requests: Array<{ bucket: StorageBucket; filePath: string; expiresIn?: number }>
): Promise<Array<{ data: { signedUrl: string } | null; error: Error | null }>> => {
  console.log('📦 Batch generating URLs:', requests.length);
  
  const results = await Promise.all(
    requests.map(req => 
      getSignedUrl(req.bucket, req.filePath, req.expiresIn || 3600)
    )
  );
  
  const successCount = results.filter(r => r.data?.signedUrl).length;
  console.log(`✅ Batch URL generation: ${successCount}/${requests.length} successful`);
  
  return results;
};

// Get public URL for public files
export const getPublicUrl = (bucket: StorageBucket, filePath: string): string => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};

// Delete file
export const deleteFile = async (
  bucket: StorageBucket,
  filePath: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Delete failed')
    };
  }
};

// Fast image specific functions (character images, quick previews)
export const uploadFastImage = async (
  imageId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileName = `${imageId}-${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile('image_fast', fileName, file, onProgress);
};

export const getFastImageUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('image_fast', filePath);
  return error ? null : data?.signedUrl || null;
};

// High-quality image specific functions (scene previews, enhanced images)
export const uploadHighQualityImage = async (
  projectId: string,
  sceneNumber: number,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileName = `${projectId}/scene-${sceneNumber}-${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile('image_high', fileName, file, onProgress);
};

export const getHighQualityImageUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('image_high', filePath);
  return error ? null : data?.signedUrl || null;
};

// SDXL image specific functions
export const uploadSDXLFastImage = async (
  imageId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileName = `${imageId}-${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile('sdxl_image_fast', fileName, file, onProgress);
};

export const getSDXLFastImageUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('sdxl_image_fast', filePath);
  return error ? null : data?.signedUrl || null;
};

export const uploadSDXLHighImage = async (
  imageId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileName = `${imageId}-${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile('sdxl_image_high', fileName, file, onProgress);
};

export const getSDXLHighImageUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('sdxl_image_high', filePath);
  return error ? null : data?.signedUrl || null;
};

// Reference image functions
export const uploadReferenceImage = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const fileName = `${Date.now()}-ref.${fileExtension}`;
  console.log('🖼️ Uploading reference image:', fileName, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
  
  return uploadFile('reference_images', fileName, file, onProgress);
};

export const getReferenceImageUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('reference_images', filePath);
  return error ? null : data?.signedUrl || null;
};

// UPDATED: Fast video specific functions with proper video support
export const uploadFastVideo = async (
  videoId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  // Ensure proper video file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['mp4', 'webm', 'mov'];
  const extension = validExtensions.includes(fileExtension || '') ? fileExtension : 'mp4';
  
  const fileName = `${videoId}-fast-${Date.now()}.${extension}`;
  console.log('📹 Uploading fast video:', fileName, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
  
  return uploadFile('video_fast', fileName, file, onProgress);
};

export const getFastVideoUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('video_fast', filePath, 86400); // 24 hours for videos
  return error ? null : data?.signedUrl || null;
};

// UPDATED: High-quality video specific functions with proper video support
export const uploadHighQualityVideo = async (
  projectId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  // Ensure proper video file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['mp4', 'webm', 'mov'];
  const extension = validExtensions.includes(fileExtension || '') ? fileExtension : 'mp4';
  
  const fileName = `${projectId}-final-${Date.now()}.${extension}`;
  console.log('📹 Uploading high quality video:', fileName, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
  
  return uploadFile('video_high', fileName, file, onProgress);
};

export const getHighQualityVideoUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('video_high', filePath, 86400); // 24 hours for videos
  return error ? null : data?.signedUrl || null;
};

// System assets specific functions
export const uploadSystemAsset = async (
  fileName: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  return uploadFile('system_assets', fileName, file, onProgress);
};

export const getSystemAssetUrl = (filePath: string): string => {
  return getPublicUrl('system_assets', filePath);
};

// Legacy function names for backward compatibility
export const uploadCharacterImage = uploadFastImage;
export const getCharacterImageUrl = getFastImageUrl;
export const uploadScenePreview = uploadHighQualityImage;
export const getScenePreviewUrl = getHighQualityImageUrl;
export const uploadVideoThumbnail = uploadFastVideo;
export const getVideoThumbnailUrl = getFastVideoUrl;
export const uploadFinalVideo = uploadHighQualityVideo;
export const getFinalVideoUrl = getHighQualityVideoUrl;

// Cache management utilities
export const clearUrlCache = (): void => {
  urlCache.clear();
  console.log('🧹 URL cache cleared');
};

export const getCacheStats = () => {
  return urlCache.getStats();
};

// Cleanup expired files (utility function)
export const cleanupExpiredFiles = async (bucket: StorageBucket, olderThanDays: number = 30) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(user.id, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' }
      });

    if (error || !files) {
      throw error || new Error('Failed to list files');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const expiredFiles = files.filter(file => 
      new Date(file.created_at || '') < cutoffDate
    );

    if (expiredFiles.length > 0) {
      const filePaths = expiredFiles.map(file => `${user.id}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove(filePaths);

      if (deleteError) {
        throw deleteError;
      }

      console.log(`Cleaned up ${expiredFiles.length} expired files from ${bucket}`);
    }

    return { success: true, cleanedCount: expiredFiles.length };
  } catch (error) {
    console.error('Cleanup failed:', error);
    return { success: false, error };
  }
};
