export type SharedAsset = {
  id: string;
  type: 'image' | 'video';
  thumbPath: string | null;     // storage path (not signed)
  originalPath: string;         // storage path (not signed)
  title?: string;
  prompt?: string;
  createdAt: Date;
  format?: string;              // 'image' | 'video'
  modelType?: string;
  metadata?: any;
  // Optional fields for compatibility
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  userId?: string;
};

/**
 * Normalize storage path by removing bucket prefixes
 */
function normalizePath(path: string | null | undefined): string | null {
  if (!path || !path.trim()) return null;
  
  // Handle absolute URLs - return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Remove bucket prefix if present
  const bucketPrefixes = ['workspace-temp/', 'user-library/'];
  for (const prefix of bucketPrefixes) {
    if (path.startsWith(prefix)) {
      return path.substring(prefix.length);
    }
  }
  
  return path;
}

/**
 * Derive thumbnail path from original storage path
 */
function deriveThumbnailPath(originalPath: string | null | undefined): string | null {
  const normalized = normalizePath(originalPath);
  if (!normalized) return null;
  
  const lastDot = normalized.lastIndexOf('.');
  if (lastDot === -1) {
    return `${normalized}.thumb.webp`;
  }
  const pathWithoutExt = normalized.substring(0, lastDot);
  return `${pathWithoutExt}.thumb.webp`;
}

/**
 * Map workspace_assets row to SharedAsset
 * Handles both snake_case (DB) and camelCase (service) formats
 */
export function toSharedFromWorkspace(row: any): SharedAsset {
  // Handle both formats: snake_case from DB and camelCase from services
  const rawOriginalPath = row.temp_storage_path || row.tempStoragePath || row.storage_path || row.storagePath || row.url || '';
  const rawThumbPath = row.thumbnail_path || row.thumbnailPath || row.thumbnailUrl || null;
  
  const originalPath = normalizePath(rawOriginalPath) || '';
  // Only use thumbPath if explicitly provided (SDXL worker creates thumbnails, Replicate does not)
  const thumbPath = rawThumbPath ? normalizePath(rawThumbPath) : null;
  
  // Add warning if originalPath is empty to prevent future regressions
  if (!originalPath) {
    console.warn('⚠️ AssetMappers.toSharedFromWorkspace: Empty originalPath detected', {
      id: row.id,
      rawOriginalPath,
      availableFields: Object.keys(row).filter(k => k.includes('path') || k.includes('url'))
    });
  }
  
  // Support both naming conventions
  const assetType = row.asset_type || row.assetType || 'image';
  const originalPrompt = row.original_prompt || row.originalPrompt || '';
  const createdAt = row.created_at || row.createdAt;
  const modelUsed = row.model_used || row.modelUsed || '';
  const mimeType = row.mime_type || row.mimeType || '';
  const generationSeed = row.generation_seed || row.generationSeed;
  const jobId = row.job_id || row.jobId;
  const generationSettings = row.generation_settings || row.generationSettings || {};
  const fileSizeBytes = row.file_size_bytes || row.fileSizeBytes;
  const durationSeconds = row.duration_seconds || row.durationSeconds;
  const userId = row.user_id || row.userId;
  const customTitle = row.custom_title || row.customTitle;
  
  const sharedAsset = {
    id: row.id,
    type: (assetType === 'video' ? 'video' : 'image') as 'image' | 'video',
    thumbPath,
    originalPath,
    title: customTitle || `Generated ${assetType}`,
    prompt: originalPrompt,
    createdAt: new Date(createdAt),
    format: assetType,
    modelType: modelUsed,
    metadata: {
      source: 'workspace',
      bucket: 'workspace-temp',
      storage_path: originalPath,
      mime_type: mimeType,
      seed: generationSeed,
      job_id: jobId,
      generation_settings: generationSettings,
      ...generationSettings
    },
    width: row.width,
    height: row.height,
    duration: durationSeconds,
    fileSize: fileSizeBytes,
    mimeType: mimeType,
    userId: userId
  };
  
  // One-time diagnostic logging
  if (Math.random() < 0.1) { // Log ~10% of assets for sampling
    console.log('🔍 Asset mapped (workspace):', {
      id: sharedAsset.id,
      originalPath: sharedAsset.originalPath,
      thumbPath: sharedAsset.thumbPath,
      type: sharedAsset.type,
      hasOriginalPath: !!sharedAsset.originalPath,
      hasThumbPath: !!sharedAsset.thumbPath,
      willUseOriginalAsThumb: !sharedAsset.thumbPath && sharedAsset.type === 'image'
    });
  }
  
  return sharedAsset;
}

