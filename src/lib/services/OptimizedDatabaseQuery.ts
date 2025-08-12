/**
 * Optimized database query service with cursor-based pagination and streaming
 */

import { supabase } from '@/integrations/supabase/client';
import { UnifiedAsset } from './OptimizedAssetService';
import { normalizeQuality, normalizeModel } from '@/lib/generation/normalize';

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
  // Phase 1: Database Query Optimization with proper pagination and filtering
  static async queryAssets(
    userId: string,
    filters: QueryFilters = {},
    options: QueryOptions = { limit: 20 }
  ): Promise<QueryResult> {
    const { limit = 20, cursor, metadataOnly = false } = options;

    try {
      // Use optimized pagination strategy - smaller initial loads
      const result = await this.executeOptimizedPaginatedQuery(userId, filters, options);
      
      return {
        assets: result.assets,
        nextCursor: result.nextCursor,
        hasMore: result.assets.length === limit,
        total: result.total
      };
    } catch (error) {
      console.error('❌ Optimized query failed, falling back:', error);
      
      // Fallback to simpler query with reduced load
      return this.executeFallbackQuery(userId, filters, { ...options, limit: Math.min(limit, 10) });
    }
  }

  // Phase 1: Optimized pagination with database-level filtering
  private static async executeOptimizedPaginatedQuery(
    userId: string,
    filters: QueryFilters,
    options: QueryOptions
  ): Promise<QueryResult> {
    const { limit = 20, cursor, metadataOnly = false } = options;

    // Phase 1: Optimized fields selection - only essential data
    const essentialImageFields = metadataOnly 
      ? 'id, prompt, status, quality, format, created_at, metadata'
      : 'id, prompt, status, quality, format, created_at, metadata, image_url, image_urls';

    const essentialVideoFields = metadataOnly
      ? 'id, status, format, created_at, duration, resolution, metadata'
      : 'id, status, format, created_at, duration, resolution, video_url, metadata';

    // Phase 1: Reduced joins and optimized queries
    let imageQuery = supabase
      .from('images')
      .select(essentialImageFields)
      .eq('user_id', userId);

    let videoQuery = supabase
      .from('videos')
      .select(essentialVideoFields)
      .eq('user_id', userId);

    // Apply cursor-based pagination
    if (cursor?.lastCreatedAt && cursor?.lastId) {
      const cursorTimestamp = cursor.lastCreatedAt;
      imageQuery = imageQuery
        .or(`created_at.lt.${cursorTimestamp},and(created_at.eq.${cursorTimestamp},id.lt.${cursor.lastId})`);
      videoQuery = videoQuery
        .or(`created_at.lt.${cursorTimestamp},and(created_at.eq.${cursorTimestamp},id.lt.${cursor.lastId})`);
    }

    // Phase 1: Database-level filtering (moved from client-side)
    if (filters.status) {
      imageQuery = imageQuery.eq('status', filters.status);
      videoQuery = videoQuery.eq('status', filters.status);
    }
    if (filters.quality && filters.type !== 'video') {
      imageQuery = imageQuery.eq('quality', filters.quality);
    }
    // Database-level search filtering
    if (filters.search) {
      const searchFilter = `prompt.ilike.%${filters.search}%`;
      imageQuery = imageQuery.or(searchFilter);
      videoQuery = videoQuery.or(`metadata->prompt.ilike.%${filters.search}%`);
    }

    // Phase 1: Optimized execution with proper limits
    const imagePromise = (!filters.type || filters.type === 'image') 
      ? imageQuery
          .order('created_at', { ascending: false })
          .limit(Math.ceil(limit / 2)) // Split between images and videos
      : Promise.resolve({ data: [], error: null });

    const videoPromise = (!filters.type || filters.type === 'video')
      ? videoQuery
          .order('created_at', { ascending: false })
          .limit(Math.ceil(limit / 2)) // Split between images and videos
      : Promise.resolve({ data: [], error: null });

    // Execute queries with Promise.allSettled for better error handling
    const [imageResult, videoResult] = await Promise.all([imagePromise, videoPromise]);

    if (imageResult.error) throw imageResult.error;
    if (videoResult.error) throw videoResult.error;

    // Phase 1: Streamlined asset processing
    const imageAssets = this.processImageDataOptimized(imageResult.data || [], metadataOnly);
    const videoAssets = this.processVideoDataOptimized(videoResult.data || [], metadataOnly);
    
    const allAssets = [...imageAssets, ...videoAssets]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    // Phase 1: Search filtering now handled at database level
    const filteredAssets = allAssets;

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

    const imageAssets = this.processImageDataOptimized(images || [], true);
    const videoAssets = this.processVideoDataOptimized(videos || [], true);
    
    const allAssets = [...imageAssets, ...videoAssets]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return {
      assets: allAssets,
      hasMore: allAssets.length === limit
    };
  }

  // Phase 1: Optimized image processing with reduced operations
  private static processImageDataOptimized(images: any[], metadataOnly: boolean): UnifiedAsset[] {
    return images.map(image => {
      const quality = normalizeQuality(image);
      const modelType = normalizeModel(image);
      const bucketHint = image?.metadata?.bucket;
      return {
        id: image.id,
        type: 'image' as const,
        prompt: image.prompt || 'Untitled Image',
        status: image.status || 'pending',
        quality,
        format: image.format || 'png',
        createdAt: new Date(image.created_at),
        // Remove unnecessary joins and fields
        url: metadataOnly ? undefined : image.image_url,
        signedUrls: metadataOnly ? undefined : image.image_urls,
        modelType,
        isSDXL: image.metadata?.is_sdxl || false,
        bucketHint
      };
    });
  }

  // Phase 1: Optimized video processing with reduced operations
  private static processVideoDataOptimized(videos: any[], metadataOnly: boolean): UnifiedAsset[] {
    return videos.map(video => {
      const quality = normalizeQuality(video);
      const modelType = this.detectModelTypeSimple(video.metadata);
      const bucketHint = video?.metadata?.bucket;
      return {
        id: video.id,
        type: 'video' as const,
        prompt: this.extractVideoPromptSimple(video),
        status: video.status || 'draft',
        format: video.format || 'mp4',
        createdAt: new Date(video.created_at),
        duration: video.duration,
        resolution: video.resolution,
        quality,
        // Only include URLs if not metadata-only
        url: metadataOnly ? undefined : video.video_url,
        modelType,
        bucketHint
      };
    });
  }

  // Phase 1: Simplified model type detection
  private static detectModelTypeSimple(metadata: any): string {
    if (!metadata) return 'WAN';
    
    if (metadata.is_sdxl) return 'SDXL';
    if (metadata.model_type?.includes('7b') || metadata.model_type?.includes('enhanced')) {
      return 'Enhanced-7B';
    }
    return 'WAN';
  }

  // Phase 1: Simplified video prompt extraction
  private static extractVideoPromptSimple(video: any): string {
    const metadata = video.metadata || {};
    return metadata.prompt || metadata.original_prompt || 'Untitled Video';
  }

  private static applySearchFilter(assets: UnifiedAsset[], search: string): UnifiedAsset[] {
    const searchLower = search.toLowerCase();
    return assets.filter(asset => 
      asset.prompt?.toLowerCase().includes(searchLower) ||
      asset.title?.toLowerCase().includes(searchLower)
    );
  }
}