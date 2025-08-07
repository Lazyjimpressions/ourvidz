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
      console.log(`🔍 Using explicit bucket from metadata: ${metadata.bucket}`);
      return metadata.bucket;
    }
    
    // Determine bucket based on model type and quality
    const isSDXL = metadata?.is_sdxl || 
                   metadata?.model_type === 'sdxl' || 
                   asset.modelType === 'SDXL';
    
    const isEnhanced = metadata?.enhanced || 
                       asset.modelType?.includes('7b') ||
                       asset.modelType === 'Enhanced';
    
    const quality = asset.quality || metadata?.quality || 'fast';
    
    console.log(`🔍 Bucket determination for asset ${asset.id}:`, {
      type: asset.type,
      isSDXL,
      isEnhanced,
      quality,
      modelType: asset.modelType,
      metadataModelType: metadata?.model_type
    });
    
    if (asset.type === 'video') {
      if (isEnhanced) {
        const bucket = quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced';
        console.log(`🎬 Video bucket determined: ${bucket}`);
        return bucket;
      } else {
        const bucket = quality === 'high' ? 'video_high' : 'video_fast';
        console.log(`🎬 Video bucket determined: ${bucket}`);
        return bucket;
      }
    } else {
      // Image assets
      if (isSDXL) {
        const bucket = quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
        console.log(`🖼️ SDXL image bucket determined: ${bucket}`);
        return bucket;
      } else if (isEnhanced) {
        const bucket = quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
        console.log(`🖼️ Enhanced image bucket determined: ${bucket}`);
        return bucket;
      } else {
        const bucket = quality === 'high' ? 'image_high' : 'image_fast';
        console.log(`🖼️ Standard image bucket determined: ${bucket}`);
        return bucket;
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
    
    // Clean the path - remove bucket prefix if present
    let cleanPath = path;
    if (cleanPath.startsWith(`${bucket}/`)) {
      cleanPath = cleanPath.replace(`${bucket}/`, '');
    }
    
    // Also remove any leading slashes
    cleanPath = cleanPath.replace(/^\/+/, '');
    
    console.log(`🔐 Generating signed URL: ${bucket}/${cleanPath.slice(0, 50)}...`);
    console.log(`🔍 Path details:`, {
      originalPath: path,
      cleanPath: cleanPath,
      assetId: asset.id,
      assetType: asset.type,
      bucket: bucket
    });
    
    const { data, error } = await getSignedUrl(bucket as any, cleanPath, 3600);
    
    if (error || !data?.signedUrl) {
      console.error(`❌ Failed to generate signed URL for ${asset.id}:`, {
        bucket,
        path: cleanPath,
        error: error?.message || 'No URL returned'
      });
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
    console.log(`🔍 Getting image path for asset ${asset.id}, type: ${type}`, {
      assetType: asset.type,
      isSDXL: asset.isSDXL,
      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl,
      metadata: asset.metadata
    });

    // For SDXL images with multiple URLs - check metadata for image_urls array
    if (asset.isSDXL) {
      const metadata = asset.metadata as any;
      const imageUrls = metadata?.image_urls;
      if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
        console.log(`✅ Found SDXL image URLs: ${imageUrls.length} images`);
        return imageUrls[0];
      }
    }
    
    // For regular images - check asset properties first
    if (asset.type === 'image') {
      // Check direct asset properties first
      if (type === 'thumbnail' && asset.thumbnailUrl) {
        return asset.thumbnailUrl;
      }
      if (asset.url) {
        return asset.url;
      }
      
      // Fallback to metadata if direct properties are missing
      const metadata = asset.metadata as any;
      return metadata?.image_url || null;
    } 
    
    // For videos
    if (asset.type === 'video') {
      if (type === 'thumbnail' && asset.thumbnailUrl) {
        return asset.thumbnailUrl;
      }
      
      // For video primary, we typically use thumbnail or video URL
      const metadata = asset.metadata as any;
      return asset.thumbnailUrl || metadata?.video_url || null;
    }
    
    console.warn(`❌ No image path found for asset ${asset.id} of type ${asset.type}`);
    return null;
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