/**
 * Optimized database query service with cursor-based pagination and streaming
 */

import { supabase } from '@/integrations/supabase/client';
import { UnifiedAsset } from './OptimizedAssetService';

interface QueryFilters {
  type?: 'image' | 'video';
  status?: string;
  quality?: string;
  search?: string;
}

interface PaginationCursor {
  lastId?: string;
  lastCreatedAt?: string;
}

interface QueryOptions {
  limit: number;
  cursor?: PaginationCursor;
  metadataOnly?: boolean;
}

interface QueryResult {
  assets: UnifiedAsset[];
  nextCursor?: PaginationCursor;
  hasMore: boolean;
  total?: number;
}

export class OptimizedDatabaseQuery {
  // Enhanced query with cursor-based pagination for better performance
  static async queryAssets(
    userId: string,
    filters: QueryFilters = {},
    options: QueryOptions = { limit: 50 }
  ): Promise<QueryResult> {
    const { limit, cursor, metadataOnly = false } = options;

    try {
      // Use cursor-based pagination for better performance on large datasets
      const result = await this.executeOptimizedQuery(userId, filters, options);
      
      return {
        assets: result.assets,
        nextCursor: result.nextCursor,
        hasMore: result.assets.length === limit,
        total: result.total
      };
    } catch (error) {
      console.error('❌ Optimized query failed, falling back:', error);
      
      // Fallback to simpler query
      return this.executeFallbackQuery(userId, filters, options);
    }
  }

