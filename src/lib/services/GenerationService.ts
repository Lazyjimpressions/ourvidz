
import { supabase } from '@/integrations/supabase/client';
import { imageAPI, videoAPI, usageAPI } from '@/lib/database';
import type { GenerationRequest, GenerationFormat, GenerationQuality } from '@/types/generation';
import { getModelType, getGenerationConfig } from '@/types/generation';

export class GenerationService {
  static async generate(request: GenerationRequest): Promise<{ success: boolean; id: string; jobId?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const config = getGenerationConfig(request.format, request.quality);
      const modelType = getModelType(request.format, request.quality);

      console.log('Starting generation with config:', { 
        format: request.format, 
        quality: request.quality, 
        modelType,
        credits: config.credits 
      });

      // Create the appropriate record based on format
      let recordId: string;
      let jobMetadata = {
        ...request.metadata,
        format: request.format,
        quality: request.quality,
        model_type: modelType,
        credits: config.credits
      };

      if (request.format === 'image') {
        const image = await imageAPI.create({
          user_id: user.id,
          prompt: request.prompt,
          project_id: request.projectId,
          generation_mode: 'functional',
          status: 'pending',
          metadata: jobMetadata
        });
        recordId = image.id;
        jobMetadata.image_id = image.id;
      } else {
        // For video, we need a project first
        if (!request.projectId) {
          throw new Error('Project ID is required for video generation');
        }

        const video = await videoAPI.create({
          user_id: user.id,
          project_id: request.projectId,
          status: 'pending',
          duration: 5,
          resolution: config.resolution === '1080p' ? '1080p' : '720p',
          format: 'mp4'
        });
        recordId = video.id;
        jobMetadata.video_id = video.id;
      }

      // Queue the job with the new functional parameters
      const { data: jobData, error: jobError } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: modelType,
          metadata: {
            prompt: request.prompt,
            format: request.format,
            quality: request.quality,
            model_type: modelType,
            ...jobMetadata
          },
          projectId: request.projectId,
          videoId: request.format === 'video' ? recordId : undefined,
          imageId: request.format === 'image' ? recordId : undefined
        }
      });

      if (jobError) {
        console.error('Failed to queue job:', jobError);
        throw new Error(`Failed to queue generation job: ${jobError.message}`);
      }

      // Log usage with new format/quality tracking
      await usageAPI.logAction(
        `generate_${modelType}`,
        config.credits,
        {
          format: request.format,
          quality: request.quality,
          model_type: modelType,
          prompt: request.prompt,
          record_id: recordId
        }
      );

      console.log('Generation queued successfully:', {
        recordId,
        jobId: jobData.job?.id,
        modelType,
        credits: config.credits
      });

      return {
        success: true,
        id: recordId,
        jobId: jobData.job?.id
      };

    } catch (error) {
      console.error('Generation failed:', error);
      throw error;
    }
  }

  static async getGenerationStatus(id: string, format: GenerationFormat): Promise<any> {
    try {
      if (format === 'image') {
        const { data, error } = await supabase
          .from('images')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Failed to get generation status:', error);
      throw error;
    }
  }

  static getEstimatedCredits(format: GenerationFormat, quality: GenerationQuality): number {
    const config = getGenerationConfig(format, quality);
    return config.credits;
  }
}
