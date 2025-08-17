import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Updated unified asset interface for new schema
export interface UnifiedAsset {
  id: string;
  type: 'image' | 'video';
  title?: string;
  prompt: string;
  enhancedPrompt?: string;
  thumbnailUrl?: string;
  url?: string;
  status: string;
  quality?: string;
  format?: string;
  createdAt: Date;
  projectId?: string;
  projectTitle?: string;
  duration?: number;
  resolution?: string;
  error?: string;
  modelType?: string;
  isSDXL?: boolean;
  metadata?: Record<string, any>;
  isUrlLoaded?: boolean;
  isVisible?: boolean;
  virtualIndex?: number;
  seed?: number;
  generationParams?: Record<string, any>;
  userId?: string;
  fileSize?: number;
  mimeType?: string;
  tags?: string[];
  isFavorite?: boolean;
  customTitle?: string;
  signedUrls?: string[];
  bucketHint?: string;
}

export class AssetService {
  // Get bucket name based on asset type and quality
  static getBucketByType(assetType: 'image' | 'video', quality?: string, isLibrary = false): string {
    if (isLibrary) {
      return 'user-library';
    }
    
    // For workspace assets, use workspace-temp bucket
    return 'workspace-temp';
  }

  // Generate signed URL for main asset
  static async generateURL(asset: UnifiedAsset): Promise<string | null> {
    try {
      const bucket = this.getBucketByType(asset.type, asset.quality, false);
      
      // For workspace assets, the path is in temp_storage_path
      // For library assets, the path is in storage_path
      const storagePath = asset.url || `${asset.userId}/${asset.id}`;
      
      // Add bucketHint for compatibility
      (asset as any).bucketHint = bucket;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error generating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error in generateURL:', error);
      return null;
    }
  }

