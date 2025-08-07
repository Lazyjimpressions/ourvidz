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
  // Individual image record now - no arrays needed
}

export class AssetService {
  private static determineImageBucket(imageData: Partial<ImageRecord>, jobData?: any): string {
    const metadata = imageData.metadata as any;
    const jobType = jobData?.job_type || '';
    const quality = imageData.quality || jobData?.quality || 'fast';
    
    // Enhanced model detection with all 7B variants
    const isSDXL = metadata?.is_sdxl || 
                   metadata?.model_type === 'sdxl' || 
                   jobType.startsWith('sdxl_') ||
                   jobData?.model_type?.includes('sdxl_image') ||
                   metadata?.bucket?.includes('sdxl');
    
    const isEnhanced = jobType.includes('enhanced') || jobType.includes('7b');
    
    // Determine bucket with enhanced 7B model support
    let bucket: string;
    if (isSDXL) {
      bucket = quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
    } else if (isEnhanced) {
      bucket = quality === 'high' ? 'image7b_high_enhanced' : 'image7b_fast_enhanced';
    } else {
      bucket = quality === 'high' ? 'image_high' : 'image_fast';
    }
    
    console.log('🔍 Enhanced bucket determination:', {
      imageId: imageData.id,
      jobType,
      quality,
      isSDXL,
      isEnhanced,
      bucket
    });
    
    return bucket;
  }

  private static determineVideoBucket(jobData?: any): string {
    const quality = jobData?.quality || 'fast';
    const jobType = jobData?.job_type || '';
    
    // Enhanced video model detection with all 7B variants
    const isEnhanced = jobType.includes('enhanced') || 
                       jobType.includes('7b') ||
                       jobType.startsWith('video7b_');
    
    let bucket: string;
    if (isEnhanced) {
      bucket = quality === 'high' ? 'video7b_high_enhanced' : 'video7b_fast_enhanced';
    } else {
      bucket = quality === 'high' ? 'video_high' : 'video_fast';
    }
    
    console.log('🎬 Enhanced video bucket determination:', {
      jobType,
      quality,
      isEnhanced,
      bucket
    });
    
    return bucket;
  }

  // URL generation methods with fallback bucket support
  private static async generateImageUrlsWithFallback(imageUrlsArray: string[], primaryBucket: any, imageId: string): Promise<any> {
    const fallbackBuckets = ['sdxl_image_fast', 'sdxl_image_high', 'image_fast', 'image_high', 'image7b_fast_enhanced', 'image7b_high_enhanced'];
    const bucketsToTry = [primaryBucket, ...fallbackBuckets.filter(b => b !== primaryBucket)];
    
    for (const bucket of bucketsToTry) {
      try {
        const urlPromises = imageUrlsArray.map(path => 
          getSignedUrl(bucket as any, path, 3600)
            .then(({ data, error }) => error ? null : data?.signedUrl)
            .catch(() => null)
        );
        
        const urls = await Promise.all(urlPromises);
        const validUrls = urls.filter(Boolean) as string[];
        
        if (validUrls.length > 0) {
          console.log(`✅ Generated URLs with bucket ${bucket}:`, validUrls.length);
            return {
              id: imageId,
              thumbnailUrl: validUrls[0],
              url: validUrls[0],
              error: undefined
            };
        }
      } catch (error) {
        console.warn(`⚠️ Bucket ${bucket} failed for image ${imageId}:`, error);
        continue;
      }
    }
    
      return {
        id: imageId,
        thumbnailUrl: undefined,
        url: undefined,
        error: 'Failed to generate URLs from any bucket'
      };
  }

  private static async generateSingleImageUrlWithFallback(imagePath: string, primaryBucket: any, imageId: string): Promise<any> {
    const fallbackBuckets = ['sdxl_image_fast', 'sdxl_image_high', 'image_fast', 'image_high', 'image7b_fast_enhanced', 'image7b_high_enhanced'];
    const bucketsToTry = [primaryBucket, ...fallbackBuckets.filter(b => b !== primaryBucket)];
    
    for (const bucket of bucketsToTry) {
      try {
        const { data, error } = await getSignedUrl(bucket as any, imagePath, 3600);
        
        if (!error && data?.signedUrl) {
          console.log(`✅ Generated single image URL with bucket ${bucket}`);
          return {
            id: imageId,
            thumbnailUrl: data.signedUrl,
            url: data.signedUrl,
            error: undefined
          };
        }
      } catch (error) {
        console.warn(`⚠️ Bucket ${bucket} failed for image ${imageId}:`, error);
        continue;
      }
    }
    
      return {
        id: imageId,
        thumbnailUrl: undefined,
        url: undefined,
        error: 'Failed to generate URL from any bucket'
      };
  }

