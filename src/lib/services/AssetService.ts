import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl, deleteFile } from '@/lib/storage';
import type { Tables } from '@/integrations/supabase/types';
import { UnifiedUrlService } from './UnifiedUrlService';
import { AssetServiceErrorHandler } from './AssetServiceErrorHandler';

type ImageRecord = Tables<'images'>;
type VideoRecord = Tables<'videos'>;

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
}

export class AssetService {
  static getBucketByType(assetType: 'image' | 'video'): string {
    return assetType === 'image' ? 'images' : 'videos';
  }

  static async generateURL(asset: UnifiedAsset): Promise<string | null> {
    if (!asset) {
      console.warn('No asset provided to generateURL');
      return null;
    }

    try {
      let storagePath: string | undefined;

      if (asset.type === 'image') {
        const image = await supabase
          .from('images')
          .select('image_url')
          .eq('id', asset.id)
          .single();
        storagePath = image.data?.image_url;
      } else if (asset.type === 'video') {
        const video = await supabase
          .from('videos')
          .select('video_url')
          .eq('id', asset.id)
          .single();
        storagePath = video.data?.video_url;
      }

      if (!storagePath) {
        console.warn(`No storage path found for asset ID: ${asset.id}`);
        return null;
      }

      const { data, error } = await getSignedUrl(this.getBucketByType(asset.type) as any, storagePath, 3600);
      return error ? null : data?.signedUrl || null;
    } catch (error) {
      console.error('Error generating URL:', error);
      return null;
    }
  }

  static async generateThumbnailURL(asset: UnifiedAsset): Promise<string | null> {
    if (!asset) {
      console.warn('No asset provided to generateThumbnailURL');
      return null;
    }

    try {
      let thumbnailPath: string | undefined;

      if (asset.type === 'image') {
        const image = await supabase
          .from('images')
          .select('thumbnail_url')
          .eq('id', asset.id)
          .single();
        thumbnailPath = image.data?.thumbnail_url;
      } else if (asset.type === 'video') {
        const video = await supabase
          .from('videos')
          .select('thumbnail_url')
          .eq('id', asset.id)
          .single();
        thumbnailPath = video.data?.thumbnail_url;
      }

      if (!thumbnailPath) {
        console.warn(`No thumbnail path found for asset ID: ${asset.id}`);
        return null;
      }

      const { data, error } = await getSignedUrl(this.getBucketByType(asset.type) as any, thumbnailPath, 3600);
      return error ? null : data?.signedUrl || null;
    } catch (error) {
      console.error('Error generating thumbnail URL:', error);
      return null;
    }
  }

  /**
   * NEW: Get user library assets from new architecture
   */
  static async getUserLibraryAssets(): Promise<UnifiedAsset[]> {
    console.log('🚀 Getting user library assets from new architecture');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { data: libraryAssets, error } = await supabase
      .from('user_library')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch library assets:', error);
      throw error;
    }

    // Transform library assets to UnifiedAsset format
    const assets: UnifiedAsset[] = (libraryAssets || []).map(asset => ({
      id: asset.id,
      type: asset.asset_type as 'image' | 'video',
      title: asset.custom_title || undefined,
      prompt: asset.original_prompt,
      status: 'completed',
      createdAt: new Date(asset.created_at!),
      modelType: asset.model_used,
      // URLs will be generated on demand
      thumbnailUrl: undefined,
      url: undefined
    }));

