
import { supabase } from '@/integrations/supabase/client';

export interface GenerationContext {
  mode: 'standalone' | 'preview' | 'character' | 'admin';
  projectId?: string;
  characterId?: string;
  requiresApproval?: boolean;
}

export interface ImageGenerationParams {
  prompt: string;
  enhancedPrompt?: string;
  context: GenerationContext;
  title?: string;
  metadata?: any;
}

export class ImageGenerationService {
  static async generateImage(params: ImageGenerationParams) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // For admin mode, skip database creation and go directly to generation
      if (params.context.mode === 'admin') {
        return this.generateAdminImage(params);
      }

      // Create image record first
      const { data: image, error: imageError } = await supabase
        .from('images')
        .insert({
          user_id: user.id,
          project_id: params.context.projectId,
          title: params.title,
          prompt: params.prompt,
          enhanced_prompt: params.enhancedPrompt,
          generation_mode: params.context.mode,
          status: 'pending',
          metadata: params.metadata
        })
        .select()
        .single();

      if (imageError) throw imageError;

      // Queue image generation job
      const { data: jobData, error: jobError } = await supabase.functions.invoke('queue-job', {
        body: {
          jobType: 'image',
          imageId: image.id,
          projectId: params.context.projectId,
          metadata: {
            prompt: params.enhancedPrompt || params.prompt,
            mode: params.context.mode,
            characterId: params.context.characterId
          }
        }
      });

      if (jobError) throw jobError;

      return { image, job: jobData.job };
    } catch (error) {
      console.error('Image generation error:', error);
      throw error;
    }
  }

  static async generateAdminImage(params: ImageGenerationParams) {
    try {
      // For admin testing, call image generation directly without database storage
      const { data, error } = await supabase.functions.invoke('generate-admin-image', {
        body: {
          prompt: params.enhancedPrompt || params.prompt,
          mode: params.context.mode,
          metadata: params.metadata
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Admin image generation error:', error);
      throw error;
    }
  }

  static async getImageStatus(imageId: string) {
    try {
      const { data: image, error } = await supabase
        .from('images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (error) throw error;
      return image;
    } catch (error) {
      console.error('Error checking image status:', error);
      throw error;
    }
  }

  static async getUserImages(mode?: string) {
    try {
      let query = supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });

      if (mode) {
        query = query.eq('generation_mode', mode);
      }

      const { data: images, error } = await query;
      if (error) throw error;
      return images;
    } catch (error) {
      console.error('Error fetching user images:', error);
      throw error;
    }
  }
}
