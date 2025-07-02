import { supabase } from '@/integrations/supabase/client';

export type StorageBucket = 
  | 'image_fast' 
  | 'image_high' 
  | 'video_fast' 
  | 'video_high' 
  | 'sdxl_fast'
  | 'sdxl_high'
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

// ENHANCED signed URL generation with comprehensive debugging
export const getSignedUrl = async (
  bucket: StorageBucket,
  filePath: string,
  expiresIn: number = 3600
): Promise<{ data: { signedUrl: string } | null; error: Error | null }> => {
  try {
    console.log('🔐 getSignedUrl called with enhanced SDXL support:');
    console.log('   - Bucket:', bucket);
    console.log('   - File path:', filePath);
    console.log('   - Expires in:', expiresIn, 'seconds');
    
    // Validate inputs
    if (!bucket || !filePath) {
      const errorMsg = `Missing required params - bucket: ${bucket}, filePath: ${filePath}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Check if user is authenticated for private buckets
    if (!['system_assets'].includes(bucket)) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ Auth error in getSignedUrl:', authError);
        throw new Error('Authentication error: ' + authError.message);
      }

      if (!user) {
        console.error('❌ No authenticated user found');
        throw new Error('User must be authenticated to access files');
      }

      console.log('✅ User authenticated:', user.id);
    }

    // Use the filePath as-is (it should already be user-scoped from the database)
    const pathToUse = filePath;
    console.log('📁 Using path for signed URL with SDXL support:', pathToUse);

    // Test if the file exists first
    console.log('📋 Checking if file exists...');
    const { data: fileList, error: listError } = await supabase.storage
      .from(bucket)
      .list(pathToUse.split('/').slice(0, -1).join('/') || '', {
        limit: 100,
        search: pathToUse.split('/').pop()
      });

    if (listError) {
      console.warn('⚠️ Could not list files (might be normal):', listError.message);
    } else {
      console.log('📁 File listing result:', fileList?.length, 'files found');
      if (fileList) {
        const fileName = pathToUse.split('/').pop();
        const fileExists = fileList.some(f => f.name === fileName);
        console.log('🔍 File exists check:', fileExists, 'for file:', fileName, 'in bucket:', bucket);
      }
    }

    // Generate signed URL
    console.log('🔗 Generating signed URL for SDXL/WAN content...');
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(pathToUse, expiresIn);

    if (error) {
      console.error('❌ Signed URL generation failed:');
      console.error('   - Error code:', error.message);
      console.error('   - Bucket:', bucket);
      console.error('   - Path:', pathToUse);
      console.error('   - Full error:', error);
      throw new Error(`Signed URL generation failed: ${error.message}`);
    }

    if (!data?.signedUrl) {
      console.error('❌ No signed URL returned from Supabase');
      throw new Error('No signed URL returned from Supabase');
    }

    console.log('✅ Signed URL generated successfully for', bucket);
    console.log('   - URL length:', data.signedUrl.length);
    console.log('   - URL starts with:', data.signedUrl.substring(0, 100) + '...');
    
    return { data, error: null };
  } catch (error) {
    console.error('❌ Exception in getSignedUrl with SDXL support:');
    console.error('   - Bucket:', bucket);
    console.error('   - Path:', filePath);
    console.error('   - Error:', error);
    console.error('   - Stack:', error instanceof Error ? error.stack : 'No stack');
    
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

// SDXL image specific functions
export const uploadSDXLFastImage = async (
  imageId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileName = `${imageId}-${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile('sdxl_fast', fileName, file, onProgress);
};

export const getSDXLFastImageUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('sdxl_fast', filePath);
  return error ? null : data?.signedUrl || null;
};

export const uploadSDXLHighImage = async (
  imageId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const fileName = `${imageId}-${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile('sdxl_high', fileName, file, onProgress);
};

export const getSDXLHighImageUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await getSignedUrl('sdxl_high', filePath);
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
