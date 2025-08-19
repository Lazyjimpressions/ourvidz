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
 */
export function toSharedFromWorkspace(row: any): SharedAsset {
  const rawOriginalPath = row.temp_storage_path || row.storage_path || '';
  const rawThumbPath = row.thumbnail_path;
  
  const originalPath = normalizePath(rawOriginalPath) || '';
  const thumbPath = normalizePath(rawThumbPath) || deriveThumbnailPath(originalPath);
  
  return {
    id: row.id,
    type: row.asset_type === 'video' ? 'video' : 'image',
    thumbPath,
    originalPath,
    title: row.custom_title || `Generated ${row.asset_type}`,
    prompt: row.original_prompt,
    createdAt: new Date(row.created_at),
    format: row.asset_type,
    modelType: row.model_used,
    metadata: {
      source: 'workspace',
      bucket: 'workspace-temp',
      storage_path: originalPath,
      mime_type: row.mime_type,
      seed: row.generation_seed,
      job_id: row.job_id,
      generation_settings: row.generation_settings,
      ...row.generation_settings
    },
    width: row.width,
    height: row.height,
    duration: row.duration_seconds,
    fileSize: row.file_size_bytes,
    mimeType: row.mime_type,
    userId: row.user_id
  };
}

/**
 * Map user_library row to SharedAsset
 */
export function toSharedFromLibrary(row: any): SharedAsset {
  const rawOriginalPath = row.storage_path || '';
  const rawThumbPath = row.thumbnail_path;
  
  const originalPath = normalizePath(rawOriginalPath) || '';
  const thumbPath = normalizePath(rawThumbPath) || deriveThumbnailPath(originalPath);
  
  return {
    id: row.id,
    type: row.asset_type === 'video' ? 'video' : 'image',
    thumbPath,
    originalPath,
    title: row.custom_title || `Saved ${row.asset_type}`,
    prompt: row.original_prompt,
    createdAt: new Date(row.created_at),
    format: row.asset_type,
    modelType: row.model_used,
    metadata: {
      source: 'library',
      bucket: 'user-library',
      storage_path: originalPath,
      mime_type: row.mime_type,
      seed: row.generation_seed,
      tags: row.tags,
      is_favorite: row.is_favorite,
      collection_id: row.collection_id,
      visibility: row.visibility
    },
    width: row.width,
    height: row.height,
    duration: row.duration_seconds,
    fileSize: row.file_size_bytes,
    mimeType: row.mime_type,
    userId: row.user_id
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
  const thumbPath = normalizePath(rawThumbPath) || deriveThumbnailPath(originalPath);
  
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