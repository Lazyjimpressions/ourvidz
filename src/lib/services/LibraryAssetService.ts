import { supabase } from '@/integrations/supabase/client';

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

    return (data || []).map(asset => this.transformLibraryAsset(asset as any));
  }

  /**
   * Generate signed URL for a library asset
   */
  static async generateSignedUrl(asset: any): Promise<string> {
    const { data, error } = await supabase.storage
      .from('user-library')
      .createSignedUrl(asset.storage_path, 3600); // 1 hour expiry

    if (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }

    return data.signedUrl;
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