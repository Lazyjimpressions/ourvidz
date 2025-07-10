import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl, deleteFile } from '@/lib/storage';
import type { Tables } from '@/integrations/supabase/types';
import { sessionCache } from '@/lib/cache/SessionCache';
import { assetMetadataCache, assetUrlCache } from '@/lib/cache/StaleWhileRevalidateCache';
import { OptimizedDatabaseQuery } from './OptimizedDatabaseQuery';
import { EnhancedErrorHandling } from './EnhancedErrorHandling';

type ImageRecord = Tables<'images'>;
type VideoRecord = Tables<'videos'>;
type JobRecord = Tables<'jobs'>;

export interface UnifiedAsset {
  id: string;
  type: 'image' | 'video';
  title?: string;
  prompt: string;
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
  signedUrls?: string[];
  jobId?: string;
  // SDXL image handling properties
  isSDXLImage?: boolean;
  sdxlIndex?: number;
  originalAssetId?: string;
}

interface AssetFilters {
  type?: 'image' | 'video';
  status?: string;
  quality?: string;
  search?: string;
}

interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export class OptimizedAssetServiceV2 {
  static async getUserAssets(
    filters: AssetFilters = {}, 
    pagination: PaginationOptions = { limit: 50, offset: 0 }
  ): Promise<{ assets: UnifiedAsset[]; hasMore: boolean; total: number }> {
    console.log('🚀 OptimizedAssetServiceV2: Fetching assets with enhanced caching');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Enhanced caching with stale-while-revalidate pattern
    const cacheKey = `assets-v2-${user.id}-${JSON.stringify(filters)}-${pagination.offset || 0}`;
    
    try {
      const result = await assetMetadataCache.get(
        cacheKey,
        async (): Promise<{ assets: UnifiedAsset[]; hasMore: boolean; total: number }> => {
          console.log('🔄 Fetching fresh asset data from database');
          
          // Use enhanced error handling for the database query
          const queryResult = await EnhancedErrorHandling.enhancedRequest(
            () => OptimizedDatabaseQuery.queryAssets(user.id, filters, {
              limit: pagination.limit || 50,
              metadataOnly: true // Load metadata first, URLs on-demand
            }),
            {
              timeout: 15000,
              deduplicationKey: cacheKey,
              retries: {
                maxRetries: 2,
                baseDelay: 1000,
                maxDelay: 3000
              }
            }
          );
          
          return {
            assets: queryResult.assets,
            hasMore: queryResult.hasMore,
            total: queryResult.total || queryResult.assets.length
          };
        }
      );
      
      return result;
    } catch (error) {
      console.error('❌ Enhanced caching failed, using fallback:', error);
      
      // Fallback to basic query without caching
      const queryResult = await OptimizedDatabaseQuery.queryAssets(user.id, filters, {
        limit: pagination.limit || 50,
        metadataOnly: true
      });
      
      return {
        assets: queryResult.assets,
        hasMore: queryResult.hasMore,
        total: queryResult.total || queryResult.assets.length
      };
    }
  }

  static async generateAssetUrls(asset: UnifiedAsset): Promise<UnifiedAsset> {
    // Initialize session cache
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      sessionCache.initializeSession(user.id);
    }

    const cacheKey = `url-v2-${asset.id}-${asset.type}`;
    
    try {
      const result = await assetUrlCache.get(
        cacheKey,
        async (): Promise<UnifiedAsset> => {
          console.log(`🔗 Generating URLs for ${asset.type} asset:`, asset.id);
          
          const enhancedAsset = await EnhancedErrorHandling.enhancedRequest(
            async () => {
              if (asset.type === 'image') {
                return this.generateImageUrls(asset);
              } else {
                return this.generateVideoUrls(asset);
              }
            },
            {
              timeout: 10000,
              retries: {
                maxRetries: 2,
                baseDelay: 500,
                maxDelay: 2000
              }
            }
          );
          
          return enhancedAsset;
        }
      );
      
      return result;
    } catch (error) {
      console.error('❌ URL generation failed for asset:', asset.id, error);
      return asset; // Return original asset if URL generation fails
    }
  }

  private static async generateVideoUrls(asset: UnifiedAsset): Promise<UnifiedAsset> {
    // Implementation similar to OptimizedAssetService but with enhanced error handling
    return asset; // Placeholder - would implement full video URL generation
  }

  private static async generateImageUrls(asset: UnifiedAsset): Promise<UnifiedAsset> {
    // Implementation similar to OptimizedAssetService but with enhanced error handling  
    return asset; // Placeholder - would implement full image URL generation
  }
}