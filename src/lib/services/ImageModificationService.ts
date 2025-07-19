
import { supabase } from '@/integrations/supabase/client';
import { GenerationRequest } from '@/types/generation';
import { MediaTile } from '@/types/workspace';
import { GenerationService } from './GenerationService';

export interface ModificationSettings {
  positivePrompt: string;
  negativePrompt?: string;
  referenceStrength: number;
  keepSeed: boolean;
  seed?: number;
}

export class ImageModificationService {
  static async modifyImage(
    originalTile: MediaTile,
    settings: ModificationSettings
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Get or create a valid project ID
    const projectId = await this.getValidProjectId(user.id);
    
    // Prepare reference image using original asset ID for better reliability
    const referenceUrl = await this.prepareReferenceImage(originalTile);
    
    const format = originalTile.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
    
    const generationRequest: GenerationRequest = {
      format,
      prompt: settings.positivePrompt.trim(),
      referenceImageUrl: referenceUrl,
      projectId,
      metadata: {
        reference_image: true,
        reference_strength: settings.referenceStrength,
        reference_type: 'composition',
        negative_prompt: settings.negativePrompt?.trim() || undefined,
        ...(settings.keepSeed && settings.seed && { seed: settings.seed }),
        credits: originalTile.quality === 'high' ? 2 : 1,
        num_images: 1,
        modification_source: 'workspace',
        original_image_id: originalTile.id,
        original_prompt: originalTile.prompt,
        is_modification: true
      }
    };

    console.log('🎨 Starting image modification:', {
      originalImageId: originalTile.id,
      projectId,
      referenceStrength: settings.referenceStrength,
      keepSeed: settings.keepSeed,
      seed: settings.seed
    });

    return GenerationService.queueGeneration(generationRequest);
  }

  private static async getValidProjectId(userId: string): Promise<string> {
    // Try to find an existing project
    const { data: existingProjects, error: fetchError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching projects:', fetchError);
    }

    if (existingProjects && existingProjects.length > 0) {
      return existingProjects[0].id;
    }

    // Create a new default project if none exist
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title: 'Image Modifications',
        original_prompt: 'Auto-created for image modifications',
        media_type: 'image'
      })
      .select('id')
      .single();

    if (createError) {
      throw new Error('Failed to create project for modification');
    }

    return newProject.id;
  }

  private static async prepareReferenceImage(tile: MediaTile): Promise<string> {
    // Use direct URL if available and valid
    if (tile.url && !tile.url.includes('supabase.co/storage')) {
      return tile.url;
    }

    // For Supabase storage URLs, generate a fresh signed URL
    if (tile.originalAssetId) {
      try {
        const bucket = tile.quality === 'high' ? 'sdxl_image_high' : 'sdxl_image_fast';
        const filePath = `${tile.originalAssetId}.png`;
        
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (error) {
        console.warn('Failed to create signed URL, using original:', error);
      }
    }

    // Fallback to original URL
    return tile.url || '';
  }

  static getOptimalStrength(modificationType: 'subtle' | 'moderate' | 'strong'): number {
    switch (modificationType) {
      case 'subtle': return 0.3;
      case 'moderate': return 0.6;
      case 'strong': return 0.8;
      default: return 0.6;
    }
  }

  static getPresetPromptModifications() {
    return {
      lighting: {
        name: 'Better Lighting',
        prompt: ', dramatic lighting, professional photography lighting, cinematic lighting'
      },
      style: {
        name: 'Artistic Style',
        prompt: ', artistic, stylized, enhanced colors, beautiful composition'
      },
      quality: {
        name: 'Higher Quality',
        prompt: ', high quality, detailed, sharp focus, professional'
      },
      mood: {
        name: 'Mood Enhancement',
        prompt: ', atmospheric, moody, enhanced ambiance'
      }
    };
  }
}