/**
 * Map user_library row to SharedAsset
 * Handles both snake_case (DB) and camelCase (service) formats
 */
export function toSharedFromLibrary(row: any): SharedAsset {
  // Handle both formats: snake_case from DB and camelCase from services
  const rawOriginalPath = row.storage_path || row.storagePath || '';
  const rawThumbPath = row.thumbnail_path || row.thumbnailPath || null;
  
  const originalPath = normalizePath(rawOriginalPath) || '';
  const thumbPath = rawThumbPath ? normalizePath(rawThumbPath) : null;
  
  // Support both naming conventions
  const assetType = row.asset_type || row.assetType || 'image';
  const originalPrompt = row.original_prompt || row.originalPrompt || '';
  const createdAt = row.created_at || row.createdAt;
  const modelUsed = row.model_used || row.modelUsed || '';
  const mimeType = row.mime_type || row.mimeType || '';
  const generationSeed = row.generation_seed || row.generationSeed;
  const fileSizeBytes = row.file_size_bytes || row.fileSizeBytes;
  const durationSeconds = row.duration_seconds || row.durationSeconds;
  const userId = row.user_id || row.userId;
  const customTitle = row.custom_title || row.customTitle;
  const tags = row.tags || [];
  const isFavorite = row.is_favorite || row.isFavorite || false;
  const collectionId = row.collection_id || row.collectionId;
  const visibility = row.visibility || 'private';
  
  return {
    id: row.id,
    type: (assetType === 'video' ? 'video' : 'image') as 'image' | 'video',
    thumbPath,
    originalPath,
    title: customTitle || `Saved ${assetType}`,
    prompt: originalPrompt,
    createdAt: new Date(createdAt),
    format: assetType,
    modelType: modelUsed,
    metadata: {
      source: 'library',
      bucket: 'user-library',
      storage_path: originalPath,
      mime_type: mimeType,
      seed: generationSeed,
      tags: tags,
      is_favorite: isFavorite,
      collection_id: collectionId,
      visibility: visibility
    },
    width: row.width,
    height: row.height,
    duration: durationSeconds,
    fileSize: fileSizeBytes,
    mimeType: mimeType,
    userId: userId
  };
}

/**
 * Map legacy UnifiedAsset to SharedAsset for backward compatibility
 */
export function toSharedFromLegacy(asset: any): SharedAsset {
  // Determine source from metadata or URL patterns
  const isLibrary = asset.metadata?.source === 'library' || 
                   asset.url?.includes('user-library') ||
                   asset.metadata?.bucket === 'user-library';
  
  const bucket = isLibrary ? 'user-library' : 'workspace-temp';
  const rawOriginalPath = asset.metadata?.storage_path || 
                         asset.storagePath || 
                         asset.originalPath || 
                         '';
  const rawThumbPath = asset.thumbnailPath || asset.metadata?.thumbnail_path;
  
  const originalPath = normalizePath(rawOriginalPath) || '';
  // Only set thumbPath if exists, otherwise null to prevent 404s
  const thumbPath = rawThumbPath ? normalizePath(rawThumbPath) : null;
  
  return {
    id: asset.id,
    type: asset.type === 'video' ? 'video' : 'image',
    thumbPath,
    originalPath,
    title: asset.title || asset.customTitle || `${asset.type} asset`,
    prompt: asset.prompt || asset.originalPrompt,
    createdAt: asset.createdAt || new Date(asset.timestamp || asset.created_at || Date.now()),
    format: asset.format || asset.type,
    modelType: asset.modelType || asset.model_used,
    metadata: {
      source: isLibrary ? 'library' : 'workspace',
      bucket,
      ...asset.metadata
    },
    width: asset.width,
    height: asset.height,
    duration: asset.duration || asset.duration_seconds,
    fileSize: asset.fileSize || asset.file_size_bytes,
    mimeType: asset.mimeType || asset.mime_type,
    userId: asset.userId || asset.user_id
  };
}