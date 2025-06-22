
import { supabase } from '@/integrations/supabase/client';
import { ImageGenerationService, GenerationContext } from './ImageGenerationService';

export interface VideoGenerationParams {
  projectId: string;
  duration: number;
  resolution: string;
  format: string;
  previewImageId?: string;
}

export class VideoGenerationService {
  static async generatePreviewImage(projectId: string, prompt: string, enhancedPrompt?: string) {
    try {
      const context: GenerationContext = {
        mode: 'preview',
        projectId,
        requiresApproval: true
      };

      return await ImageGenerationService.generateImage({
        prompt,
        enhancedPrompt,
        context,
        title: 'Video Preview',
        metadata: { isPreview: true }
      });
    } catch (error) {
      console.error('Preview image generation error:', error);
      throw error;
    }
  }

  static async generateVideo(params: VideoGenerationParams) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Get project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('enhanced_prompt, original_prompt, character_id')
        .eq('id', params.projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      // Create video record
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert({
          project_id: params.projectId,
          user_id: user.id,
          duration: params.duration,
          resolution: params.resolution,
          format: params.format,
          status: 'draft',
          reference_image_url: params.previewImageId
        })
        .select()
        .single();

      if (videoError) throw videoError;

      // Queue video generation job
      const { data, error } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: 'video',
          videoId: video.id,
          projectId: params.projectId,
          metadata: {
            prompt: project.enhanced_prompt || project.original_prompt,
            characterId: project.character_id,
            duration: params.duration,
            resolution: params.resolution,
            format: params.format,
            previewImageId: params.previewImageId
          }
        }
      });

      if (error) throw error;

      return { video, job: data.job };
    } catch (error) {
      console.error('Video generation error:', error);
      throw error;
    }
  }

  static async checkVideoStatus(videoId: string) {
    try {
      const { data: video, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (error) throw error;
      return video;
    } catch (error) {
      console.error('Error checking video status:', error);
      throw error;
    }
  }
}
