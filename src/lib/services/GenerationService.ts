
import { supabase } from '@/integrations/supabase/client';
import { GenerationRequest, GenerationFormat, GENERATION_CONFIGS } from '@/types/generation';
import { videoAPI, imageAPI, usageAPI } from '@/lib/database';

export class GenerationService {
  static async queueGeneration(request: GenerationRequest): Promise<string> {
    console.log('🎬 GenerationService.queueGeneration called with:', request);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to generate content');
    }

    const config = GENERATION_CONFIGS[request.format];
    if (!config) {
      throw new Error(`Unknown generation format: ${request.format}`);
    }

    try {
      // Create record in appropriate table
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
        console.log('✅ Video record created:', videoId);
      } else {
        console.log('🖼️ Creating image record...');
        const image = await imageAPI.create({
          user_id: user.id,
          project_id: request.projectId,
          prompt: request.prompt,
          generation_mode: 'standalone',
          status: 'queued',
          format: 'png',
          quality: config.format.includes('high') ? 'high' : 'fast'
        });
        imageId = image.id;
        console.log('✅ Image record created:', imageId);
      }

      // Queue the job with proper routing
      console.log('📤 Queueing job via edge function...');
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: request.format,
          metadata: {
            ...request.metadata,
            credits: config.credits,
            model_variant: config.isSDXL ? 'lustify_sdxl' : 'wan_2_1_1_3b',
            prompt: request.prompt,
            queue: config.queue,
            bucket: config.bucket
          },
          projectId: request.projectId,
          videoId,
          imageId
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(`Failed to queue generation: ${error.message}`);
      }

      if (!data?.success) {
        console.error('❌ Edge function returned failure:', data);
        throw new Error(data?.error || 'Failed to queue generation');
      }

      console.log('✅ Job queued successfully:', data);
      
      // Log usage
      await usageAPI.logAction(request.format, config.credits, {
        format: config.isVideo ? 'video' : 'image',
        quality: config.format.includes('high') ? 'high' : 'fast',
        model_type: config.isSDXL ? 'sdxl' : 'wan',
        job_id: data.job?.id
      });

      return data.job?.id || 'unknown';
    } catch (error) {
      console.error('❌ GenerationService.queueGeneration failed:', error);
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
