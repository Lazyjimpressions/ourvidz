import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl, deleteFile } from '@/lib/storage';
import type { Tables } from '@/integrations/supabase/types';

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

// Smart caching with 2-hour URL cache and 5-minute metadata cache
const URL_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours
const METADATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedUrl {
  url: string;
  timestamp: number;
}

interface CachedMetadata {
  assets: UnifiedAsset[];
  timestamp: number;
}

class SmartCache {
  private urlCache = new Map<string, CachedUrl>();
  private metadataCache = new Map<string, CachedMetadata>();

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

  clear(): void {
    this.urlCache.clear();
    this.metadataCache.clear();
  }
}

export class OptimizedAssetService {
  private static cache = new SmartCache();

  private static determineImageBucket(imageData: Partial<ImageRecord>, jobData?: JobRecord): string {
    const metadata = imageData.metadata as any;
    const isSDXL = metadata?.is_sdxl || 
                   metadata?.model_type === 'sdxl' || 
                   jobData?.job_type?.startsWith('sdxl_') ||
                   jobData?.model_type?.includes('sdxl_image') ||
                   metadata?.bucket?.includes('sdxl');
    
    const quality = imageData.quality || jobData?.quality || 'fast';
    
    return isSDXL 
      ? (quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast')
      : (quality === 'high' ? 'image_high' : 'image_fast');
  }

  private static determineVideoBucket(jobData?: JobRecord): string {
    const quality = jobData?.quality || 'fast';
    const jobType = jobData?.job_type || '';
    
    if (jobType.includes('enhanced') || jobType.includes('7b')) {
      return quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced';
    }
    
    return quality === 'high' ? 'video_high' : 'video_fast';
  }

  static async getUserAssets(
    filters: AssetFilters = {}, 
    pagination: PaginationOptions = { limit: 50, offset: 0 }
  ): Promise<{ assets: UnifiedAsset[]; hasMore: boolean; total: number }> {
    console.log('🚀 OptimizedAssetService: Fetching assets with filters:', filters, pagination);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Check cache first (stale-while-revalidate pattern)
    const cacheKey = `${user.id}-${JSON.stringify(filters)}-${pagination.offset}`;
    const cachedAssets = this.cache.getCachedMetadata(cacheKey);
    
    // Start fresh fetch in background if cache is stale
    const fetchPromise = this.fetchAssetsFromDatabase(user.id, filters, pagination);
    
    if (cachedAssets) {
      console.log('✅ Cache hit: Returning cached assets while refreshing in background');
      
      // Update cache in background
      fetchPromise.then(result => {
        this.cache.setCachedMetadata(cacheKey, result.assets);
      }).catch(console.error);
      
      return { 
        assets: cachedAssets, 
        hasMore: cachedAssets.length === pagination.limit,
        total: cachedAssets.length 
      };
    }

    // No cache, wait for fresh data
    console.log('🔄 Cache miss: Fetching fresh data');
    const result = await fetchPromise;
    this.cache.setCachedMetadata(cacheKey, result.assets);
    
    return result;
  }

  private static async fetchAssetsFromDatabase(
    userId: string, 
    filters: AssetFilters, 
    pagination: PaginationOptions
  ): Promise<{ assets: UnifiedAsset[]; hasMore: boolean; total: number }> {
    const { limit = 50, offset = 0 } = pagination;

    console.log('📊 Database fetch with optimized single query strategy');

    // OPTIMIZATION: Single batched query with joins - much faster than separate queries
    const { data: combinedData, error, count } = await supabase
      .from('images')
      .select(`
        id, type::'image'::text, title, prompt, status, quality, format, 
        created_at, updated_at, project_id, metadata, image_url, image_urls, thumbnail_url,
        project:projects(title),
        job:jobs(id, quality, job_type, model_type, metadata)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Also get videos with same pattern
    const { data: videosData, error: videoError } = await supabase
      .from('videos')
      .select(`
        id, type::'video'::text, status, format, created_at, updated_at, project_id,
        duration, resolution, video_url, thumbnail_url,
        project:projects(title),
        job:jobs(id, quality, job_type, model_type, metadata)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (videoError) throw videoError;

    // Transform and process assets
    const imageAssets = await this.processImageAssets(combinedData || []);
    const videoAssets = await this.processVideoAssets(videosData || []);
    
    const allAssets = [...imageAssets, ...videoAssets]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    // Apply filters
    const filteredAssets = this.applyFilters(allAssets, filters);

    console.log('✅ Optimized fetch complete:', {
      total: count || 0,
      returned: filteredAssets.length,
      hasMore: filteredAssets.length === limit
    });

    return {
      assets: filteredAssets,
      hasMore: filteredAssets.length === limit,
      total: count || 0
    };
  }

  private static async processImageAssets(images: any[]): Promise<UnifiedAsset[]> {
    // OPTIMIZATION: Batch URL generation in chunks of 10 for better performance
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      batches.push(images.slice(i, i + BATCH_SIZE));
    }

    const processedBatches = await Promise.all(
      batches.map(batch => Promise.all(batch.map(image => this.processSingleImage(image))))
    );

    return processedBatches.flat();
  }

  private static async processSingleImage(image: any): Promise<UnifiedAsset> {
    const jobData = Array.isArray(image.job) ? image.job[0] : image.job;
    const metadata = image.metadata as any;
    const isSDXL = metadata?.is_sdxl || 
                   metadata?.model_type === 'sdxl' || 
                   jobData?.job_type?.startsWith('sdxl_') ||
                   jobData?.model_type?.includes('sdxl');

    let thumbnailUrl: string | undefined;
    let url: string | undefined;
    let signedUrls: string[] | undefined;
    let error: string | undefined;

    if (image.status === 'completed') {
      try {
        const bucket = this.determineImageBucket(image, jobData);
        
        // Handle multi-image generations
        const imageUrlsArray = image.image_urls || metadata?.image_urls;
        
        if (imageUrlsArray && Array.isArray(imageUrlsArray) && imageUrlsArray.length > 0) {
          // Check cache first
          const cacheKey = `${bucket}-${imageUrlsArray[0]}`;
          const cachedUrl = this.cache.getCachedUrl(cacheKey);
          
          if (cachedUrl) {
            thumbnailUrl = url = cachedUrl;
          } else {
            // Generate URLs in parallel with smart caching
            const urlPromises = imageUrlsArray.map(async (path: string) => {
              const pathCacheKey = `${bucket}-${path}`;
              const cached = this.cache.getCachedUrl(pathCacheKey);
              
              if (cached) return cached;
              
              const { data, error: urlError } = await getSignedUrl(bucket as any, path, 7200);
              if (!urlError && data?.signedUrl) {
                this.cache.setCachedUrl(pathCacheKey, data.signedUrl);
                return data.signedUrl;
              }
              return null;
            });
            
            const urls = (await Promise.all(urlPromises)).filter(Boolean) as string[];
            if (urls.length > 0) {
              signedUrls = urls;
              thumbnailUrl = url = urls[0];
            } else {
              error = 'Failed to generate image URLs';
            }
          }
        } else if (image.image_url) {
          const cacheKey = `${bucket}-${image.image_url}`;
          const cachedUrl = this.cache.getCachedUrl(cacheKey);
          
          if (cachedUrl) {
            thumbnailUrl = url = cachedUrl;
          } else {
            const { data, error: urlError } = await getSignedUrl(bucket as any, image.image_url, 7200);
            if (!urlError && data?.signedUrl) {
              this.cache.setCachedUrl(cacheKey, data.signedUrl);
              thumbnailUrl = url = data.signedUrl;
            } else {
              error = urlError?.message;
            }
          }
        }
      } catch (err) {
        error = 'URL generation failed';
        console.error('Image URL generation error:', err);
      }
    }

    return {
      id: image.id,
      type: 'image',
      title: image.title,
      prompt: image.prompt,
      status: image.status,
      quality: image.quality,
      format: image.format,
      createdAt: new Date(image.created_at),
      projectId: image.project_id,
      projectTitle: image.project?.title,
      modelType: isSDXL ? 'SDXL' : 'WAN',
      isSDXL,
      thumbnailUrl,
      url,
      signedUrls,
      error,
      jobId: jobData?.id
    };
  }

  private static async processVideoAssets(videos: any[]): Promise<UnifiedAsset[]> {
    return Promise.all(videos.map(async (video) => {
      const jobData = Array.isArray(video.job) ? video.job[0] : video.job;
      
      let thumbnailUrl: string | undefined;
      let url: string | undefined;
      let error: string | undefined;

      if (video.status === 'completed' && video.video_url) {
        try {
          const bucket = this.determineVideoBucket(jobData);
          const cacheKey = `${bucket}-${video.video_url}`;
          const cachedUrl = this.cache.getCachedUrl(cacheKey);
          
          if (cachedUrl) {
            url = cachedUrl;
          } else {
            const { data, error: urlError } = await getSignedUrl(bucket as any, video.video_url, 7200);
            if (!urlError && data?.signedUrl) {
              this.cache.setCachedUrl(cacheKey, data.signedUrl);
              url = data.signedUrl;
            } else {
              error = urlError?.message;
            }
          }

          // Thumbnail
          if (video.thumbnail_url) {
            const thumbCacheKey = `image_fast-${video.thumbnail_url}`;
            const cachedThumb = this.cache.getCachedUrl(thumbCacheKey);
            
            if (cachedThumb) {
              thumbnailUrl = cachedThumb;
            } else {
              const { data: thumbData } = await getSignedUrl('image_fast' as any, video.thumbnail_url, 3600);
              if (thumbData?.signedUrl) {
                this.cache.setCachedUrl(thumbCacheKey, thumbData.signedUrl);
                thumbnailUrl = thumbData.signedUrl;
              }
            }
          }
        } catch (err) {
          error = 'URL generation failed';
          console.error('Video URL generation error:', err);
        }
      }

      return {
        id: video.id,
        type: 'video' as const,
        prompt: video.project?.title || 'Untitled Video',
        status: video.status || 'draft',
        format: video.format,
        createdAt: new Date(video.created_at),
        projectId: video.project_id,
        projectTitle: video.project?.title,
        duration: video.duration,
        resolution: video.resolution,
        thumbnailUrl,
        url,
        error,
        jobId: jobData?.id
      };
    }));
  }

  private static applyFilters(assets: UnifiedAsset[], filters: AssetFilters): UnifiedAsset[] {
    return assets.filter(asset => {
      if (filters.type && asset.type !== filters.type) return false;
      if (filters.status && asset.status !== filters.status) return false;
      if (filters.quality && asset.quality !== filters.quality) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesPrompt = asset.prompt.toLowerCase().includes(searchLower);
        const matchesTitle = asset.title?.toLowerCase().includes(searchLower);
        const matchesProject = asset.projectTitle?.toLowerCase().includes(searchLower);
        if (!matchesPrompt && !matchesTitle && !matchesProject) return false;
      }
      return true;
    });
  }