  private static async generateVideoUrlWithFallback(videoPath: string, primaryBucket: any, videoId: string, thumbnailPath?: string): Promise<any> {
    const fallbackBuckets = ['video_fast', 'video_high', 'video7b_fast_enhanced', 'video7b_high_enhanced'];
    const bucketsToTry = [primaryBucket, ...fallbackBuckets.filter(b => b !== primaryBucket)];
    
    let videoUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    
    // Try to get video URL with fallback buckets
    for (const bucket of bucketsToTry) {
      try {
        const { data, error } = await getSignedUrl(bucket as any, videoPath, 7200);
        
        if (!error && data?.signedUrl) {
          videoUrl = data.signedUrl;
          console.log(`✅ Generated video URL with bucket ${bucket}`);
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Video bucket ${bucket} failed for video ${videoId}:`, error);
        continue;
      }
    }
    
    // Try to get thumbnail URL if provided
    if (thumbnailPath) {
      try {
        const { data } = await getSignedUrl('image_fast' as any, thumbnailPath, 3600);
        if (data?.signedUrl) {
          thumbnailUrl = data.signedUrl;
        }
      } catch (error) {
        console.warn(`⚠️ Thumbnail generation failed for video ${videoId}:`, error);
      }
    }
    
    return {
      id: videoId,
      url: videoUrl,
      thumbnailUrl: thumbnailUrl,
      error: videoUrl ? undefined : 'Failed to generate video URL from any bucket'
    };
  }

  static async getAssetsByIds(assetIds: string[]): Promise<UnifiedAsset[]> {
    if (assetIds.length === 0) {
      return [];
    }

    console.log('🚀 Optimized getAssetsByIds:', { assetIds: assetIds.length });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // OPTIMIZATION: Batch all database queries in parallel
    const [imagesResult, videosResult, jobsResult] = await Promise.all([
      supabase
        .from('images')
        .select('*, project:projects(title)')
        .eq('user_id', user.id)
        .in('id', assetIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('videos')
        .select('*, project:projects(title)')
        .eq('user_id', user.id)
        .in('id', assetIds)
        .order('created_at', { ascending: false }),
      // OPTIMIZATION: Get ALL job data in one query instead of per-asset
      supabase
        .from('jobs')
        .select('image_id, video_id, quality, job_type, model_type, metadata')
        .or(`image_id.in.(${assetIds.join(',')}),video_id.in.(${assetIds.join(',')})`)
        .order('created_at', { ascending: false })
    ]);

    if (imagesResult.error) throw imagesResult.error;
    if (videosResult.error) throw videosResult.error;

    // OPTIMIZATION: Create job lookup map for O(1) access
    const jobMap = new Map<string, any>();
    (jobsResult.data || []).forEach(job => {
      const assetId = job.image_id || job.video_id;
      if (assetId && !jobMap.has(assetId)) {
        jobMap.set(assetId, job);
      }
    });

    // OPTIMIZATION: Process all URL generation in parallel
    const urlGenerationTasks: Array<Promise<any>> = [];
    
    // Process images
    const imageAssets: UnifiedAsset[] = (imagesResult.data || []).map(image => {
      const jobData = jobMap.get(image.id);
      const metadata = image.metadata as any;
      const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl' || 
                     jobData?.job_type?.startsWith('sdxl_') ||
                     jobData?.model_type?.includes('sdxl');
      const modelType = isSDXL ? 'SDXL' : 'WAN';

      let urlPromise: Promise<any> = Promise.resolve({
        id: image.id,
        thumbnailUrl: undefined,
        url: undefined,
        error: undefined
      });

      if (image.status === 'completed') {
        const bucket = AssetService.determineImageBucket(image, jobData);
        if (image.image_url) {
          urlPromise = AssetService.generateSingleImageUrlWithFallback(image.image_url, bucket as any, image.id);
        }
      }

      urlGenerationTasks.push(urlPromise);

      return {
        id: image.id,
        type: 'image' as const,
        title: image.title || undefined,
        prompt: image.prompt,
        status: image.status,
        quality: image.quality || undefined,
        format: image.format || undefined,
        createdAt: new Date(image.created_at),
        projectId: image.project_id || undefined,
        projectTitle: (image.project as any)?.title,
        modelType,
        isSDXL,
        // URLs will be populated after Promise resolves
        thumbnailUrl: undefined,
        url: undefined,
        error: undefined
      };
    });

    // Process videos
    const videoAssets: UnifiedAsset[] = (videosResult.data || []).map(video => {
      const jobData = jobMap.get(video.id);
      
      let urlPromise: Promise<any> = Promise.resolve({
        id: video.id,
        thumbnailUrl: undefined,
        url: undefined,
        error: undefined
      });

      if (video.status === 'completed' && video.video_url) {
        const bucket = AssetService.determineVideoBucket(jobData);
        
        urlPromise = AssetService.generateVideoUrlWithFallback(video.video_url, bucket as any, video.id, video.thumbnail_url);
      }

      urlGenerationTasks.push(urlPromise);

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
        // URLs will be populated after Promise resolves
        thumbnailUrl: undefined,
        url: undefined,
        error: undefined
      };
    });

    // OPTIMIZATION: Wait for all URL generation to complete in parallel
    const urlResults = await Promise.all(urlGenerationTasks);
    
    // Merge URL results back into assets
    const allAssets = [...imageAssets, ...videoAssets];
    urlResults.forEach(result => {
      const asset = allAssets.find(a => a.id === result.id);
      if (asset) {
        asset.thumbnailUrl = result.thumbnailUrl;
        asset.url = result.url;
        asset.error = result.error;
      }
    });

    allAssets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    console.log('✅ Optimized getAssetsByIds complete:', { 
      found: allAssets.length,
      withUrls: allAssets.filter(a => a.url).length 
    });
    
    return allAssets;
  }

  /**
   * Optimized getUserAssets method using UnifiedUrlService
   * This is the primary implementation for workspace and library
   */
  static async getUserAssetsOptimized(sessionOnly: boolean = false): Promise<UnifiedAsset[]> {
    console.log('🚀 OPTIMIZED: Fetching assets with UTC session filtering:', { sessionOnly });
    
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
    }

    console.log('🔍 ASSET SERVICE: Executing database queries...');

    let imagesResult, videosResult;
    
    try {
      // Fetch images and videos in parallel
      [imagesResult, videosResult] = await Promise.all([
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

      console.log('✅ ASSET SERVICE: Database queries successful:', {
        imagesFound: imagesResult.data?.length || 0,
        videosFound: videosResult.data?.length || 0,
        totalRawAssets: (imagesResult.data?.length || 0) + (videosResult.data?.length || 0)
      });
    } catch (error: any) {
      const serviceError = AssetServiceErrorHandler.createError(
        'DATABASE_QUERY_FAILED',
        `Database query failed: ${error.message}`,
        { sessionOnly, userId: user.id, error: error.message },
        'Failed to load your content from the database'
      );
      
      AssetServiceErrorHandler.handleError(serviceError);
      throw serviceError;
    }

    // Transform images to UnifiedAsset format
    const imageAssets: UnifiedAsset[] = (imagesResult.data || []).map((image) => {
      const metadata = image.metadata as any;
      const isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl';
      const modelType = isSDXL ? 'SDXL' : 'WAN';

      // Get the first job from the jobs array (most recent)
      const jobData = (image.jobs as any[])?.[0] || null;

      // Include job information in metadata
      const enhancedMetadata = {
        ...metadata,
        job_id: jobData?.id || image.id, // Use job ID or fallback to image ID
        job_type: jobData?.job_type,
        job_model_type: jobData?.model_type,
        job_metadata: jobData?.metadata
      };

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
        metadata: enhancedMetadata,
        // Map database URLs to UnifiedAsset properties
        thumbnailUrl: image.thumbnail_url || undefined,
        url: image.image_url || undefined,
        error: undefined
      };
    });

    // Transform videos to UnifiedAsset format
    const videoAssets: UnifiedAsset[] = (videosResult.data || []).map((video) => {
      const metadata = video.metadata as any;
      const isEnhanced = metadata?.enhanced || metadata?.model_type?.includes('7b');

      // Get the first job from the jobs array (most recent)
      const jobData = (video.jobs as any[])?.[0] || null;

      // Include job information in metadata
      const enhancedMetadata = {
        ...metadata,
        job_id: jobData?.id || video.id, // Use job ID or fallback to video ID
        job_type: jobData?.job_type,
        job_model_type: jobData?.model_type,
        job_metadata: jobData?.metadata
      };

      return {
        id: video.id,
        type: 'video' as const,
        title: video.title || undefined,
        prompt: (video as any).prompt || '',
        enhancedPrompt: video.enhanced_prompt || undefined,
        status: video.status,
        quality: (video as any).quality || undefined,
        format: video.format || undefined,
        createdAt: new Date(video.created_at),
        projectId: video.project_id || undefined,
        projectTitle: (video.project as any)?.title,
        duration: video.duration || undefined,
        resolution: video.resolution || undefined,
        modelType: isEnhanced ? 'Enhanced' : 'Standard',
        metadata: enhancedMetadata,
        // Map database URLs to UnifiedAsset properties
        thumbnailUrl: video.thumbnail_url || undefined,
        url: video.video_url || undefined,
        error: undefined
      };
    });

    // Combine all assets
    const allAssets = [...imageAssets, ...videoAssets];

    // Use UnifiedUrlService for batch URL generation
    console.log(`🚀 Generating URLs for ${allAssets.length} assets using UnifiedUrlService`);
    const assetsWithUrls = await UnifiedUrlService.generateBatchUrls(allAssets);

    console.log('✅ OPTIMIZED: Asset loading completed', {
      totalAssets: assetsWithUrls.length,
      images: assetsWithUrls.filter(a => a.type === 'image').length,
      videos: assetsWithUrls.filter(a => a.type === 'video').length,
      withUrls: assetsWithUrls.filter(a => a.url).length,
      withErrors: assetsWithUrls.filter(a => a.error).length,
      completed: assetsWithUrls.filter(a => a.status === 'completed').length
    });

    // Emit library-assets-ready event for real-time UI updates
    window.dispatchEvent(new CustomEvent('library-assets-ready', {
      detail: { 
        assets: assetsWithUrls,
        sessionOnly,
        source: 'AssetService.getUserAssetsOptimized'
      }
    }));

    return assetsWithUrls;
  }

  static async getUserAssets(sessionOnly: boolean = false): Promise<UnifiedAsset[]> {
    console.log('🔍 ENHANCED ASSET FETCHING with session filtering:', { sessionOnly });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    console.log('👤 Fetching assets for user:', user.id);

    // Get today's date for session filtering (LOCAL timezone, not UTC)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log('📅 Session filtering details:', {
      sessionOnly,
      startOfDay: startOfDay.toISOString(),
      localStartOfDay: startOfDay.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentTime: now.toLocaleString()
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
      imageQuery = imageQuery.gte('created_at', startOfDay.toISOString());
      videoQuery = videoQuery.gte('created_at', startOfDay.toISOString());
      console.log('📅 Session filtering enabled - showing assets from:', startOfDay.toISOString());
    }

    // Filter out dismissed items for workspace view
    if (sessionOnly) {
      // For workspace view, exclude items that have been dismissed
      imageQuery = imageQuery.not('metadata->workspace_dismissed', 'eq', true);
      videoQuery = videoQuery.not('metadata->workspace_dismissed', 'eq', true);
      console.log('🚫 Filtering out dismissed items for workspace view');
    }

    // Fetch images and videos in parallel
    const [imagesResult, videosResult] = await Promise.all([
      imageQuery.order('created_at', { ascending: false }),
      videoQuery.order('created_at', { ascending: false })
    ]);

    if (imagesResult.error) {
      console.error('❌ Error fetching images:', imagesResult.error);
      throw imagesResult.error;
    }

    if (videosResult.error) {
      console.error('❌ Error fetching videos:', videosResult.error);
      throw videosResult.error;
    }

    console.log('📊 ENHANCED Raw data analysis:', {
      totalImages: imagesResult.data?.length,
      totalVideos: videosResult.data?.length,
      imageStatuses: imagesResult.data?.reduce((acc, img) => {
        acc[img.status] = (acc[img.status] || 0) + 1;
        return acc;
      }, {}),
      completedImages: imagesResult.data?.filter(img => img.status === 'completed').length,
      imagesWithUrls: imagesResult.data?.filter(img => img.image_url).length,
      sessionFiltered: sessionOnly ? 'YES' : 'NO',
      oldestImage: imagesResult.data?.[imagesResult.data.length - 1]?.created_at,
      newestImage: imagesResult.data?.[0]?.created_at
    });

    // Enhanced debugging for each image
    imagesResult.data?.forEach((image, index) => {
      console.log(`🖼️ Image ${index + 1} analysis:`, {
        id: image.id,
        status: image.status,
        quality: image.quality,
        hasImageUrl: !!image.image_url,
        createdAt: image.created_at,
        isInSession: sessionOnly ? new Date(image.created_at) >= startOfDay : 'N/A'
      });
    });

    // Transform and combine assets
    const imageAssets: UnifiedAsset[] = await Promise.all(
      (imagesResult.data || []).map(async (image, index) => {
        console.log(`🔄 Processing image asset ${index + 1}/${imagesResult.data?.length}:`, image.id);
        
        let thumbnailUrl: string | undefined;
        let url: string | undefined;
        let error: string | undefined;
        let jobData: any = null;
        let modelType: string | undefined;
        let isSDXL = false;

        // Get job data to determine model type and bucket
        console.log('🔍 Fetching job data for image:', image.id);
        const { data: jobResult, error: jobError } = await supabase
          .from('jobs')
          .select('quality, job_type, model_type, metadata')
          .eq('image_id', image.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jobError) {
          console.warn('⚠️ Error fetching job data for image:', image.id, jobError);
        } else {
          jobData = jobResult;
          console.log('✅ Job data fetched:', {
            imageId: image.id,
            jobData: jobResult
          });
        }

        // Determine model type and SDXL status
        const metadata = image.metadata as any;
        isSDXL = metadata?.is_sdxl || metadata?.model_type === 'sdxl' || 
                 jobData?.job_type?.startsWith('sdxl_') ||
                 jobData?.model_type?.includes('sdxl');
        modelType = isSDXL ? 'SDXL' : 'WAN';

        console.log('🔧 Enhanced image processing analysis:', {
          imageId: image.id,
          status: image.status,
          quality: image.quality,
          isSDXL,
          modelType,
          jobType: jobData?.job_type,
          hasImageUrl: !!image.image_url,
          imageUrl: image.image_url,
          metadata: metadata,
          jobMetadata: jobData?.metadata
        });

        // Generate signed URLs for completed images
        if (image.status === 'completed') {
          try {
            const bucket = AssetService.determineImageBucket(image, jobData);
            
            // Check for image_urls array (6-image generation) - check root field first
            const metadata = image.metadata as any;
            const imageUrlsArray = image.image_urls || metadata?.image_urls;
            
            if (imageUrlsArray && Array.isArray(imageUrlsArray) && imageUrlsArray.length > 0) {
              console.log('✅ Processing image_urls array:', {
                imageId: image.id,
                bucket,
                urlCount: imageUrlsArray.length,
                source: image.image_urls ? 'root' : 'metadata'
              });
              
              // Generate signed URLs for each image in the array in parallel for speed
              const signedUrlPromises = imageUrlsArray.map(async (imagePath) => {
                const { data: signedUrlData, error: urlError } = await getSignedUrl(
                  bucket as any,
                  imagePath,
                  3600
                );
                
                if (!urlError && signedUrlData?.signedUrl) {
                  return signedUrlData.signedUrl;
                } else {
                  console.error('❌ Failed to generate URL for image in array:', {
                    imageId: image.id,
                    imagePath,
                    error: urlError?.message
                  });
                  return null;
                }
              });
              
              const signedUrls = (await Promise.all(signedUrlPromises)).filter(url => url !== null);
              
              if (signedUrls.length > 0) {
                // Store signed URLs in metadata for MediaGrid to use
                (metadata as any).signed_urls = signedUrls;
                thumbnailUrl = signedUrls[0]; // Use first image as thumbnail
                url = signedUrls[0]; // Use first image as main URL
                console.log('✅ Generated signed URLs for image array:', {
                  imageId: image.id,
                  bucket,
                  urlCount: signedUrls.length,
                  processingTime: 'optimized-parallel'
                });
              } else {
                error = 'Failed to generate URLs for image array';
                console.error('❌ No signed URLs generated for image array:', image.id);
              }
            }
            // Fallback to single image_url (legacy)
            else if (image.image_url) {
              console.log('📁 Processing single image_url:', {
                imageId: image.id,
                bucket,
                imagePath: image.image_url
              });
              
              const { data: signedUrlData, error: urlError } = await getSignedUrl(
                bucket as any,
                image.image_url,
                3600
              );

              if (!urlError && signedUrlData?.signedUrl) {
                thumbnailUrl = signedUrlData.signedUrl;
                url = signedUrlData.signedUrl;
                console.log('✅ Generated signed URL for single image:', image.id);
              } else {
                error = urlError?.message || 'Failed to generate image URL';
                console.error('❌ Failed to generate URL for single image:', {
                  imageId: image.id,
                  bucket,
                  imagePath: image.image_url,
                  error: error
                });
                
                console.log('❌ Failed to generate URL - check bucket and file path');
                // Note: Removing fallback bucket logic - buckets should be consistent now
              }
            } else {
              console.log('⚠️ No image_url or image_urls found:', image.id);
            }
          } catch (urlError) {
            console.error('❌ Exception generating image URL:', {
              imageId: image.id,
              error: urlError,
              stack: urlError instanceof Error ? urlError.stack : 'No stack'
            });
            error = 'Failed to load image';
          }
        } else {
          console.log('⚠️ Skipping URL generation for image:', {
            imageId: image.id,
            status: image.status,
            reason: 'not completed'
          });
        }

        const asset: UnifiedAsset = {
          id: image.id,
          type: 'image' as const,
          title: image.title || undefined,
          prompt: image.prompt,
          enhancedPrompt: image.enhanced_prompt,
          thumbnailUrl,
          url,
          status: image.status,
          quality: image.quality || undefined,
          format: image.format || undefined,
          createdAt: new Date(image.created_at),
          projectId: image.project_id || undefined,
          projectTitle: (image.project as any)?.title,
          modelType,
          isSDXL,
          metadata: image.metadata as Record<string, any>,
          error,
        };

        console.log('📦 Final asset created:', {
          id: asset.id,
          hasUrl: !!asset.url,
          hasError: !!asset.error,
          modelType: asset.modelType,
          status: asset.status
        });

        return asset;
      })
    );

    const videoAssets: UnifiedAsset[] = await Promise.all(
      (videosResult.data || []).map(async (video) => {
        let thumbnailUrl: string | undefined;
        let url: string | undefined;
        let error: string | undefined;

        // Generate signed URLs for completed videos
        if (video.status === 'completed' && video.video_url) {
          try {
            // Get job data to determine quality
            const { data: jobData } = await supabase
              .from('jobs')
              .select('quality, job_type')
              .eq('video_id', video.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const bucket = AssetService.determineVideoBucket(jobData);
            const { data: signedUrlData, error: urlError } = await getSignedUrl(
              bucket as any,
              video.video_url,
              7200
            );

            if (!urlError && signedUrlData?.signedUrl) {
              url = signedUrlData.signedUrl;
            } else {
              error = urlError?.message || 'Failed to generate video URL';
            }

            // Use thumbnail URL if available
            if (video.thumbnail_url) {
              const { data: thumbSignedUrlData } = await getSignedUrl(
                'image_fast' as any,
                video.thumbnail_url,
                3600
              );
              if (thumbSignedUrlData?.signedUrl) {
                thumbnailUrl = thumbSignedUrlData.signedUrl;
              }
            }
          } catch (urlError) {
            console.error('Error generating video URL:', urlError);
            error = 'Failed to load video';
          }
        }

        return {
          id: video.id,
          type: 'video' as const,
          prompt: (video.project as any)?.title || 'Untitled Video',
          enhancedPrompt: undefined, // Videos don't have enhanced prompts currently
          thumbnailUrl: thumbnailUrl || video.thumbnail_url || undefined,
          url,
          status: video.status || 'draft',
          format: video.format || undefined,
          createdAt: new Date(video.created_at!),
          projectId: video.project_id || undefined,
          projectTitle: (video.project as any)?.title,
          duration: video.duration || undefined,
          resolution: video.resolution || undefined,
          metadata: video.metadata as Record<string, any>,
          error
        };
      })
    );

    // Combine and sort by creation date
    const allAssets = [...imageAssets, ...videoAssets];
    allAssets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // LIBRARY-FIRST: Emit event for workspace and other consumers after URL generation
    const completedAssets = allAssets.filter(asset => asset.status === 'completed' && asset.url && !asset.error);
    
    if (completedAssets.length > 0) {
      // Emit event for workspace and other consumers
      window.dispatchEvent(new CustomEvent('library-assets-ready', {
        detail: {
          assets: completedAssets,
          type: 'batch',
          timestamp: new Date().toISOString(),
          sessionOnly: sessionOnly
        }
      }));
      
      console.log('📡 LIBRARY: Emitted assets-ready event:', {
        assetCount: completedAssets.length,
        types: completedAssets.map(a => a.type),
        sessionOnly: sessionOnly
      });
    }

    console.log('✅ ENHANCED Final asset summary:', {
      total: allAssets.length,
      images: imageAssets.length,
      videos: videoAssets.length,
      sdxlImages: imageAssets.filter(a => a.isSDXL).length,
      wanImages: imageAssets.filter(a => !a.isSDXL).length,
      completedImages: imageAssets.filter(a => a.status === 'completed').length,
      imagesWithUrls: imageAssets.filter(a => !!a.url).length,
      imagesWithErrors: imageAssets.filter(a => !!a.error).length,
      completedWithUrls: completedAssets.length,
      assetBreakdown: allAssets.map(a => ({
        id: a.id,
        type: a.type,
        status: a.status,
        hasUrl: !!a.url,
        hasError: !!a.error,
        modelType: a.modelType
      }))
    });
    
    return allAssets;
  }

  static async deleteAsset(assetId: string, assetType: 'image' | 'video'): Promise<void> {
    console.log('🗑️ OPTIMIZED: Deleting asset with enhanced performance:', assetId, assetType);
    
    try {
      // Step 1: Get asset and job data in single optimized query
      let assetData: any = null;
      let jobData: any = null;
      
      if (assetType === 'image') {
        // Single query with JOIN to get both asset and job data - corrected foreign key reference
        const { data, error } = await supabase
          .from('images')
          .select(`
            image_url, 
            image_urls,
            quality, 
            metadata,
            jobs!jobs_image_id_fkey(quality, job_type, model_type)
          `)
          .eq('id', assetId)
          .maybeSingle();
        
        if (error) {
          console.error('❌ Failed to fetch image data:', error);
          throw error;
        }
        
        assetData = data;
        jobData = data?.jobs?.[0] || null;
        
        // Handle orphaned images (no associated job data)
        if (!jobData && assetData?.image_url) {
          console.log('⚠️ Image has no job data - attempting fallback bucket detection');
          // Fallback bucket detection based on URL patterns or metadata
          const metadata = assetData.metadata as any;
          if (metadata?.bucket?.includes('sdxl') || assetData.image_url.includes('sdxl')) {
            jobData = { quality: assetData.quality || 'fast', job_type: 'sdxl_image_fast', model_type: 'sdxl_image' };
          } else if (assetData.image_url.includes('7b_') || assetData.image_url.includes('enhanced')) {
            jobData = { quality: assetData.quality || 'fast', job_type: 'image7b_fast_enhanced' };
          } else if (assetData.quality === 'high') {
            jobData = { quality: 'high', job_type: 'image_high' };
          } else {
            jobData = { quality: 'fast', job_type: 'image_fast' };
          }
          console.log('🔧 Using fallback job data for image:', jobData);
        }
      } else {
        // Single query with JOIN for videos - corrected foreign key reference
        const { data, error } = await supabase
          .from('videos')
          .select(`
            video_url, 
            thumbnail_url,
            jobs!jobs_video_id_fkey(quality, job_type)
          `)
          .eq('id', assetId)
          .maybeSingle();
        
        if (error) {
          console.error('❌ Failed to fetch video data:', error);
          throw error;
        }
        
        assetData = data;
        jobData = data?.jobs?.[0] || null;
        
        // Handle orphaned videos (no associated job data)
        if (!jobData && assetData?.video_url) {
          console.log('⚠️ Video has no job data - attempting fallback bucket detection');
          // Fallback bucket detection based on URL patterns
          if (assetData.video_url.includes('7b_') || assetData.video_url.includes('enhanced')) {
            jobData = { quality: 'fast', job_type: 'video7b_fast_enhanced' };
          } else if (assetData.video_url.includes('high')) {
            jobData = { quality: 'high', job_type: 'video_high' };
          } else {
            jobData = { quality: 'fast', job_type: 'video_fast' };
          }
          console.log('🔧 Using fallback job data:', jobData);
        }
      }

      // Step 2: Delete from database (jobs will be cleaned up by CASCADE)
      const deletePromise = assetType === 'image' 
        ? supabase.from('images').delete().eq('id', assetId)
        : supabase.from('videos').delete().eq('id', assetId);
      
      const { error: deleteError } = await deletePromise;
      if (deleteError) {
        console.error('❌ Database deletion failed:', deleteError);
        throw deleteError;
      }

      // Step 3: Clean up storage files in parallel (non-blocking)
      if (assetData) {
        const storageCleanupPromises: Promise<any>[] = [];
        
        if (assetType === 'image') {
          const bucket = AssetService.determineImageBucket(assetData, jobData);
          console.log('🗑️ Cleaning up from bucket:', bucket);
          
          // Handle multi-image generations (image_urls array)
          const imageUrlsArray = assetData.image_urls || (assetData.metadata as any)?.image_urls;
          
          if (imageUrlsArray && Array.isArray(imageUrlsArray) && imageUrlsArray.length > 0) {
            console.log('🗑️ Deleting multiple images:', imageUrlsArray.length);
            imageUrlsArray.forEach(imagePath => {
              storageCleanupPromises.push(
                deleteFile(bucket as any, imagePath).catch(err => 
                  console.warn('⚠️ Failed to delete image:', imagePath, err)
                )
              );
            });
          } else if (assetData.image_url) {
            console.log('🗑️ Deleting single image:', assetData.image_url);
            storageCleanupPromises.push(
              deleteFile(bucket as any, assetData.image_url).catch(err => 
                console.warn('⚠️ Failed to delete image:', assetData.image_url, err)
              )
            );
          }
        } else if (assetType === 'video') {
          if (assetData.video_url) {
            const bucket = AssetService.determineVideoBucket(jobData);
            console.log('🗑️ Deleting video from bucket:', bucket);
            storageCleanupPromises.push(
              deleteFile(bucket as any, assetData.video_url).catch(err => 
                console.warn('⚠️ Failed to delete video:', assetData.video_url, err)
              )
            );
          }
          if (assetData.thumbnail_url) {
            console.log('🗑️ Deleting thumbnail');
            storageCleanupPromises.push(
              deleteFile('image_fast' as any, assetData.thumbnail_url).catch(err => 
                console.warn('⚠️ Failed to delete thumbnail:', assetData.thumbnail_url, err)
              )
            );
          }
        }
        
        // Execute storage cleanup in parallel (don't await - fire and forget)
        if (storageCleanupPromises.length > 0) {
          Promise.allSettled(storageCleanupPromises).then(results => {
            const failed = results.filter(r => r.status === 'rejected').length;
            if (failed > 0) {
              console.warn(`⚠️ ${failed}/${results.length} storage cleanup operations failed`);
            } else {
              console.log('✅ All storage cleanup completed successfully');
            }
          });
        }
      }
      
      console.log('✅ OPTIMIZED: Asset deletion completed:', assetId);
    } catch (error) {
      console.error('❌ OPTIMIZED: Asset deletion failed:', error);
      throw error;
    }
  }

  static async bulkDeleteAssets(assets: { id: string; type: 'image' | 'video' }[]): Promise<void> {
    console.log('🗑️ Bulk deleting assets:', assets.length);
    
    // Delete each asset individually to ensure proper storage cleanup
    const deletePromises = assets.map(asset => 
      AssetService.deleteAsset(asset.id, asset.type)
    );

    await Promise.all(deletePromises);
    console.log('✅ Bulk delete completed successfully');
  }

  static async cleanupOrphanedAssets(): Promise<{ cleaned: number; errors: string[] }> {
    console.log('🧹 Starting orphaned asset cleanup...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const errors: string[] = [];
    let cleanedCount = 0;

    try {
      // Get all user images
      const { data: images } = await supabase
        .from('images')
        .select('id, image_url, quality, metadata')
        .eq('user_id', user.id);

      // Get all user videos
      const { data: videos } = await supabase
        .from('videos')
        .select('id, video_url, thumbnail_url')
        .eq('user_id', user.id);

      // Check images for orphaned database records
      if (images) {
        for (const image of images) {
          if (image.image_url) {
            try {
              // Get job data for proper bucket determination
              const { data: jobData } = await supabase
                .from('jobs')
                .select('quality, job_type, model_type')
                .eq('image_id', image.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              const bucket = AssetService.determineImageBucket(image, jobData);
              const { data } = await getSignedUrl(bucket as any, image.image_url, 60);
              
              if (!data?.signedUrl) {
                // File doesn't exist in storage, remove database record
                await supabase.from('images').delete().eq('id', image.id);
                cleanedCount++;
                console.log('🗑️ Cleaned orphaned image record:', image.id);
              }
            } catch (error) {
              errors.push(`Image ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }

      // Check videos for orphaned database records
      if (videos) {
        for (const video of videos) {
          if (video.video_url) {
            try {
              // Get quality from jobs table
              const { data: jobData } = await supabase
                .from('jobs')
                .select('quality, job_type')
                .eq('video_id', video.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              const bucket = AssetService.determineVideoBucket(jobData);
              const { data } = await getSignedUrl(bucket as any, video.video_url, 60);
              
              if (!data?.signedUrl) {
                // File doesn't exist in storage, remove database record
                await supabase.from('videos').delete().eq('id', video.id);
                cleanedCount++;
                console.log('🗑️ Cleaned orphaned video record:', video.id);
              }
            } catch (error) {
              errors.push(`Video ${video.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }

      console.log(`✅ Cleanup completed: ${cleanedCount} orphaned records removed`);
      return { cleaned: cleanedCount, errors };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }
}