  private static async executeOptimizedQuery(
    userId: string,
    filters: QueryFilters,
    options: QueryOptions
  ): Promise<QueryResult> {
    const { limit, cursor, metadataOnly } = options;

    // Build optimized queries with minimal data transfer
    const baseImageFields = metadataOnly 
      ? 'id, prompt, status, quality, format, created_at, updated_at, project_id, metadata'
      : 'id, prompt, status, quality, format, created_at, updated_at, project_id, metadata, image_url, image_urls, thumbnail_url';

    const baseVideoFields = metadataOnly
      ? 'id, status, format, created_at, updated_at, project_id, duration, resolution, metadata'
      : 'id, status, format, created_at, updated_at, project_id, duration, resolution, video_url, thumbnail_url, metadata';

    let imageQuery = supabase
      .from('images')
      .select(`
        ${baseImageFields},
        project:projects(title),
        job:jobs!left(id, quality, job_type, model_type, metadata)
      `)
      .eq('user_id', userId);

    let videoQuery = supabase
      .from('videos')
      .select(`
        ${baseVideoFields},
        project:projects(title),
        job:jobs!left(id, quality, job_type, model_type, metadata)
      `)
      .eq('user_id', userId);

    // Apply cursor-based pagination
    if (cursor?.lastCreatedAt && cursor?.lastId) {
      const cursorTimestamp = cursor.lastCreatedAt;
      imageQuery = imageQuery
        .or(`created_at.lt.${cursorTimestamp},and(created_at.eq.${cursorTimestamp},id.lt.${cursor.lastId})`);
      videoQuery = videoQuery
        .or(`created_at.lt.${cursorTimestamp},and(created_at.eq.${cursorTimestamp},id.lt.${cursor.lastId})`);
    }

    // Apply filters
    if (filters.status) {
      imageQuery = imageQuery.eq('status', filters.status);
      videoQuery = videoQuery.eq('status', filters.status);
    }
    if (filters.quality && filters.type !== 'video') {
      imageQuery = imageQuery.eq('quality', filters.quality);
    }

    // Execute queries based on type filter  
    const imagePromise = (!filters.type || filters.type === 'image') 
      ? imageQuery
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null });

    const videoPromise = (!filters.type || filters.type === 'video')
      ? videoQuery
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })  
          .limit(limit)
      : Promise.resolve({ data: [], error: null });

    // Execute queries with Promise.allSettled for better error handling
    const [imageResult, videoResult] = await Promise.all([imagePromise, videoPromise]);

    if (imageResult.error) throw imageResult.error;
    if (videoResult.error) throw videoResult.error;

    // Process and combine results
    const imageAssets = this.processImageData(imageResult.data || [], metadataOnly);
    const videoAssets = this.processVideoData(videoResult.data || [], metadataOnly);
    
    const allAssets = [...imageAssets, ...videoAssets]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    // Apply client-side search filter if provided
    const filteredAssets = filters.search 
      ? this.applySearchFilter(allAssets, filters.search)
      : allAssets;

    // Calculate next cursor
    const nextCursor = filteredAssets.length === limit ? {
      lastId: filteredAssets[filteredAssets.length - 1].id,
      lastCreatedAt: filteredAssets[filteredAssets.length - 1].createdAt.toISOString()
    } : undefined;

    return {
      assets: filteredAssets,
      nextCursor,
      hasMore: filteredAssets.length === limit,
      total: filteredAssets.length
    };
  }

  private static async executeFallbackQuery(
    userId: string,
    filters: QueryFilters,
    options: QueryOptions
  ): Promise<QueryResult> {
    const { limit } = options;

    // Simple fallback query without cursor pagination
    const { data: images } = await supabase
      .from('images')
      .select('id, prompt, status, quality, created_at, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: videos } = await supabase
      .from('videos')
      .select('id, status, format, created_at, metadata, duration, resolution')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const imageAssets = this.processImageData(images || [], true);
    const videoAssets = this.processVideoData(videos || [], true);
    
    const allAssets = [...imageAssets, ...videoAssets]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return {
      assets: allAssets,
      hasMore: allAssets.length === limit
    };
  }

  private static processImageData(images: any[], metadataOnly: boolean): UnifiedAsset[] {
    return images.map(image => ({
      id: image.id,
      type: 'image' as const,
      prompt: image.prompt || 'Untitled Image',
      status: image.status || 'pending',
      quality: image.quality || 'fast',
      format: image.format || 'png',
      createdAt: new Date(image.created_at),
      projectId: image.project_id,
      projectTitle: image.project?.title,
      // Only include URLs if not metadata-only
      url: metadataOnly ? undefined : image.image_url,
      thumbnailUrl: metadataOnly ? undefined : image.thumbnail_url,
      signedUrls: metadataOnly ? undefined : image.image_urls,
      modelType: this.detectModelType(image),
      isSDXL: image.metadata?.is_sdxl || false,
      jobId: Array.isArray(image.job) ? image.job[0]?.id : image.job?.id
    }));
  }

  private static processVideoData(videos: any[], metadataOnly: boolean): UnifiedAsset[] {
    return videos.map(video => ({
      id: video.id,
      type: 'video' as const,
      prompt: this.extractVideoPrompt(video),
      status: video.status || 'draft',
      format: video.format || 'mp4',
      createdAt: new Date(video.created_at),
      projectId: video.project_id,
      projectTitle: video.project?.title,
      duration: video.duration,
      resolution: video.resolution,
      // Only include URLs if not metadata-only
      url: metadataOnly ? undefined : video.video_url,
      thumbnailUrl: metadataOnly ? undefined : video.thumbnail_url,
      modelType: this.detectModelType(video),
      jobId: Array.isArray(video.job) ? video.job[0]?.id : video.job?.id
    }));
  }

  private static detectModelType(item: any): string {
    const metadata = item.metadata || {};
    const jobData = Array.isArray(item.job) ? item.job[0] : item.job;
    
    if (jobData?.job_type?.includes('enhanced') || jobData?.model_type?.includes('7b')) {
      return 'Enhanced-7B';
    }
    if (metadata.is_sdxl || jobData?.job_type?.includes('sdxl')) {
      return 'SDXL';
    }
    return 'WAN';
  }

  private static extractVideoPrompt(video: any): string {
    const metadata = video.metadata || {};
    const jobData = Array.isArray(video.job) ? video.job[0] : video.job;
    const jobMetadata = jobData?.metadata || {};
    
    return metadata.prompt || 
           jobMetadata.prompt || 
           jobMetadata.original_prompt || 
           'Untitled Video';
  }

  private static applySearchFilter(assets: UnifiedAsset[], search: string): UnifiedAsset[] {
    const searchLower = search.toLowerCase();
    return assets.filter(asset => 
      asset.prompt?.toLowerCase().includes(searchLower) ||
      asset.title?.toLowerCase().includes(searchLower)
    );
  }
}