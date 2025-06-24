
import { supabase } from '@/integrations/supabase/client';
import { imageAPI, videoAPI, usageAPI } from '@/lib/database';
import type { GenerationRequest, GenerationFormat, GenerationQuality, FunctionalGenerationOptions, MediaType, Quality } from '@/types/generation';
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

      console.log('Starting generation with Wan 2.1 config:', { 
        format: request.format, 
        quality: request.quality, 
        modelType,
        modelVariant: config.modelVariant,
        credits: config.credits 
      });

      // Create the appropriate record based on format
      let recordId: string;
      let jobMetadata: Record<string, any> = {
        ...request.metadata,
        format: request.format,
        quality: request.quality,
        model_type: modelType,
        model_variant: config.modelVariant,
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
          resolution: config.resolution === '1280x720' ? '1280x720' : '832x480',
          format: 'mp4'
        });
        recordId = video.id;
        jobMetadata.video_id = video.id;
      }

      // Map functional request to worker job type
      let workerJobType: string;
      if (request.format === 'image') {
        workerJobType = 'preview'; // Worker generates single frame
      } else {
        workerJobType = 'video'; // Worker generates full video
      }

      // Queue the job with Wan 2.1 parameters
      const { data: jobData, error: jobError } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: workerJobType,
          metadata: {
            prompt: request.prompt,
            format: request.format,
            quality: request.quality,
            model_type: modelType,
            model_variant: config.modelVariant,
            requested_media_type: request.format,
            requested_quality: request.quality,
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

      // Log usage with Wan 2.1 model tracking
      await usageAPI.logAction(
        `generate_${modelType}`,
        config.credits,
        {
          format: request.format,
          quality: request.quality,
          model_type: modelType,
          model_variant: config.modelVariant,
          prompt: request.prompt,
          record_id: recordId
        }
      );

      console.log('Wan 2.1 generation queued successfully:', {
        recordId,
        jobId: jobData.job?.id,
        modelType,
        modelVariant: config.modelVariant,
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

  // Functional API Methods for Wan 2.1
  static async generateQuickImage(prompt: string, characterId?: string): Promise<{ success: boolean; id: string; jobId?: string }> {
    return this.generateContent({
      mediaType: 'image',
      quality: 'low',
      prompt,
      characterId
    });
  }

  static async generateDetailedImage(prompt: string, characterId?: string): Promise<{ success: boolean; id: string; jobId?: string }> {
    return this.generateContent({
      mediaType: 'image',
      quality: 'high',
      prompt,
      characterId
    });
  }

  static async generateStandardVideo(prompt: string, characterId?: string): Promise<{ success: boolean; id: string; jobId?: string }> {
    return this.generateContent({
      mediaType: 'video',
      quality: 'low',
      prompt,
      characterId
    });
  }

  static async generatePremiumVideo(prompt: string, characterId?: string): Promise<{ success: boolean; id: string; jobId?: string }> {
    return this.generateContent({
      mediaType: 'video',
      quality: 'high',
      prompt,
      characterId
    });
  }

  private static async generateContent(options: FunctionalGenerationOptions): Promise<{ success: boolean; id: string; jobId?: string }> {
    const { mediaType, quality, prompt, characterId } = options;

    // Map functional API to existing types
    const format: GenerationFormat = mediaType;
    const generationQuality: GenerationQuality = quality === 'low' ? 'fast' : 'high';

    return this.generate({
      format,
      quality: generationQuality,
      prompt,
      metadata: {
        source: 'functional_api',
        character_id: characterId,
        requested_media_type: mediaType,
        requested_quality: quality
      }
    });
  }

  static getGenerationEstimate(mediaType: MediaType, quality: Quality) {
    const format: GenerationFormat = mediaType;
    const generationQuality: GenerationQuality = quality === 'low' ? 'fast' : 'high';
    return getGenerationConfig(format, generationQuality);
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

  static getAvailableOptions() {
    return {
      image: [
        {
          quality: 'low' as Quality,
          name: 'Quick Image',
          description: 'Fast image generation (1 frame from Wan 2.1 1.3B)',
          timeEstimate: '2-3 seconds',
          resolution: '832x480',
          cost: 0.5,
          useCases: ['Preview', 'Concept check', 'Storyboard', 'Quick iteration']
        },
        {
          quality: 'high' as Quality,
          name: 'Detailed Image',
          description: 'High quality image (1 frame from Wan 2.1 14B)',
          timeEstimate: '3-4 seconds',
          resolution: '1280x720',
          cost: 1,
          useCases: ['Character reference', 'Final image', 'High detail work']
        }
      ],
      video: [
        {
          quality: 'low' as Quality,
          name: 'Standard Video',
          description: '5-second video (Wan 2.1 1.3B)',
          timeEstimate: '4-6 minutes',
          resolution: '832x480',
          cost: 3,
          useCases: ['Quick content', 'Draft video', 'Standard quality']
        },
        {
          quality: 'high' as Quality,
          name: 'Premium Video',
          description: '5-second HD video (Wan 2.1 14B)',
          timeEstimate: '6-8 minutes',
          resolution: '1280x720',
          cost: 5,
          useCases: ['Final production', 'High quality', 'Professional content']
        }
      ]
    };
  }
}
