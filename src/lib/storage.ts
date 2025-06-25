
import { supabase } from '@/integrations/supabase/client';

export type StorageBucket = 
  | 'image_fast' 
  | 'image_high' 
  | 'video_fast' 
  | 'video_high' 
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

// Get signed URL for private files
export const getSignedUrl = async (
  bucket: StorageBucket,
  filePath: string,
  expiresIn: number = 3600
): Promise<{ data: { signedUrl: string } | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to get signed URL')
    };
  }
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

// Fast video specific functions (thumbnails, quick video assets)
export const uploadFastVideo = async (
  videoId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileName = `${videoId}-fast-${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile('video_fast', fileName, file, onProgress);
};

export const getFastVideoUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('video_fast', filePath);
  return error ? null : data?.signedUrl || null;
};

// High-quality video specific functions (final videos)
export const uploadHighQualityVideo = async (
  projectId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileName = `${projectId}-final-${Date.now()}.${file.name.split('.').pop()}`;
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
