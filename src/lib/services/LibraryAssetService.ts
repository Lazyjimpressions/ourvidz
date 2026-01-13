import { supabase } from '@/integrations/supabase/client';
import { normalizeSignedUrl } from '@/lib/utils/normalizeSignedUrl';

export interface LibraryAsset {
  id: string;
  user_id: string;
  asset_type: 'image' | 'video';
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  duration_seconds?: number;
  original_prompt: string;
  model_used: string;
  generation_seed?: number;
  collection_id?: string;
  custom_title?: string;
  tags: string[];
  is_favorite: boolean;
  visibility: 'private' | 'unlisted' | 'public';
  created_at: string;
  updated_at: string;
}

export interface UserCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  asset_count: number;
  created_at: string;
}

export interface UnifiedLibraryAsset {
  id: string;
  originalAssetId: string;
  type: 'image' | 'video';
  url?: string;
  storagePath?: string;
  mimeType?: string;
  prompt: string;
  timestamp: Date;
  createdAt: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  duration?: number;
  thumbnailUrl?: string;
  enhancedPrompt?: string;
  seed?: number;
  generationParams?: Record<string, any>;
  customTitle?: string;
  tags: string[];
  isFavorite: boolean;
  collectionId?: string;
  status: 'completed' | 'processing' | 'failed';
}

export class LibraryAssetService {
  /**
   * Fetch all library assets for the current user
   */
  static async getUserLibraryAssets(): Promise<UnifiedLibraryAsset[]> {
    const { data, error } = await supabase
      .from('user_library')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching library assets:', error);
      throw error;
    }

    return (data || []).map(asset => LibraryAssetService.transformLibraryAsset(asset as any));
  }

  /**
   * Normalize storage path for reliable bucket-relative access
   */
  private static normalizeStoragePath(storagePath: string): string {
    if (!storagePath) return storagePath;
    
    // Handle full HTTP URLs from database (extract path after bucket)
    if (storagePath.startsWith('http')) {
      const urlMatch = storagePath.match(/\/storage\/v1\/object\/(?:sign|public)\/user-library\/([^?]+)/);
      if (urlMatch) {
        console.log(`🔄 Extracted path from URL: "${storagePath}" → "${urlMatch[1]}"`);
        return urlMatch[1];
      }
    }
    
    // Remove leading slash if present
    let cleanPath = storagePath.replace(/^\/+/, '');
    
    // Remove bucket prefix if it exists
    if (cleanPath.startsWith('user-library/')) {
      cleanPath = cleanPath.substring('user-library/'.length);
    }
    
    console.log(`🧹 Storage path cleaned: "${storagePath}" → "${cleanPath}"`);
    return cleanPath;
  }

  /**
   * Generate signed URL for a library asset
   */
  static async generateSignedUrl(asset: any): Promise<string> {
    const cleanPath = this.normalizeStoragePath(asset.storage_path);
    
    console.log(`🔗 Generating signed URL for library asset ${asset.id}:`, {
      originalPath: asset.storage_path,
      cleanPath,
      bucket: 'user-library'
    });

    const { data, error } = await supabase.storage
      .from('user-library')
      .createSignedUrl(cleanPath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }

    // CRITICAL: Normalize to absolute URL
    const absoluteUrl = normalizeSignedUrl(data.signedUrl);
    if (!absoluteUrl) {
      throw new Error('Failed to normalize signed URL');
    }

    console.log(`✅ Successfully generated signed URL for asset ${asset.id}`);
    return absoluteUrl;
  }

  /**
   * Update library asset
   */
  static async updateAsset(
    assetId: string,
    updates: {
      custom_title?: string;
      tags?: string[];
      is_favorite?: boolean;
      collection_id?: string;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('user_library')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId);

    if (error) {
      console.error('Error updating library asset:', error);
      throw error;
    }
  }

  /**
   * Delete library asset
   */
  static async deleteAsset(assetId: string): Promise<void> {
    const { error } = await supabase
      .from('user_library')
      .delete()
      .eq('id', assetId);

    if (error) {
      console.error('Error deleting library asset:', error);
      throw error;
    }
  }

  /**
   * Get user collections
   */
  static async getUserCollections(): Promise<UserCollection[]> {
    const { data, error } = await supabase
      .from('user_collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collections:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create new collection
   */
  static async createCollection(name: string, description?: string): Promise<UserCollection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_collections')
      .insert({
        user_id: user.id,
        name,
        description
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating collection:', error);
      throw error;
    }

    return data;
  }

  /**
   * Add library asset to workspace
   */
  static async addToWorkspace(libraryAssetId: string): Promise<void> {
    try {
      console.log('📋 Adding library asset to workspace:', { libraryAssetId });

      // First verify the asset exists
      const { data: asset, error: fetchError } = await supabase
        .from('user_library')
        .select('id, asset_type, storage_path')
        .eq('id', libraryAssetId)
        .single();

      if (fetchError || !asset) {
        console.error('📋 Library asset not found:', { libraryAssetId, fetchError });
        throw new Error('Library asset not found');
      }

      console.log('📋 Found library asset:', asset);

      const { data, error } = await supabase.functions.invoke('workspace-actions', {
        body: {
          action: 'copy_to_workspace',
          libraryAssetId
        }
      });

      if (error) {
        console.error('Error adding to workspace:', error);
        // Try to parse error details from the response
        const errorMessage = data?.error 
          ? `${data.error}${data.details ? ': ' + data.details : ''}` 
          : error.message || 'Failed to add to workspace';
        throw new Error(errorMessage);
      }

      console.log('✅ Asset added to workspace successfully');
    } catch (error) {
      console.error('Failed to add asset to workspace:', error);
      throw error;
    }
  }

  /**
   * Transform library asset to unified format
   */
  private static transformLibraryAsset(asset: LibraryAsset): UnifiedLibraryAsset {
    return {
      id: asset.id,
      originalAssetId: asset.id,
      type: asset.asset_type,
      storagePath: asset.storage_path,
      mimeType: asset.mime_type,
      prompt: asset.original_prompt,
      timestamp: new Date(asset.created_at),
      createdAt: new Date(asset.created_at),
      quality: 'high', // Library assets are considered high quality
      modelType: asset.model_used,
      duration: asset.duration_seconds,
      seed: asset.generation_seed,
      customTitle: asset.custom_title,
      tags: asset.tags,
      isFavorite: asset.is_favorite,
      collectionId: asset.collection_id,
      status: 'completed' // Library assets are always completed
    };
  }
}