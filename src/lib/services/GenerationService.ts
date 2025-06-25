
import { supabase } from '@/integrations/supabase/client';
import { usageAPI } from '@/lib/database';
import { getSignedUrl } from '@/lib/storage';
import type { GenerationRequest, GenerationFormat, GenerationQuality } from '@/types/generation';
import { GENERATION_CONFIGS } from '@/types/generation';
import type { Tables } from '@/integrations/supabase/types';

type ImageRecord = Tables<'images'>;
type VideoRecord = Tables<'videos'>;

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

  static async getGenerationStatus(id: string, format: GenerationFormat) {
    console.log('Checking generation status for:', { id, format });
    
    if (format === 'image') {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Status check error:', error);
        throw error;
      }

      console.log('Generation status:', data);

      // Handle file path to signed URL conversion for completed images
      if (data.status === 'completed' && data.image_url) {
        try {
          // Determine the bucket based on quality
          const bucket = data.quality === 'high' ? 'image_high' : 'image_fast';
          
          // Generate signed URL from the file path
          const { data: signedUrlData, error: urlError } = await getSignedUrl(
            bucket as any,
            data.image_url,
            3600 // 1 hour expiry
          );

          if (urlError) {
            console.error('Error generating signed URL:', urlError);
            // Return the data as-is if URL generation fails
            return data;
          }

          // Return with image_urls array for consistency
          return {
            ...data,
            image_urls: [signedUrlData?.signedUrl]
          };
        } catch (urlError) {
          console.error('Error processing signed URL:', urlError);
          // Return the data as-is if URL processing fails
          return data;
        }
      }

      return data;
    } else {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Status check error:', error);
        throw error;
      }

      console.log('Generation status:', data);

      // Handle file path to signed URL conversion for completed videos
      if (data.status === 'completed' && data.video_url) {
        try {
          // Determine the bucket based on quality (assuming videos have quality field)
          const bucket = 'video_fast'; // Default to fast, adjust based on your video quality logic
          
          // Generate signed URL from the file path
          const { data: signedUrlData, error: urlError } = await getSignedUrl(
            bucket as any,
            data.video_url,
            7200 // 2 hours expiry for videos
          );

          if (urlError) {
            console.error('Error generating video signed URL:', urlError);
            return data;
          }

          // Return with the signed URL
          return {
            ...data,
            video_url: signedUrlData?.signedUrl
          };
        } catch (urlError) {
          console.error('Error processing video signed URL:', urlError);
          return data;
        }
      }

      return data;
    }
  }

  static getEstimatedCredits(format: GenerationFormat, quality: GenerationQuality): number {
    const config = GENERATION_CONFIGS[`${format}_${quality}`];
    return config?.credits || 1;
  }
}
