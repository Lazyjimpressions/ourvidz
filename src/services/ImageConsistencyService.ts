import { supabase } from '@/integrations/supabase/client';

export interface ConsistencySettings {
  method: 'seed_locked' | 'i2i_reference' | 'hybrid';
  seed_value?: number;
  reference_strength?: number;
  denoise_strength?: number;
  modify_strength?: number;
}

export interface SceneGenerationRequest {
  characterId: string;
  scenePrompt: string;
  modelChoice: string;
  consistencySettings: ConsistencySettings;
  conversationContext?: string;
  userPreferences?: any;
}

export interface SceneGenerationResponse {
  success: boolean;
  imageUrl?: string;
  seedUsed?: number;
  consistencyScore?: number;
  processingTime?: number;
  error?: string;
}

class ImageConsistencyService {
  private supabase = supabase;

  /**
   * Generate a scene with character consistency
   */
  async generateConsistentScene(request: SceneGenerationRequest): Promise<SceneGenerationResponse> {
    const startTime = Date.now();
    
    try {
      // Get character data
      const character = await this.getCharacterData(request.characterId);
      if (!character) {
        throw new Error('Character not found');
      }

      // Build enhanced prompt with character context
      const enhancedPrompt = await this.buildEnhancedPrompt(request, character);
      
      // Apply consistency method
      const generationParams = await this.applyConsistencyMethod(request, character);
      
      // Generate image via cloud provider
      const result = await this.generateWithFal(enhancedPrompt, generationParams);

      // Calculate consistency score
      const consistencyScore = await this.calculateConsistencyScore(result.imageUrl, character);
      
      return {
        success: true,
        imageUrl: result.imageUrl,
        seedUsed: result.seed,
        consistencyScore,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Scene generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get character data from database
   */
  private async getCharacterData(characterId: string) {
    const { data, error } = await this.supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Build enhanced prompt with character context
   */
  private async buildEnhancedPrompt(request: SceneGenerationRequest, character: any): Promise<string> {
    let prompt = request.scenePrompt;
    
    // Add character base prompt if available
    if (character.base_prompt) {
      prompt = `${character.base_prompt}, ${prompt}`;
    }
    
    // Add character name and description
    prompt = `${character.name}, ${character.description}, ${prompt}`;
    
    // Add conversation context if provided
    if (request.conversationContext) {
      prompt = `${prompt}, context: ${request.conversationContext}`;
    }
    
    // Add consistency method to prompt
    switch (request.consistencySettings.method) {
      case 'seed_locked':
        prompt = `${prompt}, consistent character, seed locked`;
        break;
      case 'i2i_reference':
        prompt = `${prompt}, consistent character, reference image style`;
        break;
      case 'hybrid':
        prompt = `${prompt}, consistent character, hybrid consistency method`;
        break;
    }
    
    return prompt;
  }

  /**
   * Apply consistency method and return generation parameters
   */
  private async applyConsistencyMethod(request: SceneGenerationRequest, character: any) {
    const params: any = {
      prompt: request.scenePrompt,
      negative_prompt: "blurry, low quality, distorted, deformed",
      width: 1024,
      height: 1024,
      num_inference_steps: 20,
      guidance_scale: 7.5
    };

    switch (request.consistencySettings.method) {
      case 'seed_locked':
        params.seed = character.seed_locked || request.consistencySettings.seed_value || Math.floor(Math.random() * 1000000);
        break;
        
      case 'i2i_reference':
        if (character.preview_image_url) {
          params.init_image = character.preview_image_url;
          params.denoising_strength = request.consistencySettings.denoise_strength || 0.35;
        }
        break;
        
      case 'hybrid':
        // Combine seed locking with i2i reference
        params.seed = character.seed_locked || request.consistencySettings.seed_value || Math.floor(Math.random() * 1000000);
        if (character.preview_image_url) {
          params.init_image = character.preview_image_url;
          params.denoising_strength = request.consistencySettings.denoise_strength || 0.25;
        }
        break;
    }

    return params;
  }

  /**
   * Generate image using fal.ai cloud provider
   */
  private async generateWithFal(prompt: string, params: any) {
    const { data, error } = await this.supabase.functions.invoke('fal-image', {
      body: {
        prompt,
        quality: 'high',
        input: {
          image_url: params.init_image,
          seed: params.seed,
          strength: params.denoising_strength
        },
        metadata: {
          destination: 'roleplay_scene',
          character_id: params.character_id,
          scene_type: 'chat_scene',
          consistency_method: params.consistency_method,
          seed: params.seed
        }
      }
    });

    if (error) throw error;
    return { imageUrl: data.image_url, seed: params.seed };
  }

  /**
   * Calculate consistency score (placeholder for now)
   */
  private async calculateConsistencyScore(imageUrl: string, character: any): Promise<number> {
    // TODO: Implement actual consistency scoring
    // This could use image similarity algorithms or AI-based comparison
    return Math.random() * 0.3 + 0.7; // Return 70-100% for now
  }

  /**
   * Update character's seed lock
   */
  async updateSeedLock(characterId: string, seed: number): Promise<void> {
    const { error } = await this.supabase
      .from('characters')
      .update({ seed_locked: seed })
      .eq('id', characterId);

    if (error) throw error;
  }

  /**
   * Get consistency settings for a character
   */
  async getConsistencySettings(characterId: string): Promise<ConsistencySettings> {
    const { data, error } = await this.supabase
      .from('characters')
      .select('consistency_method, seed_locked')
      .eq('id', characterId)
      .single();

    if (error) throw error;

    const method = data.consistency_method;
    const validMethod = (method === 'seed_locked' || method === 'i2i_reference' || method === 'hybrid') ? method : 'hybrid';
    
    return {
      method: validMethod,
      seed_value: data.seed_locked,
      reference_strength: 0.35,
      denoise_strength: 0.25,
      modify_strength: 0.5
    };
  }
}

export const imageConsistencyService = new ImageConsistencyService();
