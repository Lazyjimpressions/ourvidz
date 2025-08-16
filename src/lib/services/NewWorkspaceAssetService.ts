
import { supabase } from '@/integrations/supabase/client';

export interface WorkspaceAsset {
  id: string;
  user_id: string;
  job_id: string;
  asset_type: 'image' | 'video';
  temp_storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  duration_seconds?: number;
  asset_index: number;
  generation_seed: number;
  original_prompt: string;
  model_used: string;
  generation_settings: any;
  created_at: string;
  expires_at: string;
  signed_url?: string;
  signed_url_expires_at?: string;
}

export class NewWorkspaceAssetService {
  /**
   * Get user's workspace assets
   */
  static async getUserWorkspaceAssets(): Promise<WorkspaceAsset[]> {
    const { data, error } = await supabase
      .from('workspace_assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch workspace assets:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Generate signed URL for workspace asset
   */
  static async generateSignedUrl(asset: WorkspaceAsset): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('workspace-temp')
        .createSignedUrl(asset.temp_storage_path, 3600); // 1 hour expiry

      if (error) {
        console.error('Failed to generate signed URL:', error);
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Signed URL generation error:', error);
      throw error;
    }
  }

  /**
   * Save workspace asset to library
   */
  static async saveToLibrary(
    assetId: string,
    options?: {
      customTitle?: string;
      collectionId?: string;
      tags?: string[];
    }
  ): Promise<void> {
    const { data, error } = await supabase.functions.invoke('workspace-actions', {
      body: {
        action: 'save_to_library',
        assetId,
        ...options
      }
    });

    if (error) {
      console.error('Failed to save to library:', error);
      throw error;
    }

    return data;
  }

  /**
   * Discard workspace asset
   */
  static async discardAsset(assetId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('workspace-actions', {
      body: {
        action: 'discard_asset',
        assetId
      }
    });

    if (error) {
      console.error('Failed to discard asset:', error);
      throw error;
    }

    return data;
  }

  /**
   * Queue a new generation job
   */
  static async queueJob(request: {
    prompt: string;
    job_type: 'sdxl_image_fast' | 'sdxl_image_high' | 'wan_video_fast' | 'wan_video_high';
    quality?: 'fast' | 'high';
    format?: string;
    model_type?: string;
    enhanced_prompt?: string;
    reference_image_url?: string;
    reference_strength?: number;
    seed?: number;
    metadata?: any;
  }): Promise<{ jobId: string; status: string; queueName: string }> {
    const { data, error } = await supabase.functions.invoke('queue-job', {
      body: request
    });

    if (error) {
      console.error('Failed to queue job:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get system metrics (admin only)
   */
  static async getSystemMetrics(): Promise<any> {
    const { data, error } = await supabase.functions.invoke('system-metrics');

    if (error) {
      console.error('Failed to get system metrics:', error);
      throw error;
    }

    return data;
  }
}
