import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl } from '@/lib/storage';
import type { UnifiedAsset } from './AssetService';

/**
 * Unified URL Generation Service
 * 
 * Provides a single source of truth for asset URL generation across the application.
 * Features:
 * - Intelligent caching with TTL
 * - Batch processing for performance
 * - Comprehensive error handling
 * - Type-safe bucket detection
 * - Fallback mechanisms
 */
export class UnifiedUrlService {
  // Cache with TTL (Time To Live)
  private static cache = new Map<string, { url: string; expires: number }>();
  private static readonly CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds
  
  // Performance monitoring
  private static metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    totalRequests: 0
  };

  /**
   * Generate URLs for a single asset
   */
  static async generateAssetUrls(asset: UnifiedAsset): Promise<UnifiedAsset> {
    this.metrics.totalRequests++;
    
    try {
      // Check cache first
      const cachedUrl = this.getCachedUrl(asset.id);
      if (cachedUrl) {
        this.metrics.cacheHits++;
        return { ...asset, url: cachedUrl, thumbnailUrl: cachedUrl };
      }

      this.metrics.cacheMisses++;
      
      // Determine bucket and generate URLs
      const bucket = this.determineBucket(asset);
      const urls = await this.generateSignedUrls(asset, bucket);
      
      // Cache the result
      this.setCachedUrl(asset.id, urls.url);
      
      return { ...asset, ...urls };
    } catch (error) {
      this.metrics.errors++;
      console.error(`❌ Failed to generate URLs for asset ${asset.id}:`, error);
      
      // Return asset without URLs on error
      return { ...asset, url: undefined, thumbnailUrl: undefined, error: 'Failed to load' };
    }
  }

  /**
   * Generate URLs for multiple assets in batch
   */
  static async generateBatchUrls(assets: UnifiedAsset[]): Promise<UnifiedAsset[]> {
    console.log(`🚀 Batch URL generation for ${assets.length} assets`);
    
    // Process in chunks to avoid overwhelming the system
    const CHUNK_SIZE = 10;
    const results: UnifiedAsset[] = [];
    
    for (let i = 0; i < assets.length; i += CHUNK_SIZE) {
      const chunk = assets.slice(i, i + CHUNK_SIZE);
      const chunkPromises = chunk.map(asset => this.generateAssetUrls(asset));
      
      try {
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
        
        console.log(`✅ Processed chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(assets.length / CHUNK_SIZE)}`);
      } catch (error) {
        console.error(`❌ Failed to process chunk ${Math.floor(i / CHUNK_SIZE) + 1}:`, error);
        // Continue with other chunks
        results.push(...chunk.map(asset => ({ ...asset, url: undefined, thumbnailUrl: undefined, error: 'Failed to load' })));
      }
    }
    
    return results;
  }

  /**
   * Get thumbnail URL for progressive loading
   */
  static async getThumbnailUrl(asset: UnifiedAsset): Promise<string | null> {
    try {
      const bucket = this.determineBucket(asset);
      const path = this.getImagePath(asset, 'thumbnail');
      
      if (!path) return null;
      
      const { data, error } = await getSignedUrl(bucket as any, path, 1800); // 30 min TTL
      
      if (error || !data?.signedUrl) {
        console.warn(`⚠️ Failed to get thumbnail URL for ${asset.id}:`, error?.message);
        return null;
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error(`❌ Error getting thumbnail URL for ${asset.id}:`, error);
      return null;
    }
  }

  /**
   * Get high-resolution URL
   */
  static async getHighResUrl(asset: UnifiedAsset): Promise<string | null> {
    try {
      const bucket = this.determineBucket(asset);
      const path = this.getImagePath(asset, 'highres');
      
      if (!path) return null;
      
      const { data, error } = await getSignedUrl(bucket as any, path, 3600); // 1 hour TTL
      
      if (error || !data?.signedUrl) {
        console.warn(`⚠️ Failed to get high-res URL for ${asset.id}:`, error?.message);
        return null;
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error(`❌ Error getting high-res URL for ${asset.id}:`, error);
      return null;
    }
  }

  /**
   * Standardized bucket detection logic
   */
  private static determineBucket(asset: UnifiedAsset): string {
    const metadata = asset.metadata as any;
    
    // Check for explicit bucket in metadata first
    if (metadata?.bucket) {
      return metadata.bucket;
    }
    
    // Determine bucket based on model type and quality
    const isSDXL = metadata?.is_sdxl || 
                   metadata?.model_type === 'sdxl' || 
                   asset.modelType === 'SDXL';
    
    const isEnhanced = metadata?.enhanced || 
                       asset.modelType?.includes('7b') ||
                       asset.modelType === 'Enhanced';
    
    const quality = asset.quality || 'fast';
    
    if (asset.type === 'video') {
      if (isEnhanced) {
        return quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced';
      } else {
        return quality === 'high' ? 'video_high' : 'video_fast';
      }
    } else {
      // Image assets
      if (isSDXL) {
        return quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
      } else if (isEnhanced) {
        return quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
      } else {
        return quality === 'high' ? 'image_high' : 'image_fast';
      }
    }
  }

  /**
   * Generate signed URLs for an asset
   */
  private static async generateSignedUrls(asset: UnifiedAsset, bucket: string): Promise<{ url: string; thumbnailUrl: string }> {
    const path = this.getImagePath(asset, 'primary');
    
    if (!path) {
      throw new Error(`No image path found for asset ${asset.id}`);
    }
    
    console.log(`🔐 Generating signed URL: ${bucket}/${path.slice(0, 30)}...`);
    
    const { data, error } = await getSignedUrl(bucket as any, path, 3600);
    
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL: ${error?.message || 'No URL returned'}`);
    }
    
    console.log(`✅ Generated signed URL successfully for: ${asset.id}`);
    
    return {
      url: data.signedUrl,
      thumbnailUrl: data.signedUrl
    };
  }

  /**
   * Get the appropriate image path for an asset
   */
  private static getImagePath(asset: UnifiedAsset, type: 'primary' | 'thumbnail' | 'highres'): string | null {
    const metadata = asset.metadata as any;
    
    // For SDXL images with multiple URLs
    if (asset.isSDXL && metadata?.image_urls && Array.isArray(metadata.image_urls)) {
      const index = asset.sdxlIndex || 0;
      return metadata.image_urls[index] || null;
    }
    
    // For single images
    if (type === 'primary') {
      return metadata?.image_url || metadata?.video_url || null;
    }
    
    // For thumbnails and high-res, use the same path for now
    // In the future, we could implement different paths for different qualities
    return metadata?.image_url || metadata?.video_url || null;
  }

  /**
   * Cache management methods
   */
  private static getCachedUrl(assetId: string): string | null {
    const cached = this.cache.get(assetId);
    
    if (!cached) return null;
    
    // Check if cache has expired
    if (Date.now() > cached.expires) {
      this.cache.delete(assetId);
      return null;
    }
    
    return cached.url;
  }

  private static setCachedUrl(assetId: string, url: string): void {
    this.cache.set(assetId, {
      url,
      expires: Date.now() + this.CACHE_TTL
    });
  }

  /**
   * Clear cache for a specific asset or all assets
   */
  static clearCache(assetId?: string): void {
    if (assetId) {
      this.cache.delete(assetId);
      console.log(`🗑️ Cleared cache for asset: ${assetId}`);
    } else {
      this.cache.clear();
      console.log(`🗑️ Cleared entire URL cache`);
    }
  }

  /**
   * Get performance metrics
   */
  static getMetrics() {
    const hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests * 100).toFixed(2)
      : '0.00';
    
    return {
      ...this.metrics,
      cacheHitRate: `${hitRate}%`,
      cacheSize: this.cache.size
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  static resetMetrics(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      totalRequests: 0
    };
  }
} 