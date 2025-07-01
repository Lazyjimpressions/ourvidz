import { supabase } from '@/integrations/supabase/client';
import { usageAPI } from '@/lib/database';
import { getSignedUrl } from '@/lib/storage';
import type { GenerationRequest, GenerationFormat, GenerationQuality } from '@/types/generation';
import { GENERATION_CONFIGS } from '@/types/generation';
import type { Tables } from '@/integrations/supabase/types';

type ImageRecord = Tables<'images'>;
type VideoRecord = Tables<'videos'>;

// Extended types to include our custom properties
type ImageRecordWithUrl = ImageRecord & {
  image_urls?: string[] | null;
  url_error?: string;
};

type VideoRecordWithUrl = VideoRecord & {
  url_error?: string;
};

// Enhanced generation request for regeneration with advanced options
interface RegenerationRequest extends GenerationRequest {
  strength?: number;
  referenceImageUrl?: string;
  preserveSeed?: boolean;
  originalItemId?: string;
}

export class GenerationService {
  static async generate(request: GenerationRequest | RegenerationRequest) {
    console.log('🚀 GenerationService.generate called with:', request);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to generate content');
    }

    // Get generation config for credits and metadata
    const config = GENERATION_CONFIGS[`${request.format}_${request.quality}`];
    if (!config) {
      throw new Error('Invalid format/quality combination');
    }

    console.log('⚙️ Using generation config:', config);

    // Get seed from original generation if preserveSeed is requested
    let originalSeed: string | undefined;
    if ('preserveSeed' in request && request.preserveSeed && 'originalItemId' in request && request.originalItemId) {
      originalSeed = await this.getOriginalSeed(request.originalItemId, request.format);
    }

    // Create a record in the appropriate table based on format
    let recordId: string;
    
