import { supabase } from '@/integrations/supabase/client';

export interface CharacterImageGenerationParams {
  characterId: string;
  characterName: string;
  description: string;
  appearanceTags?: string[];
  traits?: string;
  persona?: string;
  consistencyMethod?: string;
}

export class CharacterImageService {
  /**
   * Generate a character portrait image using the image model
   */
  static async generateCharacterPortrait(params: CharacterImageGenerationParams) {
    try {
      // Build character prompt from metadata
      const appearanceTags = params.appearanceTags?.join(', ') || '';
      const traits = params.traits || '';
      const persona = params.persona || '';
      
      const characterPrompt = `${params.characterName}, ${params.description}. ${appearanceTags}. ${traits}. ${persona}. Professional character portrait, high quality, detailed, consistent appearance, studio lighting`;
      
      // Generate image using our image model
      const { data: jobData, error: jobError } = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: characterPrompt,
          job_type: 'sdxl_image_fast',
          metadata: {
            destination: 'character_portrait',
            character_id: params.characterId,
            character_name: params.characterName,
            consistency_method: params.consistencyMethod || 'i2i_reference',
            reference_strength: 0.35,
            base_prompt: characterPrompt,
            seed_locked: null, // Will be set after first generation
            update_character_image: true // Flag to update character record
          }
        }
      });

      if (jobError) {
        throw jobError;
      }

      return {
        success: true,
        jobId: jobData?.job_id,
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

      // Queue generation job
      const { data: jobData, error: jobError } = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: fullScenePrompt,
          job_type: 'sdxl_image_fast',
          metadata: {
            destination: 'character_scene',
            character_id: characterId,
            scene_id: scene.id,
            conversation_id: conversationId,
            consistency_method: character.consistency_method || 'i2i_reference',
            reference_strength: 0.35,
            base_prompt: fullScenePrompt,
            update_scene_image: true
          }
        }
      });

      if (jobError) {
        throw jobError;
      }

      // Update scene with job ID
      await supabase
        .from('character_scenes')
        .update({ job_id: jobData?.job_id })
        .eq('id', scene.id);

      return {
        success: true,
        sceneId: scene.id,
        jobId: jobData?.job_id,
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
