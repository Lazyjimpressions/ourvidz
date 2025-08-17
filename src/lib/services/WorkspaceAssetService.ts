
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedWorkspaceAsset {
  id: string;
  userId: string;
  jobId: string;
  assetType: 'image' | 'video';
  tempStoragePath: string;
  fileSizeBytes: number;
  mimeType: string;
  durationSeconds?: number;
  assetIndex: number;
  generationSeed: number;
  originalPrompt: string;
  modelUsed: string;
  generationSettings: Record<string, any>;
  createdAt: string;
  expiresAt: string;
  url?: string;
  thumbnailUrl?: string;
}

export class WorkspaceAssetService {
  /**
   * Get all workspace assets for the current user
   */
  static async getUserWorkspaceAssets(): Promise<UnifiedWorkspaceAsset[]> {
    try {
      const { data: assets, error } = await supabase
        .from('workspace_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workspace assets:', error);
        throw error;
      }

      // Convert to unified format
      return (assets || []).map((asset: any) => ({
        id: asset.id,
        userId: asset.user_id,
        jobId: asset.job_id,
        assetType: asset.asset_type as 'image' | 'video',
        tempStoragePath: asset.temp_storage_path,
        fileSizeBytes: Number(asset.file_size_bytes),
        mimeType: asset.mime_type,
        durationSeconds: asset.duration_seconds ? Number(asset.duration_seconds) : undefined,
        assetIndex: Number(asset.asset_index),
        generationSeed: Number(asset.generation_seed),
        originalPrompt: asset.original_prompt,
        modelUsed: asset.model_used,
        generationSettings: (asset.generation_settings && typeof asset.generation_settings === 'object')
          ? (asset.generation_settings as Record<string, any>)
          : {},
        createdAt: asset.created_at,
        expiresAt: asset.expires_at
      }));
    } catch (error) {
      console.error('Failed to fetch workspace assets:', error);
      throw error;
    }
  }

  /**
   * Generate signed URL for workspace asset
   */
  static async generateSignedUrl(asset: any): Promise<string | null> {
    try {
      // For workspace assets, the temp_storage_path contains the full path
      const storagePath = asset.temp_storage_path;
      
      console.log('🔗 Generating signed URL for workspace asset:', {
        assetId: asset.id,
        storagePath,
        bucket: 'workspace-temp'
      });

      const { data, error } = await supabase.storage
        .from('workspace-temp')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error generating signed URL:', error);
        return null;
      }

      console.log('✅ Generated signed URL for workspace asset');
      return data.signedUrl;
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }
  }

  /**
   * Save workspace asset to user library
   */
  static async saveToLibrary(
    assetId: string, 
    options?: {
      customTitle?: string;
      collectionId?: string;
      tags?: string[];
    }
  ): Promise<void> {
    try {
      console.log('💾 Saving workspace asset to library:', { assetId, options });

      const { error } = await supabase.functions.invoke('workspace-actions', {
        body: {
          action: 'save_to_library',
          assetId,
          customTitle: options?.customTitle,
          collectionId: options?.collectionId,
          tags: options?.tags
        }
      });

      if (error) {
        console.error('Error saving to library:', error);
        throw error;
      }

      console.log('✅ Asset saved to library successfully');
    } catch (error) {
      console.error('Failed to save asset to library:', error);
      throw error;
    }
  }

  /**
   * Discard workspace asset (permanently delete)
   */
  static async discardAsset(assetId: string): Promise<void> {
    try {
      console.log('🗑️ Discarding workspace asset:', assetId);

      const { error } = await supabase.functions.invoke('workspace-actions', {
        body: {
          action: 'discard_asset',
          assetId
        }
      });

      if (error) {
        console.error('Error discarding asset:', error);
        throw error;
      }

      console.log('✅ Asset discarded successfully');
    } catch (error) {
      console.error('Failed to discard asset:', error);
      throw error;
    }
  }

  /**
   * Clear workspace asset (save to library if not saved, then remove from workspace)
   */
  static async clearAsset(
    assetId: string, 
    options?: {
      customTitle?: string;
      collectionId?: string;
      tags?: string[];
    }
  ): Promise<void> {
    try {
      console.log('🧹 Clearing workspace asset:', { assetId, options });

      const { error } = await supabase.functions.invoke('workspace-actions', {
        body: {
          action: 'clear_asset',
          assetId,
          customTitle: options?.customTitle,
          collectionId: options?.collectionId,
          tags: options?.tags
        }
      });

      if (error) {
        console.error('Error clearing asset:', error);
        throw error;
      }

      console.log('✅ Asset cleared successfully');
    } catch (error) {
      console.error('Failed to clear asset:', error);
      throw error;
    }
  }

  /**
   * Clear job assets (save to library if not saved, then remove from workspace)
   */
  static async clearJob(jobId: string): Promise<void> {
    try {
      console.log('🧹 Clearing job assets:', jobId);

      const { error } = await supabase.functions.invoke('workspace-actions', {
        body: {
          action: 'clear_job',
          jobId
        }
      });

      if (error) {
        console.error('Error clearing job:', error);
        throw error;
      }

      console.log('✅ Job cleared successfully');
    } catch (error) {
      console.error('Failed to clear job:', error);
      throw error;
    }
  }

  /**
   * Clear entire workspace (save to library if not saved, then remove from workspace)
   */
  static async clearWorkspace(): Promise<void> {
    try {
      console.log('🧹 Clearing entire workspace');

      const { error } = await supabase.functions.invoke('workspace-actions', {
        body: {
          action: 'clear_workspace'
        }
      });

      if (error) {
        console.error('Error clearing workspace:', error);
        throw error;
      }

      console.log('✅ Workspace cleared successfully');
    } catch (error) {
      console.error('Failed to clear workspace:', error);
      throw error;
    }
  }
}

