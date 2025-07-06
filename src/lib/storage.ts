import { supabase } from '@/integrations/supabase/client';

// URL Cache with TTL and smart invalidation
interface CachedUrl {
  url: string;
  expiresAt: number;
  generatedAt: number;
}

class UrlCache {
  private cache = new Map<string, CachedUrl>();
  private readonly DEFAULT_TTL = 3600 * 1000; // 1 hour
  private readonly VIDEO_TTL = 7200 * 1000; // 2 hours

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

  set(bucket: string, path: string, url: string, ttlSeconds: number = 3600): void {
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
  | 'system_assets';

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

// ENHANCED signed URL generation with caching and fallback buckets
export const getSignedUrl = async (
  bucket: StorageBucket,
  filePath: string,
  expiresIn: number = 3600
): Promise<{ data: { signedUrl: string } | null; error: Error | null }> => {
  try {
    // Check cache first
    const cachedUrl = urlCache.get(bucket, filePath);
    if (cachedUrl) {
      console.log('✅ Cache hit for URL:', bucket, filePath.substring(0, 50) + '...');
      return { data: { signedUrl: cachedUrl }, error: null };
    }

    console.log('🔐 Generating new signed URL:', bucket, filePath.substring(0, 50) + '...');
    
    // Validate inputs
    if (!bucket || !filePath) {
      const errorMsg = `Missing required params - bucket: ${bucket}, filePath: ${filePath}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Check authentication for private buckets
    if (!['system_assets'].includes(bucket)) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }
    }

    // Try primary bucket first, then fallbacks
    const fallbackBuckets = [
      'sdxl_image_fast', 'sdxl_image_high', 
      'image_fast', 'image_high', 
      'image7b_fast_enhanced', 'image7b_high_enhanced',
      'video_fast', 'video_high',
      'video7b_fast_enhanced', 'video7b_high_enhanced'
    ].filter(b => b !== bucket);
    
    const bucketsToTry = [bucket, ...fallbackBuckets];
    
    for (const tryBucket of bucketsToTry) {
      try {
        const { data, error } = await supabase.storage
          .from(tryBucket)
          .createSignedUrl(filePath, expiresIn);

        if (!error && data?.signedUrl) {
          // Cache the successful URL
          urlCache.set(tryBucket, filePath, data.signedUrl, expiresIn);
          
          if (tryBucket !== bucket) {
            console.log(`✅ Fallback success: ${tryBucket} (primary: ${bucket})`);
          }
          
          return { data, error: null };
        }
      } catch (err) {
        console.warn(`⚠️ Bucket ${tryBucket} failed:`, err instanceof Error ? err.message : err);
        continue;
      }
    }

    throw new Error(`File not found in any bucket: ${filePath}`);
    
  } catch (error) {
    console.error('❌ getSignedUrl failed:', bucket, filePath.substring(0, 50) + '...', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get signed URL')
    };
  }
};

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
  const { data, error } = await getSignedUrl('video_fast', filePath, 7200); // 2 hours for videos
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
  const { data, error } = await getSignedUrl('video_high', filePath, 7200); // 2 hours for videos
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
