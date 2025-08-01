import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl, deleteFile, type StorageBucket } from '@/lib/storage';
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
  metadata?: any;
  rawPaths?: string[];
  // SDXL image handling properties
  isSDXLImage?: boolean;
  sdxlIndex?: number;
  originalAssetId?: string;
  // Bucket hint for signed URL generation
  bucketHint?: string;
}

interface AssetFilters {
  type?: 'all' | 'image' | 'video';
  status?: 'all' | string;
  quality?: string;
  search?: string;
}

interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// Smart caching with longer durations for better performance
const URL_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours (longer for URLs)
const METADATA_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes (longer for metadata)
const VIEWPORT_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for viewport assets

interface CachedUrl {
  url: string;
  timestamp: number;
}

interface CachedMetadata {
  assets: UnifiedAsset[];
  timestamp: number;
}

interface ViewportAsset {
  asset: UnifiedAsset;
  urlsGenerated: boolean;
  timestamp: number;
}

class SmartCache {
  private urlCache = new Map<string, CachedUrl>();
  private metadataCache = new Map<string, CachedMetadata>();
  private viewportCache = new Map<string, ViewportAsset>();

  getCachedUrl(key: string): string | null {
    const cached = this.urlCache.get(key);
    if (cached && Date.now() - cached.timestamp < URL_CACHE_DURATION) {
      return cached.url;
    }
    if (cached) {
      this.urlCache.delete(key);
    }
    return null;
  }

  setCachedUrl(key: string, url: string): void {
    this.urlCache.set(key, { url, timestamp: Date.now() });
  }

  getCachedMetadata(key: string): UnifiedAsset[] | null {
    const cached = this.metadataCache.get(key);
    if (cached && Date.now() - cached.timestamp < METADATA_CACHE_DURATION) {
      return cached.assets;
    }
    if (cached) {
      this.metadataCache.delete(key);
    }
    return null;
  }

  setCachedMetadata(key: string, assets: UnifiedAsset[]): void {
    this.metadataCache.set(key, { assets, timestamp: Date.now() });
  }

  getViewportAsset(key: string): ViewportAsset | null {
    const cached = this.viewportCache.get(key);
    if (cached && Date.now() - cached.timestamp < VIEWPORT_CACHE_DURATION) {
      return cached;
    }
    if (cached) {
      this.viewportCache.delete(key);
    }
    return null;
  }

  setViewportAsset(key: string, asset: ViewportAsset): void {
    this.viewportCache.set(key, { ...asset, timestamp: Date.now() });
  }

  clear(): void {
    this.urlCache.clear();
    this.metadataCache.clear();
    this.viewportCache.clear();
  }
}

export class OptimizedAssetService {
  private static cache = new SmartCache();

  // REMOVED: Bucket guessing logic - now trust database metadata directly

  private static determineVideoBucket(jobData?: JobRecord): string {
    const quality = jobData?.quality || 'fast';
    const jobType = jobData?.job_type || '';
    const modelType = jobData?.model_type || '';
    const jobMetadata = jobData?.metadata as any;
    
    // Enhanced 7B models detection
    if (jobType.includes('enhanced') || 
        jobType.includes('7b') || 
        modelType.includes('7b') ||
        jobMetadata?.bucket?.includes('7b') ||
        jobMetadata?.bucket?.includes('enhanced')) {
      return quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced';
    }
    
    // Default video buckets - always use video_fast/video_high for WAN
    return quality === 'high' ? 'video_high' : 'video_fast';
  }

