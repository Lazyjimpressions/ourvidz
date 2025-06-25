
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

export class GenerationService {
  static async generate(request: GenerationRequest) {
    console.log('GenerationService.generate called with:', request);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to generate content');
    }

    // Get generation config for credits and metadata
    const config = GENERATION_CONFIGS[`${request.format}_${request.quality}`];
    if (!config) {
      throw new Error('Invalid format/quality combination');
    }

    // Create a record in the appropriate table based on format
    let recordId: string;
    
    if (request.format === 'image') {
      const { data: image, error: imageError } = await supabase
        .from('images')
        .insert({
          user_id: user.id,
          project_id: request.projectId,
          prompt: request.prompt,
          status: 'queued',
          generation_mode: 'functional',
          format: 'png',
          quality: request.quality
        })
        .select()
        .single();

      if (imageError) throw imageError;
      recordId = image.id;
    } else {
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          project_id: request.projectId,
          status: 'queued',
          duration: 5,
          format: 'mp4'
        })
        .select()
        .single();

      if (videoError) throw videoError;
      recordId = video.id;
    }

    // Use the clean job type format
    const jobType = `${request.format}_${request.quality}`;

    // Queue the job using the existing queue-job function
    const { data, error } = await supabase.functions.invoke('queue-job', {
      body: {
        jobType,
        [request.format === 'image' ? 'imageId' : 'videoId']: recordId,
        projectId: request.projectId,
        metadata: {
          ...request.metadata,
          prompt: request.prompt,
          format: request.format,
          quality: request.quality,
          model_type: jobType,
          model_variant: config.modelVariant,
          credits: config.credits,
          generate_variations: true,
          variation_count: 6
        }
      }
    });

    if (error) {
      console.error('Job queue error:', error);
      throw new Error(`Failed to queue generation job: ${error.message}`);
    }

    // Log usage
    await usageAPI.logAction(
      jobType,
      config.credits,
      {
        format: request.format,
        quality: request.quality,
        model_type: jobType,
        [request.format === 'image' ? 'image_id' : 'video_id']: recordId,
        project_id: request.projectId
      }
    );

    console.log('Generation job queued successfully:', data);
    return {
      id: recordId,
      jobId: data.job?.id,
      format: request.format,
      quality: request.quality,
      estimatedTime: config.estimatedTime
    };
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

      // Handle completed images with bulletproof URL conversion
      if (data.status === 'completed' && data.image_url) {
        try {
          console.log('🎯 Processing completed image with filePath:', data.image_url);
          
          // Determine the correct bucket based on quality
          const bucket = data.quality === 'high' ? 'image_high' : 'image_fast';
          console.log('🪣 Using bucket:', bucket);
          
          // Generate signed URL from the file path with retry logic
          const maxRetries = 3;
          let signedUrl = null;
          let lastError = null;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Attempt ${attempt}/${maxRetries} to generate signed URL`);
            
            const { data: signedUrlData, error: urlError } = await getSignedUrl(
              bucket as any,
              data.image_url,
              3600 // 1 hour expiry
            );

            if (!urlError && signedUrlData?.signedUrl) {
              signedUrl = signedUrlData.signedUrl;
              console.log('✅ Signed URL generated successfully on attempt', attempt);
              break;
            } else {
              lastError = urlError;
              console.error(`❌ Attempt ${attempt} failed:`, urlError?.message);
              
              // Wait before retry (exponential backoff)
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
              }
            }
          }

          if (signedUrl) {
            // Return with image_urls array for consistency
            const result: ImageRecordWithUrl = {
              ...data,
              image_urls: [signedUrl]
            };
            console.log('✅ Successfully processed image with signed URL');
            return result;
          } else {
            console.error('❌ Failed to generate signed URL after all retries:', lastError?.message);
            
            // Return with placeholder or error indication
            const result: ImageRecordWithUrl = {
              ...data,
              image_urls: null,
              url_error: lastError?.message || 'Failed to generate image URL'
            };
            return result;
          }
        } catch (urlError) {
          console.error('❌ Error processing signed URL:', urlError);
          
          // Return with error indication but don't fail completely
          const result: ImageRecordWithUrl = {
            ...data,
            image_urls: null,
            url_error: urlError instanceof Error ? urlError.message : 'Unknown URL processing error'
          };
          return result;
        }
      }

      // For non-completed images, return as-is with proper typing
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

      // Handle completed videos with bulletproof URL conversion
      if (data.status === 'completed' && data.video_url) {
        try {
          console.log('🎯 Processing completed video with filePath:', data.video_url);
          
          // Determine the bucket (assuming videos have quality field or default to fast)
          const bucket = 'video_fast'; // Default to fast, adjust based on your video quality logic
          console.log('🪣 Using video bucket:', bucket);
          
          // Generate signed URL from the file path with retry logic
          const maxRetries = 3;
          let signedUrl = null;
          let lastError = null;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Video attempt ${attempt}/${maxRetries} to generate signed URL`);
            
            const { data: signedUrlData, error: urlError } = await getSignedUrl(
              bucket as any,
              data.video_url,
              7200 // 2 hours expiry for videos
            );

            if (!urlError && signedUrlData?.signedUrl) {
              signedUrl = signedUrlData.signedUrl;
              console.log('✅ Video signed URL generated successfully on attempt', attempt);
              break;
            } else {
              lastError = urlError;
              console.error(`❌ Video attempt ${attempt} failed:`, urlError?.message);
              
              // Wait before retry
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
              }
            }
          }

          if (signedUrl) {
            // Return with the signed URL
            const result: VideoRecordWithUrl = {
              ...data,
              video_url: signedUrl
            };
            console.log('✅ Successfully processed video with signed URL');
            return result;
          } else {
            console.error('❌ Failed to generate video signed URL after all retries:', lastError?.message);
            
            // Return with error indication
            const result: VideoRecordWithUrl = {
              ...data,
              video_url: null,
              url_error: lastError?.message || 'Failed to generate video URL'
            };
            return result;
          }
        } catch (urlError) {
          console.error('❌ Error processing video signed URL:', urlError);
          
          // Return with error indication but don't fail completely
          const result: VideoRecordWithUrl = {
            ...data,
            video_url: null,
            url_error: urlError instanceof Error ? urlError.message : 'Unknown video URL processing error'
          };
          return result;
        }
      }

      // For non-completed videos, return as-is with proper typing
      console.log('ℹ️ Video not completed yet, returning raw data');
      return data as VideoRecordWithUrl;
    }
  }

  static getEstimatedCredits(format: GenerationFormat, quality: GenerationQuality): number {
    const config = GENERATION_CONFIGS[`${format}_${quality}`];
    return config?.credits || 1;
  }
}
