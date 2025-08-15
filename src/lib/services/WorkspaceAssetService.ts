import { supabase } from '@/integrations/supabase/client';

export interface WorkspaceAsset {
  id: string;
  user_id: string;
  asset_type: 'image' | 'video';
  temp_storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  duration_seconds?: number;
  job_id: string;
  asset_index: number;
  generation_seed: number;
  original_prompt: string;
  model_used: string;
  generation_settings: Record<string, any>;
  created_at: string;
  expires_at: string;
}

export interface UnifiedWorkspaceAsset {
  id: string;
  originalAssetId: string;
  type: 'image' | 'video';
  url?: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  duration?: number;
  thumbnailUrl?: string;
  enhancedPrompt?: string;
  seed?: number;
  generationParams?: Record<string, any>;
}

export class WorkspaceAssetService {
  /**
   * Fetch all workspace assets for the current user
   */
  static async getUserWorkspaceAssets(): Promise<UnifiedWorkspaceAsset[]> {
    const { data, error } = await supabase
      .from('workspace_assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workspace assets:', error);
      throw error;
    }

    return (data || []).map(asset => this.transformWorkspaceAsset(asset as any));
  }

  /**
   * Generate signed URL for a workspace asset
   */
  static async generateSignedUrl(asset: any): Promise<string> {
    const { data, error } = await supabase.storage
      .from('workspace-temp')
      .createSignedUrl(asset.temp_storage_path, 3600); // 1 hour expiry

    if (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  }

  /**
   * Save workspace asset to user library via workspace-actions
   */
  static async saveToLibrary(
    workspaceAssetId: string, 
    options?: {
      customTitle?: string;
      collectionId?: string;
      tags?: string[];
    }
  ): Promise<string> {
    const { data, error } = await supabase.functions.invoke('workspace-actions', {
      body: {
        action: 'save_to_library',
        asset_ids: [workspaceAssetId],
        collection_id: options?.collectionId,
        custom_title: options?.customTitle,
        tags: options?.tags
      }
    });

    if (error) {
      console.error('Error saving to library via workspace-actions:', error);
      throw error;
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to save to library');
    }

    return data.saved_assets?.[0]?.id || workspaceAssetId;
  }

  /**
   * Discard workspace asset
   */
  static async discardAsset(workspaceAssetId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_assets')
      .delete()
      .eq('id', workspaceAssetId);

    if (error) {
      console.error('Error discarding workspace asset:', error);
      throw error;
    }
  }

  /**
   * Transform workspace asset to unified format
   */
  private static transformWorkspaceAsset(asset: WorkspaceAsset): UnifiedWorkspaceAsset {
    const settings = asset.generation_settings || {};
    
    return {
      id: asset.id,
      originalAssetId: asset.id,
      type: asset.asset_type,
      prompt: asset.original_prompt,
      timestamp: new Date(asset.created_at),
      quality: settings.quality || 'fast',
      modelType: asset.model_used,
      duration: asset.duration_seconds,
      enhancedPrompt: settings.enhanced_prompt,
      seed: asset.generation_seed,
      generationParams: settings
    };
  }

  /**
   * Get file extension from mime type
   */
  private static getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4'
    };
    return extensions[mimeType] || 'png';
  }
}