import { getSignedUrl } from '@/lib/storage';
import { assetUrlCache } from '@/lib/cache/StaleWhileRevalidateCache';
import { sessionCache } from '@/lib/cache/SessionCache';
import type { UnifiedAsset } from './OptimizedAssetService';

/**
 * Unified URL Generation Service
 * 
 * Single source of truth for asset URL generation across the application.
 * Features:
 * - Intelligent bucket detection with fallbacks
 * - Efficient caching with stale-while-revalidate pattern
 * - Batch processing for performance
 * - Comprehensive error handling
 * - Progressive loading support
 */
export class UnifiedUrlService {
  private static readonly DEFAULT_EXPIRY = 30 * 60; // 30 minutes (Supabase default)
  private static readonly THUMBNAIL_EXPIRY = 60 * 60; // 1 hour for thumbnails
  
  // Performance monitoring
  private static metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    totalRequests: 0,
    batchRequests: 0
  };

  /**
   * Generate URLs for a single asset with intelligent caching
   */
  static async generateAssetUrls(asset: UnifiedAsset): Promise<UnifiedAsset> {
    this.metrics.totalRequests++;
    
    try {
      // Check session cache first (fastest)
      const cachedUrl = sessionCache.getCachedSignedUrl(asset.id);
      if (cachedUrl) {
        this.metrics.cacheHits++;
        console.log(`⚡ Cache hit for asset ${asset.id}`);
        return { ...asset, url: cachedUrl, thumbnailUrl: cachedUrl };
      }

      // Check if asset already has valid signed URLs
      if (this.hasValidSignedUrls(asset)) {
        this.metrics.cacheHits++;
        sessionCache.cacheSignedUrl(asset.id, asset.url!);
        return asset;
      }

      this.metrics.cacheMisses++;

      // Use stale-while-revalidate cache for URL generation
      const cacheKey = `asset-url-${asset.id}`;
      const generateUrls = async () => {
        const bucket = this.determineBucket(asset);
        return await this.generateSignedUrls(asset, bucket);
      };

      const urls = await assetUrlCache.get(cacheKey, generateUrls);
      
      // Cache in session storage for immediate access
      if (urls && typeof urls === 'object' && 'url' in urls && urls.url) {
        sessionCache.cacheSignedUrl(asset.id, urls.url as string);
      }
      
      return { ...asset, ...(urls as object) };
    } catch (error) {
      this.metrics.errors++;
      console.error(`❌ Failed to generate URLs for asset ${asset.id}:`, error);
      
      return { 
        ...asset, 
        url: undefined, 
        thumbnailUrl: undefined, 
        error: 'Failed to load media' 
      };
    }
  }

  /**
   * Generate URLs for multiple assets in batch (optimized)
   */
  static async generateBatchUrls(assets: UnifiedAsset[]): Promise<UnifiedAsset[]> {
    if (assets.length === 0) return [];
    
    this.metrics.batchRequests++;
    console.log(`🚀 Batch URL generation for ${assets.length} assets`);
    
    // Split into assets that need URLs vs those that already have them
    const { needUrls, haveUrls } = this.splitAssetsByUrlStatus(assets);
    
    if (needUrls.length === 0) {
      console.log(`✅ All ${assets.length} assets already have URLs`);
      return assets;
    }

    console.log(`⚡ Processing ${needUrls.length} assets needing URLs, ${haveUrls.length} already have URLs`);

    // Process URL generation in smaller batches to prevent overwhelming the system
    const BATCH_SIZE = 10;
    const results: UnifiedAsset[] = [];
    
    for (let i = 0; i < needUrls.length; i += BATCH_SIZE) {
      const batch = needUrls.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(asset => 
        this.generateAssetUrls(asset).catch(error => {
          console.error(`Failed to generate URL for asset ${asset.id}:`, error);
          return { ...asset, error: 'Failed to load' };
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to prevent rate limiting
      if (i + BATCH_SIZE < needUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Combine results maintaining original order
    const allResults = [...haveUrls, ...results];
    allResults.sort((a, b) => assets.findIndex(asset => asset.id === a.id) - assets.findIndex(asset => asset.id === b.id));
    
    console.log(`✅ Batch URL generation complete: ${results.length} new URLs generated`);
    return allResults;
  }

  /**
   * Get thumbnail URL for an asset (optimized for quick preview)
   */
  static async getThumbnailUrl(asset: UnifiedAsset): Promise<string | null> {
    try {
      if (asset.thumbnailUrl) {
        return asset.thumbnailUrl;
      }

      // For images, use the main URL as thumbnail
      if (asset.type === 'image' && asset.url) {
        return asset.url;
      }

      // For videos without thumbnails, use placeholder
      if (asset.type === 'video') {
        return '/video-thumbnail-placeholder.svg';
      }

      return null;
    } catch (error) {
      console.error(`Failed to get thumbnail for asset ${asset.id}:`, error);
      return null;
    }
  }

  /**
   * Get high-resolution URL for an asset
   */
  static async getHighResUrl(asset: UnifiedAsset): Promise<string | null> {
    try {
      const highResAsset = { ...asset, quality: 'high' };
      const result = await this.generateAssetUrls(highResAsset);
      return result.url || null;
    } catch (error) {
      console.error(`Failed to get high-res URL for asset ${asset.id}:`, error);
      return null;
    }
  }

  /**
   * Clear cache for specific asset or all assets
   */
  static clearCache(assetId?: string): void {
    if (assetId) {
      // Remove specific cached URL - no method needed, just avoid calling
      assetUrlCache.invalidate(`asset-url-${assetId}`);
    } else {
      sessionCache.clearAllCache();
      assetUrlCache.invalidate();
    }
  }

  /**
   * Get performance metrics
   */
  static getMetrics() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = total > 0 ? (this.metrics.cacheHits / total * 100).toFixed(1) : '0';
    
    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      totalOperations: total
    };
  }

  /**
   * Reset performance metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      totalRequests: 0,
      batchRequests: 0
    };
  }

  // Private helper methods

  private static splitAssetsByUrlStatus(assets: UnifiedAsset[]): { needUrls: UnifiedAsset[]; haveUrls: UnifiedAsset[] } {
    const needUrls: UnifiedAsset[] = [];
    const haveUrls: UnifiedAsset[] = [];
    
    for (const asset of assets) {
      if (this.hasValidSignedUrls(asset) || sessionCache.getCachedSignedUrl(asset.id)) {
        haveUrls.push(asset);
      } else {
        needUrls.push(asset);
      }
    }
    
    return { needUrls, haveUrls };
  }

  private static hasValidSignedUrls(asset: UnifiedAsset): boolean {
    return !!(asset.url?.startsWith('https://') || asset.thumbnailUrl?.startsWith('https://'));
  }

  private static determineBucket(asset: UnifiedAsset): string {
    const metadata = asset.metadata || {};
    const quality = (asset.quality as any) || 'fast';

    // Priority 1: Explicit bucket hint from metadata or asset
    const hinted = asset.bucketHint || metadata?.bucket;
    if (typeof hinted === 'string' && hinted.length > 0) {
      return hinted;
    }
    
    // Library assets: use user-library bucket
    if (metadata?.source === 'library' || metadata?.storage_path) {
      return 'user-library' as any;
    }
    
    // Fallback: heuristic detection
    if (asset.type === 'image') {
      const isSDXL = metadata.is_sdxl || 
                     metadata.model_type === 'sdxl' || 
                     asset.isSDXL ||
                     (typeof metadata.bucket === 'string' && metadata.bucket.includes('sdxl'));
      const isEnhanced = (metadata.job_type || '').includes('enhanced') || 
                         (metadata.job_type || '').includes('7b');
      if (isSDXL) {
        return quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
      } else if (isEnhanced) {
        return quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
      } else {
        return quality === 'high' ? 'image_high' : 'image_fast';
      }
    } else {
      const isEnhanced = (metadata.job_type || '').includes('enhanced') || 
                         (metadata.job_type || '').includes('7b');
      if (isEnhanced) {
        return quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced';
      } else {
        return quality === 'high' ? 'video_high' : 'video_fast';
      }
    }
  }

  private static async generateSignedUrls(asset: UnifiedAsset, bucket: string): Promise<{ url: string; thumbnailUrl: string }> {
    const fallbackBuckets = asset.type === 'image' 
      ? ['sdxl_image_fast', 'sdxl_image_high', 'image_fast', 'image_high', 'image7b_fast_enhanced', 'image7b_high_enhanced']
      : ['video_fast', 'video_high', 'video7b_fast_enhanced', 'video7b_high_enhanced'];
    
    const bucketsToTry = [bucket, ...fallbackBuckets.filter(b => b !== bucket)];
    
    for (const currentBucket of bucketsToTry) {
      try {
        const path = this.getAssetPath(asset, asset.type === 'image' ? 'primary' : 'primary');
        if (!path) continue;
        
        const { data, error } = await getSignedUrl(
          currentBucket as any, 
          path, 
          this.DEFAULT_EXPIRY
        );
        
        if (!error && data?.signedUrl) {
          console.log(`✅ Generated URL with bucket ${currentBucket} for asset ${asset.id}`);
          
          let thumbnailUrl = data.signedUrl;
          
          // For videos, try to get a thumbnail from image_fast bucket
          if (asset.type === 'video' && asset.thumbnailUrl) {
            try {
              const thumbPath = asset.thumbnailUrl.replace(/^\/+/, '').replace(/^image_fast\//, '');
              const { data: thumbData } = await getSignedUrl('image_fast' as any, thumbPath, this.THUMBNAIL_EXPIRY);
              if (thumbData?.signedUrl) {
                thumbnailUrl = thumbData.signedUrl;
              }
            } catch (thumbError) {
              console.warn(`Failed to generate thumbnail for video ${asset.id}:`, thumbError);
              thumbnailUrl = '/video-thumbnail-placeholder.svg';
            }
          }
          
          return {
            url: data.signedUrl,
            thumbnailUrl
          };
        }
      } catch (error) {
        console.warn(`Bucket ${currentBucket} failed for asset ${asset.id}:`, error);
        continue;
      }
    }
    
    throw new Error(`Failed to generate signed URLs for asset ${asset.id} from any bucket`);
  }

  static getImagePath(asset: UnifiedAsset, pathType: 'primary' | 'thumbnail' | 'highres'): string | null {
    if (asset.type !== 'image') return null;
    
    const metadata = asset.metadata || {};
    
    // Library assets: use exact storage_path
    if (metadata.storage_path) {
      return String(metadata.storage_path).replace(/^\/+/, '');
    }
    
    // Handle SDXL image arrays
    if (metadata.image_urls && Array.isArray(metadata.image_urls)) {
      const imageUrls = metadata.image_urls;
      if (imageUrls.length > 0) {
        return imageUrls[0].replace(/^\/+/, '');
      }
    }
    
    // Handle single image URL
    if (asset.url) {
      return asset.url.replace(/^\/+/, '');
    }
    
    // Fallback to asset ID
    return `${asset.id}.png`;
  }

  private static getAssetPath(asset: UnifiedAsset, pathType: 'primary' | 'thumbnail'): string | null {
    if (asset.type === 'image') {
      return this.getImagePath(asset, pathType);
    } else if (asset.type === 'video') {
      const metadata = asset.metadata || {};
      // Library videos: use storage_path directly
      if (metadata.storage_path) {
        return String(metadata.storage_path).replace(/^\/+/, '');
      }
      if (pathType === 'thumbnail' && asset.thumbnailUrl) {
        return asset.thumbnailUrl.replace(/^\/+/, '').replace(/^image_fast\//, '');
      }
      return asset.url ? asset.url.replace(/^\/+/, '') : `${asset.id}.mp4`;
    }
    
    return null;
  }

  private static getCachedUrl(assetId: string): string | null {
    return sessionCache.getCachedSignedUrl(assetId);
  }

  private static setCachedUrl(assetId: string, url: string): void {
    sessionCache.cacheSignedUrl(assetId, url);
  }
}