    if (request.format === 'image') {
      console.log('📷 Creating image record...');
      const { data: image, error: imageError } = await supabase
        .from('images')
        .insert({
          user_id: user.id,
          project_id: request.projectId || null,
          prompt: request.prompt,
          status: 'queued',
          generation_mode: 'functional',
          format: 'png',
          quality: request.quality
        })
        .select()
        .single();

      if (imageError) {
        console.error('❌ Image creation error:', imageError);
        throw imageError;
      }
      recordId = image.id;
      console.log('✅ Image record created with ID:', recordId);
    } else {
      console.log('🎬 Creating video record...');
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          project_id: request.projectId || null,
          status: 'queued',
          duration: 2,
          format: 'mp4'
        })
        .select()
        .single();

      if (videoError) {
        console.error('❌ Video creation error:', videoError);
        throw videoError;
      }
      recordId = video.id;
      console.log('✅ Video record created with ID:', recordId);
    }

    // Use the clean job type format
    const jobType = `${request.format}_${request.quality}`;
    console.log('🔧 Using job type:', jobType);

    // Enhanced metadata for WAN 2.1 regeneration features
    const enhancedMetadata = {
      ...request.metadata,
      prompt: request.prompt,
      format: request.format,
      quality: request.quality,
      model_type: jobType,
      model_variant: config.modelVariant,
      credits: config.credits,
      generate_variations: request.format === 'image' ? true : false,
      variation_count: request.format === 'image' ? 6 : 1,
      // WAN 2.1 specific parameters
      ...(('strength' in request && request.strength) && { strength: request.strength }),
      ...(('referenceImageUrl' in request && request.referenceImageUrl) && { 
        reference_image_url: request.referenceImageUrl,
        image_to_image: true
      }),
      ...(originalSeed && { seed: originalSeed, preserve_seed: true }),
      ...(('originalItemId' in request && request.originalItemId) && { 
        regeneration_source: request.originalItemId,
        is_regeneration: true 
      })
    };

    // Queue the job using the existing queue-job function
    console.log('📋 Queuing job with enhanced payload...');
    const { data, error } = await supabase.functions.invoke('queue-job', {
      body: {
        jobType,
        [request.format === 'image' ? 'imageId' : 'videoId']: recordId,
        projectId: request.projectId || null,
        metadata: enhancedMetadata
      }
    });

    if (error) {
      console.error('❌ Job queue error:', error);
      throw new Error(`Failed to queue generation job: ${error.message}`);
    }

    console.log('✅ Job queued successfully:', data);

    // Log usage with regeneration tracking
    await usageAPI.logAction(
      'originalItemId' in request && request.originalItemId ? `${jobType}_regeneration` : jobType,
      config.credits,
      {
        format: request.format,
        quality: request.quality,
        model_type: jobType,
        [request.format === 'image' ? 'image_id' : 'video_id']: recordId,
        project_id: request.projectId || null,
        ...('originalItemId' in request && request.originalItemId && { regeneration_source: request.originalItemId })
      }
    );

    console.log('📈 Usage logged for job type:', jobType);

    return {
      id: recordId,
      jobId: data.job?.id,
      format: request.format,
      quality: request.quality,
      estimatedTime: config.estimatedTime
    };
  }

  // Helper method to retrieve seed from original generation
  private static async getOriginalSeed(originalItemId: string, format: GenerationFormat): Promise<string | undefined> {
    console.log('🔍 Retrieving seed for original item:', originalItemId);
    
    try {
      const { data: job, error } = await supabase
        .from('jobs')
        .select('metadata')
        .eq(format === 'image' ? 'image_id' : 'video_id', originalItemId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching original job:', error);
        return undefined;
      }

      if (job?.metadata && typeof job.metadata === 'object' && 'seed' in job.metadata) {
        console.log('✅ Found original seed:', job.metadata.seed);
        return job.metadata.seed as string;
      }

      console.log('⚠️ No seed found in original job metadata');
      return undefined;
    } catch (error) {
      console.error('❌ Error in getOriginalSeed:', error);
      return undefined;
    }
  }

  private static extractRelativePath(filePath: string): string {
    console.log('🔧 Extracting relative path from:', filePath);
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    // If the path doesn't contain a slash, it's already relative
    if (!filePath.includes('/')) {
      console.log('✅ Path is already relative:', filePath);
      return filePath;
    }

    // Check if path starts with a known bucket prefix
    const bucketPrefixes = ['image_fast', 'image_high', 'video_fast', 'video_high'];
    const pathParts = filePath.split('/');
    
    // If first part is a bucket name, remove it
    if (pathParts.length > 1 && bucketPrefixes.includes(pathParts[0])) {
      const relativePath = pathParts.slice(1).join('/');
      console.log('🔧 Removed bucket prefix, relative path:', relativePath);
      return relativePath;
    }

    // If path starts with bucket name followed by slash, it's legacy format
    for (const prefix of bucketPrefixes) {
      if (filePath.startsWith(`${prefix}/`)) {
        const relativePath = filePath.substring(prefix.length + 1);
        console.log('🔧 Removed legacy bucket prefix, relative path:', relativePath);
        return relativePath;
      }
    }

    // Otherwise, assume it's already in the correct format
    console.log('✅ Path appears to be relative already:', filePath);
    return filePath;
  }

  private static getBucketForContent(format: GenerationFormat, quality: GenerationQuality): string {
    if (format === 'image') {
      return quality === 'high' ? 'image_high' : 'image_fast';
    } else {
      return quality === 'high' ? 'video_high' : 'video_fast';
    }
  }

  private static async getVideoQualityFromJob(videoId: string): Promise<GenerationQuality> {
    console.log('🔍 Getting video quality from job for video:', videoId);
    
    try {
      const { data: job, error } = await supabase
        .from('jobs')
        .select('quality, job_type')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching job for video quality:', error);
        return 'fast'; // Default fallback
      }

      if (job) {
        if (job.quality) {
          console.log('✅ Found quality in job record:', job.quality);
          return job.quality as GenerationQuality;
        }
        
        // Extract quality from job_type if available
        if (job.job_type) {
          const qualityFromJobType = job.job_type.split('_')[1]; // e.g., 'video_high' -> 'high'
          if (qualityFromJobType === 'high' || qualityFromJobType === 'fast') {
            console.log('✅ Extracted quality from job_type:', qualityFromJobType);
            return qualityFromJobType as GenerationQuality;
          }
        }
      }

      console.log('⚠️ No job found for video, defaulting to fast quality');
      return 'fast';
    } catch (error) {
      console.error('❌ Error in getVideoQualityFromJob:', error);
      return 'fast'; // Default fallback
    }
  }

  static async getGenerationStatus(id: string, format: GenerationFormat): Promise<ImageRecordWithUrl | VideoRecordWithUrl> {
    console.log('🔍 Checking generation status for:', { id, format });
    
    if (format === 'image') {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Status check error:', error);
        throw error;
      }

      console.log('📊 Raw image data from database:', data);

      // Handle completed images with FIXED path handling
      if (data.status === 'completed' && data.image_url) {
        try {
          console.log('🎯 Processing completed image with filePath:', data.image_url);
          
          // Extract relative path using improved logic
          const relativePath = this.extractRelativePath(data.image_url);
          
          // Get correct bucket based on image quality
          const bucket = this.getBucketForContent('image', data.quality as GenerationQuality);
          console.log('🪣 Using image bucket:', bucket, 'for relative path:', relativePath);
          
          // Generate signed URL from the RELATIVE file path
          const { data: signedUrlData, error: urlError } = await getSignedUrl(
            bucket as any,
            relativePath,
            3600 // 1 hour expiry
          );

          if (!urlError && signedUrlData?.signedUrl) {
            console.log('✅ Image signed URL generated successfully');
            const result: ImageRecordWithUrl = {
              ...data,
              image_urls: [signedUrlData.signedUrl]
            };
            return result;
          } else {
            console.error('❌ Failed to generate image signed URL:', urlError?.message);
            const result: ImageRecordWithUrl = {
              ...data,
              image_urls: null,
              url_error: urlError?.message || 'Failed to generate image URL'
            };
            return result;
          }
        } catch (urlError) {
          console.error('❌ Error processing image signed URL:', urlError);
          const result: ImageRecordWithUrl = {
            ...data,
            image_urls: null,
            url_error: urlError instanceof Error ? urlError.message : 'Unknown URL processing error'
          };
          return result;
        }
      }

      // For non-completed images, return as-is
      console.log('ℹ️ Image not completed yet, returning raw data');
      return data as ImageRecordWithUrl;
    } else {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Video status check error:', error);
        throw error;
      }

      console.log('📊 Raw video data from database:', data);

      // Handle completed videos with IMPROVED quality detection
      if (data.status === 'completed' && data.video_url) {
        try {
          console.log('🎯 Processing completed video with filePath:', data.video_url);
          
          // Extract relative path using improved logic
          const relativePath = this.extractRelativePath(data.video_url);
          
          // Get video quality from the associated job record
          const videoQuality = await this.getVideoQualityFromJob(data.id);
          const bucket = this.getBucketForContent('video', videoQuality);
          console.log('🪣 Using video bucket:', bucket, 'for relative path:', relativePath, 'quality:', videoQuality);
          
          // Generate signed URL from the RELATIVE file path
          const { data: signedUrlData, error: urlError } = await getSignedUrl(
            bucket as any,
            relativePath,
            7200 // 2 hours expiry for videos
          );

          if (!urlError && signedUrlData?.signedUrl) {
            console.log('✅ Video signed URL generated successfully');
            const result: VideoRecordWithUrl = {
              ...data,
              video_url: signedUrlData.signedUrl
            };
            return result;
          } else {
            console.error('❌ Failed to generate video signed URL:', urlError?.message);
            const result: VideoRecordWithUrl = {
              ...data,
              video_url: null,
              url_error: urlError?.message || 'Failed to generate video URL'
            };
            return result;
          }
        } catch (urlError) {
          console.error('❌ Error processing video signed URL:', urlError);
          const result: VideoRecordWithUrl = {
            ...data,
            video_url: null,
            url_error: urlError instanceof Error ? urlError.message : 'Unknown video URL processing error'
          };
          return result;
        }
      }

      // For non-completed videos, return as-is
      console.log('ℹ️ Video not completed yet, returning raw data');
      return data as VideoRecordWithUrl;
    }
  }

  static getEstimatedCredits(format: GenerationFormat, quality: GenerationQuality): number {
    const config = GENERATION_CONFIGS[`${format}_${quality}`];
    return config?.credits || 1;
  }
}