  // ENHANCED DELETION: Delete complete records and files
  static async deleteAssetCompletely(assetId: string, assetType: 'image' | 'video'): Promise<void> {
    console.log('🗑️ Complete asset deletion started:', { assetId, assetType });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    try {
      // Step 1: Get asset details and associated job
      const { data: asset, error: assetError } = await supabase
        .from(assetType === 'image' ? 'images' : 'videos')
        .select('*')
        .eq('id', assetId)
        .eq('user_id', user.id)
        .single();

      if (assetError) throw assetError;
      if (!asset) throw new Error('Asset not found');

      // Step 2: Get associated job
      const jobField = assetType === 'image' ? 'image_id' : 'video_id';
      const { data: job } = await supabase
        .from('jobs')
        .select('*')
        .eq(jobField, assetId)
        .maybeSingle();

      // Step 3: Delete files from storage
      const bucket = assetType === 'image' 
        ? this.determineImageBucket(asset, job)
        : this.determineVideoBucket(job);

      const filesToDelete: string[] = [];
      
      if (assetType === 'image') {
        const imageAsset = asset as ImageRecord;
        const imageUrlsArray = imageAsset.image_urls || (imageAsset.metadata as any)?.image_urls;
        if (imageUrlsArray && Array.isArray(imageUrlsArray)) {
          filesToDelete.push(...(imageUrlsArray as string[]));
        } else if (imageAsset.image_url) {
          filesToDelete.push(imageAsset.image_url);
        }
        if (imageAsset.thumbnail_url) filesToDelete.push(imageAsset.thumbnail_url);
      } else {
        const videoAsset = asset as VideoRecord;
        if (videoAsset.video_url) filesToDelete.push(videoAsset.video_url);
        if (videoAsset.thumbnail_url) filesToDelete.push(videoAsset.thumbnail_url);
      }

      // Delete files in parallel
      if (filesToDelete.length > 0) {
        const deletePromises = filesToDelete.map(filePath => 
          deleteFile(bucket as any, filePath).catch(error => 
            console.warn(`Failed to delete file ${filePath}:`, error)
          )
        );
        await Promise.all(deletePromises);
      }

      // Step 4: Delete database records (job first, then asset)
      const deletePromises = [];
      
      if (job) {
        deletePromises.push(
          supabase.from('jobs').delete().eq('id', job.id)
        );
      }
      
      deletePromises.push(
        supabase.from(assetType === 'image' ? 'images' : 'videos')
          .delete()
          .eq('id', assetId)
          .eq('user_id', user.id)
      );

      const results = await Promise.all(deletePromises);
      
      // Check for errors
      results.forEach((result, index) => {
        if (result.error) {
          console.error(`Delete operation ${index} failed:`, result.error);
          throw result.error;
        }
      });

      // Step 5: Clear cache
      this.cache.clear();

      console.log('✅ Complete asset deletion finished:', { assetId, assetType });
      
    } catch (error) {
      console.error('❌ Complete asset deletion failed:', error);
      throw error;
    }
  }