    console.log('✅ Library assets fetched:', { count: assets.length });
    return assets;
  }

  /**
   * ENHANCED: Get user assets with support for both old and new architecture
   */
  static async getUserAssetsOptimized(sessionOnly: boolean = false): Promise<UnifiedAsset[]> {
    console.log('🚀 OPTIMIZED: Fetching assets with new architecture support:', { sessionOnly });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ ASSET SERVICE: No authenticated user found');
      const authError = AssetServiceErrorHandler.createError(
        'AUTH_REQUIRED',
        'No authenticated user found',
        {},
        'Please sign in to continue'
      );
      AssetServiceErrorHandler.handleError(authError);
      throw authError;
    }

    if (sessionOnly) {
      // For workspace view: check new workspace_assets table first
      console.log('🔍 Checking new workspace_assets for session assets');
      
      try {
        const { data: workspaceAssets, error: workspaceError } = await supabase
          .from('workspace_assets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!workspaceError && workspaceAssets && workspaceAssets.length > 0) {
          console.log('✅ Found assets in new workspace_assets table:', { count: workspaceAssets.length });
          
          // Transform workspace assets to UnifiedAsset format
          const assets: UnifiedAsset[] = workspaceAssets.map(asset => ({
            id: asset.id,
            type: asset.asset_type as 'image' | 'video',
            prompt: asset.original_prompt,
            status: 'completed', // Workspace assets are always completed
            createdAt: new Date(asset.created_at!),
            modelType: asset.model_used,
            // URLs will be generated on demand via new service
            thumbnailUrl: undefined,
            url: undefined
          }));

          return assets;
        } else {
          console.log('⚠️ No assets in new workspace_assets, falling back to old system');
        }
      } catch (error) {
        console.error('❌ Error checking workspace_assets, falling back to old system:', error);
      }
    }

    // Fallback to old system or for library view
    return this.getUserAssetsLegacy(sessionOnly);
  }

  /**
   * LEGACY: Original method for backward compatibility
   */
  private static async getUserAssetsLegacy(sessionOnly: boolean = false): Promise<UnifiedAsset[]> {
    console.log('🔄 Using legacy asset fetching method');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Get cutoff time for session filtering (last 48 hours for better job persistence)
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
    
    console.log('📅 Session filtering details (48h):', {
      sessionOnly,
      cutoffTime: fortyEightHoursAgo.toISOString(),
      currentTime: now.toISOString(),
      hoursBack: 48,
      userId: user.id
    });
    
    // Build query conditions
    let imageQuery = supabase
      .from('images')
      .select(`
        *,
        project:projects(title),
        jobs!jobs_image_id_fkey(id, job_type, model_type, metadata)
      `)
      .eq('user_id', user.id);
      
    let videoQuery = supabase
      .from('videos')
      .select(`
        *,
        project:projects(title),
        jobs!jobs_video_id_fkey(id, job_type, model_type, metadata)
      `)
      .eq('user_id', user.id);

    // Add session filtering if requested
    if (sessionOnly) {
      console.log('🚫 Filtering out dismissed items for workspace view');
      console.log('📅 Session filtering from (48h):', fortyEightHoursAgo.toISOString());
      
      imageQuery = imageQuery.gte('created_at', fortyEightHoursAgo.toISOString());
      videoQuery = videoQuery.gte('created_at', fortyEightHoursAgo.toISOString());
      
      // Filter out dismissed items for workspace view (handle null values correctly)
      imageQuery = imageQuery.or('metadata->>workspace_dismissed.is.null,metadata->>workspace_dismissed.neq.true');
      videoQuery = videoQuery.or('metadata->>workspace_dismissed.is.null,metadata->>workspace_dismissed.neq.true');
      
      console.log('🚫 WORKSPACE FILTER: Excluding dismissed items from workspace view');
    }

    console.log('🔍 ASSET SERVICE: Executing legacy database queries...');

    // Fetch images and videos in parallel
    const [imagesResult, videosResult] = await Promise.all([
      imageQuery.order('created_at', { ascending: false }),
      videoQuery.order('created_at', { ascending: false })
    ]);

    if (imagesResult.error) {
      console.error('❌ ASSET SERVICE: Images query failed:', imagesResult.error);
      throw imagesResult.error;
    }
    if (videosResult.error) {
      console.error('❌ ASSET SERVICE: Videos query failed:', videosResult.error);
      throw videosResult.error;
    }

    console.log('✅ ASSET SERVICE: Legacy queries successful:', {
      imagesFound: imagesResult.data?.length || 0,
      videosFound: videosResult.data?.length || 0,
      totalRawAssets: (imagesResult.data?.length || 0) + (videosResult.data?.length || 0)
    });

    // Transform images to UnifiedAsset format
    const imageAssets: UnifiedAsset[] = (imagesResult.data || []).map((image) => {
      const metadata = image.metadata as any;
      const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
      const modelType = isSDXL ? 'SDXL' : 'WAN';

      const jobData = (image.jobs as any[])?.[0] || null;

      return {
        id: image.id,
        type: 'image' as const,
        title: image.title || undefined,
        prompt: image.prompt,
        enhancedPrompt: image.enhanced_prompt || undefined,
        status: image.status,
        quality: image.quality || undefined,
        format: image.format || undefined,
        createdAt: new Date(image.created_at),
        projectId: image.project_id || undefined,
        projectTitle: (image.project as any)?.title,
        modelType,
        isSDXL,
        metadata: metadata || {},
        // URLs will be populated by lazy loading
        thumbnailUrl: undefined,
        url: undefined
      };
    });

    // Transform videos to UnifiedAsset format
    const videoAssets: UnifiedAsset[] = (videosResult.data || []).map((video) => {
      const jobData = (video.jobs as any[])?.[0] || null;
      
      return {
        id: video.id,
        type: 'video' as const,
        prompt: (video.project as any)?.title || 'Untitled Video',
        status: video.status || 'draft',
        format: video.format || undefined,
        createdAt: new Date(video.created_at!),
        projectId: video.project_id || undefined,
        projectTitle: (video.project as any)?.title,
        duration: video.duration || undefined,
        resolution: video.resolution || undefined,
        // URLs will be populated by lazy loading
        thumbnailUrl: undefined,
        url: undefined
      };
    });

    // Combine and sort by creation date
    const allAssets = [...imageAssets, ...videoAssets];
    allAssets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    console.log('✅ Legacy asset fetching complete:', { 
      found: allAssets.length
    });
    
    return allAssets;
  }

  static async getAssetURL(assetId: string, assetType: 'image' | 'video'): Promise<string | null> {
    try {
      const bucket = this.getBucketByType(assetType);
      let storagePath: string | undefined;
  
      if (assetType === 'image') {
        const { data, error } = await supabase
          .from('images')
          .select('image_url')
          .eq('id', assetId)
          .single();
  
        if (error) {
          console.error('Error fetching image URL:', error);
          return null;
        }
        storagePath = data?.image_url;
      } else if (assetType === 'video') {
        const { data, error } = await supabase
          .from('videos')
          .select('video_url')
          .eq('id', assetId)
          .single();
  
        if (error) {
          console.error('Error fetching video URL:', error);
          return null;
        }
        storagePath = data?.video_url;
      }
  
      if (!storagePath) {
        console.warn(`No storage path found for asset ID: ${assetId}`);
        return null;
      }
  
      const { data, error } = await getSignedUrl(bucket as any, storagePath, 3600);
      return error ? null : data?.signedUrl || null;
    } catch (error) {
      console.error('Error in getAssetURL:', error);
      return null;
    }
  }

  static async getAssetThumbnailURL(assetId: string, assetType: 'image' | 'video'): Promise<string | null> {
    try {
      const bucket = this.getBucketByType(assetType);
      let thumbnailPath: string | undefined;
  
      if (assetType === 'image') {
        const { data, error } = await supabase
          .from('images')
          .select('thumbnail_url')
          .eq('id', assetId)
          .single();
  
        if (error) {
          console.error('Error fetching image thumbnail URL:', error);
          return null;
        }
        thumbnailPath = data?.thumbnail_url;
      } else if (assetType === 'video') {
        const { data, error } = await supabase
          .from('videos')
          .select('thumbnail_url')
          .eq('id', assetId)
          .single();
  
        if (error) {
          console.error('Error fetching video thumbnail URL:', error);
          return null;
        }
        thumbnailPath = data?.thumbnail_url;
      }
  
      if (!thumbnailPath) {
        console.warn(`No thumbnail path found for asset ID: ${assetId}`);
        return null;
      }
  
      const { data, error } = await getSignedUrl(bucket as any, thumbnailPath, 3600);
      return error ? null : data?.signedUrl || null;
    } catch (error) {
      console.error('Error in getAssetThumbnailURL:', error);
      return null;
    }
  }
  
  static async getAssetsByIds(assetIds: string): Promise<UnifiedAsset[]>;
  static async getAssetsByIds(assetIds: string[]): Promise<UnifiedAsset[]>;
  static async getAssetsByIds(assetIds: string | string[]): Promise<UnifiedAsset[]> {
    if (typeof assetIds === 'string') {
      assetIds = [assetIds];
    }
    if (assetIds.length === 0) {
      return [];
    }

    console.log('🚀 Optimized getAssetsByIds:', { assetIds: assetIds.length });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Check both new and old systems
    const [libraryResult, imagesResult, videosResult, workspaceResult] = await Promise.all([
      // New system: user_library
      supabase
        .from('user_library')
        .select('*')
        .eq('user_id', user.id)
        .in('id', assetIds),
      // Old system: images
      supabase
        .from('images')
        .select('*, project:projects(title)')
        .eq('user_id', user.id)
        .in('id', assetIds),
      // Old system: videos
      supabase
        .from('videos')
        .select('*, project:projects(title)')
        .eq('user_id', user.id)
        .in('id', assetIds),
      // New system: workspace_assets
      supabase
        .from('workspace_assets')
        .select('*')
        .eq('user_id', user.id)
        .in('id', assetIds)
    ]);

    const allAssets: UnifiedAsset[] = [];

    // Process library assets (new system)
    if (libraryResult.data) {
      const libraryAssets = libraryResult.data.map(asset => ({
        id: asset.id,
        type: asset.asset_type as 'image' | 'video',
        title: asset.custom_title || undefined,
        prompt: asset.original_prompt,
        status: 'completed',
        createdAt: new Date(asset.created_at!),
        modelType: asset.model_used,
        thumbnailUrl: undefined,
        url: undefined
      }));
      allAssets.push(...libraryAssets);
    }

    // Process workspace assets (new system)
    if (workspaceResult.data) {
      const workspaceAssets = workspaceResult.data.map(asset => ({
        id: asset.id,
        type: asset.asset_type as 'image' | 'video',
        prompt: asset.original_prompt,
        status: 'completed',
        createdAt: new Date(asset.created_at!),
        modelType: asset.model_used,
        thumbnailUrl: undefined,
        url: undefined
      }));
      allAssets.push(...workspaceAssets);
    }

    // Process legacy images
    if (imagesResult.data) {
      const imageAssets = imagesResult.data.map(image => ({
        id: image.id,
        type: 'image' as const,
        title: image.title || undefined,
        prompt: image.prompt,
        status: image.status,
        createdAt: new Date(image.created_at),
        modelType: 'Legacy',
        thumbnailUrl: undefined,
        url: undefined
      }));
      allAssets.push(...imageAssets);
    }

    // Process legacy videos
    if (videosResult.data) {
      const videoAssets = videosResult.data.map(video => ({
        id: video.id,
        type: 'video' as const,
        prompt: 'Legacy Video',
        status: video.status || 'draft',
        createdAt: new Date(video.created_at!),
        modelType: 'Legacy',
        thumbnailUrl: undefined,
        url: undefined
      }));
      allAssets.push(...videoAssets);
    }

    // Remove duplicates and sort
    const uniqueAssets = allAssets.filter((asset, index, self) => 
      index === self.findIndex(a => a.id === asset.id)
    );
    
    uniqueAssets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    console.log('✅ getAssetsByIds complete:', { 
      found: uniqueAssets.length,
      requested: assetIds.length
    });
    
    return uniqueAssets;
  }

  static async deleteAsset(assetId: string, type: 'image' | 'video'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Try to delete from new systems first
    if (type === 'image' || type === 'video') {
      // Try workspace_assets first
      const { error: workspaceError } = await supabase
        .from('workspace_assets')
        .delete()
        .eq('id', assetId)
        .eq('user_id', user.id);
      
      if (!workspaceError) {
        console.log('✅ Deleted from workspace_assets');
        return;
      }

      // Try user_library
      const { error: libraryError } = await supabase
        .from('user_library')
        .delete()
        .eq('id', assetId)
        .eq('user_id', user.id);
      
      if (!libraryError) {
        console.log('✅ Deleted from user_library');
        return;
      }
    }

    // Fallback to legacy system
    const table = type === 'image' ? 'images' : 'videos';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', assetId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete ${type}: ${error.message}`);
    }

    console.log(`✅ Deleted ${type} from legacy ${table} table`);
  }
}
