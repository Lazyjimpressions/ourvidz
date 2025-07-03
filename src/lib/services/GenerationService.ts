import { supabase } from '@/integrations/supabase/client';
import { GenerationRequest, GenerationFormat, GENERATION_CONFIGS } from '@/types/generation';
import { videoAPI, imageAPI, usageAPI } from '@/lib/database';

export class GenerationService {
  static async queueGeneration(request: GenerationRequest): Promise<string> {
    console.log('🎬 GenerationService.queueGeneration called with enhanced SDXL tracking:', {
      request,
      timestamp: new Date().toISOString()
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to generate content');
    }

    const config = GENERATION_CONFIGS[request.format];
    if (!config) {
      throw new Error(`Unknown generation format: ${request.format}`);
    }

    console.log('🔧 Enhanced generation config with model tracking:', {
      format: request.format,
      isSDXL: config.isSDXL,
      isVideo: config.isVideo,
      queue: config.queue,
      bucket: config.bucket,
      estimatedTime: config.estimatedTime
    });

    try {
      // Create record in appropriate table with enhanced model tracking
      let videoId: string | undefined;
      let imageId: string | undefined;

      if (config.isVideo) {
        console.log('📹 Creating video record...');
        const video = await videoAPI.create({
          user_id: user.id,
          project_id: request.projectId,
          status: 'queued',
          format: 'mp4',
          resolution: config.format.includes('high') ? '1280x720' : '832x480'
        });
        videoId = video.id;
        console.log('✅ Video record created:', { videoId, resolution: video.resolution });
      } else {
        console.log('🖼️ Creating image record with SDXL model tracking...');
        const image = await imageAPI.create({
          user_id: user.id,
          project_id: request.projectId,
          prompt: request.prompt,
          generation_mode: 'standalone',
          status: 'queued',
          format: 'png',
          quality: config.format.includes('high') ? 'high' : 'fast',
          metadata: {
            model_type: config.isSDXL ? 'sdxl' : 'wan',
            is_sdxl: config.isSDXL,
            bucket: config.bucket,
            job_format: request.format,
            generation_timestamp: new Date().toISOString()
          }
        });
        imageId = image.id;
        console.log('✅ Image record created with enhanced SDXL tracking:', {
          imageId,
          quality: image.quality,
          isSDXL: config.isSDXL,
          modelType: config.isSDXL ? 'sdxl' : 'wan',
          bucket: config.bucket
        });
      }

      // Queue the job with enhanced metadata
      console.log('📤 Queueing job with enhanced SDXL model tracking...');
      const jobBody = {
        jobType: request.format,
        metadata: {
          ...request.metadata,
          credits: config.credits * (request.batchCount || 1),
          model_variant: config.isSDXL ? 'lustify_sdxl' : 'wan_2_1_1_3b',
          model_type: config.isSDXL ? 'sdxl' : 'wan',
          is_sdxl: config.isSDXL,
          prompt: request.prompt,
          queue: config.queue,
          bucket: config.bucket,
          enhanced_tracking: true,
          generation_format: request.format,
          client_timestamp: new Date().toISOString(),
          batch_count: request.batchCount || 1,
          reference_image_url: request.referenceImageUrl
        },
        projectId: request.projectId,
        videoId,
        imageId
      };

      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: jobBody
      });

      if (error) {
        console.error('❌ Edge function error:', { error, request });
        throw new Error(`Failed to queue generation: ${error.message}`);
      }

      if (!data?.success) {
        console.error('❌ Edge function returned failure:', { data, request });
        throw new Error(data?.error || 'Failed to queue generation');
      }

      console.log('✅ Job queued successfully with enhanced SDXL tracking:', {
        jobId: data.job?.id,
        queueLength: data.queueLength,
        modelVariant: data.modelVariant,
        isSDXL: data.isSDXL,
        queue: data.queue,
        bucket: config.bucket
      });
      
      // Log usage with enhanced metadata
      await usageAPI.logAction(request.format, config.credits, {
        format: config.isVideo ? 'video' : 'image',
        quality: config.format.includes('high') ? 'high' : 'fast',
        model_type: config.isSDXL ? 'sdxl' : 'wan',
        is_sdxl: config.isSDXL,
        bucket: config.bucket,
        job_id: data.job?.id,
        enhanced_tracking: true,
        generation_timestamp: new Date().toISOString()
      });

      return data.job?.id || 'unknown';
    } catch (error) {
      console.error('❌ GenerationService.queueGeneration failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  static async getGenerationStatus(jobId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      throw new Error(`Failed to get job status: ${error.message}`);
    }

    return data;
  }

  static async cancelGeneration(jobId: string) {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to cancel generation: ${error.message}`);
    }
  }
}