  // BULK DELETION with progress tracking
  static async bulkDeleteAssets(
    assets: Array<{ id: string; type: 'image' | 'video' }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ success: number; failed: Array<{ id: string; error: string }> }> {
    console.log('🗑️ Bulk deletion started:', { count: assets.length });
    
    let completed = 0;
    const failed: Array<{ id: string; error: string }> = [];

    // Process in batches of 5 for better performance and stability
    const BATCH_SIZE = 5;
    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      const batch = assets.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async asset => {
        try {
          await this.deleteAssetCompletely(asset.id, asset.type);
          completed++;
          onProgress?.(completed, assets.length);
        } catch (error) {
          failed.push({ 
            id: asset.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });

      await Promise.all(batchPromises);
    }

    console.log('✅ Bulk deletion completed:', { 
      success: completed, 
      failed: failed.length 
    });
    
    return { success: completed, failed };
  }

  // AUTO-CLEANUP: Remove stuck and failed jobs
  static async cleanupStuckJobs(): Promise<{ cleaned: number; errors: string[] }> {
    console.log('🧹 Starting automatic cleanup of stuck jobs');
    
    const errors: string[] = [];
    let cleaned = 0;

    try {
      // Find jobs stuck in processing for more than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: stuckJobs, error } = await supabase
        .from('jobs')
        .select('id, image_id, video_id, job_type')
        .in('status', ['processing', 'queued'])
        .lt('created_at', oneHourAgo);

      if (error) throw error;

      if (stuckJobs && stuckJobs.length > 0) {
        // Mark as failed and clean up assets if needed
        const updatePromises = stuckJobs.map(async job => {
          try {
            await supabase
              .from('jobs')
              .update({ 
                status: 'failed', 
                error_message: 'Job timed out - cleaned up automatically',
                completed_at: new Date().toISOString()
              })
              .eq('id', job.id);
            
            cleaned++;
          } catch (err) {
            errors.push(`Failed to cleanup job ${job.id}: ${err}`);
          }
        });

        await Promise.all(updatePromises);
      }

      console.log('✅ Cleanup completed:', { cleaned, errors: errors.length });
      
    } catch (error) {
      const errorMsg = `Cleanup failed: ${error}`;
      errors.push(errorMsg);
      console.error('❌ Cleanup error:', error);
    }

    return { cleaned, errors };
  }

  // Clear all caches
  static clearCache(): void {
    this.cache.clear();
    console.log('🧹 Asset cache cleared');
  }
}