  // Phase 1: Optimized with proper pagination and database-level filtering
  static async getUserAssets(
    filters: AssetFilters = {}, 
    pagination: PaginationOptions = { limit: 20, offset: 0 }
  ): Promise<{ assets: UnifiedAsset[]; hasMore: boolean; total: number }> {
    console.log('🚀 Phase 1: Optimized database queries with pagination');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      // Convert filters for OptimizedDatabaseQuery
      const queryFilters = {
        ...filters,
        type: filters.type === 'all' ? undefined : filters.type
      };
      
      // Phase 1: Use OptimizedDatabaseQuery for better performance
      const result = await OptimizedDatabaseQuery.queryAssets(user.id, queryFilters, {
        limit: pagination.limit || 20,
        metadataOnly: false
      });
      
      return {
        assets: result.assets,
        hasMore: result.hasMore,
        total: result.total || result.assets.length
      };
    } catch (error) {
      console.error('❌ Optimized query failed:', error);
      // Fallback to simple method with reduced load
      return this.simpleFallbackMethod(user.id, filters, { ...pagination, limit: 10 });
    }
  }

  // Phase 1: Simple fallback method with essential queries only
  private static async simpleFallbackMethod(
    userId: string,
    filters: AssetFilters,
    pagination: PaginationOptions
  ): Promise<{ assets: UnifiedAsset[]; hasMore: boolean; total: number }> {
    const { limit = 10, offset = 0 } = pagination;

    console.log('🔄 Phase 1: Using simple fallback method');

  // Enhanced query with proper job data context for URL generation
    const imageQuery = supabase
      .from('images')
      .select(`
        id,
        prompt,
        image_url,
        image_urls,
        signed_url,
        signed_url_expires_at,
        created_at,
        updated_at,
        status,
        quality,
        generation_mode,
        metadata,
        title,
        format,
        jobs!images_id_fkey (
          id,
          job_type,
          model_type,
          quality,
          metadata
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.type && filters.type !== 'all') {
      if (filters.type === 'image') {
        // Already filtering images table
      } else if (filters.type === 'video') {
        // Switch to videos table when we implement video support
        throw new Error('Video filtering not yet implemented');
      }
    }

    if (filters.status && filters.status !== 'all') {
      imageQuery.eq('status', filters.status);
    }

    if (filters.search && filters.search.trim()) {
      imageQuery.or(`prompt.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
    }

    const { data: images, error } = await imageQuery;

    if (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }

    // Enhanced logging for debugging
    console.log(`📊 Fetched ${images?.length || 0} images for user ${userId}`);
    
    if (images && images.length > 0) {
      console.log('🖼️ Sample image data:', {
        id: images[0].id,
        image_url: images[0].image_url,
        signed_url: images[0].signed_url,
        generation_mode: images[0].generation_mode,
        quality: images[0].quality,
        status: images[0].status
      });
    }

    // Process images with proper job data context - transform SDXL to individual assets
    const processedImages: UnifiedAsset[] = [];
    
    images?.forEach(image => {
      // Get job data for context
      const jobData = image.jobs && Array.isArray(image.jobs) ? image.jobs[0] : null;
      
      // Trust the metadata bucket directly (Phase 1 fix)
      const metadata = image.metadata as any;
      const bucketHint = metadata?.bucket || 'image_fast'; // Fallback only if no metadata
      const isSDXL = this.isSDXLImage(image, jobData);
      
      // Handle SDXL image URLs properly
      const signedUrlsArray = image.image_urls && Array.isArray(image.image_urls) 
        ? image.image_urls.filter((url): url is string => typeof url === 'string')
        : undefined;

      // Base asset properties
      const baseAsset = {
        type: 'image' as const,
        prompt: image.prompt || 'Untitled Image',
        status: image.status || 'pending',
        quality: image.quality || 'fast',
        format: image.format || 'png',
        createdAt: new Date(image.created_at),
        bucketHint,
        modelType: this.getModelType(image, jobData),
        isSDXL,
        title: image.title,
        jobId: jobData?.id
      };

      // CRITICAL FIX: Transform SDXL jobs into individual assets (like LibraryImportModal does)
      if (isSDXL && signedUrlsArray && signedUrlsArray.length > 1) {
        // SDXL job with multiple images - create individual assets for each image
        signedUrlsArray.forEach((url, index) => {
          processedImages.push({
            ...baseAsset,
            id: `${image.id}_${index}`, // Unique ID for each SDXL image
            url: url,
            thumbnailUrl: url,
            prompt: `${baseAsset.prompt} (Image ${index + 1})`,
            isSDXLImage: true,
            sdxlIndex: index,
            originalAssetId: image.id,
          });
        });
      } else {
        // Single image (WAN) or SDXL with single URL
        let displayUrl = image.signed_url || image.image_url;
        
        // If we have image_urls array but only one URL, use it
        if (!displayUrl && signedUrlsArray && signedUrlsArray.length > 0) {
          displayUrl = signedUrlsArray[0];
        }

        processedImages.push({
          ...baseAsset,
          id: image.id,
          url: displayUrl,
          signedUrls: signedUrlsArray,
          thumbnailUrl: displayUrl,
        });
      }
    });

    return {
      assets: processedImages,
      hasMore: false, // Implement pagination later if needed
      total: processedImages.length
    };
  }

  // Helper to determine model type with job context
  private static getModelType(image: any, jobData?: any): string {
    const metadata = image.metadata || {};
    const jobType = jobData?.job_type || '';
    const modelType = jobData?.model_type || '';
    
    // Enhanced 7B model detection
    if (jobType.includes('enhanced') || jobType.includes('7b') || modelType.includes('7b')) {
      return 'Enhanced-7B';
    }
    
    // SDXL detection with job context
    if (metadata.is_sdxl || 
        image.generation_mode === 'sdxl' || 
        jobType.startsWith('sdxl_') ||
        modelType.includes('sdxl')) {
      return 'SDXL';
    }
    
    return 'WAN';
  }

  // Helper to check if image is SDXL with job context
  private static isSDXLImage(image: any, jobData?: any): boolean {
    const metadata = image.metadata || {};
    const jobType = jobData?.job_type || '';
    const modelType = jobData?.model_type || '';
    
    return !!(metadata.is_sdxl || 
              image.generation_mode === 'sdxl' ||
              jobType.startsWith('sdxl_') ||
              modelType.includes('sdxl'));
  }

  // ENHANCED: Generate URLs on-demand with advanced caching and error handling
  static async generateAssetUrls(asset: UnifiedAsset): Promise<UnifiedAsset> {
    // Initialize session cache
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      sessionCache.initializeSession(user.id);
    }

    // Use direct URL generation instead of problematic cache
    console.log(`🔗 Generating URLs for ${asset.type} asset:`, asset.id);
    
    try {
      if (asset.type === 'image') {
        return await this.generateImageUrls(asset);
      } else {
        return await this.generateVideoUrls(asset);
      }
    } catch (error) {
      console.error(`❌ URL generation failed for ${asset.type} asset:`, asset.id, error);
      return asset; // Return original asset if URL generation fails
    }
  }

  // Enhanced video URL generation with session caching
  private static async generateVideoUrls(asset: UnifiedAsset): Promise<UnifiedAsset> {
    // Check session cache first
    const cachedUrl = sessionCache.getCachedSignedUrl(asset.id);
    if (cachedUrl) {
      return { ...asset, url: cachedUrl };
    }

    try {
      // Get video data from database
      const { data: videoData } = await supabase
        .from('videos')
        .select('video_url, thumbnail_url, signed_url, signed_url_expires_at, metadata')
        .eq('id', asset.id)
        .single();

      if (!videoData) return asset;

      let videoUrl = null;
      let thumbnailUrl = videoData.thumbnail_url;

      // Check for valid signed URL first
      if (videoData.signed_url && videoData.signed_url_expires_at) {
        const expiresAt = new Date(videoData.signed_url_expires_at);
        if (expiresAt > new Date()) {
          console.log(`✅ Using cached video URL for:`, asset.id);
          videoUrl = videoData.signed_url;
        }
      }

        // Generate new signed URL with fallback buckets
        if (!videoUrl && videoData.video_url) {
          // Determine primary bucket and fallbacks
          const primaryBucket = (videoData.metadata as any)?.bucket || 'video_fast';
          const fallbackBuckets = ['video_fast', 'video_high', 'videos'];
        
          // Use enhanced error handling with bucket fallbacks
          try {
            videoUrl = await EnhancedErrorHandling.withBucketFallback(
              primaryBucket,
              fallbackBuckets,
              async (bucket) => {
                const { data, error } = await getSignedUrl(bucket as StorageBucket, videoData.video_url!);
                if (error || !data?.signedUrl) {
                  throw new Error(`Failed to get signed URL: ${error?.message}`);
                }
          // Cache the URL with user validation
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            sessionStorage.setItem(`signed_url_${user.id}_${asset.id}`, data.signedUrl);
          }
                return data.signedUrl;
              }
            );
          } catch (error) {
            console.warn(`⚠️ Failed to generate video URL for ${asset.id}:`, error);
          }
        }

      return {
        ...asset,
        url: videoUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
      };

    } catch (error) {
      console.error(`❌ Error generating video URLs for ${asset.id}:`, error);
      return asset;
    }
  }

  // PHASE 1 FIX: Trust database metadata, eliminate bucket guessing
  private static async generateImageUrls(asset: UnifiedAsset): Promise<UnifiedAsset> {
    console.log(`🖼️ Generating image URLs for asset:`, asset.id);

    try {
      // For SDXL individual images, we already have the URL from transformation
      if (asset.isSDXLImage && asset.url) {
        console.log(`✅ SDXL image already has URL:`, asset.url.slice(0, 50) + '...');
        return asset;
      }

      // Get image data from database
      const { data: imageData } = await supabase
        .from('images')
        .select('image_url, image_urls, signed_url, signed_url_expires_at, metadata, quality')
        .eq('id', asset.originalAssetId || asset.id)
        .single();

      if (!imageData) {
        console.warn(`❌ No image data found for asset:`, asset.id);
        return asset;
      }

      // PHASE 1: Trust the metadata bucket directly
      const metadata = imageData.metadata as any;
      const bucket = metadata?.bucket;
      
      if (!bucket) {
        console.warn(`❌ No bucket in metadata for asset:`, asset.id, metadata);
        return asset;
      }

      console.log(`🪣 Using bucket from metadata:`, bucket, 'for asset:', asset.id);

      // Determine the image path to use
      let imagePath: string | null = null;

      // For SDXL images with multiple URLs, use the specific index
      if (asset.isSDXLImage && asset.sdxlIndex !== undefined && imageData.image_urls) {
        const urlsArray = Array.isArray(imageData.image_urls) ? imageData.image_urls : [];
        imagePath = urlsArray[asset.sdxlIndex] as string;
        console.log(`🎯 SDXL image ${asset.sdxlIndex}:`, imagePath?.slice(0, 50) + '...');
      } else {
        // Single image - prefer image_url over signed_url
        imagePath = imageData.image_url;
        console.log(`🎯 Single image path:`, imagePath?.slice(0, 50) + '...');
      }

      if (!imagePath) {
        console.warn(`❌ No image path found for asset:`, asset.id);
        return asset;
      }

      // PHASE 2: Direct signed URL generation
      console.log(`🔐 Generating signed URL: ${bucket}/${imagePath.slice(0, 30)}...`);
      
      const { data, error } = await getSignedUrl(bucket as StorageBucket, imagePath);

      if (error || !data?.signedUrl) {
        console.warn(`❌ Signed URL generation failed:`, error?.message || 'No URL returned');
        // PHASE 3: NO raw path fallback - return asset without URL
        return asset;
      }

      console.log(`✅ Generated signed URL successfully for:`, asset.id);

      return {
        ...asset,
        url: data.signedUrl,
        thumbnailUrl: data.signedUrl,
      };

    } catch (error) {
      console.error(`❌ Error generating image URLs for ${asset.id}:`, error);
      return asset;
    }
  }

  // Simple bucket determination for deletion
  private static determineBucketFromMetadata(metadata: any, quality?: string): string {
    // Trust metadata bucket first
    if (metadata?.bucket) {
      return metadata.bucket;
    }
    
    // Fallback logic
    if (metadata?.is_sdxl || metadata?.model_type === 'sdxl') {
      return quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
    }
    
    return quality === 'high' ? 'image_high' : 'image_fast';
  }

  // Batch URL generation for better performance
  static async generateAssetUrlsBatch(assets: UnifiedAsset[]): Promise<UnifiedAsset[]> {
    console.log(`🚀 Batch generating URLs for ${assets.length} assets`);
    
    // Process in smaller batches to avoid overwhelming the system
    const batchSize = 5;
    const results: UnifiedAsset[] = [];
    
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(asset => this.generateAssetUrls(asset))
      );
      results.push(...batchResults);
      
      // Small delay between batches to prevent rate limiting
      if (i + batchSize < assets.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  // Complete asset deletion with storage cleanup
  static async deleteAssetCompletely(assetId: string, assetType: 'image' | 'video'): Promise<void> {
    console.log(`🗑️ Completely deleting ${assetType}:`, assetId);

    try {
      if (assetType === 'image') {
        // Get image data for storage cleanup
        const { data: imageData } = await supabase
          .from('images')
          .select('image_url, image_urls, thumbnail_url, quality, metadata, job:jobs(job_type, model_type, metadata)')
          .eq('id', assetId)
          .single();

        if (imageData) {
          const jobData = Array.isArray(imageData.job) ? imageData.job[0] : imageData.job;
          const bucket = this.determineBucketFromMetadata(imageData.metadata, imageData.quality);
          
          // Delete all associated files
          const filesToDelete = [];
          if (imageData.image_url) filesToDelete.push(imageData.image_url);
          if (imageData.image_urls && Array.isArray(imageData.image_urls)) {
            filesToDelete.push(...imageData.image_urls);
          }
          if (imageData.thumbnail_url) filesToDelete.push(imageData.thumbnail_url);

          // Delete files from storage
          await Promise.all(
            filesToDelete.map(filePath => 
              deleteFile(bucket as StorageBucket, filePath).catch(error => 
                console.warn(`⚠️ Failed to delete file ${filePath}:`, error)
              )
            )
          );
        }

        // Delete database record
        const { error } = await supabase
          .from('images')
          .delete()
          .eq('id', assetId);

        if (error) throw error;

      } else {
        // Video deletion
        const { data: videoData } = await supabase
          .from('videos')
          .select('video_url, thumbnail_url, metadata, job:jobs(job_type, model_type, metadata)')
          .eq('id', assetId)
          .single();

        if (videoData) {
          const jobData = Array.isArray(videoData.job) ? videoData.job[0] : videoData.job;
          const bucket = this.determineVideoBucket(jobData as any);

          // Delete files from storage
          const filesToDelete = [];
          if (videoData.video_url) filesToDelete.push(videoData.video_url);
          if (videoData.thumbnail_url) filesToDelete.push(videoData.thumbnail_url);

          await Promise.all(
            filesToDelete.map(filePath => 
              deleteFile(bucket as StorageBucket, filePath).catch(error => 
                console.warn(`⚠️ Failed to delete file ${filePath}:`, error)
              )
            )
          );
        }

        // Delete database record
        const { error } = await supabase
          .from('videos')
          .delete()
          .eq('id', assetId);

        if (error) throw error;
      }

      // Clear caches
      this.cache.clear();
      // Clear session cache
      sessionStorage.removeItem(`signed_url_${assetId}`);

      console.log(`✅ Successfully deleted ${assetType}:`, assetId);

    } catch (error) {
      console.error(`❌ Failed to delete ${assetType} ${assetId}:`, error);
      throw error;
    }
  }

  // Bulk deletion with improved error handling
  static async bulkDeleteAssets(
    assetsToDelete: { id: string; type: 'image' | 'video' }[]
  ): Promise<{ success: number; failed: { id: string; error: string }[] }> {
    console.log(`🗑️ Bulk deleting ${assetsToDelete.length} assets`);
    
    const results = {
      success: 0,
      failed: [] as { id: string; error: string }[]
    };

    // Process in small batches to avoid overwhelming the system
    const BATCH_SIZE = 3;
    const batches = [];
    for (let i = 0; i < assetsToDelete.length; i += BATCH_SIZE) {
      batches.push(assetsToDelete.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async ({ id, type }) => {
        try {
          await this.deleteAssetCompletely(id, type);
          results.success++;
        } catch (error) {
          results.failed.push({
            id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }
}
