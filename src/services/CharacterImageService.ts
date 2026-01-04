import { supabase } from '@/integrations/supabase/client';
import { buildCharacterPortraitPrompt } from '@/utils/characterPromptBuilder';

export interface CharacterImageGenerationParams {
  characterId: string;
  characterName: string;
  description: string;
  appearanceTags?: string[];
  traits?: string;
  persona?: string;
  consistencyMethod?: string;
  gender?: string;
  referenceImageUrl?: string;
  seedLocked?: number;
  apiModelId?: string; // Optional: Use specific image model from settings
}

export class CharacterImageService {
  /**
   * Generate a character portrait image using the optimized prompt builder
   * Routes to fal-image (cloud) for reliable generation
   */
  static async generateCharacterPortrait(params: CharacterImageGenerationParams) {
    try {
      // Use the optimized character prompt builder
      const characterPrompt = buildCharacterPortraitPrompt({
        name: params.characterName,
        description: params.description,
        appearance_tags: params.appearanceTags || [],
        traits: params.traits,
        persona: params.persona,
        gender: params.gender
      });

      // Use fal-image edge function for cloud model generation
      // This is more reliable than queue-job which requires local SDXL worker
      const { data: jobData, error: jobError } = await supabase.functions.invoke('fal-image', {
        body: {
          prompt: characterPrompt,
          apiModelId: params.apiModelId, // Use selected model or fal-image will use default
          quality: 'high',
          input: {
            // Reference image for I2I if provided
            image_url: params.referenceImageUrl,
            seed: params.seedLocked,
            // Strength for I2I (lower = more like original)
            strength: params.referenceImageUrl ? 0.65 : undefined
          },
          metadata: {
            destination: 'character_portrait',
            character_id: params.characterId,
            character_name: params.characterName,
            consistency_method: params.consistencyMethod || 'i2i_reference',
            reference_strength: params.referenceImageUrl ? 0.35 : undefined,
            reference_image_url: params.referenceImageUrl,
            base_prompt: characterPrompt,
            seed_locked: params.seedLocked || false,
            contentType: 'sfw' // Character portraits are SFW by default
          }
        }
      });

      if (jobError) {
        throw jobError;
      }

      return {
        success: true,
        jobId: jobData?.jobId,
        message: `Image generation started for ${params.characterName}`
      };

    } catch (error) {
      console.error('Error generating character image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update character record with generated image URL
   */
  static async updateCharacterImage(characterId: string, imageUrl: string, seed?: number) {
    try {
      const updateData: any = {
        image_url: imageUrl,
        reference_image_url: imageUrl, // Use same image as reference for consistency
        updated_at: new Date().toISOString()
      };

      // If we have a seed, lock it for consistency
      if (seed !== undefined) {
        updateData.seed_locked = seed;
      }

      const { error } = await supabase
        .from('characters')
        .update(updateData)
        .eq('id', characterId);

      if (error) {
        throw error;
      }

      return { success: true };
      
    } catch (error) {
      console.error('Error updating character image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a character scene image
   */
  static async generateCharacterScene(
    characterId: string, 
    scenePrompt: string, 
    conversationId?: string
  ) {
    try {
      // Get character data for consistency
      const { data: character, error: charError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (charError || !character) {
        throw new Error('Character not found');
      }

      // Build scene prompt with character context
      const characterContext = `${character.name}, ${character.description}`;
      const fullScenePrompt = `${characterContext}. ${scenePrompt}. High quality, detailed, consistent character appearance`;

      // Create character scene record
      const { data: scene, error: sceneError } = await supabase
        .from('character_scenes')
        .insert({
          character_id: characterId,
          conversation_id: conversationId,
          scene_prompt: fullScenePrompt,
          generation_metadata: {
            model_used: 'sdxl',
            consistency_method: character.consistency_method || 'i2i_reference',
            reference_strength: 0.35,
            base_prompt: fullScenePrompt
          }
        })
        .select()
        .single();

      if (sceneError) {
        throw sceneError;
      }

      // Queue generation job with character consistency using fal-image (cloud)
      const { data: jobData, error: jobError } = await supabase.functions.invoke('fal-image', {
        body: {
          prompt: fullScenePrompt,
          quality: 'high',
          input: {
            image_url: character.reference_image_url,
            seed: character.seed_locked,
            strength: 0.55 // Balance between scene changes and character consistency
          },
          metadata: {
            destination: 'character_scene',
            character_id: characterId,
            scene_id: scene.id,
            conversation_id: conversationId,
            consistency_method: character.consistency_method || 'i2i_reference',
            reference_strength: 0.45,
            reference_image_url: character.reference_image_url,
            seed_locked: true,
            character_name: character.name,
            base_prompt: fullScenePrompt,
            update_scene_image: true,
            contentType: 'sfw'
          }
        }
      });

      if (jobError) {
        throw jobError;
      }

      // Update scene with job ID
      await supabase
        .from('character_scenes')
        .update({ job_id: jobData?.jobId })
        .eq('id', scene.id);

      return {
        success: true,
        sceneId: scene.id,
        jobId: jobData?.jobId,
        message: 'Scene generation started'
      };
      
    } catch (error) {
      console.error('Error generating character scene:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update character scene with generated image URL
   */
  static async updateCharacterScene(sceneId: string, imageUrl: string) {
    try {
      const { error } = await supabase
        .from('character_scenes')
        .update({
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', sceneId);

      if (error) {
        throw error;
      }

      return { success: true };
      
    } catch (error) {
      console.error('Error updating character scene:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