  // Generate signed URL for thumbnail
  static async generateThumbnailURL(asset: UnifiedAsset): Promise<string | null> {
    try {
      if (asset.type === 'image') {
        // For images, use the main asset as thumbnail
        return this.generateURL(asset);
      }

      // For videos, try to get thumbnail
      const bucket = this.getBucketByType(asset.type, asset.quality, false);
      const thumbnailPath = asset.thumbnailUrl || `${asset.userId}/${asset.id}_thumb.jpg`;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(thumbnailPath, 3600);

      if (error) {
        // Fallback to main asset for videos without thumbnails
        return this.generateURL(asset);
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error in generateThumbnailURL:', error);
      return null;
    }
  }

  // Get user library assets (saved assets)
  static async getUserLibraryAssets(): Promise<UnifiedAsset[]> {
    try {
      const { data, error } = await supabase
        .from('user_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map(asset => ({
        id: asset.id,
        type: (asset.asset_type.includes('video') ? 'video' : 'image') as 'image' | 'video',
        title: asset.custom_title || asset.original_prompt.substring(0, 50) + '...',
        prompt: asset.original_prompt,
        createdAt: new Date(asset.created_at),
        modelType: asset.model_used,
        duration: asset.duration_seconds || undefined,
        url: asset.storage_path,
        userId: asset.user_id,
        fileSize: Number(asset.file_size_bytes),
        mimeType: asset.mime_type,
        tags: asset.tags,
        isFavorite: asset.is_favorite,
        customTitle: asset.custom_title,
        seed: asset.generation_seed ? Number(asset.generation_seed) : undefined,
        status: 'completed',
        metadata: {},
      }));
    } catch (error) {
      console.error('Error fetching user library assets:', error);
      toast.error('Failed to load library assets');
      return [];
    }
  }

  // Get workspace assets (temporary/session assets)
  static async getUserAssetsOptimized(sessionOnly: boolean = false): Promise<UnifiedAsset[]> {
    try {
      const { data, error } = await supabase
        .from('workspace_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map(asset => ({
        id: asset.id,
        type: (asset.asset_type.includes('video') ? 'video' : 'image') as 'image' | 'video',
        title: asset.original_prompt.substring(0, 50) + '...',
        prompt: asset.original_prompt,
        createdAt: new Date(asset.created_at),
        modelType: asset.model_used,
        duration: asset.duration_seconds || undefined,
        url: asset.temp_storage_path,
        userId: asset.user_id,
        fileSize: Number(asset.file_size_bytes),
        mimeType: asset.mime_type,
        seed: asset.generation_seed ? Number(asset.generation_seed) : undefined,
        generationParams: asset.generation_settings as Record<string, any>,
        status: 'completed',
        metadata: {
          ...(asset.generation_settings as Record<string, any>) || {},
          job_id: asset.job_id // Include job_id for grouping
        },
      }));
    } catch (error) {
      console.error('Error fetching workspace assets:', error);
      toast.error('Failed to load workspace assets');
      return [];
    }
  }

  // Get asset URL by ID and type
  static async getAssetURL(assetId: string, assetType: 'image' | 'video'): Promise<string | null> {
    try {
      // Try workspace_assets first
      const { data: workspaceAsset } = await supabase
        .from('workspace_assets')
        .select('temp_storage_path, user_id')
        .eq('id', assetId)
        .maybeSingle();

      if (workspaceAsset) {
        const bucket = 'workspace-temp';
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(workspaceAsset.temp_storage_path, 3600);

        if (!error && data) return data.signedUrl;
      }

      // Try user_library
      const { data: libraryAsset } = await supabase
        .from('user_library')
        .select('storage_path, user_id')
        .eq('id', assetId)
        .maybeSingle();

      if (libraryAsset) {
        const bucket = 'user-library';
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(libraryAsset.storage_path, 3600);

        if (!error && data) return data.signedUrl;
      }

      return null;
    } catch (error) {
      console.error('Error getting asset URL:', error);
      return null;
    }
  }

  // Get asset thumbnail URL by ID and type
  static async getAssetThumbnailURL(assetId: string, assetType: 'image' | 'video'): Promise<string | null> {
    if (assetType === 'image') {
      return this.getAssetURL(assetId, assetType);
    }

    // For videos, try to get thumbnail, fallback to main asset
    return this.getAssetURL(assetId, assetType);
  }

  // Get assets by IDs
  static async getAssetsByIds(assetIds: string | string[]): Promise<UnifiedAsset[]> {
    const ids = Array.isArray(assetIds) ? assetIds : [assetIds];
    if (ids.length === 0) return [];

    try {
      // Query both workspace_assets and user_library
      const [workspaceData, libraryData] = await Promise.all([
        supabase
          .from('workspace_assets')
          .select('*')
          .in('id', ids),
        supabase
          .from('user_library')
          .select('*')
          .in('id', ids)
      ]);

      const assets: UnifiedAsset[] = [];

      // Process workspace assets
      if (workspaceData.data) {
        assets.push(...workspaceData.data.map(asset => ({
          id: asset.id,
          type: (asset.asset_type.includes('video') ? 'video' : 'image') as 'image' | 'video',
          title: asset.original_prompt.substring(0, 50) + '...',
          prompt: asset.original_prompt,
          createdAt: new Date(asset.created_at),
          modelType: asset.model_used,
          duration: asset.duration_seconds || undefined,
          url: asset.temp_storage_path,
          userId: asset.user_id,
          fileSize: Number(asset.file_size_bytes),
          mimeType: asset.mime_type,
          seed: asset.generation_seed ? Number(asset.generation_seed) : undefined,
          generationParams: asset.generation_settings as Record<string, any>,
          status: 'completed',
          metadata: {
            ...(asset.generation_settings as Record<string, any>) || {},
            job_id: asset.job_id // Include job_id for grouping
          },
        })));
      }

      // Process library assets
      if (libraryData.data) {
        assets.push(...libraryData.data.map(asset => ({
          id: asset.id,
          type: (asset.asset_type.includes('video') ? 'video' : 'image') as 'image' | 'video',
          title: asset.custom_title || asset.original_prompt.substring(0, 50) + '...',
          prompt: asset.original_prompt,
          createdAt: new Date(asset.created_at),
          modelType: asset.model_used,
          duration: asset.duration_seconds || undefined,
          url: asset.storage_path,
          userId: asset.user_id,
          fileSize: Number(asset.file_size_bytes),
          mimeType: asset.mime_type,
          tags: asset.tags,
          isFavorite: asset.is_favorite,
          customTitle: asset.custom_title,
          seed: asset.generation_seed ? Number(asset.generation_seed) : undefined,
          status: 'completed',
          metadata: {},
        })));
      }

      return assets;
    } catch (error) {
      console.error('Error fetching assets by IDs:', error);
      return [];
    }
  }

  // Delete asset
  static async deleteAsset(assetId: string, type: 'image' | 'video'): Promise<void> {
    try {
      // Try to delete from workspace_assets first
      const { data: workspaceAsset } = await supabase
        .from('workspace_assets')
        .select('temp_storage_path')
        .eq('id', assetId)
        .maybeSingle();

      if (workspaceAsset) {
        // Delete from storage
        await supabase.storage
          .from('workspace-temp')
          .remove([workspaceAsset.temp_storage_path]);

        // Delete from database
        const { error } = await supabase
          .from('workspace_assets')
          .delete()
          .eq('id', assetId);

        if (error) throw error;
        return;
      }

      // Try user_library
      const { data: libraryAsset } = await supabase
        .from('user_library')
        .select('storage_path')
        .eq('id', assetId)
        .maybeSingle();

      if (libraryAsset) {
        // Delete from storage
        await supabase.storage
          .from('user-library')
          .remove([libraryAsset.storage_path]);

        // Delete from database
        const { error } = await supabase
          .from('user_library')
          .delete()
          .eq('id', assetId);

        if (error) throw error;
        return;
      }

      throw new Error('Asset not found');
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  }
}